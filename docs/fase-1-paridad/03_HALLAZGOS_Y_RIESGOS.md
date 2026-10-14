# Hallazgos y riesgos — Fase 1

Fecha de corte: 14 de octubre de 2026.

## 1. Resumen de prioridades

| Prioridad | Cantidad | Interpretación |
|---|---:|---|
| P0 | 4 | Bloquean un avance productivo seguro o amenazan aislamiento/integridad |
| P1 | 12 | Necesarios para reemplazo operativo o para que funciones existentes sean confiables |
| P2 | 8 | Paridad secundaria, calidad y mantenibilidad |
| P3 | 2 | Evolución condicionada a aprobación |

## 2. P0 — bloqueantes

### RSK-P0-01 — Contrato RLS incompatible con `retail_api`

- **Evidencia:** `docs/DEPLOYMENT.md:31-38`; `database/migrations/008_rls_identidad_auth_user_id.sql:138-166`.
- **Problema:** las políticas de lectura compartida son `TO authenticated` y las escrituras compartidas carecen de política. `retail_api` es `NOINHERIT/NOBYPASSRLS`.
- **Impacto:** locales/productos vacíos y fallos al crear/editar usuarios y productos.
- **Tratamiento:** diseñar políticas explícitas para el rol API y probarlas con una base local reproducible. Mantener `NOBYPASSRLS`.
- **Estado:** corregido y validado en integración local por la migración 012; pendiente de validación PostgreSQL 17/Supabase antes de cualquier aplicación real.

### RSK-P0-02 — Dependencia circular al autenticar

- **Evidencia:** `backend/src/auth/auth.guard.ts:13-22`; `backend/src/auth/auth.service.ts:123-132`; `backend/src/database/rls-context.interceptor.ts:9-14`.
- **Problema:** para conocer al actor se consulta `usuario`; RLS exige una identidad que solo se establece después de conocer al actor.
- **Impacto:** un JWT válido no puede iniciar una solicitud con el rol restringido.
- **Tratamiento:** función mínima y auditable de bootstrap `SECURITY DEFINER` que resuelva únicamente `auth_user_id` verificado, seguida del contexto transaccional normal. No abrir lectura general sobre `usuario`.
- **Estado:** corregido con `autenticar_usuario(uuid)` y validado con `retail_api` local; no validado con Supabase Auth real.

### RSK-P0-03 — Mutación multiempresa de `articulo`

- **Evidencia:** `backend/src/products/products.service.ts:567-581,764-779,802-851`.
- **Problema:** la protección de entidad compartida verifica `producto_cadena_id`, pero dos productos de cadena distintos pueden compartir `articulo`. Cambiar UxC modifica la fila global.
- **Impacto:** empresa A puede alterar atributos usados por empresa B.
- **Tratamiento:** definir inmutabilidad, propiedad o copy-on-write de artículos y reconciliación de EAN/pack/UxC; añadir pruebas negativas de dos tenants.
- **Estado:** corregido mediante mutaciones atómicas y ausencia de `UPDATE` directo; validado con dos tenants y dos `producto_cadena` distintos sobre el mismo artículo.

### RSK-P0-04 — Esquema/migraciones productivas no verificadas

- **Evidencia:** `docs/DATABASE.md:58-63`; las migraciones versionadas empiezan sobre un esquema preexistente.
- **Problema:** 006–011 se documentan como pendientes y no existe baseline completo para recrear las 22 tablas.
- **Impacto:** código puede depender de columnas, funciones, buckets y políticas inexistentes; pruebas de integración no son reproducibles.
- **Tratamiento:** obtener snapshot controlado del esquema, crear baseline de pruebas, inventariar migraciones aplicadas y validar rollback/backup en entorno no productivo.
- **Estado:** baseline y 001–012 reproducibles en PostgreSQL 16 local; Supabase real y PostgreSQL 17 siguen no verificados y bloquean cambios productivos.

## 3. P1 — críticos operativos y de seguridad

| ID | Hallazgo | Evidencia | Impacto / tratamiento recomendado |
|---|---|---|---|
| RSK-P1-01 | Frontend sin Auth productiva | `frontend/src/App.tsx:8-38`; `frontend/src/api.ts:42-44` | No existe acceso real. Implementar sesión Supabase, expiración, logout, activación y recuperación. |
| RSK-P1-02 | Sin alta/invitación de cuentas | `docs/API.md:44-46` | Usuarios heredados no pueden autenticarse. Diseñar provisión backend segura y auditable. |
| RSK-P1-03 | Listados truncados | `frontend/src/api.ts:46-48`; `frontend/src/users.ts:43-53` | 1.338 locales y 117 usuarios no son completamente navegables. Implementar paginación/infinite query. |
| RSK-P1-04 | Estado de foto puede pertenecer al producto anterior | `frontend/src/FieldPhotos.tsx:9-15` | Evidencia con stock/fecha incorrectos. Reinicializar por identidad o usar `key` y probar cambio rápido. |
| RSK-P1-05 | Nginx limita cargas a 1 MiB | `frontend/nginx.conf:1-24`; backend permite 8 MiB | Fotos válidas son rechazadas en Docker. Alinear `client_max_body_size` y probar 1/8/>8 MiB. |
| RSK-P1-06 | Objetos Storage huérfanos | `backend/src/photos/photos.service.ts:61-135` | Acumula datos/costos y deja inconsistencia. Agregar delete/compensación y job de conciliación seguro. |
| RSK-P1-07 | Coherencia tenant solo en aplicación | `docs/HITO_2_AUDITORIA_SUPABASE.md:115-117` | FKs separadas permiten combinaciones incoherentes. Probar políticas y evaluar constraints compuestos. |
| RSK-P1-08 | `persona` global genera acoplamiento entre empresas | `backend/src/users/users.service.ts:163-252` | Nombre/teléfono de una empresa condicionan otra. Aprobar modelo de identidad compartida y reglas de edición. |
| RSK-P1-09 | Cobertura de auditoría incompleta | `backend/src/products/products.service.spec.ts:216-233` | Cambios comerciales pueden no quedar trazados; no hay consulta. Definir eventos obligatorios y endpoint. |
| RSK-P1-10 | Inventario/sugeridos ausentes | matriz `INV-01`, `SUG-01` | Impide reemplazo operativo del MVP. Implementar después de asegurar identidad/RLS. |
| RSK-P1-11 | Alcance heredado cambió | AAF 01.409, AAF 01.428 y MVP público difieren | Riesgo de construir contra una especificación obsoleta. Aprobar corte funcional canónico. |
| RSK-P1-12 | Carga diaria manual de stock/ventas ausente | MVP público, funciones de carga Excel | Los datos dejan de actualizarse y “sin venta” no puede calcularse. Confirmar alcance y diseñar importación idempotente. |

## 4. P2 — calidad, paridad secundaria y mantenibilidad

| ID | Hallazgo | Consecuencia |
|---|---|---|
| RSK-P2-01 | CI rojo por `DATABASE_URL` ausente | La rama no tiene puerta de calidad verde aunque código/pruebas pasen. |
| RSK-P2-02 | CI no ejecuta e2e ni integración real | Los defectos RLS/infra no son detectados. |
| RSK-P2-03 | `lint` backend usa `--fix` | Un comando de verificación puede modificar archivos. Separar `lint` y `lint:fix`. |
| RSK-P2-04 | Booleanos query con `@Type(() => Boolean)` | La cadena `false` puede transformarse en `true`; corregir parser y probar. |
| RSK-P2-05 | Formularios no pueden limpiar campos opcionales | Los vacíos se omiten como `undefined`; datos antiguos permanecen. |
| RSK-P2-06 | Búsqueda de catálogos globales en memoria | Escala mal y puede asociar marca homónima al proveedor incorrecto. |
| RSK-P2-07 | Documentación mezcla snapshots históricos | Puede provocar decisiones basadas en estado obsoleto. Rotular documentos y enlazar esta auditoría. |
| RSK-P2-08 | README de backend/frontend son plantillas | Instrucciones irrelevantes y fuentes contradictorias. Reemplazar por guías específicas. |

## 5. P3 — evolución condicionada

| ID | Tema | Condición |
|---|---|---|
| RSK-P3-01 | Automatización de portales retail | Es evolución; requiere accesos, términos de uso, formatos y aprobación por cadena. |
| RSK-P3-02 | Jobs de retención | AAF 01.428 eliminó el job antiguo. No implementar borrado hasta aprobar retención y respaldo. |

## 6. Riesgos descartados o acotados

- El volumen actual no justifica microservicios, Redis, colas ni particionamiento inmediato.
- La base histórica documentada no presenta huérfanos en las verificaciones de migración de agosto de 2026; su estado actual sigue sin validación directa.
- El uso de Supabase Storage es coherente con la arquitectura aprobada, siempre que buckets, permisos y compensación sean probados.
- La baja lógica de usuarios/productos difiere del borrado legacy, pero es preferible para preservar trazabilidad. Requiere aceptación funcional, no retorno al borrado físico.

## 7. Registro de supuestos

1. No se considera una función validada en producción por el solo hecho de compilar o tener tests unitarios.
2. El MVP público se trató como evidencia funcional de solo lectura, no como fuente autorizada de arquitectura.
3. Los archivos no versionados preexistentes no se modificaron ni se consideran contrato aprobado.
4. Cualquier migración o prueba contra Supabase real requiere autorización y un entorno controlado.
