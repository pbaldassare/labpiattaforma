-- Fase 4.2: offerta di noleggio lungo termine e griglia dei canoni (§6.1).

create type venditori.servizio_incluso as enum (
  'assicurazione', 'manutenzione', 'bollo', 'gomme', 'auto_sostitutiva', 'assistenza'
);

create table venditori.offerta_noleggio_lungo (
  offerta_id   uuid primary key references venditori.offerta (id) on delete cascade,
  marca        text not null,
  modello      text not null,
  allestimento text,

  anticipo_cent bigint check (anticipo_cent >= 0),
  servizi       venditori.servizio_incluso[] not null default '{}',

  tempi_consegna       text,
  riscatto_previsto    boolean not null default false,
  riscatto_valore_cent bigint check (riscatto_valore_cent >= 0),

  constraint lungo_marca_modello_non_vuoti check (
    btrim(marca) <> '' and btrim(modello) <> ''
  )
);

-- La griglia dei canoni: una riga per ogni combinazione durata x chilometri.
--
-- Il documento (§6.1) la chiama "il campo piu' importante del modulo", ed e'
-- vero: e' quella che permette alla pagina di rispondere da sola alla domanda
-- "quanto mi costa al mese", senza che il venditore faccia un preventivo a
-- mano. Una tabella e non un campo JSON, cosi' i vincoli valgono davvero e la
-- pagina puo' chiedere il canone minimo senza scorrere tutto.
create table venditori.canone_lungo (
  offerta_id  uuid not null references venditori.offerta (id) on delete cascade,
  durata_mesi smallint not null check (durata_mesi between 1 and 60),
  km_annui    integer  not null check (km_annui > 0),

  canone_pubblico_cent    bigint not null check (canone_pubblico_cent > 0),
  -- Facoltativo, come il prezzo rivenditore della vendita: senza almeno un
  -- canone riservato, la pagina riservata non nasce.
  canone_rivenditore_cent bigint check (canone_rivenditore_cent > 0),

  primary key (offerta_id, durata_mesi, km_annui)
);

create index canone_lungo_minimo_idx
  on venditori.canone_lungo (offerta_id, canone_pubblico_cent);

alter table venditori.offerta_noleggio_lungo enable row level security;
alter table venditori.canone_lungo           enable row level security;

create policy lungo_select on venditori.offerta_noleggio_lungo
  for select to authenticated using ( venditori.offerta_mia(offerta_id) );
create policy lungo_insert on venditori.offerta_noleggio_lungo
  for insert to authenticated with check ( venditori.offerta_mia(offerta_id) );
create policy lungo_update on venditori.offerta_noleggio_lungo
  for update to authenticated
  using ( venditori.offerta_mia(offerta_id) ) with check ( venditori.offerta_mia(offerta_id) );
create policy lungo_delete on venditori.offerta_noleggio_lungo
  for delete to authenticated using ( venditori.offerta_mia(offerta_id) );

create policy canone_select on venditori.canone_lungo
  for select to authenticated using ( venditori.offerta_mia(offerta_id) );
create policy canone_insert on venditori.canone_lungo
  for insert to authenticated with check ( venditori.offerta_mia(offerta_id) );
create policy canone_update on venditori.canone_lungo
  for update to authenticated
  using ( venditori.offerta_mia(offerta_id) ) with check ( venditori.offerta_mia(offerta_id) );
create policy canone_delete on venditori.canone_lungo
  for delete to authenticated using ( venditori.offerta_mia(offerta_id) );

create view public.venditori_offerta_noleggio_lungo
  with (security_invoker = on) as select * from venditori.offerta_noleggio_lungo;
create view public.venditori_canone_lungo
  with (security_invoker = on) as select * from venditori.canone_lungo;

grant select, insert, update, delete
  on public.venditori_offerta_noleggio_lungo, public.venditori_canone_lungo
  to authenticated;
