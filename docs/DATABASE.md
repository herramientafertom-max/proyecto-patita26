# Base de datos

PostgreSQL/Supabase es la fuente de verdad. El modelo incluye tenants, usuarios, locales, catálogo homologado, stock, inventarios y fotografías.

## Tablas usadas por el incremento

- `usuario`, `persona`: identidad de negocio.
- `usuario_local_asignacion`: alcance operativo del usuario.
- `cadena`, `subcadena`, `local`: jerarquía retail.
- `producto_cliente`, `producto_cadena`, `producto_homologado`, `marca`: catálogo.
- `stock_snapshot`: stock vigente.

## Aislamiento actual

Las consultas de API reciben `tenantId` desde el token y filtran por `empresa_cliente_id`. Los reponedores requieren además asignación al local. El modo productivo deberá usar una cuenta PostgreSQL de privilegios mínimos y RLS corregido como defensa adicional.

## Pendientes

- Vincular cuentas reales mediante `usuario.auth_user_id`.
- Corregir `empresa_cliente_actual()` y políticas que comparan `usuario.id = auth.uid()`.
- Definir políticas de tablas de catálogo.
- Medir consultas definitivas con `EXPLAIN ANALYZE`.
