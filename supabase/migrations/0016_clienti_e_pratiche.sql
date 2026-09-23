-- Fase 2.1: clienti, pratiche e storico dei contatti.
--
-- Un cliente e' unico per venditore e attraversa i moduli: chi ha noleggiato a
-- giugno e' lo stesso a cui a ottobre si propone l'acquisto (documento §8.1).
-- La pratica e' l'incrocio fra un'offerta e un cliente: la stessa auto proposta
-- a due persone fa due pratiche, e lo stesso cliente puo' averne piu' d'una.

create type venditori.stato_pratica as enum (
  'da_richiamare',
  'in_trattativa',
  'preventivo_inviato',
  'venduto',
  'prenotato',
  'chiuso'
);

create type venditori.origine_contatto as enum (
  'form',      -- arrivato dalla landing
  'chiamata',  -- registrato dal venditore dopo una telefonata
  'nota'       -- appunto libero
);

create table venditori.cliente (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
               references venditori.venditore (user_id) on delete cascade,
  nome       text not null,
  telefono   text,
  email      text,
  tipo       venditori.tipo_cliente not null default 'privato',
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cliente_nome_non_vuoto check (btrim(nome) <> ''),
  -- Senza almeno un recapito non e' un contatto, e' un appunto.
  constraint cliente_almeno_un_recapito check (
    coalesce(btrim(telefono), '') <> '' or coalesce(btrim(email), '') <> ''
  )
);

create index cliente_user_idx on venditori.cliente (user_id);
-- Per riconoscere chi ha gia' scritto invece di creare un doppione.
create index cliente_user_telefono_idx on venditori.cliente (user_id, telefono);
create index cliente_user_email_idx on venditori.cliente (user_id, email);

create trigger cliente_updated_at
  before update on venditori.cliente
  for each row execute function venditori.set_updated_at();

create table venditori.pratica (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
               references venditori.venditore (user_id) on delete cascade,
  cliente_id uuid not null references venditori.cliente (id) on delete cascade,
  offerta_id uuid references venditori.offerta (id) on delete set null,
  modulo     venditori.modulo not null,
  stato      venditori.stato_pratica not null default 'da_richiamare',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Se lo stesso cliente riscrive sulla stessa offerta non nasce una seconda
  -- pratica: si aggiunge una riga allo storico di quella che c'e' gia'.
  unique (cliente_id, offerta_id)
);

create index pratica_user_stato_idx on venditori.pratica (user_id, stato);
create index pratica_cliente_idx on venditori.pratica (cliente_id);
create index pratica_offerta_idx on venditori.pratica (offerta_id);

create trigger pratica_updated_at
  before update on venditori.pratica
  for each row execute function venditori.set_updated_at();

create table venditori.contatto_storico (
  id         bigint generated always as identity primary key,
  pratica_id uuid not null references venditori.pratica (id) on delete cascade,
  origine    venditori.origine_contatto not null,
  testo      text,
  creato_il  timestamptz not null default now()
);

create index contatto_storico_pratica_idx
  on venditori.contatto_storico (pratica_id, creato_il desc);

create table venditori.promemoria (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
               references venditori.venditore (user_id) on delete cascade,
  pratica_id uuid references venditori.pratica (id) on delete cascade,
  quando     timestamptz not null,
  motivo     text not null,
  fatto      boolean not null default false,
  created_at timestamptz not null default now(),

  constraint promemoria_motivo_non_vuoto check (btrim(motivo) <> '')
);

-- L'agenda si legge sempre per data, e solo i non fatti.
create index promemoria_agenda_idx
  on venditori.promemoria (user_id, quando) where not fatto;
