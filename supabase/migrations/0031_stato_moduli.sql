-- Fase 7.3: lo stato dei quattro moduli (§8.5).
--
-- Tutti e quattro sempre, anche quelli mai usati: un modulo assente
-- dall'elenco e' un modulo che non verra' mai comprato.

create or replace function venditori.stato_moduli()
returns json
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(json_agg(json_build_object(
           'modulo', m.modulo,
           'offerte_attive', coalesce(o.attive, 0),
           'pratiche_aperte', coalesce(p.aperte, 0),
           'utilizzi_consumati', coalesce(ms.utilizzi_consumati, 0),
           'utilizzi_inclusi', coalesce(ms.utilizzi_inclusi, 5),
           'acquistato_fino_a', ms.acquistato_fino_a
         ) order by m.ordine), '[]'::json)
    from (values
      ('vendita'::venditori.modulo, 1),
      ('noleggio_breve', 2),
      ('noleggio_lungo', 3),
      ('assicurazioni', 4)
    ) as m(modulo, ordine)
    left join venditori.modulo_stato ms
           on ms.modulo = m.modulo and ms.user_id = (select auth.uid())
    left join lateral (
      select count(*) as attive from venditori.offerta o2
       where o2.user_id = (select auth.uid()) and o2.modulo = m.modulo
         and o2.stato = 'attiva'
    ) o on true
    left join lateral (
      select count(*) as aperte from venditori.pratica p2
       where p2.user_id = (select auth.uid()) and p2.modulo = m.modulo
         and p2.stato not in ('chiuso', 'venduto', 'respinta')
    ) p on true;
$fn$;

revoke execute on function venditori.stato_moduli() from public, anon;
grant execute on function venditori.stato_moduli() to authenticated;

create or replace function public.venditori_stato_moduli()
returns json language sql stable security definer set search_path = ''
as $fn$ select venditori.stato_moduli(); $fn$;

revoke execute on function public.venditori_stato_moduli() from public, anon;
grant execute on function public.venditori_stato_moduli() to authenticated;
