begin;

-- SAP de pack por cadena. El SAP de unidad ya existe en producto_cadena.sap.
alter table public.producto_cadena
  add column if not exists sap_pack text;

comment on column public.producto_cadena.sap_pack is
  'Código SAP del formato pack/caja en la cadena. El SAP de unidad ya existe en la columna sap.';

-- Precio de pack por empresa cliente. El precio de unidad ya existe en producto_cliente.precio.
alter table public.producto_cliente
  add column if not exists precio_pack numeric;

comment on column public.producto_cliente.precio_pack is
  'Precio del formato pack para esta empresa cliente. El precio de unidad ya existe en la columna precio.';

-- Campaña comercial. Vive en producto_cliente porque cada empresa cliente puede activar
-- una campaña distinta sobre el mismo producto de cadena/homologado.
alter table public.producto_cliente
  add column if not exists campana_activa boolean not null default false,
  add column if not exists campana_desde date,
  add column if not exists campana_hasta date;

alter table public.producto_cliente
  drop constraint if exists producto_cliente_campana_desde_ck;
alter table public.producto_cliente
  add constraint producto_cliente_campana_desde_ck
  check (campana_activa = false or campana_desde is not null);

alter table public.producto_cliente
  drop constraint if exists producto_cliente_campana_rango_ck;
alter table public.producto_cliente
  add constraint producto_cliente_campana_rango_ck
  check (campana_hasta is null or campana_desde is null or campana_hasta >= campana_desde);

comment on column public.producto_cliente.campana_activa is
  'Campaña comercial activa para este producto en esta empresa cliente.';

-- Quiebre de stock declarado administrativamente.
-- Decisión de diseño: vive en producto_cliente (no en producto_cadena ni articulo) porque
-- es una declaración operativa de la empresa cliente sobre su relación con el producto,
-- análoga a "estado" y "precio", que ya son atributos por cliente en esta tabla.
-- No sustituye ni se calcula desde stock_snapshot: el quiebre es una decisión manual del
-- Administrador/Supervisor, no una lectura de inventario.
-- Preparado para una futura propagación masiva por EAN (candado >= 8 dígitos, como en el
-- legacy AAF 01.428) reutilizando producto_cadena.articulo_id -> articulo.ean_unidad, que
-- ya existen; esa propagación no se implementa en este incremento.
alter table public.producto_cliente
  add column if not exists quiebre_activo boolean not null default false,
  add column if not exists quiebre_declarado_en timestamptz,
  add column if not exists quiebre_declarado_por uuid references public.usuario(id) on delete set null;

alter table public.producto_cliente
  drop constraint if exists producto_cliente_quiebre_declarado_en_ck;
alter table public.producto_cliente
  add constraint producto_cliente_quiebre_declarado_en_ck
  check (quiebre_activo = false or quiebre_declarado_en is not null);

comment on column public.producto_cliente.quiebre_activo is
  'Quiebre declarado manualmente por Administrador/Supervisor para esta empresa cliente. No representa el stock físico (ver stock_snapshot).';

-- Amplía producto_imagen para admitir el formato "pack" además de unidad y caja.
alter table public.producto_imagen
  drop constraint if exists producto_imagen_tipo_check;
alter table public.producto_imagen
  add constraint producto_imagen_tipo_check
  check (tipo in ('unidad', 'pack', 'caja'));

create index if not exists producto_cliente_quiebre_activo_idx
  on public.producto_cliente (empresa_cliente_id)
  where quiebre_activo = true;

create index if not exists producto_cliente_campana_activa_idx
  on public.producto_cliente (empresa_cliente_id)
  where campana_activa = true;

commit;
