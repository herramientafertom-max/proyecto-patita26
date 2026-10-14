# Matriz preliminar de paridad funcional

Fecha de corte: 14 de octubre de 2026.

## 1. Convenciones

- **HEREDADA:** comportamiento observado en el MVP y requerido para reemplazo, sujeto a confirmación del alcance vigente.
- **MEJORA TÉCNICA:** necesaria para seguridad, integridad, estabilidad o mantenibilidad.
- **NUEVA:** no demostrada como parte del MVP; se reserva para evolución.
- **IMPLEMENTADO:** código y pruebas relevantes respaldan el comportamiento.
- **PARCIAL:** existe una parte, pero faltan componentes, integración o validación esencial.
- **PENDIENTE:** no existe implementación suficiente.
- **NO VERIFICADO:** la evidencia disponible no permite decidir.

El MVP desplegado consultado públicamente usa Firestore para varios flujos y presenta más funciones que la auditoría AAF 01.409. La matriz incorpora esas funciones, pero marca las discrepancias que requieren aprobación.

## 2. Matriz

| ID | Tipo | Módulo / actor | Comportamiento heredado comprobado | Implementación nueva | Estado | Diferencia / prioridad | Criterio |
|---|---|---|---|---|---|---|---|
| AUT-01 | HEREDADA + MEJORA | Autenticación / todos | ID empresa + RUT; empresa activa; el MVP no usa autenticación criptográfica segura | Backend valida JWT Supabase; frontend solo demo | PARCIAL | Flujo productivo completo ausente y bootstrap RLS roto / P0 | CA-AUT-01 |
| AUT-02 | MEJORA | Cuentas / admin | No se demostró provisión segura en legado | Solo vincula UUID existente | PENDIENTE | Crear/invitar/activar/recuperar cuenta sin exponer `service_role` / P1 | CA-AUT-02 |
| EMP-01 | HEREDADA | Empresas / todos | Selección por ID y rechazo de empresa inactiva | Tenant derivado de identidad backend | PARCIAL | Correcto conceptualmente, no probado con dos tenants / P0 | CA-TEN-01 |
| ROL-01 | HEREDADA | Roles / todos | Administrador, Supervisor, Reponedor, Reponedor Externo | Roles y guards existentes | PARCIAL | Diferencias exactas aún no aprobadas; sin matriz e2e / P0 | CA-ROL-01 |
| USR-01 | HEREDADA | Usuarios / admin | Listar, crear, editar, cambiar RUT/perfil/teléfono y rutas; MVP público elimina permanentemente | API/UI de alta/edición/baja lógica/asignación | PARCIAL | Baja lógica es mejora aceptable; UI no vincula Auth; primera página 100/117 / P1 | CA-USR-01 |
| LOC-01 | HEREDADA | Locales / todos | Locales activos por retailer/cadena; código, nombre y GPS | Lista y selección | PARCIAL | Máximo 100 sin paginación; no expone GPS/dirección / P1 | CA-LOC-01 |
| RUT-01 | HEREDADA | Rutas / reponedores | Locales asignados por día; destaca jornada actual; permite ver otros locales | Ruta semanal y administración | PARCIAL | No filtra/prioriza día actual de forma equivalente / P1 | CA-RUT-01 |
| PROD-01 | HEREDADA | Consulta producto / operación | Producto activo por local con SAP, EAN, UxC, precio, campaña, quiebre, fotos y stock | Catálogo por local con subconjunto de campos | PARCIAL | Límite 50; faltan campos/visualización equivalente y código de barras / P1 | CA-PROD-01 |
| PROD-02 | HEREDADA | Maestra / admin-supervisor | Crear, copiar, editar, excluir/eliminar, filtrar y reordenar columnas; 21 atributos en AAF 01.428 | Crear, clonar, editar, bloquear y filtrar | PARCIAL | Semántica de exclusión/eliminación y campos del MVP público requieren conciliación / P1 | CA-PROD-02 |
| HOM-01 | HEREDADA | Homologación / admin | El MVP público mantiene homologaciones por código/cadena y filtros de homologación | Tabla y edición normalizada | PARCIAL | Sin bandeja de no homologados, conciliación o importación / P1 | CA-HOM-01 |
| STK-01 | HEREDADA | Stock vigente / operación | Stock por local, fecha sistémica y equivalencia cajas/unidades | Último snapshot y stock | PARCIAL | Sin alimentación diaria; fecha no visible; sin equivalencia UI / P1 | CA-STK-01 |
| STK-02 | HEREDADA | Historial / operación | Historial exacto local+SAP; MVP público consulta casilleros históricos | API hasta 365 días; UI muestra 20 de 30 días | PARCIAL | Puede ocultar capturas válidas / P2 | CA-STK-02 |
| INV-01 | HEREDADA | Conteo / operación | Envío de conteo de sala en unidades y equivalencia en cajas; escritura diaria idempotente | Solo tabla/datos históricos | PENDIENTE | Función operativa crítica ausente / P1 | CA-INV-01 |
| SUG-01 | HEREDADA | Sugeridos/empujes / operación | Envío en cajas y conversión a unidades; MVP público usa registro separado | Sin API/UI | PENDIENTE | Función operativa crítica ausente / P1 | CA-SUG-01 |
| QUI-01 | HEREDADA | Quiebres / admin-supervisor | Declarar/revertir; propagación solo con EAN numérico de al menos 8 dígitos | API/UI y unitarias | PARCIAL | Bien cubierto en código; falta e2e RLS y paridad con filtros/resumen / P1 | CA-QUI-01 |
| FOT-01 | HEREDADA | Fotos catálogo / admin-supervisor | Unidad, pack y caja | Storage privado y UI | PARCIAL | Falta integración real, cleanup y migración/continuidad de enlaces / P1 | CA-FOT-01 |
| FOT-02 | HEREDADA | Foto terreno / operación | Captura cámara, stock/fecha, actor, local/producto, GPS usuario/local y distancia | Carga privada con stock/fecha | PARCIAL | Sin GPS/distancia; estado UI puede pertenecer al producto anterior / P1 | CA-FOT-02 |
| FOT-03 | HEREDADA | Galería / admin | Filtros, vistas PC/móvil, CSV y ZIP de fotografías | Solo historial por producto/local | PENDIENTE | Galería y exportaciones ausentes / P2 | CA-FOT-03 |
| EST-01 | HEREDADA | Estadísticas / admin | Actividad; MVP público muestra vistas usuario/día/semana | Sin endpoint/UI | PENDIENTE | Módulo completo ausente / P2 | CA-EST-01 |
| REP-01 | HEREDADA | Reporte inventario / admin | Filtros, CSV y envío por correo | Sin implementación | PENDIENTE | Confirmar correo como alcance y mecanismo seguro / P2 | CA-REP-01 |
| NSV-01 | HEREDADA EN MVP PÚBLICO | Productos sin venta / admin | Cruza ventas con stock de referencia, umbral, retailer/cadena/local/producto y exporta | Sin modelo/servicio/UI | PENDIENTE | No aparece en auditoría antigua; requiere validación contractual / P1 si se confirma | CA-NSV-01 |
| IMP-01 | HEREDADA EN MVP PÚBLICO | Carga stock Excel / admin | Valida consolidado, descarta inactivos con stock 0, previsualiza y carga por cadena/retailer | Solo ETL de migración inicial | PENDIENTE | Proceso diario manual ausente / P1 si se confirma | CA-IMP-01 |
| IMP-02 | HEREDADA EN MVP PÚBLICO | Carga ventas Excel / admin | Procesa y carga ventas por retailer/cadena | Sin implementación | PENDIENTE | Requerido por productos sin venta / P1 si se confirma | CA-IMP-02 |
| AUTM-01 | NUEVA/MEJORA | Automatización / sistema | AAF 01.428 declara eliminado el trigger antiguo; MVP público evidencia carga manual | Sin scheduler/job | PENDIENTE | Automatización de portales es evolución, no paridad confirmada / P3 hasta aprobación | CA-AUTM-01 |
| AUD-01 | MEJORA | Auditoría / admin-soporte | Legacy registra accesos y errores; MVP público registra actividad | Auditoría append-only parcial | PARCIAL | Sin consulta; cobertura de cambios incompleta / P1 | CA-AUD-01 |
| REP-02 | HEREDADA EN MVP PÚBLICO | Código de barras / operación | Genera visor de código de barras del EAN | Sin implementación | PENDIENTE | No documentado en AAF 01.409 / P2 si se confirma | CA-REP-02 |

## 3. Evidencia del MVP

### Código legacy local

- AAF 01.409: `codigo-actual/catalogo_digital_backend.gs.txt`.
- AAF 01.428 no versionado: `retail29agos.txt`.
- Reglas ya extraídas: [HITO_1_AUDITORIA_FUNCIONAL.md](../HITO_1_AUDITORIA_FUNCIONAL.md).

### MVP público (consulta 14-10-2026)

Sin ingresar credenciales ni ejecutar escrituras se identificaron:

- login por ID empresa + RUT;
- menú de estadísticas, galería, inventario/sugeridos, productos sin venta, asignación de locales y maestra de productos;
- carga Excel de stock y ventas;
- conteo, sugerido, historial, código de barras y fotografía con geolocalización;
- exportación CSV/ZIP y envío de reporte de inventario por correo.

La implementación pública lee/escribe Firestore directamente en varios flujos. Esa dependencia es una característica técnica del MVP actual, **no** una arquitectura que deba copiarse.

## 4. Requisitos por validar con el progenitor/cliente

1. ¿El objetivo de paridad es AAF 01.428, el MVP público Firestore actual o un corte funcional acordado?
2. ¿Productos sin venta, carga de ventas y carga de stock Excel son P1 contractual?
3. ¿Debe conservarse el envío de reportes por correo o basta exportación descargable?
4. ¿Se exige GPS y distancia local–reponedor al registrar fotos?
5. ¿“Eliminar” usuario/producto debe migrarse a baja lógica, preservando historial?
6. ¿Supervisor puede cargar stock/ventas, editar productos, ver estadísticas y gestionar fotos?
7. ¿Reponedor y Reponedor Externo difieren solo en asignaciones/registro de acceso?
8. ¿Qué retención corresponde? AAF 01.428 eliminó el mantenimiento nocturno que aparecía en AAF 01.409.
9. ¿La consulta de otros locales es obligatoria para todos los reponedores?
10. ¿Qué reportes del SaaS externo, no visibles en el MVP, forman parte del reemplazo?

La falta de respuesta a una pregunta no bloquea las correcciones P0 ni el desarrollo de módulos confirmados; el requisito afectado permanece `NO VERIFICADO` o condicionado.
