import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuthUser } from '../auth/auth-user';
import { ListQueryDto } from './list-query.dto';

type StoreRow = {
  id: string;
  code: string;
  name: string;
  chain: string;
  subchain: string;
  status: string;
  total: string;
};
type ProductRow = {
  id: string;
  sap: string;
  name: string;
  brand: string | null;
  price: string | null;
  stock: string;
  stock_date: string;
  total: string;
};

@Injectable()
export class StoresService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: AuthUser, query: ListQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const rows = await this.database.query<StoreRow>(
      `
      select l.id, l.codigo_local as code, l.nombre_local as name, c.nombre as chain,
             sc.nombre as subchain, l.estado as status, count(*) over()::text as total
      from public.local l
      join public.subcadena sc on sc.id = l.subcadena_id
      join public.cadena c on c.id = sc.cadena_id
      where ($3 = '' or l.nombre_local ilike '%' || $3 || '%' or c.nombre ilike '%' || $3 || '%' or sc.nombre ilike '%' || $3 || '%')
        and (
          ($4 = any(array['Administrador','Supervisor']) and exists (
            select 1 from public.stock_snapshot ss where ss.local_id = l.id and ss.empresa_cliente_id = $1
          ))
          or exists (
            select 1 from public.usuario_local_asignacion ula where ula.local_id = l.id and ula.usuario_id = $2
          )
        )
      order by c.nombre, sc.nombre, l.nombre_local
      limit $5 offset $6`,
      [user.tenantId, user.id, query.search, user.role, query.limit, offset],
    );
    return {
      items: rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        chain: row.chain,
        subchain: row.subchain,
        status: row.status,
      })),
      total: Number(rows[0]?.total ?? 0),
      page: query.page,
      limit: query.limit,
    };
  }

  async products(user: AuthUser, storeId: string, query: ListQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const rows = await this.database.query<ProductRow>(
      `
      with latest as (
        select distinct on (ss.producto_cliente_id)
          ss.producto_cliente_id, ss.stock, ss.fecha
        from public.stock_snapshot ss
        where ss.empresa_cliente_id = $1 and ss.local_id = $2
        order by ss.producto_cliente_id, ss.fecha desc, ss.id desc
      )
      select pcl.id, pc.sap, coalesce(ph.nombre_homologado, pc.nombre_texto_cadena, pc.sap) as name,
             coalesce(m.nombre, pc.marca_texto_cadena) as brand, pcl.precio::text as price,
             latest.stock::text, latest.fecha::text as stock_date, count(*) over()::text as total
      from latest
      join public.producto_cliente pcl on pcl.id = latest.producto_cliente_id and pcl.empresa_cliente_id = $1
      join public.producto_cadena pc on pc.id = pcl.producto_cadena_id
      left join public.producto_homologado ph on ph.id = pcl.producto_homologado_id
      left join public.marca m on m.id = ph.marca_id
      where ($3 = '' or pc.sap ilike '%' || $3 || '%' or ph.nombre_homologado ilike '%' || $3 || '%' or m.nombre ilike '%' || $3 || '%')
        and ($4 = any(array['Administrador','Supervisor']) or exists (
          select 1 from public.usuario_local_asignacion ula where ula.local_id = $2 and ula.usuario_id = $5
        ))
      order by name, pc.sap
      limit $6 offset $7`,
      [
        user.tenantId,
        storeId,
        query.search,
        user.role,
        user.id,
        query.limit,
        offset,
      ],
    );
    return {
      items: rows.map((row) => ({
        id: row.id,
        sap: row.sap,
        name: row.name,
        brand: row.brand,
        price: row.price,
        stock: row.stock,
        stockDate: row.stock_date,
      })),
      total: Number(rows[0]?.total ?? 0),
      page: query.page,
      limit: query.limit,
    };
  }

  async history(
    user: AuthUser,
    storeId: string,
    productId: string,
    days: number,
  ) {
    const rows = await this.database.query<{ date: string; stock: string }>(
      `select sh.fecha::text as date, sh.stock::text
       from public.stock_historial sh
       where sh.empresa_cliente_id = $1 and sh.local_id = $2 and sh.producto_cliente_id = $3
         and sh.fecha >= current_date - ($4::int - 1)
         and ($5 = any(array['Administrador','Supervisor']) or exists (
           select 1 from public.usuario_local_asignacion ula where ula.local_id = $2 and ula.usuario_id = $6
         ))
       order by sh.fecha desc, sh.id desc
       limit 1000`,
      [user.tenantId, storeId, productId, days, user.role, user.id],
    );
    return { items: rows, days };
  }
}
