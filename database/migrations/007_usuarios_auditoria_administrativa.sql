begin;

-- Fecha de última actualización del usuario de negocio, mantenida automáticamente.
alter table public.usuario
  add column if not exists actualizado_en timestamptz not null default now();

create or replace function public.usuario_actualizar_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists usuario_actualizado_en_trg on public.usuario;
create trigger usuario_actualizado_en_trg
  before update on public.usuario
  for each row execute function public.usuario_actualizar_timestamp();

-- Recreación defensiva e idempotente de las restricciones existentes, alineadas con los
-- únicos valores observados en producción (ver auditoria/validacion_datos.txt).
alter table public.usuario drop constraint if exists usuario_perfil_check;
alter table public.usuario
  add constraint usuario_perfil_check
  check (perfil in ('Administrador', 'Supervisor', 'Reponedor', 'Reponedor Externo'));

alter table public.usuario drop constraint if exists usuario_estado_check;
alter table public.usuario
  add constraint usuario_estado_check
  check (estado in ('Activo', 'Inactivo'));

-- Búsqueda de usuarios por RUT (independiente de empresa; la unicidad por empresa+rut
-- ya existe como usuario_empresa_cliente_id_persona_rut_key).
create index if not exists usuario_persona_rut_idx
  on public.usuario (persona_rut);

-- Listados administrativos filtrados por empresa + estado + perfil.
create index if not exists usuario_empresa_estado_perfil_idx
  on public.usuario (empresa_cliente_id, estado, perfil);

-- Asignaciones por local (la unicidad usuario_id+local_id ya cubre búsquedas por usuario).
create index if not exists usuario_local_asignacion_local_idx
  on public.usuario_local_asignacion (local_id);

-- Auditoría administrativa append-only. Vive en el esquema public porque, a diferencia de
-- migracion_auditoria (trazabilidad de la carga histórica, restringida a service_role),
-- esta tabla es parte de la operación normal: un Administrador debe poder consultar el
-- historial de cambios de su propia empresa.
create table if not exists public.auditoria_administrativa (
  id bigint generated always as identity primary key,
  empresa_cliente_id uuid not null
    references public.empresa_cliente(id) on delete cascade,
  actor_usuario_id uuid references public.usuario(id) on delete set null,
  actor_auth_user_id uuid,
  accion text not null check (btrim(accion) <> ''),
  entidad_tipo text not null check (btrim(entidad_tipo) <> ''),
  entidad_id text not null check (btrim(entidad_id) <> ''),
  valores_anteriores jsonb,
  valores_nuevos jsonb,
  metadata jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

comment on table public.auditoria_administrativa is
  'Auditoría append-only de cambios administrativos sensibles (usuarios, asignaciones, etc.). No debe registrar tokens, contraseñas ni secretos.';

comment on column public.auditoria_administrativa.metadata is
  'Metadatos técnicos seguros del cambio (por ejemplo: origen de la solicitud). Nunca debe contener tokens, contraseñas ni claves.';

create index if not exists auditoria_administrativa_empresa_fecha_idx
  on public.auditoria_administrativa (empresa_cliente_id, creado_en desc);

create index if not exists auditoria_administrativa_entidad_idx
  on public.auditoria_administrativa (entidad_tipo, entidad_id);

-- Bloqueo de UPDATE/DELETE a nivel de motor, independiente del rol que ejecute la consulta.
create or replace function public.auditoria_administrativa_bloquear_mutacion()
returns trigger
language plpgsql
as $$
begin
  raise exception 'auditoria_administrativa es de solo anexado (append-only): no se permiten UPDATE ni DELETE';
end;
$$;

drop trigger if exists auditoria_administrativa_append_only on public.auditoria_administrativa;
create trigger auditoria_administrativa_append_only
  before update or delete on public.auditoria_administrativa
  for each row execute function public.auditoria_administrativa_bloquear_mutacion();

alter table public.auditoria_administrativa enable row level security;

commit;
