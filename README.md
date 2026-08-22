# Software Retail

Reconstrucción profesional del MVP retail basado en Google Apps Script/Sheets. El nuevo incremento utiliza NestJS, React/Vite, PostgreSQL/Supabase y Docker.

## Estado actual

- Base histórica migrada y auditada.
- API REST versionada y Swagger.
- Acceso demo exclusivamente local.
- Listado multi-tenant de locales.
- Productos y stock vigente por local con búsqueda y paginación.
- Frontend responsive orientado a operación en terreno.
- Docker Compose validado de extremo a extremo.

La autenticación productiva, Storage, inventarios editables y administración aún están pendientes.

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
