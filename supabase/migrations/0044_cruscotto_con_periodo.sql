/*
 * Aperture e contatti anche sugli ultimi trenta giorni.
 *
 * Il totale da sempre non dice niente: "49 aperture" puo' voler dire che le
 * pagine vanno bene adesso o che sono andate bene un anno fa. Il numero che
 * serve in home e' quello del mese, con il totale accanto come riferimento.
 *
 * Arriva anche l'offerta che tira di piu': e' la risposta alla domanda per cui
 * il documento chiede i numeri, "capire quali annunci funzionano" (§8.4).
 */
create or replace function venditori.cruscotto()
returns json
language sql
stable
security definer
set search_path = ''
as $fn$
  with mie as (
    select pg.id as pagina_id, pg.tipo, o.id as offerta_id, o.titolo
      from venditori.pagina pg
      join venditori.offerta o on o.id = pg.offerta_id
     where o.user_id = (select auth.uid())
  ),
  eventi as (
    select e.tipo as evento, m.tipo as pagina, m.titolo, e.creato_il
      from venditori.evento_pagina e
      join mie m on m.pagina_id = e.pagina_id
  )
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
    'pratiche_chiuse', (
      select count(*) from venditori.pratica p
       where p.user_id = (select auth.uid()) and p.stato in ('venduto', 'chiuso')
    ),
    'aperture', (select count(*) from eventi where evento = 'apertura'),
    'aperture_pubbliche', (
      select count(*) from eventi where evento = 'apertura' and pagina = 'pubblica'
    ),
    'aperture_riservate', (
      select count(*) from eventi where evento = 'apertura' and pagina = 'riservata'
    ),
    'aperture_30', (
      select count(*) from eventi
       where evento = 'apertura' and creato_il > now() - interval '30 days'
    ),
    'contatti', (select count(*) from eventi where evento = 'contatto'),
    'contatti_pubblici', (
      select count(*) from eventi where evento = 'contatto' and pagina = 'pubblica'
    ),
    'contatti_riservati', (
      select count(*) from eventi where evento = 'contatto' and pagina = 'riservata'
    ),
    'contatti_30', (
      select count(*) from eventi
       where evento = 'contatto' and creato_il > now() - interval '30 days'
    ),
    -- L'annuncio piu' aperto del mese, con quanti gli hanno scritto.
    'migliore', (
      select json_build_object(
               'titolo', titolo,
               'aperture', count(*) filter (where evento = 'apertura'),
               'contatti', count(*) filter (where evento = 'contatto')
             )
        from eventi
       where creato_il > now() - interval '30 days'
       group by titolo
      having count(*) filter (where evento = 'apertura') > 0
       order by count(*) filter (where evento = 'apertura') desc
       limit 1
    ),
    'prenotazioni', (
      select count(*) from venditori.prenotazione pr
       where pr.user_id = (select auth.uid())
         and pr.stato in ('bloccata', 'confermata')
    ),
    'clienti', (
      select count(*) from venditori.cliente c where c.user_id = (select auth.uid())
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
