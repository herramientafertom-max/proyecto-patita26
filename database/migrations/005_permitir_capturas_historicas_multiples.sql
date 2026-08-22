begin;

alter table public.stock_historial
  drop constraint if exists stock_historial_local_id_producto_cliente_id_fecha_key;

create index if not exists stock_historial_busqueda_idx
  on public.stock_historial (local_id, producto_cliente_id, fecha desc);

comment on table public.stock_historial is
  'Historial heredado y futuro. Puede contener varias capturas del mismo producto, local y fecha; cada fila conserva su origen y un ID único.';

commit;
