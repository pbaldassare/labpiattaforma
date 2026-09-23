-- Fase 0.4: Row Level Security.
--
-- La chiave pubblicabile e' dentro il bundle dell'app: chiunque la puo' leggere.
-- Le policy sono l'unica cosa che separa i dati di un venditore da quelli di un altro.
--
-- Convenzioni applicate ovunque:
--   * una policy per operazione, mai "for all"
--   * "to authenticated" sempre esplicito (senza, vale anche per gli anonimi)
--   * "(select auth.uid())" e mai "auth.uid()" nudo: valutato una volta sola
--   * su update sia using sia with check, o si puo' riassegnare la riga a un altro
--   * nessuna delete dal client

alter table venditori.venditore     enable row level security;
alter table venditori.slug_storico  enable row level security;
alter table venditori.slug_riservato enable row level security;
alter table venditori.modulo_stato  enable row level security;

-- ---------------------------------------------------------------- venditore
create policy venditore_select_proprio
  on venditori.venditore for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy venditore_insert_proprio
  on venditori.venditore for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy venditore_update_proprio
  on venditori.venditore for update to authenticated
  using      ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- ------------------------------------------------------------- slug_storico
-- Sola lettura: le righe le scrive il trigger, non il client.
create policy slug_storico_select_proprio
  on venditori.slug_storico for select to authenticated
  using ( (select auth.uid()) = user_id );

-- ------------------------------------------------------------ slug_riservato
-- Elenco pubblico fra gli autenticati: serve all'app per spiegare il rifiuto.
create policy slug_riservato_select
  on venditori.slug_riservato for select to authenticated
  using ( true );

-- ------------------------------------------------------------- modulo_stato
create policy modulo_stato_select_proprio
  on venditori.modulo_stato for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy modulo_stato_insert_proprio
  on venditori.modulo_stato for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy modulo_stato_update_proprio
  on venditori.modulo_stato for update to authenticated
  using      ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );
