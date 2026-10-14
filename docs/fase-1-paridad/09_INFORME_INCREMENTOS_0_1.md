# Informe de Incrementos 0 y 1

## Resumen ejecutivo

Los Incrementos 0 y 1 quedaron implementados y comprobados exclusivamente en una rama local y
una base PostgreSQL efímera. La plataforma dispone ahora de un arnés reproducible sin datos
reales, un bootstrap compatible con RLS, permisos mínimos para `retail_api` y controles de
catálogo compartido que no requieren `BYPASSRLS` ni credenciales administrativas.

El estado previo fue reproducido antes de aceptar las correcciones: con migraciones 001–011 la
suite final obtuvo 18/100 pruebas aprobadas. Con la migración 012 y los cambios de backend,
obtuvo 100/100. Esto es validación local, no validación productiva.

## Correcciones implementadas

1. `autenticar_usuario(uuid)` resuelve una identidad activa después de verificar el JWT y antes
   del contexto RLS, sin abrir lectura general sobre `usuario`.
2. La migración rechaza un `retail_api` inseguro y concede solo los permisos necesarios.
3. El catálogo global es legible por una sesión de negocio válida del rol de la API.
4. Los perfiles se validan en `WITH CHECK`, cerrando inserciones de Reponedor y Reponedor
   Externo en tablas administrativas.
5. Las referencias privadas de fotografías, inventario, imágenes y homologaciones se validan
   contra el tenant de la sesión.
6. `articulo` y `producto_cadena` no admiten actualización directa desde `retail_api`; funciones
   atómicas comprueban uso por otros tenants y retornan `false` ante una entidad compartida.
7. El backend usa esas funciones y convierte el rechazo en conflicto de negocio.
8. El modo demo resuelve UUID configurados por perfil mediante el mismo bootstrap seguro; no
   consulta tablas protegidas antes de establecer identidad.
9. Los privilegios residuales de esquema y secuencias se revocan, y el rol se rechaza si tiene
   replicación, membresías o propiedad de objetos críticos.
10. Se eliminó una inversión de locks entre el servicio y las funciones de catálogo compartido.

## Archivos del incremento

### Backend y pruebas

- `.github/workflows/ci.yml`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/auth.service.spec.ts`
- `backend/src/products/products.service.ts`
- `backend/src/products/products.service.spec.ts`
- `backend/test/security.integration-spec.ts`
- `backend/test/jest-integration.json`
- `backend/package.json`
- `backend/src/app.module.ts`
- `.env.example`
- `docker-compose.yml`

### Base de datos e integración

- `database/migrations/012_retail_api_rls_seguro.sql`
- `database/integration/000_supabase_stubs.sql`
- `database/integration/001_legacy_domain.sql`
- `database/integration/fixtures.sql`
- `docker-compose.integration.yml`
- `scripts/test-integration.sh`

### Documentación actualizada

- `docs/DEPLOYMENT.md`
- `docs/SECURITY.md`
- `docs/DATABASE.md`
- `docs/adr/0002-auth-staged.md`
- `docs/fase-1-paridad/06_BITACORA_DESARROLLO.md`
- `docs/fase-1-paridad/08_EVIDENCIAS_INCREMENTOS_0_1.md`
- `docs/fase-1-paridad/09_INFORME_INCREMENTOS_0_1.md`

## Evidencia de pruebas

| Prueba | Resultado |
|---|---|
| Integración pre-012 | 18 aprobadas, 82 fallidas de 100; defectos reproducidos |
| Integración post-012 | 100/100 aprobadas |
| Backend unitario | 43/43 aprobadas |
| Backend e2e | 1/1 aprobada |
| Frontend | 3/3 aprobadas |
| ESLint | Aprobado en backend y frontend |
| Build | Aprobado en backend y frontend |
| Compose | Configuración principal e integración válidas |
| Formato/shell | Prettier y `bash -n` aprobados |

El workflow de CI ahora proporciona una URL estrictamente sintética al validar Compose y ejecuta
la suite PostgreSQL efímera; no usa secretos ni servicios externos.

## Riesgos pendientes

- Repetir la prueba con PostgreSQL 17, versión documentada del destino.
- Validar JWT, invitaciones y cuentas con Supabase Auth de integración real.
- Validar políticas, URLs firmadas y limpieza de objetos con Supabase Storage real.
- Añadir e2e HTTP conectado a PostgreSQL restringido; el e2e actual general usa mocks.
- Ampliar casos SQL específicos de fotografías, inventario y auditoría.
- Preparar respaldo, ventana de cambio y procedimiento de reversión antes de solicitar una
  aplicación real de la migración 012.

## Operaciones no realizadas

No se aplicaron migraciones reales, no se accedió a Supabase productivo, no se modificaron datos
históricos, no se desplegó, no se hizo `push` y no se fusionó a `main`.
