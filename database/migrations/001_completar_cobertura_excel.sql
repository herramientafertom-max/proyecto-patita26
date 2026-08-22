begin;

-- Conserva identificadores heredados necesarios para conciliación con Google Sheets.
alter table public.empresa_cliente
  add column if not exists referencia_base_origen text;

alter table public.producto_cadena
  add column if not exists llave_sap_origen text;

create unique index if not exists producto_cadena_llave_sap_origen_uq
  on public.producto_cadena (llave_sap_origen)
  where llave_sap_origen is not null;

-- Fotografías maestras del catálogo. Se mantienen separadas de foto_terreno.
create table if not exists public.producto_imagen (
  id uuid primary key default gen_random_uuid(),
  empresa_cliente_id uuid not null
    references public.empresa_cliente(id) on delete cascade,
  producto_cliente_id uuid not null
    references public.producto_cliente(id) on delete cascade,
  tipo text not null check (tipo in ('unidad', 'caja')),
  referencia_archivo text,
  url text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint producto_imagen_referencia_ck
    check (referencia_archivo is not null or url is not null),
  constraint producto_imagen_producto_tipo_uq
    unique (producto_cliente_id, tipo)
);

create index if not exists producto_imagen_empresa_idx
  on public.producto_imagen (empresa_cliente_id);

create index if not exists producto_imagen_producto_idx
  on public.producto_imagen (producto_cliente_id);

alter table public.producto_imagen enable row level security;

comment on table public.producto_imagen is
  'Imágenes maestras de unidad y caja provenientes del catálogo de productos.';

comment on column public.producto_imagen.referencia_archivo is
  'ID o referencia heredada del archivo en Google Drive u otro almacenamiento.';

-- Auditoría privada de migraciones. No se expone mediante el esquema public.
create schema if not exists migracion_auditoria;

revoke all on schema migracion_auditoria from public, anon, authenticated;
grant usage on schema migracion_auditoria to service_role;

create table if not exists migracion_auditoria.lote (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  archivo_origen text not null,
  hash_archivo_sha256 text not null,
  iniciado_en timestamptz not null default now(),
  finalizado_en timestamptz,
  estado text not null default 'preparado'
    check (estado in ('preparado', 'validando', 'cargando', 'completado', 'fallido')),
  total_filas bigint not null default 0 check (total_filas >= 0),
  filas_exitosas bigint not null default 0 check (filas_exitosas >= 0),
  filas_con_error bigint not null default 0 check (filas_con_error >= 0),
  observaciones text
);

create unique index if not exists migracion_lote_archivo_hash_uq
  on migracion_auditoria.lote (archivo_origen, hash_archivo_sha256);

create table if not exists migracion_auditoria.registro (
  id bigint generated always as identity primary key,
  lote_id uuid not null
    references migracion_auditoria.lote(id) on delete cascade,
  hoja_origen text not null,
  fila_origen integer not null check (fila_origen > 0),
  hash_fila_sha256 text not null,
  tabla_destino text,
  registro_destino_id text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'omitido', 'cargado', 'error')),
  mensaje text,
  creado_en timestamptz not null default now(),
  constraint migracion_registro_origen_uq
    unique (lote_id, hoja_origen, fila_origen)
);

create index if not exists migracion_registro_destino_idx
  on migracion_auditoria.registro (tabla_destino, registro_destino_id);

revoke all on all tables in schema migracion_auditoria from public, anon, authenticated;
grant select, insert, update on all tables in schema migracion_auditoria to service_role;
grant usage, select on all sequences in schema migracion_auditoria to service_role;

comment on schema migracion_auditoria is
  'Trazabilidad privada de lotes y filas importadas desde fuentes heredadas.';

commit;
