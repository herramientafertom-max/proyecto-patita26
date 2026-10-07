# Despliegue

## Desarrollo Docker

```bash
./scripts/docker-up-local.sh
```

Servicios:

- `frontend`: Nginx, puerto host 8080.
- `backend`: NestJS, red interna, healthcheck en `/api/v1/health`.

## Producción

Antes de producción:

1. Desactivar demo auth.
2. Configurar Supabase Auth real.
3. Usar secretos administrados y rotar credenciales actuales.
4. Aplicar las migraciones hasta `011_rls_contexto_backend.sql`.
5. Usar un rol PostgreSQL exclusivo de la API: sin propiedad de tablas ni `BYPASSRLS`, con permisos mínimos y `DATABASE_URL` exclusivo para ese rol.
6. Mantener `DATABASE_SSL_REJECT_UNAUTHORIZED=true` y proveer una CA válida cuando el proveedor no use una cadena pública.
7. Configurar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` solo en el backend para fotografías. Nunca usar el prefijo `VITE_`, exponer esa clave al navegador ni registrarla en Git.
8. Configurar TLS, dominio, backups, logs y rollback.
9. Ejecutar CI y pruebas de aislamiento.

El rol de producción se provisiona fuera del repositorio y debe cumplir, como mínimo:

```sql
create role retail_api login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
grant usage on schema public to retail_api;
grant select, insert, update, delete on all tables in schema public to retail_api;
grant usage, select on all sequences in schema public to retail_api;
grant execute on function public.sesion_usuario_id() to retail_api;
grant execute on function public.usuario_actual() to retail_api;
grant execute on function public.empresa_cliente_actual() to retail_api;
grant execute on function public.perfil_actual() to retail_api;
```

Configura su contraseña en el gestor de secretos y úsala en `DATABASE_URL` solo después de desplegar el backend con la migración 011 aplicada. El rol no debe ser dueño de tablas.

Las imágenes no dependen de un proveedor de hosting específico.
