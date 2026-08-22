# Hito 2 — Auditoría de Supabase

Fecha: 22 de agosto de 2026.

Esta fase fue ejecutada en modo de solo lectura después de recibir las nuevas instrucciones. No se reimportaron ni modificaron datos.

## 1. Resumen del esquema

El esquema `public` contiene 22 tablas normalizadas. Todas tienen RLS activado. Existe además el esquema privado `migracion_auditoria`, con dos lotes completados y trazabilidad de 187.619 filas de origen.

| Área | Tablas principales | Relaciones clave |
|---|---|---|
| Tenant | `empresa_cliente`, `carpeta_almacenamiento` | Carpetas pertenecen a empresa |
| Identidad | `persona`, `usuario`, `usuario_local_asignacion` | Persona → usuario por tenant → locales |
| Retail | `cadena`, `subcadena`, `local` | Cadena → subcadena → local |
| Catálogo | `proveedor`, `marca`, `seccion`, `articulo`, `producto_cadena`, `producto_homologado`, `producto_cliente`, `producto_imagen` | Artículo y texto de cadena → homologación → producto del tenant |
| Operación | `stock_snapshot`, `stock_historial`, `inventario_registro`, `foto_terreno` | Tenant + local + producto; usuario cuando existe |
| Observabilidad | `registro_acceso`, `registro_error` | Accesos por tenant; errores globales |

No hay vistas de negocio. La única función pública propia es `empresa_cliente_actual()`. No existen buckets de Supabase Storage.

## 2. Correspondencia MVP ↔ Supabase

| Concepto del MVP | Tabla/relación Supabase | Estado |
|---|---|---|
| Cliente y activación | `empresa_cliente` | Cubierto |
| IDs de carpetas | `carpeta_almacenamiento` | Cubierto como referencia legacy |
| RUT, nombre, teléfono | `persona` | Cubierto |
| Usuario, rol, estado | `usuario` | Datos cubiertos; autenticación pendiente |
| Ruta y días asignados | `usuario_local_asignacion` | Cubierto |
| Cadena/subcadena/local | `cadena` → `subcadena` → `local` | Cubierto |
| SAP por cadena | `producto_cadena` | Cubierto |
| EAN y unidades/caja | `articulo` | Cubierto |
| Marca/sección/nombre homologado | `marca`, `seccion`, `producto_homologado` | Cubierto |
| Precio/estado por cliente | `producto_cliente` | Cubierto |
| Fotos unidad/caja | `producto_imagen` | Metadatos cubiertos; storage pendiente |
| Stock actual | `stock_snapshot` | Cubierto |
| Historial stock | `stock_historial` | Cubierto; múltiples capturas diarias permitidas |
| Conteo/sugerido | `inventario_registro` | Cubierto |
| Foto de terreno | `foto_terreno` | Metadatos cubiertos; storage pendiente |
| Accesos/estadísticas | `registro_acceso` | Cubierto |
| Errores | `registro_error` | Cubierto |
| Selección tenant actual | `empresa_cliente_actual()` | Defectuoso con el modelo actual de Auth |
| Importación diaria desde portales | No existe módulo/tabla de ingestión | Faltante funcional, no necesariamente tabla |
| Jobs/retención | No existe scheduler definido | Faltante |

## 3. Integridad y volúmenes

| Métrica | Resultado |
|---|---:|
| Empresas | 1 |
| Personas | 117 |
| Usuarios | 117 |
| Usuarios vinculados a Supabase Auth | 0 |
| Locales | 1.338 |
| Productos cliente | 1.588 |
| Productos bloqueados | 1.402 |
| Productos heredados sin artículo | 528 |
| Stock vigente | 11.927 |
| Historial de stock | 169.922 |
| Inventarios | 1.189 |
| Fotos terreno | 1.220 |
| Accesos | 774 |
| Relaciones huérfanas en stock | 0 |
| Registros de inventario sin usuario vigente | 1.003 |
| Fotos sin usuario vigente | 813 |
| Accesos sin usuario vigente | 131 |
| Buckets Storage | 0 |

Los usuarios históricos ausentes de la maestra conservan nombre/perfil de origen. Esto es correcto para auditoría, pero deben tratarse como actores eliminados, no como cuentas habilitadas.

La simulación contabilizó 71 solicitudes de creación de local heredado, que se deduplicaron en 63 locales distintos. El valor operativo correcto es 63.

## 4. PK, FK y restricciones relevantes

- Las entidades usan UUID, excepto `persona.rut`.
- Unicidad por nombre en cadenas, secciones y proveedores.
- Unicidad de local por `codigo_local`.
- Unicidad de producto por `(cadena_id, sap)`.
- Unicidad de producto cliente por `(empresa_cliente_id, producto_cadena_id)`.
- Unicidad de asignación por `(usuario_id, local_id)`.
- Stock vigente único por `(local_id, producto_cliente_id, fecha)`.
- Historial admite varias capturas para esa misma combinación.
- Los eventos operativos tienen FK a tenant, local y producto; usuario puede ser nulo para historia heredada.
- `usuario.auth_user_id` es opcional y referencia `auth.users`.

El inventario completo de columnas, restricciones e índices está en `auditoria/`.

## 5. Hallazgos críticos de autenticación y RLS

### 5.1 Autenticación no operativa

`auth.users` está vacío y ningún `usuario.auth_user_id` está vinculado. Los 117 usuarios son perfiles de negocio, no cuentas autenticables.

### 5.2 Función de tenant incompatible

La función actual ejecuta:

```sql
select empresa_cliente_id
from usuario
where id = auth.uid();
```

El modelo vigente separa `usuario.id` de `usuario.auth_user_id`. La función debería buscar por `auth_user_id`, pero no debe cambiarse hasta aprobar la estrategia de autenticación.

### 5.3 Políticas que repiten la relación antigua

Varias políticas consultan `usuario.id = auth.uid()`. Por lo tanto, incluso después de crear cuentas, los permisos por rol no funcionarán correctamente mientras no se adapten a `auth_user_id`.

### 5.4 Tablas con RLS pero sin políticas

`cadena`, `subcadena`, `local`, `articulo`, `proveedor`, `marca`, `seccion`, `producto_cadena`, `persona`, `producto_imagen` y `registro_error`, entre otras, no tienen políticas de acceso aplicables. Un cliente directo autenticado no podrá leerlas; usar `service_role` desde el frontend sería inaceptable.

### 5.5 Validación tenant incompleta en escrituras

Las políticas de inserción de inventario y fotos comprueban `empresa_cliente_id`, pero no garantizan que `producto_cliente_id` y `usuario_id` pertenezcan al mismo tenant. Debe validarse en backend y, cuando convenga, reforzarse con funciones/políticas o constraints compuestos.

### 5.6 Storage inexistente

No hay buckets ni políticas de objetos. Los enlaces migrados apuntan al almacenamiento legacy; la nueva subida de fotografías aún no tiene destino Supabase.

## 6. Problemas y faltantes

### Bloqueantes antes del desarrollo funcional

1. Aprobar estrategia de autenticación y vinculación de usuarios.
2. Corregir función tenant y políticas que usan `id = auth.uid()`.
3. Definir si el backend será la única frontera de acceso o si el frontend consultará Supabase bajo RLS.
4. Diseñar buckets y políticas de imágenes.
5. Definir permisos exactos por rol.

### Importantes

- Índices específicos para listados por tenant/fecha y fotos por local/producto/fecha.
- Búsqueda textual/paginación de productos.
- Estrategia de usuarios, productos y locales heredados/bloqueados.
- Política de retención del historial.
- Job diario de ingestión y homologación.

### No se justifica crear todavía

- Microservicios.
- Cola distribuida.
- Caché Redis.
- Particionamiento inmediato del historial.
- Tablas adicionales sin caso funcional aprobado.

## 7. Consultas críticas a reconstruir

1. Resolver tenant a partir de la identidad autenticada.
2. Listar locales asignados al usuario para el día solicitado.
3. Listar productos y stock vigente de un local con paginación.
4. Consultar historial de stock por local/producto/período.
5. Registrar conteo/sugerido con idempotencia diaria.
6. Crear y consultar fotos de terreno con ventana temporal.
7. Administrar usuarios y asignaciones dentro del tenant.
8. Editar precio, estado e imágenes de producto con autorización.
9. Calcular actividad por usuario y período.
10. Importar stock diario y producir un reporte de homologación/errores.

Antes de añadir índices se deben capturar consultas definitivas y medirlas con `EXPLAIN (ANALYZE, BUFFERS)` en un entorno controlado.

## 8. Evaluación de capacidad

El volumen actual es pequeño para PostgreSQL: ~170 mil filas históricas y ~12 mil snapshots. Una API stateless con consultas indexadas y paginación soporta razonablemente 1.000 usuarios previstos sin microservicios. El riesgo principal no es capacidad bruta, sino autenticación, aislamiento tenant, ingestión diaria y calidad de consultas.

## 9. Conclusión

El modelo normalizado contiene la información necesaria para reconstruir las funciones principales. No se requieren nuevas tablas para iniciar el backend mínimo. Sí se necesita corregir la capa de identidad/RLS tras aprobar autenticación, y diseñar Storage e ingestión. La implementación no debe comenzar hasta aprobar el Hito 3.
