-- Fase 4.4: la pagina pubblica sa mostrare anche il noleggio lungo.
--
-- Stesso confine della vendita: la griglia che esce di qui porta un canone
-- solo, gia' scelto in base al tipo di pagina. La pagina pubblica non riceve
-- nemmeno i canoni riservati, quindi non puo' rivelarli in nessun modo.

create or replace function venditori.dati_pagina(p_codice text)
returns json
language sql
stable
security definer
set search_path = ''
as $fn$
  select json_build_object(
    'pagina', json_build_object(
      'tipo', p.tipo, 'codice', p.codice, 'pubblicata', p.pubblicata
    ),
    'offerta', json_build_object(
      'modulo', o.modulo, 'titolo', o.titolo, 'stato', o.stato
    ),
    'venditore', json_build_object(
      'slug', v.slug, 'nome', v.nome_visualizzato, 'telefono', v.telefono,
      'whatsapp', v.whatsapp, 'email', v.email_pubblica,
      'presentazione', v.presentazione, 'logo_path', v.logo_path, 'stato', v.stato
    ),
    'vendita', case when ov.offerta_id is null then null else json_build_object(
      'marca', ov.marca, 'modello', ov.modello, 'chilometri', ov.chilometri,
      'anno', ov.anno, 'alimentazione', ov.alimentazione, 'cambio', ov.cambio,
      'prezzo_cent', case when p.tipo = 'riservata'
                          then ov.prezzo_rivenditore_cent
                          else ov.prezzo_pubblico_cent end,
      'prezzo_consigliato_cent', case when p.tipo = 'riservata'
                                      then ov.prezzo_pubblico_cent else null end
    ) end,
    'lungo', case when ol.offerta_id is null then null else json_build_object(
      'marca', ol.marca, 'modello', ol.modello, 'allestimento', ol.allestimento,
      'anticipo_cent', ol.anticipo_cent,
      'servizi', to_json(ol.servizi),
      'tempi_consegna', ol.tempi_consegna,
      'riscatto_previsto', ol.riscatto_previsto,
      'riscatto_valore_cent', ol.riscatto_valore_cent,
      'griglia', coalesce((
        select json_agg(json_build_object(
                 'durata_mesi', c.durata_mesi,
                 'km_annui', c.km_annui,
                 'canone_cent', case when p.tipo = 'riservata'
                                     then c.canone_rivenditore_cent
                                     else c.canone_pubblico_cent end
               ) order by c.durata_mesi, c.km_annui)
          from venditori.canone_lungo c
         where c.offerta_id = o.id
           and (case when p.tipo = 'riservata'
                     then c.canone_rivenditore_cent
                     else c.canone_pubblico_cent end) is not null
      ), '[]'::json),
      'canone_minimo_cent', (
        select min(case when p.tipo = 'riservata'
                        then c.canone_rivenditore_cent
                        else c.canone_pubblico_cent end)
          from venditori.canone_lungo c where c.offerta_id = o.id
      )
    ) end,
    'foto', coalesce((
      select json_agg(f.path order by f.ordine)
        from venditori.offerta_foto f where f.offerta_id = o.id
    ), '[]'::json),
    'formule', coalesce((
      select json_agg(fo.formula order by fo.formula)
        from venditori.offerta_formula fo where fo.offerta_id = o.id
    ), '[]'::json)
  )
  from venditori.pagina p
  join venditori.offerta o   on o.id = p.offerta_id
  join venditori.venditore v on v.user_id = o.user_id
  left join venditori.offerta_vendita ov        on ov.offerta_id = o.id
  left join venditori.offerta_noleggio_lungo ol on ol.offerta_id = o.id
  where p.codice = p_codice;
$fn$;
