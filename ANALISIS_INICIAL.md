# Análisis inicial de fuentes y migración

Fecha: 22 de agosto de 2026.

## Archivos recibidos

- `datos-origen/Base_de_Datos_1.xlsx`: base operativa del cliente.
- `datos-origen/Clientes_IDs_Maestra_de_Locales_y_Registro_de_Errores.xlsx`: control de clientes, locales y errores.
- `codigo-actual/catalogo_digital_backend.gs.txt`: backend principal en Google Apps Script, versión AAF 01.409.
- `codigo-actual/consulta_honorarios_apps_script_y_html.txt`: aplicativo independiente de consulta de boletas de honorarios; contiene Apps Script y HTML en un mismo archivo.

## Inventario de `Base_de_Datos_1.xlsx`

- `Usuarios`: 206 registros, 12 columnas.
- `Maestra Productos`: 1.060 registros, 12 columnas y 1.060 fórmulas.
- `Maestra Retail`: 11.927 registros, 4 columnas.
- `Historial de Stock`: 169.922 registros, 3 columnas.
- `Inventario y Sugerido`: 1.189 registros, 12 columnas.
- `Fotos en Terreno`: 1.220 registros, 16 columnas.
- `Registro de Accesos`: 774 registros, 4 columnas.

## Inventario de la planilla de control

- `Clientes e IDs`: 1 registro, 8 columnas.
- `Maestra de Locales`: 1.267 registros, 6 columnas.
- `Registro de Errores`: 1.000 filas detectadas. La primera fila no contiene encabezados utilizables y requiere inspección/limpieza antes de migrar.

## Estado de Supabase

- La conexión mediante la API funciona.
- Se detectaron 21 tablas del dominio.
- Todas las tablas están actualmente vacías.
- No se modificaron ni cargaron datos durante este análisis.

## Mapeo conceptual inicial

- `Usuarios` → `persona`, `usuario` y `usuario_local_asignacion`.
- `Maestra de Locales` → `cadena`, `subcadena` y `local`.
- `Maestra Productos` → `proveedor`, `marca`, `seccion`, `articulo`, `producto_cadena`, `producto_homologado` y `producto_cliente`.
- `Maestra Retail` → `stock_snapshot`.
- `Historial de Stock` → `stock_historial`.
- `Inventario y Sugerido` → `inventario_registro`.
- `Fotos en Terreno` → `foto_terreno`.
- `Registro de Accesos` → `registro_acceso`.
- `Clientes e IDs` → `empresa_cliente` y `carpeta_almacenamiento`.
- `Registro de Errores` → `registro_error`.

## Hallazgos importantes

1. El código AAF 01.409 no coincide completamente con los Excel recibidos.
2. El código lee 17 columnas de `Maestra Productos`, pero el archivo recibido expone 12 columnas.
3. El código lee 11 columnas de `Maestra Retail`, pero el archivo recibido expone 4 columnas.
4. El código espera dirección y ubicación GPS separadas en la maestra de locales; el Excel recibido presenta una única columna de geolocalización y no expone una columna separada de dirección.
5. Las relaciones normalizadas de Supabase exigen resolver identificadores antes de cargar tablas dependientes.
6. Los RUT, teléfonos y nombres son datos personales y deben tratarse con acceso restringido.
7. El módulo de honorarios parece ser una aplicación separada del catálogo retail y no debe mezclarse con la migración sin confirmación del alcance.

## Evaluación de cobertura del esquema

Conclusión: el esquema actual permite representar la mayor parte de la operación, pero no conserva literalmente el 100 % de los datos de los Excel.

### Datos cubiertos correctamente

- Personas, usuarios, perfiles y asignaciones semanales por local.
- Empresas cliente y referencias a carpetas de almacenamiento.
- Cadenas, subcadenas, locales y estado del local.
- Productos normalizados por artículo, cadena, proveedor, marca y sección.
- Stock vigente e historial de stock.
- Conteos de inventario, fotografías de terreno y accesos.
- Registro de errores: aunque el libro no tiene encabezados, se detectaron 53 filas reales con tres valores, compatibles conceptualmente con fecha, error y contexto.

### Brechas que deben resolverse

1. `Maestra Productos` contiene `ID FOTO PRODUCTO` e `ID FOTO CAJA`, pero ninguna tabla de producto tiene campos equivalentes. `foto_terreno` no es semánticamente adecuada para fotografías maestras de catálogo.
2. La llave original `LLAVE_SAP` se genera mediante una fórmula que combina un prefijo de cadena con SAP. El esquema puede reconstruirla con relaciones, pero no conserva el valor de origen para auditoría.
3. `Clientes e IDs` contiene el identificador de la planilla/base heredada. El esquema guarda las carpetas, pero no ese identificador de origen.
4. No existe una tabla de lote de migración o fila de origen para rastrear exactamente desde qué archivo, hoja y fila nació cada registro.
5. Algunos históricos guardan textos descriptivos repetidos —perfil, nombre, cadena, local, marca y producto— mientras Supabase guarda relaciones. Esto es correcto para operación normalizada, pero no preserva la fotografía textual exacta del momento si esos nombres cambian después.
6. `GEOLOCALIZACIÓN` debe validarse y dividirse en `latitud` y `longitud`; los valores que no tengan un formato interpretable necesitarán tratamiento manual.

### Ajustes recomendados antes de migrar

- Crear una tabla de imágenes de producto, por ejemplo `producto_imagen`, con tipo (`unidad` o `caja`), referencia, URL y relación al producto correspondiente.
- Agregar campos opcionales para claves heredadas cuando sean necesarios para conciliación, o crear una tabla general de identificadores externos.
- Crear `migracion_lote` y, si se requiere auditoría completa, guardar archivo, hoja, número de fila y hash del registro de origen.
- Decidir si los textos históricos deben quedar congelados en las tablas de eventos o si basta con resolverlos mediante relaciones actuales.

## Corrección preparada

Se creó la migración `database/migrations/001_completar_cobertura_excel.sql`, que:

- agrega `referencia_base_origen` a `empresa_cliente`;
- agrega `llave_sap_origen` a `producto_cadena`;
- crea `producto_imagen` para imágenes de unidad y caja;
- crea el esquema privado `migracion_auditoria` con tablas de lote y registro por fila;
- restringe la auditoría a `service_role` y evita exponerla a usuarios anónimos o autenticados;
- se ejecuta dentro de una transacción y utiliza operaciones idempotentes cuando corresponde.

La migración fue aplicada correctamente en Supabase el 22 de agosto de 2026 mediante una conexión PostgreSQL cifrada. Se verificaron `public.producto_imagen`, `migracion_auditoria.lote`, `migracion_auditoria.registro`, las dos columnas heredadas y la activación de RLS en `producto_imagen`. Las tablas nuevas quedaron vacías y preparadas para la migración de datos.

## Orden de migración propuesto

1. Respaldar los archivos originales y calcular controles de integridad.
2. Limpiar y normalizar valores sin modificar los Excel originales.
3. Cargar `empresa_cliente`, `cadena`, `subcadena`, `local`, `proveedor`, `marca`, `seccion`, `persona` y `articulo`.
4. Cargar `usuario`, asignaciones y tablas de productos.
5. Cargar stock actual, historial, inventarios, fotografías y accesos.
6. Comparar recuentos, claves huérfanas, duplicados y totales entre origen y destino.
7. Ejecutar una prueba funcional antes del cambio definitivo.

## Pendientes antes de migrar

- Confirmar cuál estructura representa la versión vigente: el código o los Excel recibidos.
- Definir la empresa/proveedor asociado a los productos.
- Definir cómo separar la geolocalización en latitud y longitud y qué hacer con la dirección ausente.
- Revisar las fórmulas de `Maestra Productos` y guardar sus valores calculados correctamente.
- Revisar el contenido real de `Registro de Errores`.
- Acordar si se migrará todo el historial o solo una ventana temporal.
- Preparar una simulación que genere archivos limpios y un reporte de errores sin escribir todavía en Supabase.
