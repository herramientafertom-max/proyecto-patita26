# Seguridad

## Implementado

- Secretos excluidos de Git y del contexto Docker.
- Backend no expuesto directamente en Compose.
- Consultas SQL parametrizadas.
- DTO validation estricta.
- Helmet, CORS configurable y JWT firmado.
- Modo demo rechazado en `NODE_ENV=production`.
- Tenant, usuario y rol resueltos desde PostgreSQL a partir de la identidad verificada del token (nunca desde el body/query del cliente).
- Verificación criptográfica de tokens de Supabase Auth (firma, `exp`, `iss`, `aud`), con `AuthGuard`/`RolesGuard` devolviendo `401`/`403` según corresponda.
- RLS recibe `usuario.id` desde `set_config('app.usuario_id', ..., true)` local a cada transacción autenticada; las funciones `SECURITY DEFINER` con `search_path` fijo resuelven usuario, empresa y perfil. El backend también filtra explícitamente por tenant.
- Todas las tablas con RLS activado tienen ahora al menos una política explícita (o una decisión documentada de dejarlas sin políticas, como `registro_error`).
- Auditoría append-only (`auditoria_administrativa`) de altas, ediciones, cambios de RUT/perfil/estado, asignaciones y vínculos de cuenta Auth, con trigger que bloquea `UPDATE`/`DELETE` a nivel de motor.
- Validación de RUT con dígito verificador real (módulo 11), sin eliminar la letra `K` al normalizar.
- Baja lógica de usuarios (`estado = 'Inactivo'`); no existe eliminación física por API.
- Las credenciales de Storage solo existen en backend; fotografías validan firma binaria, tipo permitido y máximo de 8 MB.
- El token de acceso vive solo en memoria del navegador y se elimina automáticamente tras un `401`.
- TLS de PostgreSQL valida certificados por defecto (`DATABASE_SSL_REJECT_UNAUTHORIZED=true`).

## No apto aún para producción

- El despliegue debe provisionar un rol PostgreSQL exclusivo de mínimo privilegio, no propietario y sin `BYPASSRLS`; sin él, RLS no es una frontera efectiva frente a una credencial administrativa.
- No hay rate limiting ni auditoría completa de todos los requests HTTP (solo de operaciones administrativas sensibles).
- No se han realizado pruebas de integración con dos tenants reales usando Supabase Auth y el rol PostgreSQL restringido en producción.
- No hay flujo de invitación/creación de cuentas nuevas en Supabase Auth: solo se puede vincular un `auth_user_id` ya existente.

## Regla de secretos

Nunca registrar ni enviar al frontend contraseñas, JWT completos, cookies, `DATABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY`.
