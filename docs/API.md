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
| GET | `/api/v1/stores/my-route` | Bearer | Ruta semanal propia y días asignados |
| GET | `/api/v1/stores/:id/products` | Bearer | Productos y stock del local |
| GET | `/api/v1/stores/:id/products/:productId/history` | Bearer | Historial reciente de stock |
| GET | `/api/v1/users` | Bearer, Administrador | Lista usuarios de la empresa (`search`, `perfil`, `estado`, paginación) |
| GET | `/api/v1/users/options` | Bearer, Administrador | Locales disponibles para asignar rutas semanales |
| GET | `/api/v1/users/:id` | Bearer, Administrador | Detalle de usuario con sus asignaciones |
| POST | `/api/v1/users` | Bearer, Administrador | Crea persona + usuario (+ asignaciones opcionales) en una transacción |
| PATCH | `/api/v1/users/:id` | Bearer, Administrador | Edición parcial: nombre, teléfono, RUT, perfil, estado, `authUserId`, asignaciones |
| GET | `/api/v1/products` | Bearer, Admin/Supervisor | Catálogo paginado (`search`, `cadenaId`, `seccionId`, `estado`, `campanaActiva`, `quiebreActivo`) |
| GET | `/api/v1/products/options` | Bearer, Admin/Supervisor | Cadenas, secciones y marcas (con proveedor) para poblar formularios |
| GET | `/api/v1/products/:id` | Bearer, Admin/Supervisor | Detalle de producto con imágenes de catálogo |
| POST | `/api/v1/products` | Bearer, Administrador | Crea producto (artículo + producto de cadena + homologado) en una transacción |
| POST | `/api/v1/products/:id/clone` | Bearer, Administrador | Clona un producto con nuevo SAP |
| PATCH | `/api/v1/products/:id` | Bearer, Admin/Supervisor | Edición: identidad (cadena/SAP/EAN), homologación, precio, campaña |
| PATCH | `/api/v1/products/:id/status` | Bearer, Administrador | Activa/bloquea el producto (baja lógica) |
| PATCH | `/api/v1/products/:id/quiebre` | Bearer, Admin/Supervisor | Declara o revierte quiebre, individual o propagado por EAN |
| GET | `/api/v1/photos/field` | Bearer | Fotos de terreno de un producto/local permitido (15 días por defecto) |
| POST | `/api/v1/photos/field` | Bearer | Sube una foto de terreno y la vincula al actor, local y producto |
| GET | `/api/v1/photos/catalog/:productId` | Bearer, Admin/Supervisor | Imágenes de unidad, pack y caja con URL privada temporal |
| POST | `/api/v1/photos/catalog/:productId/:type` | Bearer, Admin/Supervisor | Carga/reemplaza una imagen de catálogo (`unidad`, `pack` o `caja`) |

Los listados aceptan `search`, `page` y `limit` (máximo 100). Las respuestas incluyen `items`, `total`, `page` y `limit`. El historial acepta `days` entre 1 y 365.

## Autenticación

El `Bearer` puede ser un token de Supabase Auth (verificado criptográficamente contra `SUPABASE_JWT_SECRET` o el JWKS de `SUPABASE_URL`, según configuración) o el token demo local (solo si `ENABLE_DEMO_AUTH=true` y `NODE_ENV` no es `production`). En ambos casos el backend resuelve el usuario, tenant y rol consultando PostgreSQL por `auth_user_id` (o desde el propio token en modo demo); nunca confía en claims de rol/tenant enviados por el cliente. Respuestas `401` indican identidad inválida; `403`, permisos insuficientes para el rol autenticado.

## Administración de usuarios

`PATCH /api/v1/users/:id` es idempotente por campo: solo se modifican los campos presentes en el body. `asignaciones`, cuando se envía (incluso como arreglo vacío), reemplaza el conjunto completo de locales asignados. No existe endpoint de borrado físico: la baja de un usuario se hace con `PATCH { "estado": "Inactivo" }`. Vincular `authUserId` solo asocia una cuenta de Supabase Auth **ya existente**; la creación/invitación de cuentas nuevas no está implementada en este incremento. Toda escritura queda registrada en `auditoria_administrativa`.

## Administración de productos

`estado` de producto usa `Activo`/`Bloqueado` (no `Inactivo`, a diferencia de usuario) para alinearse con la terminología ya usada en los datos migrados ("productos bloqueados"). `POST /products` y `PATCH /products/:id` aceptan `marcaId`/`seccionId` (referencia a un valor existente) o `marcaNombre`/`seccionNombre`/`proveedorNombre` (creación dinámica): la búsqueda por nombre es insensible a mayúsculas y acentos para evitar duplicados. Cambiar `cadenaId`/`sap` en un `PATCH` reubica el producto hacia una relación cadena+SAP existente o nueva, sin romper stock/historial/inventario/fotos (que referencian el mismo `producto_cliente.id`, no la relación cadena+SAP). El clonado (`POST /:id/clone`) nunca copia stock, inventario, historial, fotos de terreno ni auditoría; solo copia catálogo (y solo si se pide explícitamente EAN, campaña o imágenes). `PATCH /:id/quiebre` con `propagarPorEan: true` aplica el mismo cambio a todos los productos de la empresa que comparten el EAN de unidad (candado: EAN de al menos 8 dígitos, igual que el legacy), registrando una fila de auditoría por producto afectado con `propagado`, `eanUtilizado` y `productoOrigenId` en su `metadata`.

## Fotografías

Las cargas usan `multipart/form-data` y aceptan JPEG, PNG y WebP de hasta 8 MB. El backend verifica la firma binaria, guarda el objeto en un bucket privado y persiste solamente su ruta lógica. Las respuestas entregan URLs firmadas con vigencia de una hora. Se requieren `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el backend; la clave de servicio nunca se expone al frontend. Las fotos de terreno validan tenant, producto y acceso del reponedor al local.
