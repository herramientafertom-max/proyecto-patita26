# Roadmap recomendado — Fase 1

El roadmap no contiene fechas ni compromisos comerciales. Cada incremento debe ejecutarse en rama/worktree aislado, revisarse y probarse de forma independiente. La Etapa 4 comienza solo tras aprobación del progenitor.

## Principios de orden

1. Seguridad e integridad antes que nuevas pantallas.
2. Resolver dependencias reales: identidad → RLS → consultas/escrituras → paridad operativa.
3. No conectar producción para compensar la falta de un entorno reproducible.
4. Conservar el monolito modular y la API como frontera de negocio.
5. Separar paridad heredada de automatización futura.

## Incremento 0 — Cierre del alcance y banco de pruebas

**Estado al 2026-10-14:** implementado y validado en PostgreSQL 16 local; pendiente de repetir en PostgreSQL 17.

**Prioridad:** P0
**Objetivo:** convertir la auditoría en una especificación ejecutable y reproducible.

Incluye:

- aprobar la fuente canónica: AAF 01.428, MVP público actual o corte acordado;
- confirmar matriz de roles, GPS, reportes, productos sin venta y cargas Excel;
- inventariar migraciones realmente aplicadas sin modificarlas;
- crear un baseline de esquema para una PostgreSQL local desechable;
- preparar fixtures sintéticos de al menos dos tenants, cuatro roles y datos compartidos;
- agregar ejecución de integración separada de unit tests.

**Salida verificable:** una base local se crea desde cero, aplica migraciones y ejecuta pruebas sin datos reales.

## Incremento 1 — Fundación segura de identidad y RLS

**Estado al 2026-10-14:** implementado y validado localmente (100/100 pruebas); no desplegado.

**Prioridad:** P0
**Objetivo:** hacer operativa y demostrable la frontera backend con `retail_api` sin `BYPASSRLS`.

Incluye:

- mecanismo mínimo de bootstrap por `auth_user_id` verificado;
- políticas explícitas compatibles con `retail_api` para lectura/escritura necesarias;
- corrección de grants y propiedad de funciones;
- regla segura para mutaciones de `articulo`/catálogo compartido;
- pruebas negativas de lectura, inferencia y escritura cruzada entre tenants;
- pruebas de Admin/Supervisor/Reponedor/Reponedor Externo;
- verificación de `SET LOCAL`/rollback y pool sin fuga de contexto.

**No incluye:** habilitar credenciales productivas ni aplicar migraciones reales.

**Salida verificable:** suite de integración verde usando un rol local `NOBYPASSRLS`; tenant A no puede observar ni alterar tenant B.

## Incremento 2 — Autenticación productiva y operación base confiable

**Prioridad:** P1
**Dependencia:** Incremento 1.

Incluye:

- login/sesión/logout/expiración Supabase Auth en frontend;
- provisión o invitación de cuentas desde backend con auditoría;
- recuperación/activación según datos de contacto aprobados;
- eliminación total del camino demo en builds productivos;
- paginación completa de locales, usuarios y productos;
- corrección del stock/fecha reutilizado en fotografías;
- pruebas de navegación y visibilidad por rol.

**Salida verificable:** dos cuentas de prueba de tenants distintos inician sesión y solo ven su información permitida.

## Incremento 3 — Inventario y sugeridos

**Prioridad:** P1
**Dependencia:** Incrementos 1–2.

Incluye:

- separar o tipar claramente conteo y sugerido según regla aprobada;
- upsert idempotente diario por actor/local/producto/tipo;
- unidades, cajas, UxC, stock y fecha sistémica;
- consulta administrativa con filtros y paginación;
- UI móvil accesible y confirmación de envío;
- auditoría y pruebas de concurrencia/reintentos;
- exportación CSV si se confirma como paridad.

**Salida verificable:** crear, actualizar y consultar el registro diario sin duplicados ni cruce de tenant.

## Incremento 4 — Fotografías y evidencia de terreno robustas

**Prioridad:** P1/P2
**Dependencia:** Incremento 2.

Incluye:

- alinear Nginx y backend a 8 MiB;
- compensación de objetos si falla PostgreSQL;
- eliminación segura del objeto reemplazado y conciliación de huérfanos;
- prueba de buckets privados y URLs firmadas temporales;
- GPS/distancia si se confirma como requisito;
- galería administrativa con filtros y exportación aprobada;
- migración/continuidad de referencias legacy.

**Salida verificable:** pruebas de 1 MiB, 8 MiB y >8 MiB; fallo SQL no deja objeto; tenant cruzado recibe rechazo.

## Incremento 5 — Estadísticas, auditoría consultable y reportes

**Prioridad:** P2, con elementos P1 si el cliente los declara críticos.

Incluye:

- registro fiable de actividad/acceso;
- estadísticas por usuario, día y semana con zona `America/Santiago`;
- endpoint/UI de auditoría administrativa paginada;
- cobertura de precio, campaña, homologación, fotos, inventarios y permisos;
- reportes CSV/ZIP/correo únicamente según alcance confirmado.

**Salida verificable:** los cálculos sobre fixtures coinciden con casos heredados y no exponen datos personales de otro tenant.

## Incremento 6 — Carga operativa de stock y ventas

**Prioridad:** P1 si el MVP público es el corte canónico; en otro caso P2/P3.

Incluye:

- plantillas/formato versionado por retailer;
- carga idempotente con previsualización, validación y reporte de errores;
- homologación explícita de códigos desconocidos;
- stock actual + historial sin pérdida de capturas;
- carga de ventas requerida por “productos sin venta”;
- rollback lógico del lote y trazabilidad por archivo/fila/hash.

**Salida verificable:** reimportar el mismo lote no duplica; un lote inválido no deja escrituras parciales.

## Incremento 7 — Productos sin venta y cierre de paridad

**Prioridad:** condicionada al alcance.

Incluye:

- regla aprobada de días sin venta, stock de referencia y ventanas;
- filtros por retailer/cadena/local/marca/producto/reponedor;
- exportación aprobada;
- recorrido completo de la matriz y pruebas de regresión;
- UAT con progenitor/cliente y registro de desviaciones aceptadas.

**Salida verificable:** cada requisito de la matriz queda IMPLEMENTADO/VALIDADO o excluido formalmente.

## Incremento 8 — Automatización y estabilización productiva

**Prioridad:** P3 después de paridad manual.

Incluye, solo con autorización específica:

- descarga programada desde portales permitidos;
- secretos, backups, rollback, observabilidad y alertas;
- política de retención aprobada;
- despliegue controlado y prueba de restauración.

No se introducen colas, Redis o microservicios salvo evidencia medible.

## Primer incremento recomendado

Recomiendo aprobar primero **Incrementos 0 y 1 como paquete de fundación segura**. Implementar inventario o Auth frontend antes de arreglar RLS produciría funciones que pasan unit tests pero fallan —o requieren privilegios excesivos— en el entorno real.

## Puertas de calidad por incremento

- criterios de aceptación enlazados y revisados;
- TypeScript, lint no mutativo, unit tests e integración;
- pruebas negativas de permisos/multiempresa;
- build frontend/backend y configuración Compose;
- revisión de migraciones y rollback cuando aplique;
- documentación/bitácora actualizadas;
- sin push, merge, producción ni migración real sin autorización.
