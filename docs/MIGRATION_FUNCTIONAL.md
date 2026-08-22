# Paridad funcional

| Funcionalidad MVP | Nueva implementación | Estado |
|---|---|---|
| Estado API | Health endpoint | Implementado |
| Login por RUT | Acceso demo local; Auth real pendiente | Parcial |
| Tenant/rol | Claims firmados y filtros backend | Parcial, falta Auth/RLS productivo |
| Listar locales | API + pantalla responsive | Implementado |
| Productos por local | JOIN normalizado + búsqueda/paginación | Implementado |
| Stock vigente | `stock_snapshot` más reciente | Implementado |
| Historial de stock | API y panel de últimos 30 días | Implementado |
| Inventario/sugerido | Datos migrados, escritura pendiente | Pendiente |
| Fotos terreno/producto | Metadatos migrados, Storage pendiente | Pendiente |
| Usuarios/admin | Datos migrados, UI/API pendiente | Pendiente |
| Estadísticas | Datos migrados, endpoint pendiente | Pendiente |
| Job diario | No implementado | Pendiente |

El incremento actual permite validar arquitectura, conectividad, aislamiento de consultas, locales, catálogo y stock sin depender de Google Sheets.
