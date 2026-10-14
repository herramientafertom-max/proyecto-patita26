\set ON_ERROR_STOP on

-- Minimal, disposable Supabase surface required by the project migrations.
-- This file deliberately does not import or depend on historical/production data.

create extension if not exists pgcrypto;

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'retail_api') then
    create role retail_api login password 'retail_api_local_only'
      noinherit nobypassrls;
  end if;
end
$roles$;

create schema if not exists auth;
create schema if not exists storage;

create table auth.users (
  id uuid primary key,
  email text unique,
  created_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table storage.buckets (
  id text primary key,
  name text not null unique,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

grant usage on schema auth to authenticated, service_role;
grant execute on function auth.uid() to authenticated, service_role;
grant usage on schema storage to service_role;
grant select, insert, update, delete on storage.buckets to service_role;
