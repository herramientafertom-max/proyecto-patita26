# Auditoría técnica — Fase 1 de paridad

Fecha de corte: 14 de octubre de 2026
Commit auditado: `949caeb` (`main`, alineado con `origin/main`)
Alcance: análisis de solo lectura, pruebas locales seguras y documentación. No se aplicaron migraciones, no se modificaron servicios ni datos reales y no se desplegó nada.

## 1. Resumen ejecutivo

El repositorio contiene un monolito modular coherente con NestJS, React/Vite, PostgreSQL/Supabase, Docker y Nginx. Hay código relevante para autenticación backend, locales/rutas, productos, stock, usuarios, quiebres, fotografías y auditoría administrativa. Las pruebas existentes pasan, pero predominan las pruebas unitarias con dobles de base de datos.

La plataforma **no está lista para producción ni alcanza paridad funcional**. Los bloqueantes principales son:

1. La combinación RLS + rol restringido `retail_api` es incompatible con las políticas actuales y bloquearía autenticación, lecturas y escrituras esenciales.
2. El flujo inicial de autenticación consulta `usuario` antes de establecer `app.usuario_id`, pero la política de lectura depende de esa misma identidad.
3. Una modificación de `articulo` compartido puede alterar indirectamente datos usados por otra empresa.
4. El frontend solo obtiene tokens mediante el login demo; no implementa sesión productiva de Supabase Auth.
5. Inventarios, sugeridos, estadísticas, reportes, carga diaria de stock/ventas y productos sin venta están ausentes.
6. El MVP público consultado el 14-10-2026 es más amplio que la documentación original y opera directamente con Firestore en varios flujos. El alcance contractual vigente debe confirmarse.

## 2. Fuentes y precedencia provisional

Se contrastaron:

- Código y configuración del commit auditado.
- Migraciones `database/migrations/001` a `011`.
- Documentos existentes enlazados desde [README.md](../../README.md).
- Backend legacy AAF 01.409 en `codigo-actual/catalogo_digital_backend.gs.txt`.
- Archivo local no versionado `retail29agos.txt`, identificado como AAF 01.428.
- MVP público: <https://catalogodigital.desarrollospdv.com/> (inspección pública y sin escrituras).

Precedencia propuesta, pendiente de aprobación: comportamiento desplegado confirmado, luego fuente legacy más reciente confirmada, luego documentación histórica. Las diferencias no se resuelven por suposición; quedan como requisitos por validar.

## 3. Arquitectura constatada

```text
Navegador
  -> React/Vite servido por Nginx
  -> API REST NestJS /api/v1
  -> PostgreSQL/Supabase
  -> Supabase Auth y Storage
```

La decisión de monolito modular es adecuada para el volumen documentado. No hay evidencia que justifique microservicios, Kubernetes, Redis o colas en esta fase.

Módulos backend registrados en [app.module.ts](../../backend/src/app.module.ts): `auth`, `database`, `health`, `stores`, `users`, `photos` y `products`. `audit` se consume como servicio, pero no expone consulta. No existen módulos de inventario, sugeridos, estadísticas, reportes o importaciones.

## 4. Clasificación por módulo

La clasificación se aplica al módulo completo, no a la mera existencia de endpoints.

| Módulo | Estado | Operaciones verificadas | Evidencia principal | Brecha determinante |
|---|---|---|---|---|
| Health | IMPLEMENTADO | Estado API/DB | `backend/src/health/`; e2e aprobada | Falta monitorización productiva, fuera de la paridad básica |
| Auth backend | PARCIAL | Demo local, validación JWT Supabase, `/auth/me` | `backend/src/auth/` | Bootstrap RLS roto; sin provisión de cuentas ni prueba real multiempresa |
| Auth frontend | PENDIENTE | Solo login demo | `frontend/src/App.tsx:8-38`; `frontend/src/api.ts:42-44` | No hay cliente/sesión Supabase, recuperación ni renovación |
| Roles y permisos | PARCIAL | Guards de Admin/Supervisor; roles operativos | controladores y `RolesGuard` | Sin pruebas integradas de cuatro roles y dos tenants |
| Empresas/tenant | PARCIAL | Tenant derivado del usuario backend | `AuthService`; filtros SQL | Sin administración; identidad productiva y RLS no operativos juntos |
| Locales | PARCIAL | Lista, búsqueda y selección | `stores`; `frontend/src/api.ts` | Frontend pide máximo 100 de 1.338 y no pagina |
| Rutas | PARCIAL | Ruta semanal propia y asignación administrativa | `stores/my-route`; `UsersAdmin` | UI no prioriza explícitamente el día actual; sin prueba integral |
| Productos | PARCIAL | Lista, detalle, alta, edición, clonación, baja lógica | `products`; `CatalogAdmin` | RLS impide escrituras compartidas; listados UI truncados |
| Homologación | PARCIAL | Relación normalizada y edición dentro del producto | `producto_homologado`; `ProductsService` | Sin revisión de no homologados ni flujo de importación |
| Stock vigente | PARCIAL | Último snapshot por local/producto | `StoresService` | Sin ingestión vigente ni prueba de datos reales; fecha no visible en UI |
| Historial de stock | PARCIAL | Consulta 1–365 días | endpoint `history` | UI recorta a 20 resultados; sin integración DB/RLS |
| Inventario/conteo | PENDIENTE | Solo datos históricos | tabla `inventario_registro` | Sin API ni UI de escritura/consulta |
| Sugeridos/empujes | PENDIENTE | Solo datos históricos combinados | tabla `inventario_registro` | Sin API ni UI; el MVP público usa colección separada |
| Quiebres | PARCIAL | Individual y propagado por EAN con auditoría | `ProductsService`; unitarias | Sin prueba integrada RLS/multiempresa ni paridad visual completa |
| Fotos de catálogo | PARCIAL | Lista y reemplazo privado | `PhotosService`; `CatalogPhotos` | Sin compensación/borrado del objeto anterior ni validación real de buckets |
| Fotos de terreno | PARCIAL | Carga y consulta por local/producto | `PhotosService`; `FieldPhotos` | Sin GPS/distancia, galería global ni cleanup; riesgo de stock obsoleto en UI |
| Estadísticas | PENDIENTE | Ninguna | no hay módulo | MVP desplegado ofrece vistas por usuario, día y semana |
| Reportes/exportaciones | PENDIENTE | Ninguna | no hay módulo | MVP exporta inventario, fotos y productos sin venta; también envía correo |
| Productos sin venta | PENDIENTE | Ninguna | no hay módulo | Presente en MVP público con stock de referencia y ventas |
| Carga stock/ventas | PENDIENTE | ETL histórico, no operación diaria | `scripts/` solo migración inicial | MVP público admite Excel de stock y ventas |
| Procesos automáticos | PENDIENTE | Ninguno | no hay scheduler/worker | La automatización diaria sigue futura; no confundirla con carga manual existente |
| Auditoría administrativa | PARCIAL | Escritura append-only de varias operaciones | migración 007; `AuditService` | Sin endpoint/UI; precio, campaña y otras operaciones no siempre se auditan |
| Logs técnicos | PARCIAL | `registro_error` existe | esquema auditado | Sin servicio de observabilidad, request ID ni flujo operativo |

## 5. Endpoints actuales

El inventario documentado en [API.md](../API.md) coincide con los controladores:

- Público: `GET /api/v1/health`.
- Solo desarrollo: `POST /api/v1/auth/demo`.
- Bearer: `GET /auth/me`, locales, ruta, productos por local, historial y fotos de terreno.
- Administrador: usuarios; crear/clonar/cambiar estado de productos.
- Administrador/Supervisor: catálogo, edición, quiebres y fotos de catálogo.

No existen endpoints de inventario, sugeridos, estadísticas, reportes, auditoría consultable, importación o jobs.

## 6. Hallazgos obligatorios A–E

### A — Autenticación

**Resultado: PARCIAL y no operativa productivamente de extremo a extremo.**

El backend verifica JWT de Supabase y resuelve usuario/tenant/rol desde PostgreSQL (`auth_user_id`). El frontend, sin embargo, solo llama a `/auth/demo` y no incluye dependencia ni flujo de Supabase Auth. Tampoco existe creación/invitación de cuentas.

Además, con RLS efectivo, `AuthGuard` intenta resolver `usuario` antes de que el interceptor configure `app.usuario_id`, creando un bloqueo circular.

### B — RLS y `retail_api`

**Resultado: incompatibilidad confirmada, P0.**

- [DEPLOYMENT.md](../DEPLOYMENT.md) define `retail_api` con `NOINHERIT` y `NOBYPASSRLS`.
- La migración 008 concede varias lecturas solo `TO authenticated`.
- La misma migración deja sin política de escritura las tablas compartidas y afirma que solo un rol con bypass puede escribir.
- Productos y usuarios escriben `articulo`, `producto_cadena`, `marca`, `proveedor`, `seccion` y `persona`.

Otorgar `GRANT` SQL no evita el rechazo de RLS. No debe usarse propietario, `service_role` ni `BYPASSRLS` como solución.

### C — Datos compartidos

**Resultado: riesgo confirmado.**

Existe una protección para no editar un `producto_cadena` compartido entre empresas, pero no cubre dos filas `producto_cadena` distintas que referencian el mismo `articulo`. Cambiar `unidades_por_caja` puede modificar la fila global y afectar otra empresa. También se reutiliza un artículo por EAN sin reconciliar todos sus atributos.

### D — GitHub Actions

**Resultado: fallo vigente confirmado.**

La ejecución `37557988524` del 07-10-2026 aprobó instalación, lint, pruebas y build, y falló en `docker compose config`. Localmente se reprodujo: sin `DATABASE_URL` termina con código 1; con una URL ficticia válida termina con código 0. El workflow no aporta esa variable.

### E — Storage

**Resultado: diseño parcialmente correcto, integración incompleta.**

La migración 010 define buckets privados y el backend genera URLs firmadas de una hora, valida firma binaria/MIME/tamaño y mantiene la clave de servicio fuera del frontend. No obstante:

- si Storage guarda el objeto y PostgreSQL falla, queda huérfano;
- al reemplazar catálogo no se elimina el objeto anterior;
- no existe método de eliminación/compensación;
- no se verificaron buckets/policies/credenciales desplegados;
- fallar al firmar una URL se degrada silenciosamente a `null` o URL heredada.

Además, Nginx no configura `client_max_body_size`, por lo que conserva el límite predeterminado de 1 MiB. En Docker, una fotografía válida para NestJS de entre 1 y 8 MiB sería rechazada antes de llegar a la API.

## 7. Base de datos y migraciones

La migración histórica documenta 187.619 filas trazadas y sin relaciones huérfanas en las validaciones de 2026-08-22. Esa evidencia no demuestra que el entorno actual tenga aplicadas 006–011. [DATABASE.md](../DATABASE.md) aún las marca pendientes.

El repositorio no contiene una migración base reproducible de las 22 tablas; 001–011 son cambios sobre un esquema previo. Esto impide crear de cero una base de integración confiable solo con artefactos versionados.

## 8. Frontend y experiencia operativa

La SPA cubre demostración, ruta, locales, productos, historial, administración de usuarios/productos, quiebres y fotos. Brechas comprobadas:

- locales limitados a 100, productos/local a 50 y usuarios a la primera página de 100;
- `FieldPhotos` inicializa stock/fecha una sola vez y puede conservar los del producto anterior;
- no hay campo UI para vincular `authUserId`, pese a afirmaciones documentales;
- varios formularios convierten vacío en `undefined`, impidiendo limpiar campos opcionales;
- solo hay tres pruebas frontend y no cubren roles, navegación, formularios, fotos o paginación.

## 9. Verificaciones ejecutadas

- Backend: 7 suites, 40 pruebas unitarias aprobadas.
- Backend e2e: 1 prueba aprobada.
- Backend TypeScript `--noEmit`: aprobado.
- Backend ESLint sin `--fix`: aprobado.
- Frontend: 2 archivos, 3 pruebas aprobadas.
- Frontend ESLint: aprobado.
- Build completo backend + frontend: aprobado (`nest build`, `tsc -b`, `vite build`).
- GitHub Actions: última ejecución revisada, fallo exclusivo en `docker compose config`.
- Compose local: fallo reproducido sin `DATABASE_URL`; validación correcta con valor ficticio.

Estas pruebas no validan Supabase real, RLS con `retail_api`, Storage real, dos tenants, los cuatro roles ni los flujos productivos del navegador.

## 10. Conclusión

La base técnica es recuperable y conviene mantenerla, pero el estado debe describirse como **prototipo funcional parcial con pruebas unitarias**, no como plataforma lista para producción. La primera implementación debe reparar y demostrar la frontera de identidad/RLS antes de completar funcionalidades de negocio.
