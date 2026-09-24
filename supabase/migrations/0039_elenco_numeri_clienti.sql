-- Fase 7: le parti comuni ai quattro moduli.
--
-- Tre cose in una migrazione sola perche' sono la stessa idea: guardare le
-- offerte, i numeri e i clienti senza piu' distinguere il modulo.

-- 1. L'elenco delle offerte mostra tutti e quattro i moduli.
--
-- Prima univa solo vendita e noleggio lungo: un'offerta di noleggio breve o
-- una polizza comparivano senza numero e senza foto. La copertina esplicita
-- vince sulla prima foto, che e' quella che il venditore ha messo per prima.
create or replace view public.venditori_offerta_elenco
with (security_invoker = on) as
  select
    o.id, o.user_id, o.modulo, o.titolo, o.stato, o.copertina_path,
    o.created_at, o.updated_at,
    coalesce(ov.marca, ol.marca)     as marca,
    coalesce(ov.modello, ol.modello) as modello,
    ov.prezzo_pubblico_cent,
    ov.prezzo_rivenditore_cent,
    (select min(c.canone_pubblico_cent)
       from venditori.canone_lungo c where c.offerta_id = o.id) as canone_minimo_cent,
    ob.tariffa_giorno_cent,
    oa.premio_partenza_cent,
    coalesce(
      o.copertina_path,
      (select f.path from venditori.offerta_foto f
        where f.offerta_id = o.id order by f.ordine limit 1)
    ) as foto_path,
    (select count(*) from venditori.offerta_foto f where f.offerta_id = o.id) as quante_foto
  from venditori.offerta o
  left join venditori.offerta_vendita ov        on ov.offerta_id = o.id
  left join venditori.offerta_noleggio_lungo ol on ol.offerta_id = o.id
  left join venditori.offerta_noleggio_breve ob on ob.offerta_id = o.id
  left join venditori.offerta_assicurazione oa  on oa.offerta_id = o.id;

-- 2. I numeri del venditore (§8.4).
--
-- Le aperture vanno separate fra pagina pubblica e riservata: sono due
-- pubblici diversi, e un annuncio che gira fra i rivenditori ma non fra i
-- privati dice qualcosa che il totale nasconderebbe.
create or replace function venditori.cruscotto()
returns json
language sql
stable
security definer
set search_path = ''
as $fn$
  with mie as (
    select pg.id as pagina_id, pg.tipo
      from venditori.pagina pg
      join venditori.offerta o on o.id = pg.offerta_id
     where o.user_id = (select auth.uid())
  ),
  eventi as (
    select e.tipo as evento, m.tipo as pagina
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
    'contatti', (select count(*) from eventi where evento = 'contatto'),
    'contatti_pubblici', (
      select count(*) from eventi where evento = 'contatto' and pagina = 'pubblica'
    ),
    'contatti_riservati', (
      select count(*) from eventi where evento = 'contatto' and pagina = 'riservata'
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

/*
 * 3. I contatti (§8.1).
 *
 * Un elenco solo, con lo storico di tutte le offerte mandate in qualunque
 * modulo: "chi ha noleggiato a giugno e' lo stesso a cui a ottobre si propone
 * l'acquisto". Percio' le pratiche del cliente arrivano dentro la riga, e non
 * da una seconda richiesta per ogni cliente aperto.
 *
 * Una vista non basterebbe: l'aggregato annidato si scrive molto meglio qui, e
 * la lettura resta limitata alle righe di chi chiama.
 */
create or replace function venditori.clienti()
returns json
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(json_agg(riga order by riga->>'ultimo_contatto' desc nulls last), '[]'::json)
    from (
      select json_build_object(
        'id', c.id,
        'nome', c.nome,
        'tipo', c.tipo,
        'telefono', c.telefono,
        'email', c.email,
        'note', c.note,
        'quante_pratiche', (
          select count(*) from venditori.pratica p where p.cliente_id = c.id
        ),
        'moduli', coalesce((
          select json_agg(distinct p.modulo) from venditori.pratica p where p.cliente_id = c.id
        ), '[]'::json),
        'ultimo_contatto', (
          select max(p.updated_at) from venditori.pratica p where p.cliente_id = c.id
        ),
        'offerte', coalesce((
          select json_agg(json_build_object(
                   'pratica_id', p.id,
                   'titolo', o.titolo,
                   'modulo', p.modulo,
                   'stato', p.stato,
                   'quando', p.updated_at
                 ) order by p.updated_at desc)
            from venditori.pratica p
            left join venditori.offerta o on o.id = p.offerta_id
           where p.cliente_id = c.id
        ), '[]'::json)
      ) as riga
      from venditori.cliente c
     where c.user_id = (select auth.uid())
    ) x;
$fn$;

revoke execute on function venditori.clienti() from public, anon;
grant execute on function venditori.clienti() to authenticated;

create or replace function public.venditori_clienti()
returns json language sql stable security definer set search_path = ''
as $fn$ select venditori.clienti(); $fn$;

revoke execute on function public.venditori_clienti() from public, anon;
grant execute on function public.venditori_clienti() to authenticated;
