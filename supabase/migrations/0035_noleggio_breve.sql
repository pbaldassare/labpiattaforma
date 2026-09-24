-- btree_gist serve a mettere offerta_id (uguaglianza) e il periodo
-- (sovrapposizione) nello stesso vincolo di esclusione.
create extension if not exists btree_gist with schema extensions;

create type venditori.stato_prenotazione as enum (
  'bloccata',    -- date tenute mentre il cliente paga
  'confermata',
  'annullata',
  'scaduta'      -- il blocco e' passato senza conferma
);

create table venditori.offerta_noleggio_breve (
  offerta_id uuid primary key references venditori.offerta (id) on delete cascade,
  modello    text not null,
  targa      text,

  disponibile_dal date not null,
  disponibile_al  date not null,

  tariffa_giorno_cent             bigint not null check (tariffa_giorno_cent > 0),
  tariffa_giorno_rivenditore_cent bigint check (tariffa_giorno_rivenditore_cent > 0),

  -- Tariffa ridotta oltre 3, 7 e 15 giorni (§5.1). Facoltative.
  tariffa_oltre_3_cent  bigint check (tariffa_oltre_3_cent > 0),
  tariffa_oltre_7_cent  bigint check (tariffa_oltre_7_cent > 0),
  tariffa_oltre_15_cent bigint check (tariffa_oltre_15_cent > 0),

  km_inclusi_giorno   integer check (km_inclusi_giorno >= 0),
  costo_km_extra_cent bigint  check (costo_km_extra_cent >= 0),
  deposito_cent       bigint  check (deposito_cent >= 0),

  eta_minima   smallint check (eta_minima between 18 and 99),
  patente_anni smallint check (patente_anni between 0 and 50),

  constraint breve_modello_non_vuoto check (btrim(modello) <> ''),
  constraint breve_finestra_coerente check (disponibile_al >= disponibile_dal)
);

create table venditori.prenotazione (
  id         uuid primary key default gen_random_uuid(),
  offerta_id uuid not null references venditori.offerta (id) on delete cascade,
  user_id    uuid not null references venditori.venditore (user_id) on delete cascade,
  cliente_id uuid references venditori.cliente (id) on delete set null,

  -- Intervallo con estremo finale escluso: il giorno di riconsegna e' libero
  -- per chi ritira subito dopo, che e' come funziona un noleggio.
  periodo daterange not null,

  nome     text not null,
  telefono text,
  email    text,

  giorni        integer not null check (giorni > 0),
  tariffa_applicata_cent bigint not null,
  totale_cent   bigint not null check (totale_cent > 0),
  deposito_cent bigint not null default 0 check (deposito_cent >= 0),

  stato           venditori.stato_prenotazione not null default 'bloccata',
  -- Scadenza del blocco: senza, una prenotazione abbandonata a meta' pagamento
  -- terrebbe il mezzo occupato per sempre.
  blocco_scade_il timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint prenotazione_nome_non_vuoto check (btrim(nome) <> ''),
  constraint prenotazione_recapito check (
    coalesce(btrim(telefono), '') <> '' or coalesce(btrim(email), '') <> ''
  )
);

-- Il cuore del modulo: due prenotazioni vive non possono sovrapporsi sullo
-- stesso mezzo. E' un vincolo del database e non un controllo applicativo
-- perche' due richieste che arrivano nello stesso istante passerebbero
-- entrambe un controllo fatto prima dell'inserimento.
alter table venditori.prenotazione
  add constraint prenotazione_niente_sovrapposizioni
  exclude using gist (offerta_id with =, periodo with &&)
  where (stato in ('bloccata', 'confermata'));

create index prenotazione_offerta_idx on venditori.prenotazione (offerta_id);
create index prenotazione_scadenza_idx on venditori.prenotazione (blocco_scade_il)
  where stato = 'bloccata';

create trigger prenotazione_updated_at
  before update on venditori.prenotazione
  for each row execute function venditori.set_updated_at();

alter table venditori.offerta_noleggio_breve enable row level security;
alter table venditori.prenotazione           enable row level security;

create policy breve_select on venditori.offerta_noleggio_breve
  for select to authenticated using ( venditori.offerta_mia(offerta_id) );
create policy breve_insert on venditori.offerta_noleggio_breve
  for insert to authenticated with check ( venditori.offerta_mia(offerta_id) );
create policy breve_update on venditori.offerta_noleggio_breve
  for update to authenticated
  using ( venditori.offerta_mia(offerta_id) ) with check ( venditori.offerta_mia(offerta_id) );
create policy breve_delete on venditori.offerta_noleggio_breve
  for delete to authenticated using ( venditori.offerta_mia(offerta_id) );

create policy prenotazione_select on venditori.prenotazione
  for select to authenticated using ( (select auth.uid()) = user_id );
create policy prenotazione_update on venditori.prenotazione
  for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );

-- Nessun insert dal client: le prenotazioni nascono solo da blocca_date().

create view public.venditori_offerta_noleggio_breve
  with (security_invoker = on) as select * from venditori.offerta_noleggio_breve;
create view public.venditori_prenotazione
  with (security_invoker = on) as select * from venditori.prenotazione;

grant select, insert, update, delete on public.venditori_offerta_noleggio_breve to authenticated;
grant select, update on public.venditori_prenotazione to authenticated;
