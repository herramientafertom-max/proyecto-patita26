# Base de datos

PostgreSQL/Supabase es la fuente de verdad. El modelo incluye tenants, usuarios, locales, catálogo homologado, stock, inventarios y fotografías.

## Tablas usadas por el incremento

- `usuario`, `persona`: identidad de negocio. `usuario.auth_user_id` vincula opcionalmente con `auth.users`.
- `usuario_local_asignacion`: alcance operativo del usuario, con días de la semana.
- `cadena`, `subcadena`, `local`: jerarquía retail.
- `producto_cliente`, `producto_cadena`, `producto_homologado`, `marca`: catálogo.
- `producto_imagen`: fotografías maestras de unidad, pack y caja.
- `stock_snapshot`: stock vigente.
- `foto_terreno`: evidencia operativa vinculada a usuario, local, producto y stock observado.
- `auditoria_administrativa`: auditoría append-only de cambios administrativos sensibles (usuarios, asignaciones, vínculos de cuenta).

## Catálogo de productos: dónde vive cada atributo

Para evitar duplicar datos ya normalizados, cada atributo del catálogo se agregó en la entidad cuyo alcance corresponde:

| Atributo | Tabla | Motivo |
|---|---|---|
| EAN unidad/pack, unidades por caja | `articulo` | Ya existían; son propiedades físicas del artículo, no dependen de la cadena ni del cliente. |
| SAP de unidad | `producto_cadena.sap` | Ya existía. |
| SAP de pack | `producto_cadena.sap_pack` | Nuevo. Es un código de la cadena, igual que `sap`. |
| Precio de unidad | `producto_cliente.precio` | Ya existía. |
| Precio de pack | `producto_cliente.precio_pack` | Nuevo. Precio comercial que cada empresa cliente define. |
| Estado activo/bloqueado | `producto_cliente.estado` (`Activo`/`Bloqueado`, restricción ya existente) | Ya existía. Usa `Bloqueado`, no `Inactivo` (distinto de `usuario.estado`). |
| Campaña activa + fechas | `producto_cliente.campana_activa/desde/hasta` | Nuevo. Cada empresa cliente puede tener una campaña distinta sobre el mismo producto. |
| Quiebre | `producto_cliente.quiebre_activo/declarado_en/declarado_por` | Nuevo. Ver decisión de diseño abajo. |
| Imagen de unidad/pack/caja | `producto_imagen` (`tipo` ahora admite `unidad`, `pack`, `caja`) | Ya existía la tabla; se amplió el dominio de `tipo`. |

### Decisión: quiebre en `producto_cliente`, no en `producto_cadena` ni `articulo`

El quiebre es una **declaración administrativa** (Administrador/Supervisor marca manualmente que un producto no está disponible), no una lectura de inventario ni un atributo físico del artículo. Por eso vive junto a `estado` y `precio`, que ya son atributos por empresa cliente en `producto_cliente`. No sustituye a `stock_snapshot`, que sigue siendo la fuente de stock real capturado.

La propagación masiva de quiebre por EAN **sí está implementada** (`PATCH /products/:id/quiebre` con `propagarPorEan: true`): reutiliza `producto_cadena.articulo_id → articulo.ean_unidad`, con el mismo candado del legacy AAF 01.428 (EAN de al menos 8 dígitos), y queda estrictamente acotada al tenant del actor (nunca cruza empresas aunque el `articulo` sea compartido).

### Unicidad de EAN de pack (migración 009)

`articulo.ean_unidad` ya tenía una restricción única; `articulo.ean_pack` no la tenía. Se agregó `articulo_ean_pack_key` (índice único parcial, ignora `NULL`) para que un EAN de pack duplicado también sea rechazado como conflicto (`409`), igual que el de unidad.

## Auditoría administrativa

`auditoria_administrativa` registra creación, edición, cambio de RUT, cambio de perfil, cambio de asignaciones, activación/desactivación y vínculo/desvínculo de cuenta Auth. Es append-only: un trigger `BEFORE UPDATE OR DELETE` bloquea cualquier modificación posterior, sin importar el rol que la ejecute. Solo un Administrador puede leer la auditoría de su propia empresa.

## Identidad y RLS

Tres funciones `SECURITY DEFINER` con `search_path` fijo resuelven la identidad a partir de `app.usuario_id`, configurado por NestJS mediante `set_config` y limitado a la transacción, exigiendo que el usuario y su empresa estén `Activo`:

- `usuario_actual()` → `usuario.id`
- `empresa_cliente_actual()` → `usuario.empresa_cliente_id`
- `perfil_actual()` → `usuario.perfil`

Las políticas usan estas funciones, por lo que la identidad no depende de claims de PostgREST. Las tablas de catálogo compartido entre empresas (`cadena`, `subcadena`, `local`, `articulo`, `proveedor`, `marca`, `seccion`, `producto_cadena`) tienen lectura para usuarios autenticados. `persona` solo es visible si existe un `usuario` de la misma empresa vinculado a ese RUT. `registro_error` se deja deliberadamente sin políticas (log técnico global, sin tenant).

RLS es una defensa adicional: el backend **siempre** filtra por el `tenantId` resuelto desde el JWT verificado, sin depender exclusivamente de RLS.

## Pendientes

- Ejecutar las migraciones 006-011 contra Supabase (no se ejecutan automáticamente; ver reglas del incremento).
- Medir consultas definitivas con `EXPLAIN ANALYZE`.
- Provisionar cuentas nuevas en Supabase Auth (invitaciones por correo): no implementado; el backend solo permite vincular un `auth_user_id` ya existente.
- Configurar `SUPABASE_SERVICE_ROLE_KEY` en el backend y aplicar la migración 010 para crear los buckets privados antes de habilitar cargas.
