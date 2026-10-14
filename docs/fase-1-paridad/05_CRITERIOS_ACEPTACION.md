# Criterios de aceptación — Fase 1

Estos criterios son verificables. “Compila” o “existe un endpoint” no constituye aceptación.

## Criterios transversales

### CA-BASE-01 — Calidad

- TypeScript, lint, unit tests, integración y build aprobados.
- Ninguna prueba declarada exitosa sin haber sido ejecutada.
- Errores esperados usan códigos HTTP y mensajes seguros.

### CA-BASE-02 — Multiempresa

- Con dos tenants, toda lectura y escritura positiva se prueba para el tenant propio.
- Se prueban intentos cruzados por ID válido, búsqueda, paginación y relación compartida.
- No se filtran existencia, cantidad, nombre ni metadatos del otro tenant.

### CA-BASE-03 — Datos

- Escrituras multi-tabla son atómicas.
- Reintentos no generan duplicados indebidos.
- Los históricos existentes permanecen consultables.
- Toda migración propuesta incluye respaldo, reversión y validación posterior.

## Autenticación, tenant y roles

### CA-AUT-01 — Sesión productiva

- Usuario activo + empresa activa + cuenta vinculada puede iniciar sesión.
- Token inválido, expirado, firma/audience/issuer incorrectos reciben `401`.
- Usuario/empresa inactivos o sin vínculo reciben `401` sin revelar detalles sensibles.
- Frontend renueva o finaliza la sesión de manera controlada y borra estado al salir/recibir `401`.
- Ningún rol/tenant se acepta desde body/query/claims no confiables.

### CA-AUT-02 — Provisión de cuenta

- Solo rol autorizado crea/invita, reactiva o desvincula cuentas de su tenant.
- `service_role` nunca llega al navegador ni logs.
- La operación es auditable y maneja reintentos/fallos parciales.

### CA-TEN-01 — Tenant

- La identidad se resuelve con `retail_api NOBYPASSRLS`.
- El bootstrap de identidad expone solo la fila necesaria.
- No hay fuga de `app.usuario_id` entre conexiones del pool.

### CA-ROL-01 — Matriz de permisos

- Los cuatro roles tienen pruebas positivas y negativas por capacidad.
- UI oculta acciones no permitidas, pero backend sigue siendo la autoridad.
- La matriz exacta queda aprobada por progenitor/cliente.

## Usuarios, locales y rutas

### CA-USR-01

- Admin lista todos los usuarios mediante paginación y filtros.
- Crea/edita RUT válido, nombre, teléfono, perfil, estado, cuenta y asignaciones.
- RUT duplicado/conflictivo produce `409` sin escrituras parciales.
- Baja es lógica y preserva historial; la diferencia frente al borrado legacy está aceptada.
- Cambios sensibles quedan auditados.

### CA-LOC-01

- Se pueden alcanzar todos los locales activos permitidos, no solo los primeros 100.
- Búsqueda y paginación son estables y no duplican/omiten resultados.
- Código, retailer/cadena, nombre, estado y GPS/dirección aprobados están disponibles.

### CA-RUT-01

- Reponedor ve sus asignaciones y días correctos; jornada actual se distingue según zona chilena.
- Un local no asignado se rechaza salvo permiso explícito para “otros locales”.
- Admin reemplaza asignaciones de forma atómica y auditable.

## Productos, homologación, stock y quiebres

### CA-PROD-01

- Todos los productos activos del local son navegables con paginación.
- Se muestran campos aprobados: SAP/EAN, UxC, marca, nombre, precio, campaña, quiebre, stock/fecha y fotos.
- Producto bloqueado/inactivo sigue la regla acordada y no desaparece de históricos.

### CA-PROD-02

- Admin crea/clona/edita/bloquea; Supervisor solo realiza capacidades aprobadas.
- Cambiar identidad no rompe stock, historial, inventario ni fotos.
- Entidades compartidas no cambian otro tenant sin una operación explícita y autorizada.
- Campos vacíos pueden limpiarse deliberadamente.

### CA-HOM-01

- Código de retailer se asocia a producto homologado sin perder texto de origen.
- Duplicados/conflictos se detectan antes de persistir.
- Productos no homologados se reportan y pueden resolverse de forma trazable.

### CA-STK-01

- Se obtiene el snapshot vigente correcto por tenant/local/producto.
- Fecha/hora y zona se muestran de forma consistente.
- Actualización diaria es trazable e idempotente.

### CA-STK-02

- El historial devuelve todas las capturas del período, incluidas varias del mismo día.
- Coincidencia de local y SAP/producto es exacta.
- Paginación/orden no ocultan registros válidos.

### CA-QUI-01

- Individual afecta solo el producto solicitado.
- Propagación exige EAN numérico de al menos 8 dígitos y solo afecta el mismo tenant.
- Activación/reversión registran actor, motivo, producto origen y afectados.

## Inventario y sugeridos

### CA-INV-01

- Actor autorizado registra conteo en unidades y equivalencia en cajas para local/producto permitido.
- Un segundo envío de la misma clave diaria actualiza según regla aprobada, no duplica.
- Stock y fecha sistémicos asociados corresponden al producto seleccionado.
- Admin consulta y filtra los registros sin cruzar tenants.

### CA-SUG-01

- Sugerido acepta cajas válidas y calcula unidades con UxC vigente.
- Se conserva separado conceptualmente del conteo aunque comparta tabla física.
- Reintento es idempotente y el usuario recibe confirmación inequívoca.

## Fotografías

### CA-FOT-01 — Catálogo

- Unidad, pack y caja aceptan JPEG/PNG/WebP válidos hasta 8 MiB.
- Buckets son privados y URL firmada expira en el plazo configurado.
- Reemplazo exitoso elimina/retira el objeto anterior de forma segura.
- Fallo DB no deja objeto huérfano.

### CA-FOT-02 — Terreno

- Solo actor con acceso al local/producto puede subir y consultar.
- Metadatos de actor, local, producto, stock y fecha corresponden a la selección actual.
- GPS/distancia se captura y valida solo si se aprueba como requisito.
- Historial de 15 días reproduce la regla acordada.

### CA-FOT-03 — Galería

- Admin filtra por período, usuario, retailer/cadena/local, marca y producto.
- Vista móvil/PC y exportaciones aprobadas no exponen URLs permanentes públicas.

## Estadísticas, reportes e importaciones

### CA-EST-01

- Actividad cuenta días distintos, no requests brutos, en período y zona aprobados.
- Vistas usuario/día/semana coinciden con fixtures conocidos.

### CA-REP-01

- Filtros del reporte producen el mismo conjunto que la vista.
- CSV abre correctamente y neutraliza fórmulas peligrosas.
- Si hay correo, destinatario, autorización, auditoría y fallo de envío se controlan.

### CA-NSV-01

- La regla de “sin venta” define ventana, stock de referencia, exclusiones y zona.
- Mismo dataset genera resultados reproducibles y exportables.

### CA-IMP-01 / CA-IMP-02

- Archivo se valida antes de escribir y ofrece previsualización/reporte de errores.
- Lote completo es atómico o tiene checkpoint/rollback explícito.
- Reimportar el mismo hash no duplica.
- Filas/códigos no homologados quedan en una bandeja trazable.

### CA-AUTM-01

- Solo aplica si se aprueba automatización.
- Job es idempotente, observable, reintentable y no borra históricos por defecto.
- Credenciales y condiciones de uso de cada portal están autorizadas.

## Auditoría y código de barras

### CA-AUD-01

- Eventos append-only incluyen actor, tenant, acción, entidad, antes/después, metadata y timestamp.
- Admin solo consulta auditoría de su tenant; soporte global requiere rol separado y aprobado.
- Intentos de UPDATE/DELETE a la auditoría son rechazados.

### CA-REP-02

- Si se confirma, el código de barras representa el EAN seleccionado y maneja EAN ausente/inválido sin generar uno engañoso.
