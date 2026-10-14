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
4. Provisionar el rol PostgreSQL restringido `retail_api` antes de aplicar la migración 012.
5. Aplicar las migraciones hasta `012_retail_api_rls_seguro.sql`; la migración verifica los atributos del rol y concede permisos mínimos.
6. Mantener `DATABASE_SSL_REJECT_UNAUTHORIZED=true` y proveer una CA válida cuando el proveedor no use una cadena pública.
7. Configurar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` solo en el backend para fotografías. Nunca usar el prefijo `VITE_`, exponer esa clave al navegador ni registrarla en Git.
8. Configurar TLS, dominio, backups, logs y rollback.
9. Ejecutar CI y pruebas de aislamiento.

El rol de producción se provisiona fuera del repositorio y debe cumplir, como mínimo:

```sql
create role retail_api login nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
```

Configura su contraseña mediante el gestor de secretos. No concedas permisos amplios manualmente:
la migración 012 define los permisos de tablas, secuencias y funciones que necesita la API y
rechaza un rol con atributos inseguros. Usa su `DATABASE_URL` solo después de aplicar 012 y
ejecutar la suite de aislamiento en un entorno de integración. El rol no debe pertenecer a otros
roles ni ser dueño de tablas o del esquema `public`.

En desarrollo, si `ENABLE_DEMO_AUTH=true`, configura únicamente los perfiles que se quieran
exponer con `DEMO_AUTH_USER_ID_ADMINISTRADOR`, `DEMO_AUTH_USER_ID_SUPERVISOR`,
`DEMO_AUTH_USER_ID_REPONEDOR` y `DEMO_AUTH_USER_ID_REPONEDOR_EXTERNO`. Cada valor debe ser el UUID
de una identidad local vinculada y activa; la ausencia de un valor hace que ese perfil demo falle
de forma cerrada.

Las imágenes no dependen de un proveedor de hosting específico.
