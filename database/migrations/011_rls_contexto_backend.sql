begin;

-- NestJS connects directly to PostgreSQL, not through PostgREST. Keep the business
-- user id in a transaction-local setting so RLS has the same identity boundary.
create or replace function public.sesion_usuario_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.usuario_id', true), '')::uuid
$$;

create or replace function public.usuario_actual()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select u.id
  from public.usuario u
  join public.empresa_cliente ec on ec.id = u.empresa_cliente_id
  where u.id = public.sesion_usuario_id()
    and u.estado = 'Activo'
    and ec.estado = 'Activo'
  limit 1
$$;

create or replace function public.empresa_cliente_actual()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select u.empresa_cliente_id
  from public.usuario u
  join public.empresa_cliente ec on ec.id = u.empresa_cliente_id
  where u.id = public.sesion_usuario_id()
    and u.estado = 'Activo'
    and ec.estado = 'Activo'
  limit 1
$$;

create or replace function public.perfil_actual()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select u.perfil
  from public.usuario u
  join public.empresa_cliente ec on ec.id = u.empresa_cliente_id
  where u.id = public.sesion_usuario_id()
    and u.estado = 'Activo'
    and ec.estado = 'Activo'
  limit 1
$$;

revoke all on function public.sesion_usuario_id() from public;
grant execute on function public.sesion_usuario_id() to authenticated, service_role;

comment on function public.sesion_usuario_id() is
  'Identidad de negocio configurada por el backend con set_config local a la transacción.';

commit;
