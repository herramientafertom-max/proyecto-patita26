\set ON_ERROR_STOP on

-- Small pre-migration representation of the inherited domain. It contains only the
-- structures and original RLS policies needed to apply database/migrations/001-011.
-- Provenance: sanitized from backups/pre_migracion_2026-08-22/schema_antes.sql
-- (ignored source SHA-256 6169859132af1d7faad29600d415bc26073216905fdc005728c6030972b02a9d).
-- No COPY/INSERT statements, production rows, secrets or Supabase internals were imported.

create table public.empresa_cliente (
  id uuid primary key default gen_random_uuid(),
  rut_empresa text not null unique,
  nombre_comercial text not null,
  estado text not null default 'Activo'
    check (estado in ('Activo', 'Inactivo')),
  codigo_acceso text not null unique
    check (codigo_acceso ~ '^[1-9][0-9]{5}$'),
  creado_en timestamptz not null default now()
);

create table public.cadena (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table public.subcadena (
  id uuid primary key default gen_random_uuid(),
  cadena_id uuid not null references public.cadena(id) on delete cascade,
  nombre text not null,
  unique (cadena_id, nombre)
);

create table public.local (
  id uuid primary key default gen_random_uuid(),
  subcadena_id uuid not null references public.subcadena(id) on delete cascade,
  codigo_local text not null unique,
  nombre_local text not null,
  direccion text,
  latitud numeric(9,6),
  longitud numeric(9,6),
  estado text not null default 'Abierto'
    check (estado in ('Abierto', 'Cerrado'))
);

create table public.articulo (
  id uuid primary key default gen_random_uuid(),
  ean_unidad text unique,
  ean_pack text,
  unidades_por_caja numeric(10,2)
);

create table public.proveedor (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table public.marca (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedor(id) on delete cascade,
  nombre text not null,
  unique (proveedor_id, nombre)
);

create table public.seccion (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table public.persona (
  rut text primary key,
  nombre text not null,
  telefono text,
  constraint persona_rut_check check (rut ~ '^[0-9]{7,8}$')
);

-- Before migration 002, usuario.id was coupled to auth.users.id.
create table public.usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_cliente_id uuid not null
    references public.empresa_cliente(id) on delete cascade,
  persona_rut text not null references public.persona(rut),
  perfil text not null
    check (perfil in ('Administrador', 'Supervisor', 'Reponedor', 'Reponedor Externo')),
  estado text not null default 'Activo'
    check (estado in ('Activo', 'Inactivo')),
  creado_en timestamptz not null default now(),
  unique (empresa_cliente_id, persona_rut)
);

create table public.carpeta_almacenamiento (
  id uuid primary key default gen_random_uuid(),
  empresa_cliente_id uuid not null
    references public.empresa_cliente(id) on delete cascade,
  tipo text not null check (tipo in ('unidades', 'cajas', 'terreno')),
  referencia_carpeta text not null,
  unique (empresa_cliente_id, tipo)
);

create table public.producto_cadena (
  id uuid primary key default gen_random_uuid(),
  cadena_id uuid not null references public.cadena(id) on delete cascade,
  sap text not null,
  articulo_id uuid references public.articulo(id),
  marca_texto_cadena text,
  nombre_texto_cadena text,
  unique (cadena_id, sap)
);

create table public.producto_homologado (
  id uuid primary key default gen_random_uuid(),
  empresa_cliente_id uuid not null
    references public.empresa_cliente(id) on delete cascade,
  marca_id uuid references public.marca(id),
  seccion_id uuid references public.seccion(id),
  nombre_homologado text not null,
  caracteres numeric,
  unique (empresa_cliente_id, nombre_homologado)
);

create table public.producto_cliente (
  id uuid primary key default gen_random_uuid(),
  empresa_cliente_id uuid not null
    references public.empresa_cliente(id) on delete cascade,
  producto_cadena_id uuid not null
    references public.producto_cadena(id) on delete cascade,
  producto_homologado_id uuid references public.producto_homologado(id),
  precio numeric(12,2),
  estado text not null default 'Activo'
    check (estado in ('Activo', 'Bloqueado')),
  unique (empresa_cliente_id, producto_cadena_id)
);

create table public.stock_snapshot (
  id uuid primary key default gen_random_uuid(),
  empresa_cliente_id uuid not null
    references public.empresa_cliente(id) on delete cascade,
  local_id uuid not null references public.local(id),
  producto_cliente_id uuid not null
    references public.producto_cliente(id) on delete cascade,
  fecha date not null,
  stock numeric(12,2) not null default 0,
  unique (local_id, producto_cliente_id, fecha)
);

create table public.stock_historial (
  id uuid primary key default gen_random_uuid(),
  empresa_cliente_id uuid not null
    references public.empresa_cliente(id) on delete cascade,
  local_id uuid not null references public.local(id),
  producto_cliente_id uuid not null
    references public.producto_cliente(id) on delete cascade,
  fecha date not null,
  stock numeric(12,2) not null default 0,
  constraint stock_historial_local_id_producto_cliente_id_fecha_key
    unique (local_id, producto_cliente_id, fecha)
);

create table public.inventario_registro (
  id uuid primary key default gen_random_uuid(),
  empresa_cliente_id uuid not null
    references public.empresa_cliente(id) on delete cascade,
  usuario_id uuid not null references public.usuario(id),
  local_id uuid not null references public.local(id),
  producto_cliente_id uuid not null references public.producto_cliente(id),
  fecha timestamptz not null default now(),
  tipo_ingreso text not null
    check (tipo_ingreso in ('Conteo Stock', 'Sugerido')),
  unidades numeric(12,2),
  cajas numeric(12,2)
);

create table public.foto_terreno (
  id uuid primary key default gen_random_uuid(),
  empresa_cliente_id uuid not null
    references public.empresa_cliente(id) on delete cascade,
  usuario_id uuid not null references public.usuario(id),
  local_id uuid not null references public.local(id),
  producto_cliente_id uuid not null references public.producto_cliente(id),
  fecha timestamptz not null default now(),
  stock_al_momento numeric(12,2),
  fecha_stock_sistemico date,
  foto_referencia text,
  foto_url text
);

create table public.registro_acceso (
  id uuid primary key default gen_random_uuid(),
  empresa_cliente_id uuid not null
    references public.empresa_cliente(id) on delete cascade,
  usuario_id uuid not null references public.usuario(id),
  fecha timestamptz not null default now(),
  rol_en_el_momento text not null
);

create table public.registro_error (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  mensaje_error text not null,
  contexto_funcion text
);

create table public.usuario_local_asignacion (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuario(id) on delete cascade,
  local_id uuid not null references public.local(id) on delete cascade,
  lunes boolean not null default false,
  martes boolean not null default false,
  miercoles boolean not null default false,
  jueves boolean not null default false,
  viernes boolean not null default false,
  sabado boolean not null default false,
  domingo boolean not null default false,
  unique (usuario_id, local_id)
);

create or replace function public.empresa_cliente_actual()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select empresa_cliente_id
  from public.usuario
  where id = auth.uid()
  limit 1
$$;

alter table public.articulo enable row level security;
alter table public.cadena enable row level security;
alter table public.carpeta_almacenamiento enable row level security;
alter table public.empresa_cliente enable row level security;
alter table public.foto_terreno enable row level security;
alter table public.inventario_registro enable row level security;
alter table public.local enable row level security;
alter table public.marca enable row level security;
alter table public.persona enable row level security;
alter table public.producto_cadena enable row level security;
alter table public.producto_cliente enable row level security;
alter table public.producto_homologado enable row level security;
alter table public.proveedor enable row level security;
alter table public.registro_acceso enable row level security;
alter table public.registro_error enable row level security;
alter table public.seccion enable row level security;
alter table public.stock_historial enable row level security;
alter table public.stock_snapshot enable row level security;
alter table public.subcadena enable row level security;
alter table public.usuario enable row level security;
alter table public.usuario_local_asignacion enable row level security;

create policy empresa_cliente_select on public.empresa_cliente
  for select using (id = public.empresa_cliente_actual());
create policy foto_terreno_insert on public.foto_terreno
  for insert with check (empresa_cliente_id = public.empresa_cliente_actual());
create policy foto_terreno_select on public.foto_terreno
  for select using (empresa_cliente_id = public.empresa_cliente_actual());
create policy inventario_registro_insert on public.inventario_registro
  for insert with check (empresa_cliente_id = public.empresa_cliente_actual());
create policy inventario_registro_select on public.inventario_registro
  for select using (empresa_cliente_id = public.empresa_cliente_actual());
create policy producto_cliente_select on public.producto_cliente
  for select using (empresa_cliente_id = public.empresa_cliente_actual());
create policy producto_homologado_select on public.producto_homologado
  for select using (empresa_cliente_id = public.empresa_cliente_actual());
create policy registro_acceso_insert on public.registro_acceso
  for insert with check (empresa_cliente_id = public.empresa_cliente_actual());
create policy stock_historial_select on public.stock_historial
  for select using (empresa_cliente_id = public.empresa_cliente_actual());
create policy stock_snapshot_select on public.stock_snapshot
  for select using (empresa_cliente_id = public.empresa_cliente_actual());
create policy usuario_select on public.usuario
  for select using (empresa_cliente_id = public.empresa_cliente_actual());
create policy usuario_local_asignacion_select on public.usuario_local_asignacion
  for select using (
    usuario_id in (
      select id from public.usuario
      where empresa_cliente_id = public.empresa_cliente_actual()
    )
  );

-- These policy names and semantics are intentionally inherited: migrations 008+
-- replace them with the auth_user_id/session-aware versions.
create policy carpeta_almacenamiento_select on public.carpeta_almacenamiento
  for select using (empresa_cliente_id = public.empresa_cliente_actual());
create policy usuario_insert on public.usuario
  for insert with check (empresa_cliente_id = public.empresa_cliente_actual());
create policy usuario_update on public.usuario
  for update using (empresa_cliente_id = public.empresa_cliente_actual());
create policy usuario_local_asignacion_write on public.usuario_local_asignacion
  for all using (
    usuario_id in (
      select id from public.usuario
      where empresa_cliente_id = public.empresa_cliente_actual()
    )
  );
create policy producto_cliente_write on public.producto_cliente
  for all using (empresa_cliente_id = public.empresa_cliente_actual());
create policy producto_homologado_write on public.producto_homologado
  for all using (empresa_cliente_id = public.empresa_cliente_actual());
create policy registro_acceso_select on public.registro_acceso
  for select using (empresa_cliente_id = public.empresa_cliente_actual());

grant usage on schema public to anon, authenticated, service_role, retail_api;
grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role, retail_api;
