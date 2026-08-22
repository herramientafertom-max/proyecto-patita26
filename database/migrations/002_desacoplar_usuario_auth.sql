begin;

alter table public.usuario
  drop constraint if exists usuario_id_fkey;

alter table public.usuario
  alter column id set default gen_random_uuid();

alter table public.usuario
  add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuario_auth_user_id_fkey'
      and conrelid = 'public.usuario'::regclass
  ) then
    alter table public.usuario
      add constraint usuario_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete set null;
  end if;
end
$$;

create unique index if not exists usuario_auth_user_id_uq
  on public.usuario (auth_user_id)
  where auth_user_id is not null;

comment on column public.usuario.auth_user_id is
  'Cuenta opcional de Supabase Auth. Los usuarios heredados pueden existir antes de crear sus credenciales.';

commit;
