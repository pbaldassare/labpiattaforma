-- Fase 2.2: Row Level Security su clienti, pratiche, storico e promemoria.

alter table venditori.cliente           enable row level security;
alter table venditori.pratica           enable row level security;
alter table venditori.contatto_storico  enable row level security;
alter table venditori.promemoria        enable row level security;

-- Proprieta' della pratica, per lo storico. security definer come le altre:
-- senza, ogni riga di storico riapplicherebbe due livelli di policy.
create or replace function venditori.pratica_mia(p_pratica_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from venditori.pratica p
    where p.id = p_pratica_id and p.user_id = (select auth.uid())
  );
$fn$;

revoke execute on function venditori.pratica_mia(uuid) from public, anon;
grant execute on function venditori.pratica_mia(uuid) to authenticated;

create policy cliente_select on venditori.cliente
  for select to authenticated using ( (select auth.uid()) = user_id );
create policy cliente_insert on venditori.cliente
  for insert to authenticated with check ( (select auth.uid()) = user_id );
create policy cliente_update on venditori.cliente
  for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy cliente_delete on venditori.cliente
  for delete to authenticated using ( (select auth.uid()) = user_id );

create policy pratica_select on venditori.pratica
  for select to authenticated using ( (select auth.uid()) = user_id );
create policy pratica_insert on venditori.pratica
  for insert to authenticated with check ( (select auth.uid()) = user_id );
create policy pratica_update on venditori.pratica
  for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy pratica_delete on venditori.pratica
  for delete to authenticated using ( (select auth.uid()) = user_id );

create policy contatto_select on venditori.contatto_storico
  for select to authenticated using ( venditori.pratica_mia(pratica_id) );
create policy contatto_insert on venditori.contatto_storico
  for insert to authenticated with check ( venditori.pratica_mia(pratica_id) );

create policy promemoria_select on venditori.promemoria
  for select to authenticated using ( (select auth.uid()) = user_id );
create policy promemoria_insert on venditori.promemoria
  for insert to authenticated with check ( (select auth.uid()) = user_id );
create policy promemoria_update on venditori.promemoria
  for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy promemoria_delete on venditori.promemoria
  for delete to authenticated using ( (select auth.uid()) = user_id );
