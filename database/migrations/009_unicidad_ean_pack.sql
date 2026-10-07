begin;

-- El EAN de unidad ya es único a nivel de artículo (articulo_ean_unidad_key).
-- El EAN de pack representa un código de barra físico distinto (el del pack/caja
-- comercial) y debe ser igualmente único cuando existe. Se usa un índice único
-- parcial para no romper artículos heredados sin EAN de pack (NULL).
create unique index if not exists articulo_ean_pack_key
  on public.articulo (ean_pack)
  where ean_pack is not null;

comment on column public.articulo.ean_pack is
  'EAN del formato pack/caja. Único cuando está presente (ver articulo_ean_pack_key), igual que ean_unidad.';

commit;
