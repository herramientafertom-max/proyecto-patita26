begin;

alter table public.stock_snapshot
  add column if not exists datos_origen jsonb not null default '{}'::jsonb;

alter table public.stock_historial
  add column if not exists datos_origen jsonb not null default '{}'::jsonb;

alter table public.inventario_registro
  alter column usuario_id drop not null,
  add column if not exists nombre_usuario_origen text,
  add column if not exists perfil_origen text,
  add column if not exists datos_origen jsonb not null default '{}'::jsonb;

alter table public.foto_terreno
  alter column usuario_id drop not null,
  add column if not exists nombre_usuario_origen text,
  add column if not exists perfil_origen text,
  add column if not exists datos_origen jsonb not null default '{}'::jsonb;

alter table public.registro_acceso
  alter column usuario_id drop not null,
  add column if not exists nombre_usuario_origen text,
  add column if not exists datos_origen jsonb not null default '{}'::jsonb;

comment on column public.inventario_registro.datos_origen is
  'Representación de la fila heredada para conservar valores históricos no normalizados.';

comment on column public.foto_terreno.datos_origen is
  'Representación de la fila heredada para conservar valores históricos no normalizados.';

comment on column public.registro_acceso.nombre_usuario_origen is
  'Nombre histórico cuando el usuario ya no existe en la maestra vigente.';

commit;
