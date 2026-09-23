-- Fase 1.3: Row Level Security sulle offerte e sulle pagine.
--
-- Stesse convenzioni della Fase 0: una policy per operazione, "to authenticated"
-- esplicito, "(select auth.uid())" mai nudo, "with check" su ogni update.

alter table venditori.offerta         enable row level security;
alter table venditori.offerta_vendita enable row level security;
alter table venditori.offerta_foto    enable row level security;
alter table venditori.offerta_formula enable row level security;
alter table venditori.pagina          enable row level security;
alter table venditori.evento_pagina   enable row level security;

-- Proprieta' della pagina, per gli eventi. Come offerta_mia: security definer
-- per non riapplicare due livelli di policy a ogni riga di evento.
create or replace function venditori.pagina_mia(p_pagina_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
      from venditori.pagina p
      join venditori.offerta o on o.id = p.offerta_id
     where p.id = p_pagina_id and o.user_id = (select auth.uid())
  );
$fn$;

revoke execute on function venditori.pagina_mia(uuid) from public, anon;
grant execute on function venditori.pagina_mia(uuid) to authenticated;

-- ------------------------------------------------------------------ offerta
create policy offerta_select_propria
  on venditori.offerta for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy offerta_insert_propria
  on venditori.offerta for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy offerta_update_propria
  on venditori.offerta for update to authenticated
  using      ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- Cancellare una bozza sbagliata dev'essere possibile; le pagine e le foto
-- collegate spariscono a cascata.
create policy offerta_delete_propria
  on venditori.offerta for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------- tabelle collegate all'offerta
create policy offerta_vendita_select on venditori.offerta_vendita
  for select to authenticated using ( venditori.offerta_mia(offerta_id) );
create policy offerta_vendita_insert on venditori.offerta_vendita
  for insert to authenticated with check ( venditori.offerta_mia(offerta_id) );
create policy offerta_vendita_update on venditori.offerta_vendita
  for update to authenticated
  using ( venditori.offerta_mia(offerta_id) )
  with check ( venditori.offerta_mia(offerta_id) );
create policy offerta_vendita_delete on venditori.offerta_vendita
  for delete to authenticated using ( venditori.offerta_mia(offerta_id) );

create policy offerta_foto_select on venditori.offerta_foto
  for select to authenticated using ( venditori.offerta_mia(offerta_id) );
create policy offerta_foto_insert on venditori.offerta_foto
  for insert to authenticated with check ( venditori.offerta_mia(offerta_id) );
create policy offerta_foto_update on venditori.offerta_foto
  for update to authenticated
  using ( venditori.offerta_mia(offerta_id) )
  with check ( venditori.offerta_mia(offerta_id) );
create policy offerta_foto_delete on venditori.offerta_foto
  for delete to authenticated using ( venditori.offerta_mia(offerta_id) );

create policy offerta_formula_select on venditori.offerta_formula
  for select to authenticated using ( venditori.offerta_mia(offerta_id) );
create policy offerta_formula_insert on venditori.offerta_formula
  for insert to authenticated with check ( venditori.offerta_mia(offerta_id) );
create policy offerta_formula_update on venditori.offerta_formula
  for update to authenticated
  using ( venditori.offerta_mia(offerta_id) )
  with check ( venditori.offerta_mia(offerta_id) );
create policy offerta_formula_delete on venditori.offerta_formula
  for delete to authenticated using ( venditori.offerta_mia(offerta_id) );

-- ------------------------------------------------------------------- pagina
-- Nessuna policy di insert: le pagine nascono solo da genera_pagine(), cosi'
-- il codice riservato non puo' essere scelto dal client.
create policy pagina_select_propria on venditori.pagina
  for select to authenticated using ( venditori.offerta_mia(offerta_id) );

-- Serve all'interruttore pubblica/sospendi.
create policy pagina_update_propria on venditori.pagina
  for update to authenticated
  using ( venditori.offerta_mia(offerta_id) )
  with check ( venditori.offerta_mia(offerta_id) );

-- ------------------------------------------------------------ evento_pagina
-- Sola lettura: gli eventi li scrive il server delle landing.
create policy evento_pagina_select_proprio on venditori.evento_pagina
  for select to authenticated using ( venditori.pagina_mia(pagina_id) );
