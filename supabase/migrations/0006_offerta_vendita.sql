-- Fase 1.1: l'offerta, con la parte specifica del modulo Vendita.
--
-- Struttura scelta: una tabella comune con cio' che vale per tutti i moduli
-- (chi la possiede, stato, titolo, copertina) e una tabella per modulo con i
-- suoi campi. L'alternativa, un unico campo JSON, sarebbe piu' rapida da
-- scrivere ma non permetterebbe vincoli veri sui prezzi ne' sulle griglie
-- canoni del noleggio lungo, che arrivano dopo.
--
-- Tutti gli importi sono in centesimi e interi: i decimali in virgola mobile
-- sui prezzi producono errori di arrotondamento sui totali.

create type venditori.stato_offerta as enum (
  'bozza',    -- in lavorazione, nessuna pagina visibile
  'attiva',   -- pubblicabile
  'sospesa',  -- tolta dalla circolazione dal venditore
  'venduta'   -- chiusa: la pagina lo dice da sola e sparisce dalla vetrina
);

create type venditori.alimentazione as enum (
  'benzina', 'diesel', 'gpl', 'metano', 'ibrida', 'elettrica', 'altro'
);

create type venditori.cambio as enum ('manuale', 'automatico');

create type venditori.provenienza as enum ('proprio', 'fornitore');

create type venditori.formula_acquisto as enum (
  'contanti', 'finanziamento', 'permuta', 'noleggio_lungo'
);

-- ------------------------------------------------------------------ offerta
create table venditori.offerta (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid()
                   references auth.users (id) on delete cascade,
  modulo         venditori.modulo not null,
  -- Composto dai campi del modulo (marca + modello per la vendita) e tenuto
  -- qui perche' la vetrina elenca offerte di moduli diversi in un colpo solo.
  titolo         text not null,
  stato          venditori.stato_offerta not null default 'bozza',
  copertina_path text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint offerta_titolo_non_vuoto check (btrim(titolo) <> '')
);

create index offerta_user_idx on venditori.offerta (user_id);
create index offerta_user_modulo_idx on venditori.offerta (user_id, modulo);

create trigger offerta_updated_at
  before update on venditori.offerta
  for each row execute function venditori.set_updated_at();

-- ---------------------------------------------------------- offerta_vendita
create table venditori.offerta_vendita (
  offerta_id uuid primary key
               references venditori.offerta (id) on delete cascade,
  marca      text not null,
  modello    text not null,
  targa      text,
  chilometri integer  check (chilometri >= 0),
  anno       smallint check (anno between 1900 and 2100),
  alimentazione venditori.alimentazione,
  cambio        venditori.cambio,

  -- Solo per il venditore: non compare mai su nessuna pagina.
  prezzo_acquisto_cent    bigint check (prezzo_acquisto_cent >= 0),
  -- Il numero in evidenza sulla pagina pubblica.
  prezzo_pubblico_cent    bigint not null check (prezzo_pubblico_cent > 0),
  -- Facoltativo: senza questo, la pagina riservata non si genera.
  prezzo_rivenditore_cent bigint check (prezzo_rivenditore_cent > 0),

  provenienza    venditori.provenienza not null default 'proprio',
  fornitore_nome text,

  constraint vendita_marca_modello_non_vuoti check (
    btrim(marca) <> '' and btrim(modello) <> ''
  ),
  constraint vendita_fornitore_richiesto check (
    provenienza = 'proprio' or btrim(coalesce(fornitore_nome, '')) <> ''
  )
);

-- La targa si scrive maiuscola comunque la digiti il venditore.
create or replace function venditori.normalizza_targa()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  if new.targa is not null then
    new.targa := upper(btrim(new.targa));
    if new.targa = '' then
      new.targa := null;
    end if;
  end if;
  return new;
end;
$fn$;

create trigger offerta_vendita_targa
  before insert or update of targa on venditori.offerta_vendita
  for each row execute function venditori.normalizza_targa();

-- ------------------------------------------------------------ offerta_foto
create table venditori.offerta_foto (
  id         uuid primary key default gen_random_uuid(),
  offerta_id uuid not null references venditori.offerta (id) on delete cascade,
  path       text not null,
  -- La prima e' la copertina.
  ordine     smallint not null default 0 check (ordine >= 0),
  created_at timestamptz not null default now(),

  unique (offerta_id, ordine)
);

create index offerta_foto_offerta_idx on venditori.offerta_foto (offerta_id);

-- --------------------------------------------------------- offerta_formula
-- Le formule di acquisto mostrate al cliente, con la provvigione che il
-- venditore incassa. Gli importi del documento sono da confermare, quindi
-- stanno qui come dato e non come costante nel codice.
create table venditori.offerta_formula (
  offerta_id       uuid not null references venditori.offerta (id) on delete cascade,
  formula          venditori.formula_acquisto not null,
  provvigione_cent bigint not null default 0 check (provvigione_cent >= 0),

  primary key (offerta_id, formula)
);

-- Proprieta' dell'offerta, per le policy delle tabelle collegate.
-- security definer: senza, ogni controllo riapplicherebbe le policy di
-- "offerta" dentro la policy della tabella figlia, con il doppio del lavoro.
create or replace function venditori.offerta_mia(p_offerta_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from venditori.offerta o
    where o.id = p_offerta_id and o.user_id = (select auth.uid())
  );
$fn$;

revoke execute on function venditori.offerta_mia(uuid) from public, anon;
grant execute on function venditori.offerta_mia(uuid) to authenticated;
