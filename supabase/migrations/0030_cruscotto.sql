-- Fase 7.2: i numeri del venditore (§8.4).
--
-- Poche cifre in una richiesta sola. Chiederle una per una sarebbe cinque
-- viaggi di rete per una schermata che si apre dieci volte al giorno.
--
-- Il prossimo promemoria sta qui e non fra i numeri perche' e' l'unica voce
-- che chiede di fare qualcosa adesso: in pagina va sopra tutto il resto.

create or replace function venditori.cruscotto()
returns json
language sql
stable
security definer
set search_path = ''
as $fn$
  select json_build_object(
    'offerte_attive', (
      select count(*) from venditori.offerta o
       where o.user_id = (select auth.uid()) and o.stato = 'attiva'
    ),
    'da_richiamare', (
      select count(*) from venditori.pratica p
       where p.user_id = (select auth.uid()) and p.stato = 'da_richiamare'
    ),
    'in_corso', (
      select count(*) from venditori.pratica p
       where p.user_id = (select auth.uid())
         and p.stato in ('in_trattativa', 'preventivo_inviato', 'da_valutare')
    ),
    'aperture', (
      select count(*)
        from venditori.evento_pagina e
        join venditori.pagina pg on pg.id = e.pagina_id
        join venditori.offerta o  on o.id = pg.offerta_id
       where o.user_id = (select auth.uid()) and e.tipo = 'apertura'
    ),
    'contatti', (
      select count(*)
        from venditori.evento_pagina e
        join venditori.pagina pg on pg.id = e.pagina_id
        join venditori.offerta o  on o.id = pg.offerta_id
       where o.user_id = (select auth.uid()) and e.tipo = 'contatto'
    ),
    'prossimo_promemoria', (
      select json_build_object('quando', pr.quando, 'motivo', pr.motivo, 'pratica_id', pr.pratica_id)
        from venditori.promemoria pr
       where pr.user_id = (select auth.uid()) and not pr.fatto
       order by pr.quando
       limit 1
    )
  );
$fn$;

revoke execute on function venditori.cruscotto() from public, anon;
grant execute on function venditori.cruscotto() to authenticated;

create or replace function public.venditori_cruscotto()
returns json language sql stable security definer set search_path = ''
as $fn$ select venditori.cruscotto(); $fn$;

revoke execute on function public.venditori_cruscotto() from public, anon;
grant execute on function public.venditori_cruscotto() to authenticated;
