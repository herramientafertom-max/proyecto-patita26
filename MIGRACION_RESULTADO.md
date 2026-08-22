# Resultado de la migración inicial

Fecha: 22 de agosto de 2026.

## Estado

Migración completada y confirmada mediante una única transacción PostgreSQL. No hubo filas rechazadas ni claves foráneas huérfanas en las validaciones posteriores.

## Fuentes auditadas

- `Base_de_Datos_1.xlsx`: 186.298 filas trazadas y cargadas.
- `Clientes_IDs_Maestra_de_Locales_y_Registro_de_Errores.xlsx`: 1.321 filas trazadas y cargadas.
- Total de filas de origen auditadas: 187.619.
- Filas con error: 0.

Cada fila está registrada en `migracion_auditoria.registro` con archivo, hoja, número de fila y hash SHA-256. Los dos archivos están registrados como lotes completados.

## Cantidades finales principales

- Empresas cliente: 1.
- Cadenas: 5.
- Subcadenas: 23.
- Locales: 1.338.
- Personas y usuarios: 117 de cada uno.
- Asignaciones de usuarios a locales: 199.
- Productos por cadena y productos por cliente: 1.588 de cada uno.
- Imágenes maestras de producto: 217.
- Stock vigente: 11.927 registros.
- Historial de stock: 169.922 registros.
- Inventarios: 1.189 registros.
- Fotografías de terreno: 1.220 registros.
- Accesos: 774 registros.
- Errores históricos: 53 registros reales.

## Tratamiento de datos heredados

- Se detectaron 71 solicitudes de creación y se consolidaron en 63 locales heredados distintos para conservar eventos cuyos locales ya no estaban en la maestra vigente.
- Se crearon 528 productos heredados bloqueados para conservar stock asociado a productos ausentes de la maestra vigente.
- Los eventos de usuarios eliminados conservan nombre y perfil originales sin inventar RUT ni cuentas de autenticación.
- Las 8.548 capturas históricas que comparten local, producto y fecha se conservaron como filas independientes.
- Los datos no normalizados de eventos quedaron preservados en `datos_origen` y en la auditoría privada.

## Validaciones posteriores

- Stock vigente con local huérfano: 0.
- Stock vigente con producto huérfano: 0.
- Historial con local huérfano: 0.
- Historial con producto huérfano: 0.
- Inventarios con local o producto huérfano: 0.
- Fotografías con local o producto huérfano: 0.

## Archivos técnicos

- Migraciones SQL: `database/migrations/001` a `005`.
- ETL reproducible: `scripts/preparar_migracion.py`.
- Carga transaccional: `scripts/cargar_migracion.sql`.
- Verificación detallada: `migracion-preparada/verificacion_post_migracion.txt`.
- Respaldo previo del esquema: `backups/pre_migracion_2026-08-22/schema_antes.sql`.

## Pendiente funcional

La migración conserva y relaciona los datos, pero todavía se debe validar el comportamiento del nuevo aplicativo: autenticación, búsquedas, stock, inventarios, fotografías, permisos RLS y reportes. Los usuarios heredados aún no tienen cuentas en Supabase Auth; se vincularán mediante `usuario.auth_user_id` cuando se implemente el acceso.
