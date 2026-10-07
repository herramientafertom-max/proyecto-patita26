begin;

-- Funciones auxiliares de identidad. SECURITY DEFINER con search_path fijo para evitar
-- manipulación por objetos con el mismo nombre en otros esquemas. Corrigen el defecto
-- documentado en docs/HITO_2_AUDITORIA_SUPABASE.md (5.2): la función y las políticas
-- comparaban usuario.id con auth.uid(), pero auth.uid() identifica la cuenta de
-- Supabase Auth (usuario.auth_user_id), no la fila de negocio (usuario.id).
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
  where u.auth_user_id = auth.uid()
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
  where u.auth_user_id = auth.uid()
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
  where u.auth_user_id = auth.uid()
    and u.estado = 'Activo'
    and ec.estado = 'Activo'
  limit 1
$$;

revoke all on function public.usuario_actual() from public;
revoke all on function public.empresa_cliente_actual() from public;
revoke all on function public.perfil_actual() from public;
grant execute on function public.usuario_actual() to authenticated, service_role;
grant execute on function public.empresa_cliente_actual() to authenticated, service_role;
grant execute on function public.perfil_actual() to authenticated, service_role;

comment on function public.usuario_actual() is
  'Resuelve el usuario de negocio (usuario.id) a partir de auth.uid(), exigiendo usuario y empresa activos.';
comment on function public.empresa_cliente_actual() is
  'Resuelve la empresa cliente actual a partir de auth.uid(), exigiendo usuario y empresa activos.';
comment on function public.perfil_actual() is
  'Resuelve el perfil del usuario actual a partir de auth.uid(), exigiendo usuario y empresa activos.';

-- Reescritura de políticas que usaban usuario.id = auth.uid().

drop policy if exists carpeta_almacenamiento_select on public.carpeta_almacenamiento;
create policy carpeta_almacenamiento_select on public.carpeta_almacenamiento
  for select
  using (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = 'Administrador'
  );

drop policy if exists registro_acceso_select on public.registro_acceso;
create policy registro_acceso_select on public.registro_acceso
  for select
  using (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = 'Administrador'
  );

drop policy if exists usuario_insert on public.usuario;
create policy usuario_insert on public.usuario
  for insert
  with check (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = 'Administrador'
  );

drop policy if exists usuario_update on public.usuario;
create policy usuario_update on public.usuario
  for update
  using (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = 'Administrador'
  )
  with check (empresa_cliente_id = public.empresa_cliente_actual());

drop policy if exists usuario_local_asignacion_write on public.usuario_local_asignacion;
create policy usuario_local_asignacion_write on public.usuario_local_asignacion
  for all
  using (
    usuario_id in (
      select id from public.usuario where empresa_cliente_id = public.empresa_cliente_actual()
    )
    and public.perfil_actual() = 'Administrador'
  )
  with check (
    usuario_id in (
      select id from public.usuario where empresa_cliente_id = public.empresa_cliente_actual()
    )
  );

drop policy if exists producto_cliente_write on public.producto_cliente;
create policy producto_cliente_write on public.producto_cliente
  for all
  using (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = any (array['Administrador', 'Supervisor'])
  )
  with check (empresa_cliente_id = public.empresa_cliente_actual());

drop policy if exists producto_homologado_write on public.producto_homologado;
create policy producto_homologado_write on public.producto_homologado
  for all
  using (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = any (array['Administrador', 'Supervisor'])
  )
  with check (empresa_cliente_id = public.empresa_cliente_actual());

-- Políticas nuevas para tablas con RLS activado pero sin ninguna política (Hito 2, 5.4).
-- Datos de catálogo compartido entre empresas (no tienen empresa_cliente_id propio):
-- lectura abierta a cualquier usuario autenticado, igual que ya las consulta el backend
-- sin filtro de tenant en stores.service.ts. La escritura queda reservada al backend
-- (sin política de escritura, por lo que INSERT/UPDATE/DELETE quedan denegados a anon y
-- authenticated; solo un rol con bypass de RLS puede escribir).
drop policy if exists cadena_select on public.cadena;
create policy cadena_select on public.cadena for select to authenticated using (true);

drop policy if exists subcadena_select on public.subcadena;
create policy subcadena_select on public.subcadena for select to authenticated using (true);

drop policy if exists local_select on public.local;
create policy local_select on public.local for select to authenticated using (true);

drop policy if exists articulo_select on public.articulo;
create policy articulo_select on public.articulo for select to authenticated using (true);

drop policy if exists proveedor_select on public.proveedor;
create policy proveedor_select on public.proveedor for select to authenticated using (true);

drop policy if exists marca_select on public.marca;
create policy marca_select on public.marca for select to authenticated using (true);

drop policy if exists seccion_select on public.seccion;
create policy seccion_select on public.seccion for select to authenticated using (true);

drop policy if exists producto_cadena_select on public.producto_cadena;
create policy producto_cadena_select on public.producto_cadena for select to authenticated using (true);

-- persona contiene datos personales (RUT, nombre, teléfono): visible solo si existe un
-- usuario de la propia empresa vinculado a ese RUT.
drop policy if exists persona_select on public.persona;
create policy persona_select on public.persona
  for select
  using (
    exists (
      select 1 from public.usuario u
      where u.persona_rut = persona.rut
        and u.empresa_cliente_id = public.empresa_cliente_actual()
    )
  );

-- producto_imagen sigue el mismo patrón que producto_cliente/producto_homologado.
drop policy if exists producto_imagen_select on public.producto_imagen;
create policy producto_imagen_select on public.producto_imagen
  for select
  using (empresa_cliente_id = public.empresa_cliente_actual());

drop policy if exists producto_imagen_write on public.producto_imagen;
create policy producto_imagen_write on public.producto_imagen
  for all
  using (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = any (array['Administrador', 'Supervisor'])
  )
  with check (empresa_cliente_id = public.empresa_cliente_actual());

-- registro_error es un log técnico global sin tenant asociado: se deja deliberadamente
-- sin políticas, de modo que solo una conexión con bypass de RLS (el backend) pueda
-- leerlo o escribirlo.

-- Políticas de la auditoría administrativa creada en 007.
drop policy if exists auditoria_administrativa_select on public.auditoria_administrativa;
create policy auditoria_administrativa_select on public.auditoria_administrativa
  for select
  using (
    empresa_cliente_id = public.empresa_cliente_actual()
    and public.perfil_actual() = 'Administrador'
  );

drop policy if exists auditoria_administrativa_insert on public.auditoria_administrativa;
create policy auditoria_administrativa_insert on public.auditoria_administrativa
  for insert
  with check (empresa_cliente_id = public.empresa_cliente_actual());

commit;
