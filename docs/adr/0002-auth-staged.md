# ADR 0002 — Autenticación por etapas

- **Estado:** implementado (backend). Verificación productiva con Supabase Auth y modo demo local conviven; falta el flujo de invitación/creación de cuentas nuevas y las pruebas con tenants reales en producción.
- **Contexto:** no existían cuentas en `auth.users` ni contactos confiables para los 117 usuarios heredados.
- **Decisión:** el backend valida Bearer tokens de dos orígenes posibles:
  1. **Supabase Auth** (productivo): verificación criptográfica de firma, `exp`, `iss` y `aud` vía `jose`, usando `SUPABASE_JWT_SECRET` (HS256, proyectos legacy) o el JWKS de `SUPABASE_URL` (asimétrico). El usuario de negocio se resuelve en PostgreSQL por `usuario.auth_user_id = sub`, exigiendo `usuario.estado = 'Activo'` y `empresa_cliente.estado = 'Activo'`.
  2. **Token demo local** (solo desarrollo): mantiene el contrato HTTP, está deshabilitado
     automáticamente en `NODE_ENV=production` y cuando `ENABLE_DEMO_AUTH=false`. Cada perfil se
     vincula a un `DEMO_AUTH_USER_ID_*` explícito y se resuelve mediante
     `autenticar_usuario(uuid)`; no selecciona usuarios mediante una lectura directa previa a RLS.
- **Restricción:** ningún dato de rol o tenant se confía desde el token o el cliente; siempre se resuelve desde PostgreSQL.
- **Pendiente:** administración de usuarios permite vincular (`usuario.auth_user_id`) una cuenta de Supabase Auth **ya existente**, pero no crea/invita cuentas nuevas (requeriría la Admin API de Supabase con `service_role`, fuera de alcance de este incremento).
