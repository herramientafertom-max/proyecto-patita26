# Bitácora de desarrollo — Fase 1

## 2026-10-14 — Etapas 1 a 3

**TAREA:** Auditoría técnica, levantamiento de paridad y planificación inicial.

**OBJETIVO:** determinar el estado real del repositorio y preparar un roadmap antes de modificar software productivo.

**ESTADO:** Completado para revisión del progenitor. Etapa 4 no iniciada.

**TRABAJO REALIZADO:**

- Se comprobó capacidad del host y se trabajó con tres revisiones independientes de solo lectura.
- Se registró rama/commit/estado Git y se preservaron archivos preexistentes no versionados.
- Se leyó documentación prioritaria y se contrastó con código, migraciones, tests, Docker/Nginx y CI.
- Se auditó backend, Auth, RLS, multiempresa, catálogo compartido y Storage.
- Se auditó frontend, permisos visibles, paginación, flujos y cobertura.
- Se revisó AAF 01.409, AAF 01.428 local y contenido público del MVP desplegado.
- Se verificó la última ejecución de GitHub Actions y se reprodujo el fallo Compose sin secretos.
- Se creó la documentación obligatoria de `docs/fase-1-paridad/`.

**ARCHIVOS CREADOS:**

- `01_AUDITORIA_TECNICA.md`
- `02_MATRIZ_PARIDAD_FUNCIONAL.md`
- `03_HALLAZGOS_Y_RIESGOS.md`
- `04_ROADMAP_IMPLEMENTACION.md`
- `05_CRITERIOS_ACEPTACION.md`
- `06_BITACORA_DESARROLLO.md`
- `07_DECISIONES_TECNICAS.md`

No se modificó código productivo, migraciones, credenciales, datos ni infraestructura.

**PRUEBAS Y VERIFICACIONES:**

| Verificación | Resultado |
|---|---|
| Backend unit tests | 7 suites, 40 tests aprobados |
| Backend e2e | 1 test aprobado |
| Backend TypeScript `--noEmit` | Aprobado |
| Backend ESLint no mutativo | Aprobado |
| Frontend tests | 2 archivos, 3 tests aprobados |
| Frontend ESLint | Aprobado |
| Build backend + frontend | Aprobado |
| Último CI GitHub | Falla solo `docker compose config` |
| Compose sin `DATABASE_URL` | Falla reproducida, exit 1 |
| Compose con URL ficticia | Configuración válida, exit 0 |
| MVP público | HTTP 200 e inventario visual/funcional público inspeccionado sin login ni escrituras |

**RIESGOS ABIERTOS:**

- RLS/`retail_api` incompatible y bootstrap de Auth circular.
- Catálogo compartido puede contaminar otra empresa.
- Migraciones 006–011 y buckets reales no verificados.
- Alcance funcional difiere entre AAF 01.409, AAF 01.428 y MVP público.
- La cobertura automatizada no incluye DB/RLS/Storage real ni navegador e2e.

**SIGUIENTE ACCIÓN:** progenitor revisa/ajusta matriz y aprueba o rechaza el roadmap. Tras aprobación, preparar Incrementos 0–1 en rama local aislada.

**AUTORIZACIÓN:** requerida antes de iniciar Etapa 4, modificar arquitectura/RLS, aplicar migraciones o tocar entornos reales.

## Estado Git preservado

Antes de la auditoría ya existían sin seguimiento:

- `docs/COTIZACION_COMERCIAL_MVP.md`
- `retail29agos.txt`
- `trabajo29ago.txt`

No fueron sobrescritos. Los únicos cambios nuevos son los documentos de esta carpeta.

## 2026-10-14 — Incrementos 0 y 1

**TAREA:** base de integración reproducible y corrección de Auth/RLS/catálogo compartido.

**OBJETIVO:** demostrar y corregir los bloqueantes P0 sin acceder a Supabase productivo ni a los
datos históricos.

**ESTADO:** Implementado y validado en integración local; no desplegado.

**TRABAJO REALIZADO:**

- Se creó `feature/incrementos-0-1-seguridad` sin publicar ni fusionar.
- Se construyó PostgreSQL efímero con baseline saneado, stubs mínimos de Auth/Storage y fixtures
  sintéticos para dos empresas y los cuatro perfiles.
- Se reprodujeron los fallos sobre migraciones 001–011 antes de aplicar la corrección.
- Se agregó la migración 012 con bootstrap de identidad, permisos mínimos, políticas RLS
  corregidas y mutaciones atómicas para entidades compartidas.
- `AuthService` dejó de consultar directamente `usuario` durante el bootstrap productivo.
- `ProductsService` dejó de actualizar directamente `articulo`/`producto_cadena`.
- Se añadió cobertura de lecturas/escrituras propias, negativas cruzadas, perfiles operativos,
  referencias privadas y catálogo compartido.

**PRUEBAS:**

- Pre-012: baseline y 001–011 aplicaron; 18/100 pruebas aprobadas y 82/100 fallaron, reproduciendo
  los defectos esperados.
- Post-012: baseline y 001–012 aplicaron; 100/100 pruebas de integración aprobadas.
- Backend unitario: 43/43; backend e2e: 1/1; frontend: 3/3.
- ESLint, builds, Compose principal/integración, shell y formato TypeScript: aprobados.

**RIESGOS:** PostgreSQL 16 local frente a PostgreSQL 17 destino; Supabase Auth/Storage real y e2e
HTTP con JWT real siguen pendientes. No se verificó ni modificó ningún entorno real.

**SIGUIENTE ACCIÓN:** revisión del progenitor. Antes de cualquier despliegue, repetir la suite en
PostgreSQL 17/Supabase de integración y preparar respaldo/rollback operativo.

**AUTORIZACIÓN:** se requiere autorización expresa para aplicar 012 fuera del entorno efímero,
publicar la rama, fusionar o desplegar.
