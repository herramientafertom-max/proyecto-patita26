# Arquitectura

## Vista general

```text
Navegador → Nginx/Frontend React → API NestJS → PostgreSQL/Supabase
                                      ↓
                            Auth y Storage (pendientes)
```

La solución es un monolito modular. Frontend y backend se empaquetan por separado; Supabase permanece como servicio externo intencional.

## Backend

- Prefijo `/api/v1`.
- Módulos actuales: `health`, `auth`, `stores` y `database`.
- DTO validation global y rechazo de propiedades desconocidas.
- Helmet y CORS configurable.
- Consultas parametrizadas mediante `pg`.
- Tenant, usuario y rol provienen del token verificado.

## Frontend

- SPA React/Vite responsive.
- TanStack Query para estado remoto.
- Búsqueda y selección de locales.
- Catálogo paginado de productos y stock.
- Tamaños táctiles, contraste y etiquetas accesibles.

## Decisiones

- Sin microservicios.
- Sin Redis ni colas hasta demostrar necesidad.
- API como frontera de reglas de negocio.
- Storage externo para imágenes; nunca Base64 en PostgreSQL.
