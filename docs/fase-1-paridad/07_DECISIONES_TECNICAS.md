# Decisiones técnicas — Fase 1

Las decisiones de esta página registran la orientación aprobada y sus validaciones. No autorizan
un despliegue ni una migración sobre entornos reales.

## DT-01 — Mantener monolito modular

- **Estado:** vigente.
- **Decisión:** conservar NestJS + React/Vite + PostgreSQL/Supabase + Docker/Nginx.
- **Razón:** volumen y equipo no justifican microservicios; el riesgo actual está en identidad, datos y paridad.
- **Consecuencia:** inventario, estadísticas e importaciones se agregan como módulos del mismo sistema.

## DT-02 — API como frontera de negocio

- **Estado:** vigente.
- **Decisión:** el nuevo frontend no accederá directamente a PostgreSQL, Storage administrativo ni Firestore.
- **Razón:** tenant, permisos, auditoría y transacciones requieren control servidor.
- **Consecuencia:** no se copiará la arquitectura directa a Firestore observada en el MVP público.

## DT-03 — RLS como defensa adicional efectiva

- **Estado:** implementada y validada localmente; pendiente de entorno de integración PostgreSQL 17/Supabase.
- **Decisión:** usar rol `retail_api` de mínimo privilegio, no propietario y `NOBYPASSRLS`.
- **Razón:** evita que una omisión de filtro en aplicación se convierta automáticamente en fuga multiempresa.
- **Consecuencia:** deben existir políticas compatibles con ese rol y una vía mínima de bootstrap de identidad. Conectar como admin/service role no es solución.

## DT-04 — Identidad separada de datos laborales

- **Estado:** vigente, implementación parcial.
- **Decisión:** Supabase Auth emite identidad; `usuario.auth_user_id` la vincula con tenant/rol; RUT no es contraseña.
- **Razón:** reemplaza el login inseguro heredado sin confiar en claims del cliente.
- **Consecuencia:** se necesita provisión, activación, recuperación y desvinculación auditables.

## DT-05 — Entidades compartidas no son libremente mutables

- **Estado:** implementada en Incremento 1.
- **Decisión:** `retail_api` no actualiza directamente `articulo`/`producto_cadena`; funciones atómicas solo permiten la mutación cuando ninguna otra empresa usa la fila.
- **Razón:** una fila global puede ser usada por varios tenants.
- **Consecuencia:** una edición tenant-scoped nunca debe alterar otra empresa de forma implícita.

## DT-06 — Bajas lógicas y preservación histórica

- **Estado:** recomendada; requiere aceptación funcional.
- **Decisión:** mantener usuario inactivo y producto bloqueado en vez de borrar físicamente.
- **Razón:** stock, inventarios, fotos y auditoría necesitan conservar referencias.
- **Consecuencia:** la UI debe comunicar “desactivar/bloquear”, y los criterios explicarán la diferencia frente al legacy.

## DT-07 — Storage privado con compensación

- **Estado:** tecnología aceptada; robustez pendiente.
- **Decisión:** conservar buckets privados de Supabase Storage y URLs firmadas cortas.
- **Razón:** ya es dependencia intencional y evita blobs en PostgreSQL.
- **Consecuencia:** implementar eliminación/compensación, conciliación de huérfanos y límite coherente Nginx/backend.

## DT-08 — Fuentes de paridad versionadas

- **Estado:** pendiente de aprobación.
- **Decisión propuesta:** fijar un corte funcional firmado/hashado del MVP y tratar documentos anteriores como snapshots históricos.
- **Razón:** AAF 01.409, AAF 01.428 y el MVP Firestore público difieren materialmente.
- **Consecuencia:** requisitos no confirmados permanecen condicionados; no se inventa comportamiento.

## DT-09 — Paridad manual antes de automatización

- **Estado:** recomendada.
- **Decisión:** primero reproducir carga/operación aprobada de forma controlada; automatizar portales después.
- **Razón:** la automatización depende de accesos, formatos, términos y manejo de fallos por retailer.
- **Consecuencia:** no se introduce scheduler, worker adicional o cola hasta tener el flujo manual e idempotente validado.

## DT-10 — Baja lógica de datos no equivale a retención automática

- **Estado:** pendiente de política.
- **Decisión:** no reproducir la eliminación 14/89 días de AAF 01.409 sin aprobación.
- **Razón:** AAF 01.428 declara eliminado ese mantenimiento y los históricos tienen valor operativo/auditable.
- **Consecuencia:** cualquier job de purga exige retención, backup, legalidad y restauración aprobados.

## DT-11 — Testing con base realista y rol restringido

- **Estado:** implementado localmente y obligatorio en CI/integración antes de producción.
- **Decisión:** complementar mocks con PostgreSQL desechable, migraciones, dos tenants y cuatro roles.
- **Razón:** los defectos P0 actuales no pueden detectarse con mocks de `DatabaseService`.
- **Consecuencia:** CI debe separar unit, integration, e2e y build/Compose, sin secretos reales.

## DT-12 — Etapa 4 iniciada con aprobación acotada

- **Estado:** cumplida para Incrementos 0–1.
- **Decisión:** la implementación se limita a la rama local y al PostgreSQL efímero autorizado.
- **Razón:** el progenitor aprobó expresamente los Incrementos 0–1 con restricciones productivas.
- **Consecuencia:** cualquier aplicación real, publicación o siguiente incremento requiere una nueva autorización.

## Decisiones pendientes del progenitor

1. Corte funcional canónico del MVP.
2. Matriz exacta de roles.
3. Inclusión de productos sin venta y cargas Excel de stock/ventas.
4. GPS/distancia en fotos.
5. Reportes CSV/ZIP/correo.
6. Regla de identidad personal compartida entre empresas.
7. Política de retención.
8. Aprobación del siguiente incremento tras revisar el informe de cierre de Incrementos 0–1.
