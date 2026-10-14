# Seguridad

## Implementado

- Secretos excluidos de Git y del contexto Docker.
- Backend no expuesto directamente en Compose.
- Consultas SQL parametrizadas.
- DTO validation estricta.
- Helmet, CORS configurable y JWT firmado.
- Modo demo rechazado en `NODE_ENV=production`.
- Modo demo local vinculado por perfil a UUID explícitos (`DEMO_AUTH_USER_ID_*`) y resuelto con
  `autenticar_usuario`; no consulta tablas RLS sin identidad ni elige arbitrariamente el primer usuario.
- Tenant, usuario y rol resueltos desde PostgreSQL a partir de la identidad verificada del token (nunca desde el body/query del cliente).
- Verificación criptográfica de tokens de Supabase Auth (firma, `exp`, `iss`, `aud`), con `AuthGuard`/`RolesGuard` devolviendo `401`/`403` según corresponda.
- RLS recibe `usuario.id` desde `set_config('app.usuario_id', ..., true)` local a cada transacción autenticada; las funciones `SECURITY DEFINER` con `search_path` fijo resuelven usuario, empresa y perfil. El backend también filtra explícitamente por tenant.
- El bootstrap `autenticar_usuario(auth_user_id)` se ejecuta después de validar criptográficamente el JWT y antes de crear el contexto RLS; solo devuelve una identidad activa y su ejecución está limitada a `retail_api`.
- `retail_api` no puede actualizar directamente `articulo` ni `producto_cadena`. Las mutaciones necesarias usan funciones estrechas que rechazan filas compartidas con otra empresa.
- `retail_api` se valida sin replicación, membresías ni propiedad del esquema/tablas; la migración
  revoca privilegios residuales de tablas, secuencias y esquema antes de conceder el contrato mínimo.
- Todas las tablas con RLS activado tienen ahora al menos una política explícita (o una decisión documentada de dejarlas sin políticas, como `registro_error`).
- Auditoría append-only (`auditoria_administrativa`) de altas, ediciones, cambios de RUT/perfil/estado, asignaciones y vínculos de cuenta Auth, con trigger que bloquea `UPDATE`/`DELETE` a nivel de motor.
- Validación de RUT con dígito verificador real (módulo 11), sin eliminar la letra `K` al normalizar.
- Baja lógica de usuarios (`estado = 'Inactivo'`); no existe eliminación física por API.
- Las credenciales de Storage solo existen en backend; fotografías validan firma binaria, tipo permitido y máximo de 8 MB.
- El token de acceso vive solo en memoria del navegador y se elimina automáticamente tras un `401`.
- TLS de PostgreSQL valida certificados por defecto (`DATABASE_SSL_REJECT_UNAUTHORIZED=true`).

## No apto aún para producción

- El despliegue productivo todavía debe provisionar `retail_api` antes de la migración 012 y validar sus atributos; la configuración solo fue ejecutada en integración local.
- No hay rate limiting ni auditoría completa de todos los requests HTTP (solo de operaciones administrativas sensibles).
- La matriz local cubre dos tenants y cuatro perfiles con el rol restringido, pero no se ha ejecutado con Supabase Auth ni datos reales.
- No hay flujo de invitación/creación de cuentas nuevas en Supabase Auth: solo se puede vincular un `auth_user_id` ya existente.

## Regla de secretos

Nunca registrar ni enviar al frontend contraseñas, JWT completos, cookies, `DATABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY`.
