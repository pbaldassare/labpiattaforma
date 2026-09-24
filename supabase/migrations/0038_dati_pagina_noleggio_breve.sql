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
      'presentazione', v.presentazione, 'logo_path', v.logo_path, 'stato', v.stato,
      'rui', v.rui_numero
    ),
    'vendita', case when ov.offerta_id is null then null else json_build_object(
      'marca', ov.marca, 'modello', ov.modello, 'chilometri', ov.chilometri,
      'anno', ov.anno, 'alimentazione', ov.alimentazione, 'cambio', ov.cambio,
      'prezzo_cent', case when p.tipo = 'riservata'
                          then ov.prezzo_rivenditore_cent else ov.prezzo_pubblico_cent end,
      'prezzo_consigliato_cent', case when p.tipo = 'riservata'
                                      then ov.prezzo_pubblico_cent else null end
    ) end,
    'lungo', case when ol.offerta_id is null then null else json_build_object(
      'marca', ol.marca, 'modello', ol.modello, 'allestimento', ol.allestimento,
      'anticipo_cent', ol.anticipo_cent, 'servizi', to_json(ol.servizi),
      'tempi_consegna', ol.tempi_consegna, 'riscatto_previsto', ol.riscatto_previsto,
      'riscatto_valore_cent', ol.riscatto_valore_cent,
      'griglia', coalesce((
        select json_agg(json_build_object(
                 'durata_mesi', c.durata_mesi, 'km_annui', c.km_annui,
                 'canone_cent', case when p.tipo = 'riservata'
                                     then c.canone_rivenditore_cent
                                     else c.canone_pubblico_cent end
               ) order by c.durata_mesi, c.km_annui)
          from venditori.canone_lungo c
         where c.offerta_id = o.id
           and (case when p.tipo = 'riservata' then c.canone_rivenditore_cent
                     else c.canone_pubblico_cent end) is not null
      ), '[]'::json),
      'canone_minimo_cent', (
        select min(case when p.tipo = 'riservata' then c.canone_rivenditore_cent
                        else c.canone_pubblico_cent end)
          from venditori.canone_lungo c where c.offerta_id = o.id
      )
    ) end,
    -- Noleggio breve: la tariffa e' gia' quella giusta per il tipo di pagina,
    -- e le soglie di sconto servono alla pagina per calcolare il totale.
    'breve', case when ob.offerta_id is null then null else json_build_object(
      'modello', ob.modello,
      'disponibile_dal', ob.disponibile_dal,
      'disponibile_al', ob.disponibile_al,
      'tariffa_giorno_cent', case when p.tipo = 'riservata'
                                  then ob.tariffa_giorno_rivenditore_cent
                                  else ob.tariffa_giorno_cent end,
      'tariffa_oltre_3_cent', case when p.tipo = 'riservata' then null else ob.tariffa_oltre_3_cent end,
      'tariffa_oltre_7_cent', case when p.tipo = 'riservata' then null else ob.tariffa_oltre_7_cent end,
      'tariffa_oltre_15_cent', case when p.tipo = 'riservata' then null else ob.tariffa_oltre_15_cent end,
      'km_inclusi_giorno', ob.km_inclusi_giorno,
      'costo_km_extra_cent', ob.costo_km_extra_cent,
      'deposito_cent', ob.deposito_cent,
      'eta_minima', ob.eta_minima,
      'patente_anni', ob.patente_anni
    ) end,
    'assicurazione', case when oa.offerta_id is null then null else json_build_object(
      'compagnia', oa.compagnia, 'nome_prodotto', oa.nome_prodotto,
      'tipo_rischio', oa.tipo_rischio,
      'premio_partenza_cent', oa.premio_partenza_cent,
      'massimale_cent', oa.massimale_cent, 'franchigia_cent', oa.franchigia_cent,
      'durata_mesi', oa.durata_mesi,
      'documenti_informativi', to_json(oa.documenti_informativi),
      'garanzie', coalesce((
        select json_agg(json_build_object(
                 'nome', g.nome, 'inclusa', g.inclusa, 'dettaglio', g.dettaglio
               ) order by g.ordine)
          from venditori.garanzia g where g.offerta_id = o.id
      ), '[]'::json)
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
  left join venditori.offerta_noleggio_breve ob on ob.offerta_id = o.id
  left join venditori.offerta_assicurazione oa  on oa.offerta_id = o.id
  where p.codice = p_codice;
$fn$;
