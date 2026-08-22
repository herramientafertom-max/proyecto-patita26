# Contexto del proyecto: Software Retail

## Cliente

- Nombre:
- Empresa:
- Contacto:
- Profesión: ingeniero comercial.
- Industria: gestión y comercialización de productos en grandes cadenas de retail y supermercados de Chile.
- La empresa del cliente trabaja con cuatro grandes retailers: Walmart, Cencosud, Unimarc y Tottus.
- Opera con una serie de productos que se venden a través de estas cadenas.

## Objetivo del proyecto

Desarrollar una solución propia para gestionar la operación comercial y los datos asociados a los productos vendidos en Walmart, Cencosud, Unimarc y Tottus. La solución debe reducir la dependencia del SaaS externo actual, eliminar sus restricciones y reemplazar el aplicativo provisional desarrollado con herramientas de Google Workspace y Gemini.

El objetivo comercial informado incluye evitar un costo mensual estimado entre $2.000.000 y $2.500.000 CLP y un cobro adicional de 5 UF por cada diez trabajadores nuevos. El monto exacto debe confirmarse.

## Problema que se busca resolver

- El cliente utiliza actualmente un SaaS externo con un costo aproximado de $2.500.000 CLP mensuales.
- El SaaS es restrictivo y no se adapta suficientemente a las necesidades de la operación.
- Como alternativa, el cliente desarrolló por su cuenta un aplicativo utilizando herramientas de Google Workspace y asistencia de Gemini, pese a no tener conocimientos de programación.
- El aplicativo funciona, pero presenta múltiples problemas técnicos y de diseño.
- Originalmente, todos los datos estaban almacenados en Excel, sin un modelo relacional ni normalización.
- El problema de diseño de datos ya fue abordado mediante la creación de una base de datos en Supabase.

## Alcance inicial

- Migrar los datos existentes desde Excel hacia la base de datos de Supabase ya creada.
- Evaluar el aplicativo actual y documentar sus procesos, funciones y problemas.
- Definir el reemplazo progresivo del aplicativo actual y del SaaS externo.

## Usuarios y roles

- Roles conocidos: Administrador, Supervisor, Reponedor y Reponedor Externo.
- Cerca de 150 usuarios actuales, con un promedio informado de 25 trabajadores activos por día.
- Proyección inicial de hasta 1.000 usuarios al comercializar el producto.
- La interfaz debe ser sencilla, legible y amigable para trabajadores de mayor edad.

## Funcionalidades requeridas

- Consulta de productos, precios, fotografías, marcas, cadenas, locales y stock.
- Historial de stock y fotografías.
- Registro de inventario y sugeridos.
- Administración de usuarios, roles, asignaciones y productos.
- Estadísticas de actividad.
- Automatización futura de la descarga diaria desde portales retail y homologación actualmente realizada en Excel.

## Requisitos técnicos

- Base de datos relacional y normalizada en Supabase.
- Migración controlada de los datos existentes en Excel.
- Validación de integridad, consistencia y trazabilidad durante la migración.

## Integraciones

- Supabase: base de datos preparada y pendiente de recibir la migración.
- Google Workspace: plataforma utilizada por el aplicativo actual.
- Archivos Excel: fuente actual de los datos que deben migrarse.
- Posibles integraciones con Walmart, Cencosud, Unimarc y Tottus: por confirmar.

## Plazos y entregables

- El cliente espera el producto lo antes posible, pero todavía no existe una fecha de término definida.
- Se requiere acordar una definición contractual de terminado y entregas incrementales.

## Restricciones y riesgos

- Posibles inconsistencias, duplicados y valores incompletos en los archivos Excel.
- Diferencias entre la estructura de origen y el esquema normalizado de Supabase.
- Dependencia operativa del SaaS externo y del aplicativo actual durante la transición.
- Riesgo de pérdida o alteración de datos si la migración no incluye validaciones y respaldo.
- Las funcionalidades exactas y reglas de negocio todavía deben levantarse con el cliente.

## Decisiones tomadas

- Utilizar Supabase como base de datos relacional.
- Reemplazar el almacenamiento no normalizado basado en Excel.
- La estructura de la base de datos ya fue creada.
- Conservar los archivos recibidos como fuentes originales y no modificarlos directamente.
- Analizar y validar la migración antes de realizar escrituras en Supabase.

## Preguntas abiertas

- ¿Cuál es el nombre de la empresa y del cliente?
- ¿Qué productos, marcas y categorías administra la empresa?
- ¿Qué funciones proporciona actualmente el SaaS externo?
- ¿Qué funciones tiene el aplicativo construido con Google Workspace?
- ¿Cuáles son los principales problemas adicionales del aplicativo actual?
- ¿Cuántos archivos, hojas y registros deben migrarse?
- ¿Existe documentación del esquema de Supabase y del mapeo de columnas?
- ¿Qué usuarios y roles utilizarán el nuevo sistema?
- ¿Las cadenas de retail proporcionan archivos, portales o APIs para intercambiar información?
- ¿Cuál es el plazo esperado para dejar de utilizar el SaaS externo?

## Notas

- Documento creado el 21 de agosto de 2026.
- Contexto inicial del cliente y del estado de los datos registrado el 21 de agosto de 2026.
- El 22 de agosto de 2026 se recibieron dos libros Excel y dos archivos de código del sistema actual.
- Supabase fue verificado en modo lectura: las 21 tablas detectadas están vacías.
- El inventario y las discrepancias iniciales quedaron documentados en `ANALISIS_INICIAL.md`.
- El 22 de agosto de 2026 se completó la migración de 187.619 filas de origen a Supabase, sin errores ni relaciones huérfanas detectadas. El detalle está en `MIGRACION_RESULTADO.md`.
- El 22 de agosto de 2026 se recibió contexto adicional del cliente y un plan de reconstrucción profesional. Los Hitos 1 a 3 quedaron documentados en `docs/` y la implementación permanece pendiente de aprobación.
