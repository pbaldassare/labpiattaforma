-- Fase 0.2: profilo del venditore, slug della vetrina, contatori dei moduli.

-- Parole che nessun venditore puo' usare come slug.
-- Tabella e non costante nel codice: se ne aggiungono senza rilasciare l'app.
create table venditori.slug_riservato (
  slug   text primary key,
  motivo text
);

-- Il profilo. Una riga per venditore, legata all'utente autenticato.
create table venditori.venditore (
  user_id           uuid primary key default auth.uid()
                      references auth.users (id) on delete cascade,
  slug              text not null,
  nome_visualizzato text not null,
  logo_path         text,
  telefono          text,
  whatsapp          text,
  email_pubblica    text,
  presentazione     text,
  ragione_sociale   text,
  piva_cf           text,
  -- Il RUI e' del venditore, non del singolo prodotto assicurativo:
  -- uno stesso venditore ha un solo numero per tutte le polizze che propone.
  rui_numero        text,
  stato             venditori.stato_venditore not null default 'attivo',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint venditore_slug_formato check (
    slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' and slug !~ '--'
  ),
  constraint venditore_nome_non_vuoto check (btrim(nome_visualizzato) <> '')
);

create unique index venditore_slug_unico on venditori.venditore (slug);

-- Gli slug abbandonati. Servono a due cose:
--  1. il vecchio indirizzo continua a funzionare (redirect permanente),
--     cosi' i QR gia' stampati non diventano carta straccia;
--  2. il vecchio slug non e' piu' assegnabile ad ALTRI venditori, altrimenti
--     il successivo erediterebbe il traffico dei QR stampati dal primo.
-- Resta invece riprendibile da chi lo aveva, se cambia idea.
create table venditori.slug_storico (
  slug        text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  dismesso_il timestamptz not null default now()
);

create index slug_storico_user_id_idx on venditori.slug_storico (user_id);

-- Contatore degli utilizzi gratuiti e stato d'acquisto, per modulo.
-- Vive sul server: un contatore sul telefono si azzera reinstallando l'app.
create table venditori.modulo_stato (
  user_id            uuid not null default auth.uid()
                       references auth.users (id) on delete cascade,
  modulo             venditori.modulo not null,
  utilizzi_consumati integer not null default 0 check (utilizzi_consumati >= 0),
  utilizzi_inclusi   integer not null default 5 check (utilizzi_inclusi >= 0),
  acquistato_fino_a  timestamptz,
  origine_acquisto   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  primary key (user_id, modulo)
);

create trigger venditore_updated_at
  before update on venditori.venditore
  for each row execute function venditori.set_updated_at();

create trigger modulo_stato_updated_at
  before update on venditori.modulo_stato
  for each row execute function venditori.set_updated_at();
