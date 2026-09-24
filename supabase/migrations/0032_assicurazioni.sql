-- Fase 5.1: polizze (§7.1).
--
-- Il doppio listino qui non serve: il premio e' uno solo (§3.7), quindi per
-- questo modulo non nasce mai la pagina riservata.

create type venditori.tipo_rischio as enum ('auto', 'casa', 'infortuni', 'altro');

create table venditori.offerta_assicurazione (
  offerta_id    uuid primary key references venditori.offerta (id) on delete cascade,
  compagnia     text not null,
  nome_prodotto text not null,
  tipo_rischio  venditori.tipo_rischio not null default 'auto',

  -- "Il numero mostrato e' quello di partenza, il preventivo esatto lo fa il
  -- venditore" (§7.2): nessun calcolo automatico del premio in questa versione.
  premio_partenza_cent bigint not null check (premio_partenza_cent > 0),
  -- Solo per il venditore: non compare mai in pagina.
  provvigione_cent     bigint check (provvigione_cent >= 0),

  massimale_cent  bigint check (massimale_cent >= 0),
  franchigia_cent bigint check (franchigia_cent >= 0),
  durata_mesi     smallint check (durata_mesi between 1 and 120),

  -- Documenti informativi previsti dalla normativa (§7.4).
  documenti_informativi text[] not null default '{}',

  constraint assicurazione_testi_non_vuoti check (
    btrim(compagnia) <> '' and btrim(nome_prodotto) <> ''
  )
);

-- Cosa e' compreso e cosa no, in parole semplici (§7.2). Una tabella sola con
-- un booleano invece di due elenchi: in pagina si separano, ma l'ordine in cui
-- il venditore le scrive va mantenuto.
create table venditori.garanzia (
  offerta_id uuid not null references venditori.offerta (id) on delete cascade,
  ordine     smallint not null,
  nome       text not null,
  inclusa    boolean not null default true,
  dettaglio  text,

  primary key (offerta_id, ordine),
  constraint garanzia_nome_non_vuoto check (btrim(nome) <> '')
);

alter table venditori.offerta_assicurazione enable row level security;
alter table venditori.garanzia              enable row level security;

create policy assicurazione_select on venditori.offerta_assicurazione
  for select to authenticated using ( venditori.offerta_mia(offerta_id) );
create policy assicurazione_insert on venditori.offerta_assicurazione
  for insert to authenticated with check ( venditori.offerta_mia(offerta_id) );
create policy assicurazione_update on venditori.offerta_assicurazione
  for update to authenticated
  using ( venditori.offerta_mia(offerta_id) ) with check ( venditori.offerta_mia(offerta_id) );
create policy assicurazione_delete on venditori.offerta_assicurazione
  for delete to authenticated using ( venditori.offerta_mia(offerta_id) );

create policy garanzia_select on venditori.garanzia
  for select to authenticated using ( venditori.offerta_mia(offerta_id) );
create policy garanzia_insert on venditori.garanzia
  for insert to authenticated with check ( venditori.offerta_mia(offerta_id) );
create policy garanzia_update on venditori.garanzia
  for update to authenticated
  using ( venditori.offerta_mia(offerta_id) ) with check ( venditori.offerta_mia(offerta_id) );
create policy garanzia_delete on venditori.garanzia
  for delete to authenticated using ( venditori.offerta_mia(offerta_id) );

create view public.venditori_offerta_assicurazione
  with (security_invoker = on) as select * from venditori.offerta_assicurazione;
create view public.venditori_garanzia
  with (security_invoker = on) as select * from venditori.garanzia;

grant select, insert, update, delete
  on public.venditori_offerta_assicurazione, public.venditori_garanzia
  to authenticated;
