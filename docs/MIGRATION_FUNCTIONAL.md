# Paridad funcional

| Funcionalidad MVP | Nueva implementación | Estado |
|---|---|---|
| Estado API | Health endpoint | Implementado |
| Login por RUT | Acceso demo local + verificación productiva de tokens Supabase Auth | Implementado (backend); falta invitación/creación de cuentas nuevas |
| Tenant/rol | Resueltos en PostgreSQL desde la identidad verificada; RLS recibe la identidad desde una transacción backend | Implementado; requiere rol PostgreSQL sin `BYPASSRLS` en producción |
| Listar locales | API + pantalla responsive | Implementado |
| Productos por local | JOIN normalizado + búsqueda/paginación | Implementado |
| Stock vigente | `stock_snapshot` más reciente | Implementado |
| Historial de stock | API y panel de últimos 30 días | Implementado |
| Inventario/sugerido | Datos migrados, escritura pendiente | Pendiente |
| Fotos terreno/producto | Carga privada, validación binaria y URLs firmadas | Implementado; requiere migración 010 y credenciales de Storage |
| Usuarios/admin | API + UI de administración (crear, editar, RUT, perfil, estado, asignaciones, vínculo Auth) con auditoría | Implementado |
| Editor de productos (Maestra de Productos) | API + UI: crear, editar, clonar, activar/bloquear, campaña, con find-or-create de marca/sección/proveedor | Implementado |
| Quiebre de producto (candado por EAN) | API + UI: declarar/revertir individual o propagado por EAN, con auditoría (motivo, propagado, EAN usado) | Implementado |
| Estadísticas | Datos migrados, endpoint pendiente | Pendiente |
| Job diario | No implementado | Pendiente |

El incremento actual permite validar arquitectura, conectividad, aislamiento de consultas, locales, catálogo y stock sin depender de Google Sheets.
