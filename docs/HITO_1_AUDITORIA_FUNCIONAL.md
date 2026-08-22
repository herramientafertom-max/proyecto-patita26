# Hito 1 — Auditoría funcional del MVP

Fecha: 22 de agosto de 2026.

## 1. Descripción funcional

El producto es una plataforma multi-cliente para apoyar el trabajo diario de administradores, supervisores y reponedores que operan productos en Walmart, Cencosud, SMU/Unimarc y Tottus. El MVP reemplaza parcialmente un SaaS cuyo costo informado varía entre $2.000.000 y $2.500.000 CLP mensuales, más 5 UF por cada diez trabajadores adicionales.

Los usuarios consultan productos asociados a locales, stock, precios, marcas, fotografías e historial. También registran conteos y sugeridos, suben fotografías de góndola y, según su rol, administran usuarios, productos y estadísticas.

La fuente de información se actualiza diariamente mediante un proceso manual: ingresar a portales de cada retail, descargar stock, llevarlo a Excel, homologar nombres y alimentar una planilla madre. Automatizar esta cadena es uno de los mayores valores futuros, pero no está implementado en el código recibido.

## 2. Actores

- **Administrador:** administra usuarios y productos, consulta estadísticas y tiene acceso funcional amplio.
- **Supervisor:** consulta la operación y puede modificar ciertos datos de productos; sus permisos exactos deben confirmarse.
- **Reponedor:** consulta sus locales/productos asignados y registra actividad de terreno.
- **Reponedor Externo:** variante del reponedor con asignaciones; la diferencia funcional exacta no está documentada.
- **Desarrollador/soporte:** único acceso administrativo técnico informado; gestiona Apps Script, Sheets y Drive.
- **Empresa cliente:** tenant que contrata la plataforma y posee una base/planilla operativa propia.

Volumen informado: cerca de 150 usuarios actuales, aproximadamente 25 usuarios diarios y expectativa de 1.000 usuarios tras comercializar el producto.

## 3. Matriz funcional

| Módulo | Funcionalidad actual | Usuario | Entrada | Proceso real | Salida | Dependencia legacy | Conservar | Prioridad |
|---|---|---|---|---|---|---|---|---|
| Multi-cliente | Seleccionar base por código de empresa | Todos | ID empresa | Validar tenant activo y resolver sus datos | Tenant autorizado | Planilla control + ID de Sheet | Sí | Crítica |
| Acceso | Login mediante RUT | Todos | RUT e ID empresa | Identificar persona, rol y asignaciones | Sesión lógica y datos iniciales | Lectura de hoja; no hay autenticación criptográfica | Sí, rediseñado | Crítica |
| Locales | Consultar cadenas y locales activos | Todos | Cadena/local | Filtrar locales disponibles | Lista y metadatos | Maestra global + caché Apps Script | Sí | Crítica |
| Productos | Consultar productos de un local | Operación | Local o cadena | Relacionar local, producto y stock | Catálogo con stock/precio/fotos | TextFinder y superllaves | Sí | Crítica |
| Stock | Mostrar stock vigente | Operación | Local/producto | Consultar snapshot actual | Stock y fecha | Maestra Retail | Sí | Crítica |
| Historial | Consultar stock histórico | Operación | Local + SAP | Recuperar capturas históricas | Serie de fecha/stock | `LLAVE_LOCAL_SAP` | Sí | Importante |
| Inventario | Registrar conteo o sugerido | Operación | Usuario, local, producto, cantidades | Insertar o actualizar registro diario equivalente | Confirmación | Búsqueda inversa en hoja | Sí | Crítica |
| Fotos terreno | Subir foto de góndola | Operación | Imagen y contexto | Guardar archivo y registrar metadatos | URL/confirmación | Google Drive + Base64 | Sí, rediseñado | Crítica |
| Historial fotos | Consultar fotos recientes | Operación | Local + SAP | Filtrar últimos 15 días | Fotos y contexto | TextFinder + hoja | Sí | Importante |
| Usuarios | Listar reponedores | Administrador | Perfil | Filtrar usuarios por rol | Lista y rutas | Hoja Usuarios | Sí | Importante |
| Usuarios | Crear/editar usuario y asignaciones | Administrador | RUT, rol, contacto, locales, días | Reemplazar datos y rutas | Confirmación | Borra/reinserta filas | Sí, transaccional | Crítica |
| Productos | Listar catálogo editable | Admin/Supervisor | Tenant | Consultar datos homologados | Catálogo | Hoja completa | Sí, paginado | Importante |
| Productos | Modificar precio y fotos | Admin/Supervisor | SAP, precio, imágenes | Actualizar campos y storage | Confirmación | Drive + escritura por celda | Sí | Importante |
| Estadísticas | Actividad de últimos 15 días | Administrador | Tenant | Contar días distintos con acceso por usuario | Ranking/detalle | Registro de Accesos | Sí | Secundaria |
| Logs | Registrar fallos técnicos | Soporte | Excepción y contexto | Persistir evento | Log | Hoja global | Sí, rediseñado | Importante |
| Mantenimiento | Snapshot diario y retención | Sistema | Hora programada | Capturar stock nuevo y limpiar históricos | Datos mantenidos | Trigger Apps Script a las 03:00 | Requiere rediseño | Importante |
| Honorarios | Consulta de boleta por RUT | Prestador | RUT | Buscar datos de pago | Datos de boleta | Segundo Apps Script/HTML | No incluido por ahora | Requiere confirmación |

## 4. Reglas de negocio extraídas

1. Cada usuario opera dentro de una empresa cliente activa.
2. Un usuario tiene uno de cuatro roles conocidos y puede tener varios locales asignados.
3. Las asignaciones pueden variar por día de la semana.
4. Solo locales activos/abiertos deben aparecer en la operación normal.
5. Los productos cambian de nombre entre retailers; deben homologarse sin perder el texto específico de la cadena.
6. La identidad de negocio de un producto en una cadena es la relación cadena + SAP, no una superllave textual.
7. El stock vigente relaciona tenant, local, producto y fecha de actualización.
8. El historial admite múltiples capturas para el mismo local, producto y fecha.
9. Un conteo/sugerido diario equivalente debe actualizarse en lugar de duplicarse; la clave funcional observada incluye fecha, local, SAP y tipo de ingreso.
10. Las fotografías de terreno relacionan usuario, local, producto, fecha y stock observado.
11. El historial fotográfico mostrado por producto se limita actualmente a 15 días.
12. Las estadísticas cuentan días con actividad, no el número bruto de solicitudes.
13. El mantenimiento legacy elimina inventario, accesos e historial de stock con más de 14 días y fotos con más de 89 días. Esta retención requiere aprobación explícita antes de reproducirse.
14. Las imágenes de unidad, caja y terreno son categorías distintas.
15. Las reglas de autorización deben provenir de identidad y datos confiables del servidor, nunca del rol enviado por el frontend.

## 5. Dependencias específicas de Google

- `SpreadsheetApp`: base operativa, control de tenants, usuarios, productos, stock y logs.
- `DriveApp`: fotografías de catálogo y terreno.
- `CacheService`: caché global de locales durante seis horas.
- `ContentService` y `doPost`: API JSON monolítica.
- `ScriptApp`: tarea nocturna a las 03:00.
- `Utilities`: fechas, Base64 y blobs.
- IDs de Sheets/Drive embebidos o almacenados en celdas.
- `TextFinder`, rangos, filas y posiciones de columnas como mecanismo de consulta.

Estas dependencias describen la implementación antigua, no requisitos del producto.

## 6. Inventario de funciones legacy

### En uso y funcionalmente relevantes

`doPost`, `obtenerIdPlanillaCliente`, `obtenerIdCarpetaCliente`, `obtenerMapaLocalesRetail`, `obtenerMapaMaestraProductos`, `buscarEnMaestra`, `buscarDatos`, `obtenerHistorialStock`, `subirFotoGondola`, `obtenerFotosTerreno`, `obtenerHistorialFotosProducto`, `loginPro`, `registrarConteoYSugerido`, `getReponedores`, `obtenerEstadisticas`, `getTodosLosUsuarios`, `getLocalesMaestra`, `guardarUsuarioCompleto`, `obtenerProductosEditor`, `guardarProductoEditor`, `ejecutarLimpiezaAutomatica` y `registrarError`.

### Soporte técnico

`buscarPestanaSegura`, `formatearFechaSegura`, `parseFechaString`, `sanitizarCadenaNombre`, `obtenerFechasCadenas` y `crearActivadorLimpieza`.

### Aparentemente prescindibles o de uso puntual

- `doGet`: solo responde que la API está activa.
- `forzarPermisosDrive`: crea un archivo temporal para forzar autorización; no pertenece al flujo productivo.
- `buscarEnMaestra`: duplica parte de `buscarDatos`; puede reemplazarse por una consulta común parametrizada.
- Varias lecturas completas y funciones de mapa/caché son soluciones a limitaciones de Sheets, no módulos futuros.

## 7. Código duplicado, parcial o riesgoso

- `doPost` es un despachador monolítico basado en cadenas de acción.
- Autorización insuficiente: varias operaciones confían en `perfil` e `idPlanilla` recibidos del cliente.
- Login por RUT sin contraseña, sesión ni token verificable.
- CORS/CSRF no están realmente resueltos por usar `ContentService`.
- Operaciones de usuario borran filas antes de reinsertar, sin transacción.
- Se cargan hojas completas en memoria y se hacen búsquedas repetitivas por fila.
- Errores internos se devuelven parcialmente al cliente.
- Imágenes Base64 atraviesan la API completa sin límites explícitos de tamaño/MIME.
- La caché de locales usa una clave global que no incorpora versión de datos ni tenant.
- La limpieza borra datos de forma irreversible y con reglas de retención no confirmadas.
- El frontend principal del catálogo no fue entregado; no es posible auditar todavía navegación, accesibilidad, validaciones visuales ni todos los flujos de UI.

## 8. Funcionalidades críticas, secundarias y por confirmar

### Críticas

- Aislamiento multi-tenant.
- Autenticación y autorización.
- Consulta por local/producto y stock vigente.
- Homologación de productos.
- Registro de inventario y sugeridos.
- Fotografías de terreno.
- Administración segura de usuarios y asignaciones.
- Interfaz accesible para trabajadores de mayor edad.

### Importantes

- Historial de stock y fotos.
- Edición controlada de productos/precio/fotos.
- Logs y tareas programadas.
- Automatización diaria de importación desde portales retail.

### Secundarias

- Estadísticas actuales de acceso.
- Indicador de actividad del backend.

### Legacy o requiere confirmación

- Retención automática de 14/89 días.
- Módulo de honorarios.
- Diferencia exacta entre Reponedor y Reponedor Externo.
- Actualización versus historial de inventarios.
- Uso futuro de carpetas Google Drive ya migradas como referencias.

## 9. Riesgos

- El sistema ya está en uso: una sustitución sin convivencia/paridad puede interrumpir trabajo diario.
- Los usuarios actuales no tienen autenticación segura.
- La interfaz debe considerar edad, legibilidad, tamaño táctil y baja complejidad cognitiva.
- La carga diaria sigue siendo manual y concentra riesgo operativo.
- Existen datos históricos asociados a usuarios, locales y productos ya retirados de las maestras.
- No se dispone del frontend principal ni de acceso documentado a los portales retail.
- Costos actuales informados de forma inconsistente requieren confirmación comercial.
- No existe fecha de término ni definición detallada de alcance contractual.

## 10. Preguntas pendientes

1. ¿Cuál es el costo exacto del SaaS: $2,0 M o $2,5 M mensuales, y qué incluye?
2. ¿Qué funciones del SaaS aún no existen en el MVP?
3. ¿Se dispone del frontend completo del catálogo para auditarlo?
4. ¿Cómo se diferencian los permisos de Supervisor, Reponedor y Reponedor Externo?
5. ¿Debe mantenerse la retención de 14/89 días o conservar el historial completo?
6. ¿Cómo entregan datos los cuatro portales y qué automatización permiten legal/técnicamente?
7. ¿El módulo de honorarios pertenece a este producto?
8. ¿Se migrarán las imágenes desde Drive a otro storage o solo se conservarán enlaces?
9. ¿Qué flujos deben funcionar sin conexión o con conectividad móvil deficiente?
10. ¿Cuál es el presupuesto, equipo mantenedor y plazo comercial esperado?
