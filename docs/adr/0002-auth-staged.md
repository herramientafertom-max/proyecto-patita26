# ADR 0002 — Autenticación por etapas

- **Estado:** propuesta implementada solo para desarrollo
- **Contexto:** no existen cuentas en `auth.users` ni contactos confiables para los 117 usuarios.
- **Decisión temporal:** token demo local con contraseña de desarrollo y selección de un Administrador existente.
- **Restricción:** se deshabilita en producción.
- **Decisión pendiente:** Supabase Auth y vinculación mediante `usuario.auth_user_id`.
