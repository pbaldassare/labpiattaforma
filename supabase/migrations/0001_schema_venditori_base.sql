-- Lab Piattaforma — App Venditori
-- Fase 0.1: schema dedicato, permessi, tipi di base.
--
-- Il progetto Supabase ospita gia' tre applicazioni nello schema "public".
-- Tutto cio' che riguarda l'App Venditori vive in uno schema separato:
-- "public" non viene mai toccato.

create schema if not exists venditori;

-- Supabase configura i grant automaticamente solo per "public".
-- Su uno schema nuovo, senza questi, ogni query risponde "permission denied"
-- anche con RLS e policy corrette.
grant usage on schema venditori to anon, authenticated, service_role;

-- I privilegi sulle tabelle vanno solo ai ruoli che in Fase 0 devono operare.
-- "anon" ricevera' grant mirati in Fase 1, e solo sulle due cose che gli servono:
-- l'invio del form di contatto e il conteggio delle aperture di pagina.
grant all on all tables in schema venditori to authenticated, service_role;
grant all on all sequences in schema venditori to authenticated, service_role;
grant all on all routines in schema venditori to authenticated, service_role;

alter default privileges for role postgres in schema venditori
  grant all on tables to authenticated, service_role;
alter default privileges for role postgres in schema venditori
  grant all on sequences to authenticated, service_role;
alter default privileges for role postgres in schema venditori
  grant all on routines to authenticated, service_role;

-- Tipi condivisi da tutti i moduli.
create type venditori.modulo as enum (
  'vendita',
  'noleggio_breve',
  'noleggio_lungo',
  'assicurazioni'
);

create type venditori.tipo_cliente as enum ('privato', 'rivenditore');

create type venditori.stato_venditore as enum ('attivo', 'sospeso');

-- Aggiornamento automatico di updated_at.
create or replace function venditori.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;
