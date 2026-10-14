begin;

-- This migration is intentionally coupled to the restricted application role. It must be
-- provisioned before applying 012; accepting a superuser or BYPASSRLS role would invalidate
-- every isolation assertion in this file.
do $role_check$
declare
  api_role record;
begin
  select rolcanlogin, rolinherit, rolsuper, rolcreaterole, rolcreatedb,
         rolreplication, rolbypassrls
    into api_role
  from pg_catalog.pg_roles
  where rolname = 'retail_api';

  if not found then
    raise exception 'El rol restringido retail_api debe existir antes de aplicar la migración 012';
  end if;

  if not api_role.rolcanlogin
     or api_role.rolinherit
     or api_role.rolsuper
     or api_role.rolcreaterole
     or api_role.rolcreatedb
     or api_role.rolreplication
     or api_role.rolbypassrls then
    raise exception 'retail_api no cumple LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOREPLICATION NOBYPASSRLS';
  end if;

  -- NOINHERIT only blocks implicit privileges: a member can still use SET ROLE. The API role
  -- therefore must not belong to any other role.
  if exists (
    select 1
    from pg_catalog.pg_auth_members membership
    join pg_catalog.pg_roles member_role on member_role.oid = membership.member
    where member_role.rolname = 'retail_api'
  ) then
    raise exception 'retail_api no debe pertenecer a ningún otro rol';
  end if;

  -- A table owner bypasses RLS unless FORCE ROW LEVEL SECURITY is enabled. Ownership is never
  -- part of the application contract, even when the direct role attributes look restricted.
  if exists (
    select 1
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    join pg_catalog.pg_roles owner_role on owner_role.oid = relation.relowner
    where namespace.nspname = 'public'
      and owner_role.rolname = 'retail_api'
      and relation.relkind in ('r', 'p')
  ) then
    raise exception 'retail_api no debe ser propietario de tablas en el esquema public';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_namespace namespace
    join pg_catalog.pg_roles owner_role on owner_role.oid = namespace.nspowner
    where namespace.nspname = 'public'
      and owner_role.rolname = 'retail_api'
  ) then
    raise exception 'retail_api no debe ser propietario del esquema public';
  end if;
end
$role_check$;

-- Bootstrap de autenticación. El JWT se verifica en NestJS antes de invocar esta función.
-- La función expone solo la identidad de negocio activa asociada al sub verificado y evita
-- consultar public.usuario antes de que exista app.usuario_id.
create or replace function public.autenticar_usuario(p_auth_user_id uuid)
returns table (
  id uuid,
  tenant_id uuid,
  role text,
  name text,
  auth_user_id uuid
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select u.id,
         u.empresa_cliente_id,
         u.perfil,
         p.nombre,
         u.auth_user_id
  from public.usuario u
  join public.persona p on p.rut = u.persona_rut
  join public.empresa_cliente ec on ec.id = u.empresa_cliente_id
  where u.auth_user_id = p_auth_user_id
    and u.estado = 'Activo'
    and ec.estado = 'Activo'
  limit 1
$$;

revoke all on function public.autenticar_usuario(uuid) from public;
grant execute on function public.autenticar_usuario(uuid) to retail_api;

-- Consultas globales utilizadas exclusivamente por las políticas. SECURITY DEFINER permite
-- comprobar referencias de otros tenants sin exponer sus filas al rol de la API.
create or replace function public.persona_editable_por_empresa(p_rut text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.perfil_actual() = 'Administrador'
    and exists (
      select 1 from public.usuario u
      where u.persona_rut = p_rut
        and u.empresa_cliente_id = public.empresa_cliente_actual()
    )
    and not exists (
      select 1 from public.usuario u
      where u.persona_rut = p_rut
        and u.empresa_cliente_id <> public.empresa_cliente_actual()
    )
$$;

create or replace function public.actualizar_unidades_articulo_seguro(
  p_articulo_id uuid,
  p_unidades_por_caja numeric
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  tenant_actual uuid := public.empresa_cliente_actual();
begin
  if tenant_actual is null
     or public.perfil_actual() <> all (array['Administrador', 'Supervisor'])
     or p_unidades_por_caja is null
     or p_unidades_por_caja < 1
     or p_unidades_por_caja <> trunc(p_unidades_por_caja) then
    return false;
  end if;

  perform 1 from public.articulo where id = p_articulo_id for update;
  if not found then
    return false;
  end if;

  -- Lock every existing chain reference too. This serializes a concurrent
  -- producto_cliente insert (FK key-share lock) with the cross-tenant check below.
  perform 1
  from public.producto_cadena
  where articulo_id = p_articulo_id
  order by id
  for update;

  if not exists (
       select 1
       from public.producto_cadena pc
       join public.producto_cliente pcl on pcl.producto_cadena_id = pc.id
       where pc.articulo_id = p_articulo_id
         and pcl.empresa_cliente_id = tenant_actual
     )
     or exists (
       select 1
       from public.producto_cadena pc
       join public.producto_cliente pcl on pcl.producto_cadena_id = pc.id
       where pc.articulo_id = p_articulo_id
         and pcl.empresa_cliente_id <> tenant_actual
     ) then
    return false;
  end if;

  update public.articulo
     set unidades_por_caja = p_unidades_por_caja
   where id = p_articulo_id;
  return found;
end
$$;

create or replace function public.actualizar_producto_cadena_seguro(
  p_producto_cadena_id uuid,
  p_sap_pack text,
  p_articulo_id uuid,
  p_nombre_texto_cadena text,
  p_marca_texto_cadena text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  tenant_actual uuid := public.empresa_cliente_actual();
begin
  if tenant_actual is null
     or public.perfil_actual() <> all (array['Administrador', 'Supervisor']) then
    return false;
  end if;

  perform 1
  from public.producto_cadena
  where id = p_producto_cadena_id
  for update;
  if not found then
    return false;
  end if;

  if not exists (
       select 1 from public.producto_cliente pcl
       where pcl.producto_cadena_id = p_producto_cadena_id
         and pcl.empresa_cliente_id = tenant_actual
     )
     or exists (
       select 1 from public.producto_cliente pcl
       where pcl.producto_cadena_id = p_producto_cadena_id
         and pcl.empresa_cliente_id <> tenant_actual
     ) then
    return false;
  end if;

  update public.producto_cadena
     set sap_pack = p_sap_pack,
         articulo_id = p_articulo_id,
         nombre_texto_cadena = p_nombre_texto_cadena,
         marca_texto_cadena = p_marca_texto_cadena
   where id = p_producto_cadena_id;
  return found;
end
$$;

revoke all on function public.persona_editable_por_empresa(text) from public;
revoke all on function public.actualizar_unidades_articulo_seguro(uuid, numeric) from public;
revoke all on function public.actualizar_producto_cadena_seguro(uuid, text, uuid, text, text) from public;
grant execute on function public.persona_editable_por_empresa(text) to retail_api;
grant execute on function public.actualizar_unidades_articulo_seguro(uuid, numeric) to retail_api;
grant execute on function public.actualizar_producto_cadena_seguro(uuid, text, uuid, text, text) to retail_api;

-- Las funciones de contexto de 008/011 no habían sido concedidas al rol real del backend.
grant execute on function public.sesion_usuario_id() to retail_api;
grant execute on function public.usuario_actual() to retail_api;
grant execute on function public.empresa_cliente_actual() to retail_api;
grant execute on function public.perfil_actual() to retail_api;

-- Catálogo global: lectura solo con una identidad de negocio válida. La API puede crear
-- nuevas filas como Administrador/Supervisor, pero nunca actualizar directamente articulo o
-- producto_cadena; esas mutaciones pasan por las funciones atómicas anteriores.
drop policy if exists cadena_select on public.cadena;
create policy cadena_select on public.cadena
  for select to authenticated, retail_api
  using (public.usuario_actual() is not null);

drop policy if exists subcadena_select on public.subcadena;
create policy subcadena_select on public.subcadena
  for select to authenticated, retail_api
  using (public.usuario_actual() is not null);

drop policy if exists local_select on public.local;
create policy local_select on public.local
  for select to authenticated, retail_api
  using (public.usuario_actual() is not null);

drop policy if exists articulo_select on public.articulo;
create policy articulo_select on public.articulo
  for select to authenticated, retail_api
  using (public.usuario_actual() is not null);

drop policy if exists proveedor_select on public.proveedor;
create policy proveedor_select on public.proveedor
  for select to authenticated, retail_api
  using (public.usuario_actual() is not null);

drop policy if exists marca_select on public.marca;
create policy marca_select on public.marca
  for select to authenticated, retail_api
  using (public.usuario_actual() is not null);

drop policy if exists seccion_select on public.seccion;
create policy seccion_select on public.seccion
  for select to authenticated, retail_api
  using (public.usuario_actual() is not null);

drop policy if exists producto_cadena_select on public.producto_cadena;
create policy producto_cadena_select on public.producto_cadena
  for select to authenticated, retail_api
  using (public.usuario_actual() is not null);

drop policy if exists articulo_insert on public.articulo;
create policy articulo_insert on public.articulo
  for insert to retail_api
  with check (public.perfil_actual() = any (array['Administrador', 'Supervisor']));

drop policy if exists producto_cadena_insert on public.producto_cadena;
create policy producto_cadena_insert on public.producto_cadena
  for insert to retail_api
  with check (public.perfil_actual() = any (array['Administrador', 'Supervisor']));

drop policy if exists proveedor_insert on public.proveedor;
create policy proveedor_insert on public.proveedor
  for insert to retail_api
  with check (public.perfil_actual() = any (array['Administrador', 'Supervisor']));

drop policy if exists marca_insert on public.marca;
create policy marca_insert on public.marca
  for insert to retail_api
  with check (public.perfil_actual() = any (array['Administrador', 'Supervisor']));

drop policy if exists seccion_insert on public.seccion;
create policy seccion_insert on public.seccion
  for insert to retail_api
  with check (public.perfil_actual() = any (array['Administrador', 'Supervisor']));

-- Datos personales globales: un Administrador puede crear una persona, pero solo editarla
-- cuando su RUT no está vinculado a otra empresa.
drop policy if exists persona_insert on public.persona;
create policy persona_insert on public.persona
  for insert to retail_api
  with check (public.perfil_actual() = 'Administrador');

drop policy if exists persona_update on public.persona;
create policy persona_update on public.persona
  for update to retail_api
  using (public.persona_editable_por_empresa(rut))
  with check (public.persona_editable_por_empresa(rut));

-- El perfil debe evaluarse también en WITH CHECK. Sin esto, FOR ALL permitía INSERT a los
-- perfiles operativos porque USING no participa en la validación de una fila nueva.
drop policy if exists usuario_local_asignacion_write on public.usuario_local_asignacion;
create policy usuario_local_asignacion_write on public.usuario_local_asignacion
  for all
  using (
    public.perfil_actual() = 'Administrador'
    and exists (
      select 1 from public.usuario u
      where u.id = usuario_id
        and u.empresa_cliente_id = public.empresa_cliente_actual()
    )
  )
  with check (
    public.perfil_actual() = 'Administrador'
    and exists (
      select 1 from public.usuario u
      where u.id = usuario_id
        and u.empresa_cliente_id = public.empresa_cliente_actual()
    )
  );

drop policy if exists producto_cliente_write on public.producto_cliente;
create policy producto_cliente_write on public.producto_cliente
  for all
  using (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = any (array['Administrador', 'Supervisor'])
  )
  with check (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = any (array['Administrador', 'Supervisor'])
    and (
      producto_homologado_id is null
      or exists (
        select 1 from public.producto_homologado ph
        where ph.id = producto_homologado_id
          and ph.empresa_cliente_id = public.empresa_cliente_actual()
      )
    )
  );

drop policy if exists producto_homologado_write on public.producto_homologado;
create policy producto_homologado_write on public.producto_homologado
  for all
  using (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = any (array['Administrador', 'Supervisor'])
  )
  with check (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = any (array['Administrador', 'Supervisor'])
  );

drop policy if exists producto_imagen_write on public.producto_imagen;
create policy producto_imagen_write on public.producto_imagen
  for all
  using (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = any (array['Administrador', 'Supervisor'])
  )
  with check (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = any (array['Administrador', 'Supervisor'])
    and exists (
      select 1 from public.producto_cliente pcl
      where pcl.id = producto_cliente_id
        and pcl.empresa_cliente_id = public.empresa_cliente_actual()
    )
  );

-- Filas operativas: se conserva el acceso de los cuatro perfiles, pero se comprueba que cada
-- referencia privada pertenezca al tenant de la sesión.
drop policy if exists inventario_registro_insert on public.inventario_registro;
create policy inventario_registro_insert on public.inventario_registro
  for insert
  with check (
    empresa_cliente_id = public.empresa_cliente_actual()
    and usuario_id = public.usuario_actual()
    and exists (
      select 1 from public.producto_cliente pcl
      where pcl.id = producto_cliente_id
        and pcl.empresa_cliente_id = public.empresa_cliente_actual()
    )
  );

drop policy if exists foto_terreno_insert on public.foto_terreno;
create policy foto_terreno_insert on public.foto_terreno
  for insert
  with check (
    empresa_cliente_id = public.empresa_cliente_actual()
    and usuario_id = public.usuario_actual()
    and exists (
      select 1 from public.producto_cliente pcl
      where pcl.id = producto_cliente_id
        and pcl.empresa_cliente_id = public.empresa_cliente_actual()
    )
  );

drop policy if exists registro_acceso_insert on public.registro_acceso;
create policy registro_acceso_insert on public.registro_acceso
  for insert
  with check (
    empresa_cliente_id = public.empresa_cliente_actual()
    and usuario_id = public.usuario_actual()
  );

drop policy if exists auditoria_administrativa_insert on public.auditoria_administrativa;
create policy auditoria_administrativa_insert on public.auditoria_administrativa
  for insert
  with check (
    empresa_cliente_id = public.empresa_cliente_actual()
    and actor_usuario_id = public.usuario_actual()
  );

-- Privilegios SQL mínimos de la aplicación. RLS sigue siendo obligatorio y retail_api no es
-- propietario de ninguna tabla ni recibe acceso a auth, storage o migracion_auditoria.
revoke all on all tables in schema public from retail_api;
revoke all on all sequences in schema public from retail_api;
revoke all on schema public from retail_api;
grant usage on schema public to retail_api;
grant select on all tables in schema public to retail_api;
grant insert on table
  public.articulo,
  public.producto_cadena,
  public.proveedor,
  public.marca,
  public.seccion,
  public.persona,
  public.usuario,
  public.usuario_local_asignacion,
  public.producto_cliente,
  public.producto_homologado,
  public.producto_imagen,
  public.foto_terreno,
  public.inventario_registro,
  public.registro_acceso,
  public.auditoria_administrativa
to retail_api;
grant update on table
  public.persona,
  public.usuario,
  public.usuario_local_asignacion,
  public.producto_cliente,
  public.producto_homologado,
  public.producto_imagen
to retail_api;
grant delete on table public.usuario_local_asignacion to retail_api;
grant usage, select on all sequences in schema public to retail_api;

comment on function public.autenticar_usuario(uuid) is
  'Bootstrap mínimo de identidad posterior a validar el JWT; no depende de app.usuario_id.';
comment on function public.actualizar_unidades_articulo_seguro(uuid, numeric) is
  'Actualiza UxC solo si el artículo pertenece al tenant actual y ninguna otra empresa lo usa.';
comment on function public.actualizar_producto_cadena_seguro(uuid, text, uuid, text, text) is
  'Actualiza identidad de cadena solo si la referencia no está compartida con otra empresa.';

commit;
