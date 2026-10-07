begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', false, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('field-photos', 'field-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.producto_imagen.referencia_archivo is
  'Referencia heredada (Drive) o ruta privada del objeto en el bucket product-images.';
comment on column public.foto_terreno.foto_referencia is
  'Referencia heredada (Drive) o ruta privada del objeto en el bucket field-photos.';

commit;
