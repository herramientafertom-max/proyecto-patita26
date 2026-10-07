import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth-user';
import { DatabaseService } from '../database/database.service';
import { CreateFieldPhotoDto } from './dto/create-field-photo.dto';
import { UploadedPhoto } from './photo-file';
import { StorageService } from './storage.service';

type FieldPhotoRow = {
  id: string;
  fecha: string;
  stock_al_momento: string | null;
  fecha_stock_sistemico: string | null;
  foto_referencia: string | null;
  foto_url: string | null;
  usuario_nombre: string;
};
type CatalogPhotoRow = {
  tipo: string;
  referencia_archivo: string | null;
  url: string | null;
};

@Injectable()
export class PhotosService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async fieldList(
    actor: AuthUser,
    localId: string,
    productId: string,
    days: number,
  ) {
    await this.assertOperationalAccess(actor, localId, productId);
    const rows = await this.database.query<FieldPhotoRow>(
      `select ft.id, ft.fecha::text, ft.stock_al_momento::text, ft.fecha_stock_sistemico::text,
              ft.foto_referencia, ft.foto_url, p.nombre as usuario_nombre
       from public.foto_terreno ft
       left join public.usuario u on u.id = ft.usuario_id
       left join public.persona p on p.rut = u.persona_rut
       where ft.empresa_cliente_id = $1 and ft.local_id = $2 and ft.producto_cliente_id = $3
         and ft.fecha >= now() - ($4::int * interval '1 day')
       order by ft.fecha desc
       limit 100`,
      [actor.tenantId, localId, productId, days],
    );
    return {
      items: await Promise.all(rows.map((row) => this.toFieldPhoto(row))),
      days,
    };
  }

  async createField(
    actor: AuthUser,
    dto: CreateFieldPhotoDto,
    file: UploadedPhoto,
  ) {
    await this.assertOperationalAccess(actor, dto.localId, dto.productId);
    const path = await this.storage.upload(
      'field-photos',
      actor.tenantId,
      'terreno',
      file,
    );
    const rows = await this.database.query<FieldPhotoRow>(
      `with inserted as (
         insert into public.foto_terreno
           (empresa_cliente_id, usuario_id, local_id, producto_cliente_id, stock_al_momento,
            fecha_stock_sistemico, foto_referencia)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning *
       )
       select ft.id, ft.fecha::text, ft.stock_al_momento::text, ft.fecha_stock_sistemico::text,
              ft.foto_referencia, ft.foto_url, p.nombre as usuario_nombre
       from inserted ft
       join public.usuario u on u.id = ft.usuario_id
       join public.persona p on p.rut = u.persona_rut`,
      [
        actor.tenantId,
        actor.id,
        dto.localId,
        dto.productId,
        dto.stockAlMomento ?? null,
        dto.fechaStockSistemico ?? null,
        path,
      ],
    );
    return this.toFieldPhoto(rows[0]);
  }

  async setCatalogImage(
    actor: AuthUser,
    productId: string,
    type: string,
    file: UploadedPhoto,
  ) {
    const exists = await this.database.query<{ id: string }>(
      `select id from public.producto_cliente where id = $1 and empresa_cliente_id = $2`,
      [productId, actor.tenantId],
    );
    if (!exists[0]) throw new NotFoundException('Producto no encontrado.');
    const path = await this.storage.upload(
      'product-images',
      actor.tenantId,
      type,
      file,
    );
    await this.database.transaction(async (client) => {
      await client.query(
        `insert into public.producto_imagen (empresa_cliente_id, producto_cliente_id, tipo, referencia_archivo, url)
         values ($1, $2, $3, $4, null)
         on conflict (producto_cliente_id, tipo) do update
           set referencia_archivo = excluded.referencia_archivo, url = null, actualizado_en = now()`,
        [actor.tenantId, productId, type, path],
      );
      await this.audit.record(client, actor, {
        accion: 'producto.imagen_actualizada',
        entidadTipo: 'producto_cliente',
        entidadId: productId,
        valoresNuevos: { tipo: type, referenciaArchivo: path },
      });
    });
    return {
      tipo: type,
      referenciaArchivo: path,
      url: await this.storage.signedUrl('product-images', path),
    };
  }

  async catalogList(actor: AuthUser, productId: string) {
    const rows = await this.database.query<CatalogPhotoRow>(
      `select pi.tipo, pi.referencia_archivo, pi.url
       from public.producto_imagen pi
       join public.producto_cliente pcl on pcl.id = pi.producto_cliente_id
       where pi.producto_cliente_id = $1 and pcl.empresa_cliente_id = $2
       order by case pi.tipo when 'unidad' then 1 when 'pack' then 2 else 3 end`,
      [productId, actor.tenantId],
    );
    return {
      items: await Promise.all(
        rows.map(async (row) => {
          const isStoragePath = Boolean(row.referencia_archivo?.includes('/'));
          return {
            tipo: row.tipo,
            referenciaArchivo: row.referencia_archivo,
            url:
              (isStoragePath
                ? await this.storage.signedUrl(
                    'product-images',
                    row.referencia_archivo,
                  )
                : null) ?? row.url,
          };
        }),
      ),
    };
  }

  private async assertOperationalAccess(
    actor: AuthUser,
    localId: string,
    productId: string,
  ) {
    const rows = await this.database.query<{ allowed: boolean }>(
      `select exists (
         select 1 from public.stock_snapshot ss
         where ss.empresa_cliente_id = $1 and ss.local_id = $2 and ss.producto_cliente_id = $3
           and ($4 = any(array['Administrador','Supervisor']) or exists (
             select 1 from public.usuario_local_asignacion ula where ula.usuario_id = $5 and ula.local_id = $2
           ))
       ) as allowed`,
      [actor.tenantId, localId, productId, actor.role, actor.id],
    );
    if (!rows[0]?.allowed)
      throw new ForbiddenException('No tienes acceso a este producto y local.');
  }

  private async toFieldPhoto(row: FieldPhotoRow) {
    const isStoragePath = Boolean(row.foto_referencia?.includes('/'));
    const signedUrl = isStoragePath
      ? await this.storage.signedUrl('field-photos', row.foto_referencia)
      : null;
    return {
      id: row.id,
      fecha: row.fecha,
      stockAlMomento: row.stock_al_momento,
      fechaStockSistemico: row.fecha_stock_sistemico,
      usuarioNombre: row.usuario_nombre || 'Usuario histórico',
      url: signedUrl ?? row.foto_url,
      referenciaArchivo: row.foto_referencia,
    };
  }
}
