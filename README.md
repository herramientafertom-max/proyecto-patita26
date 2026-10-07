# Software Retail

Reconstrucción profesional del MVP retail basado en Google Apps Script/Sheets. El nuevo incremento utiliza NestJS, React/Vite, PostgreSQL/Supabase y Docker.

## Estado actual

- Base histórica migrada y auditada.
- API REST versionada y Swagger.
- Acceso demo local y verificación productiva de tokens de Supabase Auth (backend).
- Administración de usuarios (crear, editar, RUT, perfil, estado, asignaciones, vínculo de cuenta Auth) con auditoría append-only.
- Administración de catálogo de productos (crear, editar, clonar, activar/bloquear) con marca/sección/proveedor dinámicos y auditoría.
- Gestión de quiebres: declarar/revertir individual o propagado por EAN (candado ≥ 8 dígitos), con auditoría.
- RLS corregido para resolver identidad vía `usuario.auth_user_id`.
- Listado multi-tenant de locales.
- Productos y stock vigente por local con búsqueda y paginación.
- Frontend responsive orientado a operación en terreno, con panel administrativo de catálogo.
- Portal de trabajadores con ruta semanal, locales asignados, productos, historial y evidencia fotográfica.
- Docker Compose validado de extremo a extremo.

La interfaz de usuarios/reponedores y la carga de fotografías de catálogo/terreno ya están implementadas en local. Para activar fotografías en un entorno se debe aplicar la migración 010 y configurar la clave de servicio de Supabase solo en el backend. Inventarios editables, invitación de cuentas nuevas en Supabase Auth, estadísticas y tareas programadas aún están pendientes.

## Probar ahora

Los contenedores están disponibles en:

```text
http://localhost:8080
```

Clave demo local:

```text
retail-demo-local
```

El modo demo está bloqueado automáticamente cuando `NODE_ENV=production`.

Para volver a levantarlo:

```bash
./scripts/docker-up-local.sh
```

Para detenerlo:

```bash
./scripts/docker-down-local.sh
```

## Desarrollo sin Docker

```bash
npm install
npm run start:dev --workspace backend
npm run dev --workspace frontend
```

El backend lee `DATABASE_URL` desde el entorno o desde el archivo local `credenciales.txt`, que está excluido de Git.

## Verificaciones

```bash
npm run lint
npm run test --workspace backend -- --runInBand
npm run test --workspace frontend
npm run build
./scripts/smoke-api.sh
```

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Base de datos](docs/DATABASE.md)
- [API](docs/API.md)
- [Despliegue](docs/DEPLOYMENT.md)
- [Seguridad](docs/SECURITY.md)
- [Paridad funcional](docs/MIGRATION_FUNCTIONAL.md)
- [Auditoría funcional](docs/HITO_1_AUDITORIA_FUNCIONAL.md)
- [Auditoría Supabase](docs/HITO_2_AUDITORIA_SUPABASE.md)
