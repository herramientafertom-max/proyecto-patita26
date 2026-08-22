begin;

alter table public.persona
  drop constraint if exists persona_rut_check;

alter table public.persona
  add constraint persona_rut_check
  check (rut ~ '^([0-9]{7,8}|[0-9]{7,8}[0-9K])$');

comment on column public.persona.rut is
  'RUT canónico sin puntos ni guion; acepta cuerpo solo o cuerpo con dígito verificador, incluida K.';

commit;
