# API

Documentación interactiva local:

```text
http://localhost:3000/api/docs
```

En Docker, Swagger solo es accesible internamente por ahora; Nginx sirve `/api/` hacia el backend.

| Método | Endpoint | Autorización | Descripción |
|---|---|---|---|
| GET | `/api/v1/health` | Pública | Estado de API y base |
| POST | `/api/v1/auth/demo` | Solo desarrollo | Token demo local |
| GET | `/api/v1/auth/me` | Bearer | Perfil actual |
| GET | `/api/v1/stores` | Bearer | Locales permitidos |
| GET | `/api/v1/stores/:id/products` | Bearer | Productos y stock del local |
| GET | `/api/v1/stores/:id/products/:productId/history` | Bearer | Historial reciente de stock |

Los listados aceptan `search`, `page` y `limit` (máximo 100). Las respuestas incluyen `items`, `total`, `page` y `limit`. El historial acepta `days` entre 1 y 365.
