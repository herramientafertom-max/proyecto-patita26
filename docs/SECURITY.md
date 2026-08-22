# Seguridad

## Implementado

- Secretos excluidos de Git y del contexto Docker.
- Backend no expuesto directamente en Compose.
- Consultas SQL parametrizadas.
- DTO validation estricta.
- Helmet, CORS configurable y JWT firmado.
- Modo demo rechazado en `NODE_ENV=production`.
- Tenant tomado del token, no del body/query.

## No apto aún para producción

- JWT local demo no reemplaza Supabase Auth.
- La conexión usa credenciales administrativas actuales.
- RLS existente tiene referencias incompatibles con `auth_user_id`.
- No hay rate limiting ni auditoría completa de requests.
- No existen buckets/políticas de Storage.
- No se han realizado pruebas con dos tenants reales.

## Regla de secretos

Nunca registrar ni enviar al frontend contraseñas, JWT completos, cookies, `DATABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY`.
