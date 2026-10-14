import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService, DbClient } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth-user';
import { isForeignKeyViolation, isUniqueViolation } from '../common/db-errors';
import { CloneProductDto } from './dto/clone-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { QuiebreProductDto } from './dto/quiebre-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type ProductRow = {
  id: string;
  cadena_id: string;
  cadena_nombre: string;
  sap: string;
  sap_pack: string | null;
  nombre_texto_cadena: string | null;
  marca_texto_cadena: string | null;
  ean_unidad: string | null;
  ean_pack: string | null;
  unidades_por_caja: string | null;
  nombre_homologado: string | null;
  marca_nombre: string | null;
  seccion_id: string | null;
  seccion_nombre: string | null;
  precio: string | null;
  precio_pack: string | null;
  estado: string;
  campana_activa: boolean;
  campana_desde: string | null;
  campana_hasta: string | null;
  quiebre_activo: boolean;
  quiebre_declarado_en: string | null;
};

type ImageRow = {
  tipo: string;
  referencia_archivo: string | null;
  url: string | null;
};

type ProductForUpdateRow = {
  id: string;
  producto_cadena_id: string;
  producto_homologado_id: string | null;
  precio: string | null;
  precio_pack: string | null;
  estado: string;
  campana_activa: boolean;
  campana_desde: string | null;
  campana_hasta: string | null;
  quiebre_activo: boolean;
  quiebre_declarado_en: string | null;
  cadena_id: string;
  sap: string;
  sap_pack: string | null;
  articulo_id: string | null;
  nombre_texto_cadena: string | null;
  marca_texto_cadena: string | null;
  ean_unidad: string | null;
  ean_pack: string | null;
  unidades_por_caja: string | null;
  nombre_homologado: string | null;
  marca_id: string | null;
  seccion_id: string | null;
};

function toSummary(row: ProductRow) {
  return {
    id: row.id,
    cadenaId: row.cadena_id,
    cadenaNombre: row.cadena_nombre,
    sap: row.sap,
    sapPack: row.sap_pack,
    nombreCadena: row.nombre_texto_cadena,
    marcaTextoCadena: row.marca_texto_cadena,
    eanUnidad: row.ean_unidad,
    eanPack: row.ean_pack,
    unidadesPorCaja: row.unidades_por_caja,
    nombreHomologado: row.nombre_homologado,
    marcaNombre: row.marca_nombre,
    seccionId: row.seccion_id,
    seccionNombre: row.seccion_nombre,
    precio: row.precio,
    precioPack: row.precio_pack,
    estado: row.estado,
    campanaActiva: row.campana_activa,
    campanaDesde: row.campana_desde,
    campanaHasta: row.campana_hasta,
    quiebreActivo: row.quiebre_activo,
    quiebreDeclaradoEn: row.quiebre_declarado_en,
  };
}

function normalizeName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function validateCampanaFechas(
  activa: boolean | undefined,
  desde: string | undefined,
  hasta: string | undefined,
): void {
  if (activa && !desde) {
    throw new BadRequestException(
      'Si la campaña está activa, debes indicar la fecha de inicio.',
    );
  }
  if (desde && hasta && hasta < desde) {
    throw new BadRequestException(
      'La fecha de término de la campaña no puede ser anterior a la de inicio.',
    );
  }
}

const PRODUCT_COLUMNS = `pcl.id, c.id as cadena_id, c.nombre as cadena_nombre,
         pc.sap, pc.sap_pack, pc.nombre_texto_cadena, pc.marca_texto_cadena,
         a.ean_unidad, a.ean_pack, a.unidades_por_caja::text,
         ph.nombre_homologado, m.nombre as marca_nombre,
         s.id as seccion_id, s.nombre as seccion_nombre,
         pcl.precio::text, pcl.precio_pack::text, pcl.estado,
         pcl.campana_activa, pcl.campana_desde::text, pcl.campana_hasta::text,
         pcl.quiebre_activo, pcl.quiebre_declarado_en::text`;

const PRODUCT_FROM = `
  from public.producto_cliente pcl
  join public.producto_cadena pc on pc.id = pcl.producto_cadena_id
  join public.cadena c on c.id = pc.cadena_id
  left join public.articulo a on a.id = pc.articulo_id
  left join public.producto_homologado ph on ph.id = pcl.producto_homologado_id
  left join public.marca m on m.id = ph.marca_id
  left join public.seccion s on s.id = ph.seccion_id`;

const PRODUCT_SELECT = `select ${PRODUCT_COLUMNS}${PRODUCT_FROM}`;

@Injectable()
export class ProductsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: ListProductsQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const rows = await this.database.query<ProductRow & { total: string }>(
      `select ${PRODUCT_COLUMNS}, count(*) over()::text as total
       ${PRODUCT_FROM}
       where pcl.empresa_cliente_id = $1
         and ($2 = '' or pc.sap ilike '%' || $2 || '%' or pc.sap_pack ilike '%' || $2 || '%'
              or a.ean_unidad ilike '%' || $2 || '%' or a.ean_pack ilike '%' || $2 || '%'
              or m.nombre ilike '%' || $2 || '%' or ph.nombre_homologado ilike '%' || $2 || '%'
              or pc.nombre_texto_cadena ilike '%' || $2 || '%')
         and ($3::uuid is null or c.id = $3)
         and ($4::uuid is null or s.id = $4)
         and ($5 = '' or pcl.estado = $5)
         and ($6::boolean is null or pcl.campana_activa = $6)
         and ($7::boolean is null or pcl.quiebre_activo = $7)
       order by ph.nombre_homologado nulls last, pc.sap
       limit $8 offset $9`,
      [
        actor.tenantId,
        query.search,
        query.cadenaId ?? null,
        query.seccionId ?? null,
        query.estado ?? '',
        query.campanaActiva ?? null,
        query.quiebreActivo ?? null,
        query.limit,
        offset,
      ],
    );
    return {
      items: rows.map(toSummary),
      total: Number(rows[0]?.total ?? 0),
      page: query.page,
      limit: query.limit,
    };
  }

  async options() {
    const [cadenas, secciones, marcas] = await Promise.all([
      this.database.query<{ id: string; nombre: string }>(
        `select id, nombre from public.cadena order by nombre`,
      ),
      this.database.query<{ id: string; nombre: string }>(
        `select id, nombre from public.seccion order by nombre`,
      ),
      this.database.query<{
        id: string;
        nombre: string;
        proveedor_id: string;
        proveedor_nombre: string;
      }>(
        `select m.id, m.nombre, m.proveedor_id, p.nombre as proveedor_nombre
         from public.marca m join public.proveedor p on p.id = m.proveedor_id
         order by p.nombre, m.nombre`,
      ),
    ]);
    return {
      cadenas,
      secciones,
      marcas: marcas.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        proveedorId: m.proveedor_id,
        proveedorNombre: m.proveedor_nombre,
      })),
    };
  }

  async detail(actor: AuthUser, id: string) {
    return this.loadDetail(this.database, actor, id);
  }

  async create(actor: AuthUser, dto: CreateProductDto) {
    validateCampanaFechas(
      dto.campanaActiva,
      dto.campanaDesde,
      dto.campanaHasta,
    );
    return this.database.transaction(async (client) => {
      const marcaId = await this.resolveMarcaId(
        client,
        dto.marcaId,
        dto.marcaNombre,
        dto.proveedorId,
        dto.proveedorNombre,
      );
      const seccionId = await resolveSeccionId(
        client,
        dto.seccionId,
        dto.seccionNombre,
      );
      const articuloId = await findOrCreateArticulo(
        client,
        dto.eanUnidad,
        dto.eanPack,
        dto.unidadesPorCaja,
      );
      const productoCadenaId = await findOrCreateProductoCadena(
        client,
        dto.cadenaId,
        dto.sap,
        dto.sapPack,
        articuloId,
        dto.nombreCadena,
        dto.marcaTextoCadena,
      );

      const duplicate = await client.query<{ id: string }>(
        `select id from public.producto_cliente where empresa_cliente_id = $1 and producto_cadena_id = $2`,
        [actor.tenantId, productoCadenaId],
      );
      if (duplicate[0]) {
        throw new ConflictException(
          'Ya existe este producto (cadena + SAP) en el catálogo de la empresa.',
        );
      }

      const homologadoId = await findOrCreateHomologado(
        client,
        actor.tenantId,
        dto.nombreHomologado,
        marcaId,
        seccionId,
      );

      const inserted = await client.query<{ id: string }>(
        `insert into public.producto_cliente
          (empresa_cliente_id, producto_cadena_id, producto_homologado_id, precio, precio_pack, estado,
           campana_activa, campana_desde, campana_hasta)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning id`,
        [
          actor.tenantId,
          productoCadenaId,
          homologadoId,
          dto.precio ?? null,
          dto.precioPack ?? null,
          dto.estado ?? 'Activo',
          dto.campanaActiva ?? false,
          dto.campanaDesde ?? null,
          dto.campanaHasta ?? null,
        ],
      );
      const productId = inserted[0].id;

      await this.audit.record(client, actor, {
        accion: 'producto.creado',
        entidadTipo: 'producto_cliente',
        entidadId: productId,
        valoresNuevos: {
          sap: dto.sap,
          cadenaId: dto.cadenaId,
          nombreHomologado: dto.nombreHomologado,
        },
      });

      return this.loadDetail(client, actor, productId);
    });
  }

  async update(actor: AuthUser, id: string, dto: UpdateProductDto) {
    validateCampanaFechas(
      dto.campanaActiva,
      dto.campanaDesde,
      dto.campanaHasta,
    );
    return this.database.transaction(async (client) => {
      const before = await this.loadForUpdate(client, actor, id);
      if (!before) throw new NotFoundException('Producto no encontrado.');

      await this.applyIdentidad(client, actor, id, before, dto);
      await this.applyHomologacion(client, actor, id, before, dto);

      const sets: string[] = [];
      const values: unknown[] = [id];
      const addSet = (column: string, value: unknown) => {
        values.push(value);
        sets.push(`${column} = $${values.length}`);
      };
      if (dto.precio !== undefined) addSet('precio', dto.precio);
      if (dto.precioPack !== undefined) addSet('precio_pack', dto.precioPack);
      if (dto.campanaActiva !== undefined)
        addSet('campana_activa', dto.campanaActiva);
      if (dto.campanaDesde !== undefined)
        addSet('campana_desde', dto.campanaDesde);
      if (dto.campanaHasta !== undefined)
        addSet('campana_hasta', dto.campanaHasta);
      if (sets.length) {
        await client.query(
          `update public.producto_cliente set ${sets.join(', ')} where id = $1`,
          values,
        );
      }

      return this.loadDetail(client, actor, id);
    });
  }

  async setStatus(actor: AuthUser, id: string, estado: string) {
    return this.database.transaction(async (client) => {
      const before = await this.loadForUpdate(client, actor, id);
      if (!before) throw new NotFoundException('Producto no encontrado.');
      if (before.estado === estado) return this.loadDetail(client, actor, id);

      await client.query(
        `update public.producto_cliente set estado = $1 where id = $2`,
        [estado, id],
      );
      await this.audit.record(client, actor, {
        accion:
          estado === 'Activo' ? 'producto.activado' : 'producto.desactivado',
        entidadTipo: 'producto_cliente',
        entidadId: id,
        valoresAnteriores: { estado: before.estado },
        valoresNuevos: { estado },
      });

      return this.loadDetail(client, actor, id);
    });
  }

  async setQuiebre(actor: AuthUser, id: string, dto: QuiebreProductDto) {
    return this.database.transaction(async (client) => {
      const before = await this.loadForUpdate(client, actor, id);
      if (!before) throw new NotFoundException('Producto no encontrado.');

      const eanDigits = (before.ean_unidad ?? '').replace(/\D/g, '');
      const eanValido = eanDigits.length >= 8;
      const propagar = Boolean(dto.propagarPorEan) && eanValido;

      const targets = propagar
        ? await client.query<{ id: string; quiebre_activo: boolean }>(
            `select pcl.id, pcl.quiebre_activo
             from public.producto_cliente pcl
             join public.producto_cadena pc on pc.id = pcl.producto_cadena_id
             join public.articulo a on a.id = pc.articulo_id
             where pcl.empresa_cliente_id = $1 and a.ean_unidad = $2`,
            [actor.tenantId, before.ean_unidad],
          )
        : [{ id, quiebre_activo: before.quiebre_activo }];

      if (dto.propagarPorEan && !eanValido) {
        throw new BadRequestException(
          'No se puede propagar por EAN: el artículo no tiene un EAN válido (mínimo 8 dígitos).',
        );
      }

      for (const target of targets) {
        await client.query(
          `update public.producto_cliente
             set quiebre_activo = $2,
                 quiebre_declarado_en = case when $2 then now() else null end,
                 quiebre_declarado_por = case when $2 then $3::uuid else null end
           where id = $1`,
          [target.id, dto.quiebreActivo, actor.id],
        );
        await this.audit.record(client, actor, {
          accion: dto.quiebreActivo
            ? 'producto.quiebre_activado'
            : 'producto.quiebre_desactivado',
          entidadTipo: 'producto_cliente',
          entidadId: target.id,
          valoresAnteriores: { quiebreActivo: target.quiebre_activo },
          valoresNuevos: { quiebreActivo: dto.quiebreActivo },
          metadata: {
            motivo: dto.motivo ?? null,
            propagado: propagar,
            eanUtilizado: propagar ? before.ean_unidad : null,
            productoOrigenId: propagar ? id : null,
          },
        });
      }

      return this.loadDetail(client, actor, id);
    });
  }

  async clone(actor: AuthUser, id: string, dto: CloneProductDto) {
    return this.database.transaction(async (client) => {
      const source = await this.loadForUpdate(client, actor, id);
      if (!source) throw new NotFoundException('Producto no encontrado.');

      const targetCadenaId = dto.cadenaId ?? source.cadena_id;
      if (dto.sap === source.sap && targetCadenaId === source.cadena_id) {
        throw new BadRequestException(
          'El SAP del clon debe ser distinto al original, o debes clonar hacia otra cadena.',
        );
      }

      const articuloId = dto.copiarEan
        ? source.articulo_id
        : source.unidades_por_caja
          ? await findOrCreateArticulo(
              client,
              undefined,
              undefined,
              Number(source.unidades_por_caja),
            )
          : null;

      const productoCadenaId = await findOrCreateProductoCadena(
        client,
        targetCadenaId,
        dto.sap,
        dto.sapPack,
        articuloId,
        source.nombre_texto_cadena,
        source.marca_texto_cadena,
      );

      const duplicate = await client.query<{ id: string }>(
        `select id from public.producto_cliente where empresa_cliente_id = $1 and producto_cadena_id = $2`,
        [actor.tenantId, productoCadenaId],
      );
      if (duplicate[0]) {
        throw new ConflictException(
          'Ya existe un producto con esa cadena + SAP en el catálogo de la empresa.',
        );
      }

      const inserted = await client.query<{ id: string }>(
        `insert into public.producto_cliente
          (empresa_cliente_id, producto_cadena_id, producto_homologado_id, precio, precio_pack, estado,
           campana_activa, campana_desde, campana_hasta)
         values ($1, $2, $3, $4, $5, 'Activo', $6, $7, $8)
         returning id`,
        [
          actor.tenantId,
          productoCadenaId,
          source.producto_homologado_id,
          source.precio,
          source.precio_pack,
          dto.copiarCampana ? source.campana_activa : false,
          dto.copiarCampana ? source.campana_desde : null,
          dto.copiarCampana ? source.campana_hasta : null,
        ],
      );
      const newId = inserted[0].id;

      if (dto.copiarImagenes) {
        await client.query(
          `insert into public.producto_imagen (empresa_cliente_id, producto_cliente_id, tipo, referencia_archivo, url)
           select $1, $2, tipo, referencia_archivo, url from public.producto_imagen where producto_cliente_id = $3`,
          [actor.tenantId, newId, id],
        );
      }

      await this.audit.record(client, actor, {
        accion: 'producto.clonado',
        entidadTipo: 'producto_cliente',
        entidadId: newId,
        valoresNuevos: { sap: dto.sap, cadenaId: targetCadenaId, origenId: id },
        metadata: {
          copiarEan: Boolean(dto.copiarEan),
          copiarCampana: Boolean(dto.copiarCampana),
          copiarImagenes: Boolean(dto.copiarImagenes),
        },
      });

      return this.loadDetail(client, actor, newId);
    });
  }

  private async resolveMarcaId(
    client: DbClient,
    marcaId?: string,
    marcaNombre?: string,
    proveedorId?: string,
    proveedorNombre?: string,
  ): Promise<string | null> {
    if (marcaId) return marcaId;
    if (!marcaNombre) return null;
    const existing = await findMarcaByNameAnyProveedor(client, marcaNombre);
    if (existing) return existing;
    let resolvedProveedorId = proveedorId;
    if (!resolvedProveedorId) {
      if (!proveedorNombre) {
        throw new BadRequestException(
          'Para crear una marca nueva debes indicar el proveedor (proveedorId o proveedorNombre).',
        );
      }
      resolvedProveedorId = await findOrCreateProveedor(
        client,
        proveedorNombre,
      );
    }
    return findOrCreateMarca(client, resolvedProveedorId, marcaNombre);
  }

  private async applyIdentidad(
    client: DbClient,
    actor: AuthUser,
    id: string,
    before: ProductForUpdateRow,
    dto: UpdateProductDto,
  ): Promise<void> {
    const touchesIdentidad =
      dto.cadenaId !== undefined ||
      dto.sap !== undefined ||
      dto.sapPack !== undefined ||
      dto.eanUnidad !== undefined ||
      dto.eanPack !== undefined ||
      dto.unidadesPorCaja !== undefined ||
      dto.nombreCadena !== undefined ||
      dto.marcaTextoCadena !== undefined;
    if (!touchesIdentidad) return;

    const targetCadenaId = dto.cadenaId ?? before.cadena_id;
    const targetSap = dto.sap ?? before.sap;
    const relocates =
      targetCadenaId !== before.cadena_id || targetSap !== before.sap;

    const articuloId = await resolveArticuloForUpdate(client, before, dto);
    const sapPack = dto.sapPack !== undefined ? dto.sapPack : before.sap_pack;
    const nombreCadena =
      dto.nombreCadena !== undefined
        ? dto.nombreCadena
        : before.nombre_texto_cadena;
    const marcaTextoCadena =
      dto.marcaTextoCadena !== undefined
        ? dto.marcaTextoCadena
        : before.marca_texto_cadena;

    if (relocates) {
      const newProductoCadenaId = await findOrCreateProductoCadena(
        client,
        targetCadenaId,
        targetSap,
        sapPack,
        articuloId,
        nombreCadena,
        marcaTextoCadena,
      );
      const duplicate = await client.query<{ id: string }>(
        `select id from public.producto_cliente
         where empresa_cliente_id = $1 and producto_cadena_id = $2 and id <> $3`,
        [actor.tenantId, newProductoCadenaId, id],
      );
      if (duplicate[0]) {
        throw new ConflictException(
          'Ya existe otro producto con esa cadena + SAP en el catálogo de la empresa.',
        );
      }
      await client.query(
        `update public.producto_cliente set producto_cadena_id = $1 where id = $2`,
        [newProductoCadenaId, id],
      );
    } else {
      const updated = await client.query<{ actualizado: boolean }>(
        `select public.actualizar_producto_cadena_seguro($1, $2, $3, $4, $5) as actualizado`,
        [
          before.producto_cadena_id,
          sapPack,
          articuloId,
          nombreCadena,
          marcaTextoCadena,
        ],
      );
      if (!updated[0]?.actualizado) {
        throw new ConflictException(
          'La identidad del producto está compartida con otra empresa y no puede modificarse directamente.',
        );
      }
    }

    await this.audit.record(client, actor, {
      accion: 'producto.identidad_editada',
      entidadTipo: 'producto_cliente',
      entidadId: id,
      valoresAnteriores: { cadenaId: before.cadena_id, sap: before.sap },
      valoresNuevos: { cadenaId: targetCadenaId, sap: targetSap },
    });
  }

  private async applyHomologacion(
    client: DbClient,
    actor: AuthUser,
    id: string,
    before: ProductForUpdateRow,
    dto: UpdateProductDto,
  ): Promise<void> {
    const touchesHomologacion =
      dto.nombreHomologado !== undefined ||
      dto.marcaId !== undefined ||
      dto.marcaNombre !== undefined ||
      dto.proveedorId !== undefined ||
      dto.proveedorNombre !== undefined ||
      dto.seccionId !== undefined ||
      dto.seccionNombre !== undefined;
    if (!touchesHomologacion) return;

    const marcaId =
      dto.marcaId !== undefined || dto.marcaNombre !== undefined
        ? await this.resolveMarcaId(
            client,
            dto.marcaId,
            dto.marcaNombre,
            dto.proveedorId,
            dto.proveedorNombre,
          )
        : before.marca_id;
    const seccionId =
      dto.seccionId !== undefined || dto.seccionNombre !== undefined
        ? await resolveSeccionId(client, dto.seccionId, dto.seccionNombre)
        : before.seccion_id;

    if (
      dto.nombreHomologado !== undefined &&
      dto.nombreHomologado !== before.nombre_homologado
    ) {
      const newHomologadoId = await findOrCreateHomologado(
        client,
        actor.tenantId,
        dto.nombreHomologado,
        marcaId,
        seccionId,
      );
      await client.query(
        `update public.producto_cliente set producto_homologado_id = $1 where id = $2`,
        [newHomologadoId, id],
      );
    } else if (before.producto_homologado_id) {
      await client.query(
        `update public.producto_homologado set marca_id = $2, seccion_id = $3 where id = $1`,
        [before.producto_homologado_id, marcaId, seccionId],
      );
    }
  }

  private async loadForUpdate(
    client: DbClient,
    actor: AuthUser,
    id: string,
  ): Promise<ProductForUpdateRow | null> {
    const rows = await client.query<ProductForUpdateRow>(
      `select pcl.id, pcl.producto_cadena_id, pcl.producto_homologado_id, pcl.precio::text, pcl.precio_pack::text,
              pcl.estado, pcl.campana_activa, pcl.campana_desde::text, pcl.campana_hasta::text,
              pcl.quiebre_activo, pcl.quiebre_declarado_en::text,
              pc.cadena_id, pc.sap, pc.sap_pack, pc.articulo_id, pc.nombre_texto_cadena, pc.marca_texto_cadena,
              a.ean_unidad, a.ean_pack, a.unidades_por_caja::text,
              ph.nombre_homologado, ph.marca_id, ph.seccion_id
       from public.producto_cliente pcl
       join public.producto_cadena pc on pc.id = pcl.producto_cadena_id
       left join public.articulo a on a.id = pc.articulo_id
       left join public.producto_homologado ph on ph.id = pcl.producto_homologado_id
       where pcl.empresa_cliente_id = $1 and pcl.id = $2
       for update of pcl`,
      [actor.tenantId, id],
    );
    return rows[0] ?? null;
  }

  private async loadDetail(client: DbClient, actor: AuthUser, id: string) {
    const rows = await client.query<ProductRow>(
      `${PRODUCT_SELECT} where pcl.empresa_cliente_id = $1 and pcl.id = $2`,
      [actor.tenantId, id],
    );
    if (!rows[0]) throw new NotFoundException('Producto no encontrado.');
    const images = await client.query<ImageRow>(
      `select tipo, referencia_archivo, url from public.producto_imagen where producto_cliente_id = $1`,
      [id],
    );
    return {
      ...toSummary(rows[0]),
      imagenes: images.map((image) => ({
        tipo: image.tipo,
        referenciaArchivo: image.referencia_archivo,
        url: image.url,
      })),
    };
  }
}

async function resolveSeccionId(
  client: DbClient,
  seccionId?: string,
  seccionNombre?: string,
): Promise<string | null> {
  if (seccionId) return seccionId;
  if (!seccionNombre) return null;
  return findOrCreateSeccion(client, seccionNombre);
}

async function resolveArticuloForUpdate(
  client: DbClient,
  before: {
    articulo_id: string | null;
    ean_unidad: string | null;
    ean_pack: string | null;
    unidades_por_caja: string | null;
  },
  dto: { eanUnidad?: string; eanPack?: string; unidadesPorCaja?: number },
): Promise<string | null> {
  const eanUnidadChanging =
    dto.eanUnidad !== undefined && dto.eanUnidad !== before.ean_unidad;
  const eanPackChanging =
    dto.eanPack !== undefined && dto.eanPack !== before.ean_pack;

  if (!eanUnidadChanging && !eanPackChanging) {
    if (dto.unidadesPorCaja === undefined) return before.articulo_id;
    if (before.articulo_id) {
      const updated = await client.query<{ actualizado: boolean }>(
        `select public.actualizar_unidades_articulo_seguro($1, $2) as actualizado`,
        [before.articulo_id, dto.unidadesPorCaja],
      );
      if (!updated[0]?.actualizado) {
        throw new ConflictException(
          'Las unidades por caja pertenecen a un artículo compartido con otra empresa y no pueden modificarse directamente.',
        );
      }
      return before.articulo_id;
    }
    return findOrCreateArticulo(
      client,
      before.ean_unidad ?? undefined,
      before.ean_pack ?? undefined,
      dto.unidadesPorCaja,
    );
  }

  return findOrCreateArticulo(
    client,
    dto.eanUnidad !== undefined
      ? dto.eanUnidad
      : (before.ean_unidad ?? undefined),
    dto.eanPack !== undefined ? dto.eanPack : (before.ean_pack ?? undefined),
    dto.unidadesPorCaja !== undefined
      ? dto.unidadesPorCaja
      : before.unidades_por_caja
        ? Number(before.unidades_por_caja)
        : undefined,
  );
}

async function findOrCreateArticulo(
  client: DbClient,
  eanUnidad?: string,
  eanPack?: string,
  unidadesPorCaja?: number,
): Promise<string | null> {
  if (!eanUnidad && !eanPack && unidadesPorCaja === undefined) return null;
  if (eanUnidad) {
    const existing = await client.query<{ id: string }>(
      `select id from public.articulo where ean_unidad = $1`,
      [eanUnidad],
    );
    if (existing[0]) return existing[0].id;
  }
  try {
    const inserted = await client.query<{ id: string }>(
      `insert into public.articulo (ean_unidad, ean_pack, unidades_por_caja) values ($1, $2, $3) returning id`,
      [eanUnidad ?? null, eanPack ?? null, unidadesPorCaja ?? null],
    );
    return inserted[0].id;
  } catch (error) {
    if (
      isUniqueViolation(error, 'articulo_ean_unidad_key') ||
      isUniqueViolation(error, 'articulo_ean_pack_key')
    ) {
      throw new ConflictException('El EAN ya está en uso por otro artículo.');
    }
    throw error;
  }
}

async function findOrCreateProductoCadena(
  client: DbClient,
  cadenaId: string,
  sap: string,
  sapPack: string | null | undefined,
  articuloId: string | null,
  nombreTextoCadena: string | null | undefined,
  marcaTextoCadena: string | null | undefined,
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    `select id from public.producto_cadena where cadena_id = $1 and sap = $2`,
    [cadenaId, sap],
  );
  if (existing[0]) return existing[0].id;
  try {
    const inserted = await client.query<{ id: string }>(
      `insert into public.producto_cadena (cadena_id, sap, sap_pack, articulo_id, nombre_texto_cadena, marca_texto_cadena)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [
        cadenaId,
        sap,
        sapPack ?? null,
        articuloId,
        nombreTextoCadena ?? null,
        marcaTextoCadena ?? null,
      ],
    );
    return inserted[0].id;
  } catch (error) {
    if (isUniqueViolation(error, 'producto_cadena_cadena_id_sap_key')) {
      const retry = await client.query<{ id: string }>(
        `select id from public.producto_cadena where cadena_id = $1 and sap = $2`,
        [cadenaId, sap],
      );
      if (retry[0]) return retry[0].id;
    }
    if (isForeignKeyViolation(error, 'producto_cadena_cadena_id_fkey')) {
      throw new BadRequestException('La cadena indicada no existe.');
    }
    throw error;
  }
}

async function findOrCreateProveedor(
  client: DbClient,
  nombre: string,
): Promise<string> {
  const rows = await client.query<{ id: string; nombre: string }>(
    `select id, nombre from public.proveedor`,
  );
  const target = normalizeName(nombre);
  const existing = rows.find((row) => normalizeName(row.nombre) === target);
  if (existing) return existing.id;
  try {
    const inserted = await client.query<{ id: string }>(
      `insert into public.proveedor (nombre) values ($1) returning id`,
      [nombre.trim()],
    );
    return inserted[0].id;
  } catch (error) {
    if (isUniqueViolation(error, 'proveedor_nombre_key')) {
      const retry = await client.query<{ id: string }>(
        `select id from public.proveedor where nombre = $1`,
        [nombre.trim()],
      );
      if (retry[0]) return retry[0].id;
    }
    throw error;
  }
}

async function findMarcaByNameAnyProveedor(
  client: DbClient,
  nombre: string,
): Promise<string | null> {
  const rows = await client.query<{ id: string; nombre: string }>(
    `select id, nombre from public.marca`,
  );
  const target = normalizeName(nombre);
  return rows.find((row) => normalizeName(row.nombre) === target)?.id ?? null;
}

async function findOrCreateMarca(
  client: DbClient,
  proveedorId: string,
  nombre: string,
): Promise<string> {
  const rows = await client.query<{ id: string; nombre: string }>(
    `select id, nombre from public.marca where proveedor_id = $1`,
    [proveedorId],
  );
  const target = normalizeName(nombre);
  const existing = rows.find((row) => normalizeName(row.nombre) === target);
  if (existing) return existing.id;
  try {
    const inserted = await client.query<{ id: string }>(
      `insert into public.marca (proveedor_id, nombre) values ($1, $2) returning id`,
      [proveedorId, nombre.trim()],
    );
    return inserted[0].id;
  } catch (error) {
    if (isUniqueViolation(error, 'marca_proveedor_id_nombre_key')) {
      const retry = await client.query<{ id: string }>(
        `select id from public.marca where proveedor_id = $1 and nombre = $2`,
        [proveedorId, nombre.trim()],
      );
      if (retry[0]) return retry[0].id;
    }
    throw error;
  }
}

async function findOrCreateSeccion(
  client: DbClient,
  nombre: string,
): Promise<string> {
  const rows = await client.query<{ id: string; nombre: string }>(
    `select id, nombre from public.seccion`,
  );
  const target = normalizeName(nombre);
  const existing = rows.find((row) => normalizeName(row.nombre) === target);
  if (existing) return existing.id;
  try {
    const inserted = await client.query<{ id: string }>(
      `insert into public.seccion (nombre) values ($1) returning id`,
      [nombre.trim()],
    );
    return inserted[0].id;
  } catch (error) {
    if (isUniqueViolation(error, 'seccion_nombre_key')) {
      const retry = await client.query<{ id: string }>(
        `select id from public.seccion where nombre = $1`,
        [nombre.trim()],
      );
      if (retry[0]) return retry[0].id;
    }
    throw error;
  }
}

async function findOrCreateHomologado(
  client: DbClient,
  empresaClienteId: string,
  nombreHomologado: string,
  marcaId: string | null,
  seccionId: string | null,
): Promise<string> {
  const rows = await client.query<{ id: string; nombre_homologado: string }>(
    `select id, nombre_homologado from public.producto_homologado where empresa_cliente_id = $1`,
    [empresaClienteId],
  );
  const target = normalizeName(nombreHomologado);
  const existing = rows.find(
    (row) => normalizeName(row.nombre_homologado) === target,
  );
  if (existing) return existing.id;
  try {
    const inserted = await client.query<{ id: string }>(
      `insert into public.producto_homologado (empresa_cliente_id, marca_id, seccion_id, nombre_homologado)
       values ($1, $2, $3, $4) returning id`,
      [empresaClienteId, marcaId, seccionId, nombreHomologado.trim()],
    );
    return inserted[0].id;
  } catch (error) {
    if (
      isUniqueViolation(
        error,
        'producto_homologado_empresa_cliente_id_nombre_homologado_key',
      )
    ) {
      const retry = await client.query<{ id: string }>(
        `select id from public.producto_homologado where empresa_cliente_id = $1 and nombre_homologado = $2`,
        [empresaClienteId, nombreHomologado.trim()],
      );
      if (retry[0]) return retry[0].id;
    }
    throw error;
  }
}
