# Evidencias de los Incrementos 0 y 1

## Alcance y seguridad de la ejecución

- Rama local: `feature/incrementos-0-1-seguridad`.
- Entorno autorizado: local o de integración aislado.
- No se ha conectado ni se conectará esta suite a Supabase productivo.
- Los fixtures son sintéticos; no contienen registros históricos ni credenciales reales.
- Las migraciones de prueba se aplican únicamente sobre una base efímera identificada como
  `retail_integration`.

## Hallazgos confirmados mediante ejecución

### CAT-001 — Mutación indirecta de un artículo compartido

**Estado:** reproducido antes de la corrección.

**Prueba:**

```text
npm test -- --runInBand src/products/products.service.spec.ts
```

**Resultado previo a la corrección:** 1 suite fallida; 1 prueba fallida y 14 aprobadas.
La prueba `bloquea unidades por caja cuando otra referencia de cadena comparte el artículo`
esperaba un `ConflictException`, pero la promesa se resolvió correctamente. El flujo ejecutó
la mutación de `public.articulo` aunque otra referencia de cadena podía compartir el mismo
artículo.

**Causa observada:** `ProductsService.applyIdentidad` verificaba únicamente si el mismo
`producto_cadena_id` estaba relacionado con otra empresa. No verificaba que otro
`producto_cadena` de otra empresa apuntara al mismo `articulo_id`.

### AUTH-001 — El backend intenta arrancar la identidad con una lectura RLS ordinaria

**Estado:** reproducido en el contrato unitario y confirmado sobre PostgreSQL efímero antes de
la corrección.

**Prueba:**

```text
npm test -- --runInBand src/auth/auth.service.spec.ts
```

**Resultado previo a la corrección:** 1 suite fallida; 1 prueba fallida y 7 aprobadas. El test
esperaba una llamada a la función estrecha `public.autenticar_usuario($1::uuid)`, pero observó
una consulta directa a `public.usuario`, `public.persona` y `public.empresa_cliente` filtrada por
`u.auth_user_id = $1`. Esta lectura se ejecuta en el guard, antes de que el interceptor pueda
establecer `app.usuario_id`.

### DB-001 — Fallos reales con `retail_api` sobre migraciones 001–011

**Estado:** reproducido antes de aplicar la migración 012.

**Prueba:**

```text
bash scripts/test-integration.sh pre
```

El runner creó una base `retail_integration` vacía, aplicó el baseline saneado, las migraciones
001–011 y ocho usuarios sintéticos (dos empresas por cuatro perfiles). La ejecución finalizó
con 18 pruebas aprobadas y 82 fallidas de 100.

Fallos confirmados por el motor:

- `public.autenticar_usuario(uuid)` no existía.
- `retail_api` recibía `permission denied` al ejecutar `usuario_actual()`,
  `empresa_cliente_actual()` y `perfil_actual()`.
- `producto_cadena` devolvía cero filas a usuarios con contexto porque la política estaba
  dirigida a `authenticated`, no a `retail_api NOINHERIT`.
- No existía una operación atómica que rechazara la modificación de un artículo utilizado por
  otra empresa.
- Los fallos anteriores impedían operar correctamente incluso sobre filas del propio tenant.

### DB-002 — Resultado posterior a la corrección

**Prueba:**

```text
bash scripts/test-integration.sh post
```

**Resultado:** 1 suite aprobada; 100 de 100 pruebas aprobadas. La migración 012 se ejecutó bajo
transacción y `retail_api` se comprobó como `LOGIN`, `NOINHERIT`, `NOSUPERUSER`,
`NOCREATEROLE`, `NOCREATEDB`, `NOREPLICATION` y `NOBYPASSRLS`, sin membresías ni propiedad de
tablas o del esquema `public`.

La matriz ejecutada cubre Administrador, Supervisor, Reponedor y Reponedor Externo en ambos
tenants. Para cada perfil se validaron lecturas propias y ajenas y la imposibilidad de actualizar
un producto del otro tenant. Además se verificaron escrituras propias autorizadas, rechazo de
escrituras operativas, referencias privadas cruzadas, lectura de catálogo global y bloqueo de
mutaciones directas sobre artículos compartidos.
También se ejecutaron los caminos positivos de ambas funciones seguras sobre catálogo exclusivo,
los rechazos sobre catálogo exclusivo ajeno y perfiles operativos, y la validación en PostgreSQL
de unidades por caja nulas, negativas o decimales.

## Riesgos detectados por análisis estático y mitigados

### RLS-001 — Políticas de lectura ligadas a `authenticated`

Las políticas de catálogo compartido creadas por la migración 008 usan `TO authenticated`.
El rol documentado `retail_api` es `NOINHERIT`, de modo que no recibe esas políticas por
pertenencia implícita.

**Mitigación implementada y ejecutada:** políticas explícitas para `retail_api`, condicionadas a
una identidad de negocio activa. Los ocho actores leen el catálogo global en la suite post-012.

### RLS-002 — Escrituras por perfiles operativos

Varias políticas `FOR ALL` condicionan el perfil en `USING`, pero no repiten la condición en
`WITH CHECK`. Para `INSERT`, PostgreSQL solo evalúa `WITH CHECK`; si el rol tiene privilegio de
tabla, un Reponedor podría intentar insertar datos dentro de su tenant.

**Mitigación implementada y ejecutada:** el perfil se exige también en `WITH CHECK`. Los cuatro
usuarios Reponedor/Reponedor Externo reciben `42501` al intentar insertar una homologación aun
declarando su propio tenant.

### RLS-003 — Referencias privadas cruzadas

Algunas políticas comparan solamente `empresa_cliente_id` de la fila nueva. Debe verificarse
que no permitan enlazar desde el tenant A identificadores privados pertenecientes al tenant B.

**Mitigación implementada y ejecutada:** los checks comprueban la pertenencia de homologaciones,
productos y usuarios referenciados. Administrador/Supervisor no pueden enlazar un producto propio
con una homologación privada del otro tenant.

### CAT-002 — Comprobaciones multiempresa invisibles bajo RLS

La consulta del servicio que busca filas de otras empresas se ejecuta bajo la identidad del
actor. Una política RLS correcta oculta esas filas, de modo que una comprobación normal desde
el backend no puede utilizarse como garantía global. La solución deberá ser una función
estrecha, auditable y `SECURITY DEFINER`, no una conexión administrativa ni `BYPASSRLS`.

**Mitigación implementada y ejecutada:** las funciones
`actualizar_unidades_articulo_seguro` y `actualizar_producto_cadena_seguro` bloquean, verifican el
tenant desde la sesión y rechazan atómicamente la mutación si existe uso por otra empresa. El rol
no obtiene `UPDATE` directo sobre `articulo` ni `producto_cadena`.

### AUTH-002 — Login demo incompatible con el bootstrap RLS

El login demo hacía una lectura ordinaria de `usuario`, `persona` y `empresa_cliente` antes de
establecer contexto, por lo que podía devolver cero filas con el rol corregido.

**Mitigación implementada:** cada perfil demo local se vincula explícitamente a un
`auth_user_id` sintético/configurado y usa `autenticar_usuario(uuid)`, el mismo bootstrap
restringido del flujo Supabase. Si falta el mapeo, devuelve un error de configuración y no abre
una lectura general ni usa credenciales administrativas.

### DB-003 — Privilegios residuales y orden de locks

La migración revoca previamente privilegios de tablas, secuencias y esquema; luego concede solo
el contrato necesario. Las pruebas comprueban que no existe `CREATE` sobre `public`, ni
`UPDATE/setval` sobre secuencias. El servicio ya no bloquea `producto_cadena` antes de invocar
las funciones seguras, evitando la inversión de locks `producto_cadena -> articulo` frente a
`articulo -> producto_cadena`.

## Riesgos pendientes no validados en esta ejecución

- PostgreSQL local es 16; el origen documentado usa PostgreSQL 17. Debe repetirse la suite sobre
  la misma versión del destino antes de autorizar una migración real.
- Los stubs validan PostgreSQL, no GoTrue/PostgREST ni Storage real de Supabase.
- No se aplicó la migración 012 sobre Supabase ni datos reales.
- La suite no sustituye un e2e HTTP con JWT Supabase real y base restringida.
- Fotografías, inventario y auditoría recibieron checks de referencias, pero requieren casos de
  integración específicos adicionales antes de habilitar esos flujos en producción.

## Regresión local posterior

| Verificación | Resultado |
|---|---|
| Backend unitario | 7 suites, 43 pruebas aprobadas |
| Backend e2e | 1 prueba aprobada |
| Frontend | 2 archivos, 3 pruebas aprobadas |
| Integración PostgreSQL/RLS | 1 suite, 100 pruebas aprobadas |
| ESLint backend/frontend | Aprobado |
| Build NestJS + React/Vite | Aprobado |
| Compose principal con URL sintética | Válido |
| Compose de integración | Válido |
| `bash -n scripts/test-integration.sh` | Aprobado |
| Prettier en TypeScript modificado | Aprobado |
