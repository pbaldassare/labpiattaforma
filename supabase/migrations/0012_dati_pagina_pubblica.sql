-- Fase 1.6: i dati che una pagina pubblica puo' mostrare.
--
-- Questa funzione e' il confine fra cio' che il venditore sa e cio' che il
-- cliente vede. Il documento (§3.6) elenca cio' che non deve comparire mai:
-- prezzo di acquisto, margine, provvigioni, note interne.
--
-- Farlo qui, e non nel codice della pagina, significa che quei numeri non
-- escono nemmeno dal database: nessuna distrazione in un componente puo'
-- stamparli, e nessuno strumento di rete puo' leggerli nella risposta.
--
-- Il prezzo restituito e' gia' quello giusto per il tipo di pagina: la
-- pubblica non riceve nemmeno il prezzo rivenditore, che altrimenti sarebbe
-- leggibile da chiunque apra il codice sorgente.

create or replace function venditori.dati_pagina(p_codice text)
returns json
language sql
stable
security definer
set search_path = ''
as $fn$
  select json_build_object(
    'pagina', json_build_object(
      'tipo',       p.tipo,
      'codice',     p.codice,
      'pubblicata', p.pubblicata
    ),
    'offerta', json_build_object(
      'modulo', o.modulo,
      'titolo', o.titolo,
      'stato',  o.stato
    ),
    'venditore', json_build_object(
      'slug',          v.slug,
      'nome',          v.nome_visualizzato,
      'telefono',      v.telefono,
      'whatsapp',      v.whatsapp,
      'email',         v.email_pubblica,
      'presentazione', v.presentazione,
      'logo_path',     v.logo_path,
      'stato',         v.stato
    ),
    'vendita', case when ov.offerta_id is null then null else json_build_object(
      'marca',         ov.marca,
      'modello',       ov.modello,
      'chilometri',    ov.chilometri,
      'anno',          ov.anno,
      'alimentazione', ov.alimentazione,
      'cambio',        ov.cambio,
      -- Un prezzo solo, gia' scelto in base al tipo di pagina.
      'prezzo_cent', case
        when p.tipo = 'riservata' then ov.prezzo_rivenditore_cent
        else ov.prezzo_pubblico_cent
      end,
      -- Solo sulla riservata: serve all'operatore per vedere quanto puo'
      -- guadagnarci (§3.7). Sulla pubblica resta null e non viene inviato.
      'prezzo_consigliato_cent', case
        when p.tipo = 'riservata' then ov.prezzo_pubblico_cent
        else null
      end
    ) end,
    'foto', coalesce((
      select json_agg(f.path order by f.ordine)
        from venditori.offerta_foto f
       where f.offerta_id = o.id
    ), '[]'::json),
    -- Solo il nome della formula: la provvigione e' un fatto del venditore.
    'formule', coalesce((
      select json_agg(fo.formula order by fo.formula)
        from venditori.offerta_formula fo
       where fo.offerta_id = o.id
    ), '[]'::json)
  )
  from venditori.pagina p
  join venditori.offerta o   on o.id = p.offerta_id
  join venditori.venditore v on v.user_id = o.user_id
  left join venditori.offerta_vendita ov on ov.offerta_id = o.id
  where p.codice = p_codice;
$fn$;

-- La chiamano solo le landing, dal server. Nessun ruolo del browser.
revoke execute on function venditori.dati_pagina(text) from public, anon, authenticated;
