/*
 * Tutto quello che serve per mostrare un preventivo come documento.
 *
 * Il preventivo da solo e' un numero e un importo: per dire al cliente cosa
 * compra servono i dettagli dell'offerta (chilometri, servizi compresi,
 * garanzie...), che dati_pagina sa gia' raccogliere per ogni modulo, e per il
 * noleggio breve le date che il cliente ha tenuto.
 *
 * L'offerta si legge dalla pagina che corrisponde al cliente: la riservata per
 * un rivenditore, se c'e', altrimenti la pubblica.
 */
create or replace function venditori.dati_preventivo(p_preventivo_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_utente uuid := (select auth.uid());
  v_pv     venditori.preventivo;
  v_pr     venditori.pratica;
  v_codice text;
begin
  select * into v_pv from venditori.preventivo pv
   where pv.id = p_preventivo_id and pv.user_id = v_utente;
  if v_pv.id is null then raise exception 'preventivo_non_tuo'; end if;

  select * into v_pr from venditori.pratica p where p.id = v_pv.pratica_id;

  select pg.codice into v_codice
    from venditori.pagina pg
   where pg.offerta_id = v_pr.offerta_id
   order by (pg.tipo = case when v_pv.tipo_cliente = 'rivenditore'
                            then 'riservata'::venditori.tipo_pagina
                            else 'pubblica'::venditori.tipo_pagina end) desc
   limit 1;

  return json_build_object(
    'preventivo', json_build_object(
      'numero', v_pv.numero,
      'formula', v_pv.formula,
      'tipo_cliente', v_pv.tipo_cliente,
      'prezzo_cent', v_pv.prezzo_cent,
      'firma_tracciato', v_pv.firma_tracciato,
      'firmato_il', v_pv.firmato_il,
      'creato_il', v_pv.created_at,
      'doc_identita', v_pv.doc_identita,
      'doc_reddito', v_pv.doc_reddito,
      'doc_passaggio', v_pv.doc_passaggio
    ),
    'modulo', v_pr.modulo,
    'cliente', (
      select json_build_object('nome', c.nome, 'telefono', c.telefono, 'email', c.email)
        from venditori.cliente c where c.id = v_pr.cliente_id
    ),
    'venditore', (
      select json_build_object(
               'nome', v.nome_visualizzato, 'ragione_sociale', v.ragione_sociale,
               'piva_cf', v.piva_cf, 'telefono', v.telefono,
               'email', v.email_pubblica, 'rui', v.rui_numero)
        from venditori.venditore v where v.user_id = v_utente
    ),
    'titolo', (select o.titolo from venditori.offerta o where o.id = v_pr.offerta_id),
    -- I dettagli dell'offerta, gli stessi che vede il cliente sulla pagina.
    'offerta', case when v_codice is not null then venditori.dati_pagina(v_codice) end,
    -- Per il noleggio breve: l'ultima prenotazione di questo cliente.
    'prenotazione', (
      select json_build_object(
               'dal', lower(pn.periodo), 'al', upper(pn.periodo),
               'giorni', pn.giorni, 'tariffa_cent', pn.tariffa_applicata_cent,
               'totale_cent', pn.totale_cent, 'deposito_cent', pn.deposito_cent)
        from venditori.prenotazione pn
       where pn.cliente_id = v_pr.cliente_id and pn.offerta_id = v_pr.offerta_id
       order by pn.created_at desc
       limit 1
    )
  );
end;
$fn$;

revoke execute on function venditori.dati_preventivo(uuid) from public, anon;
grant execute on function venditori.dati_preventivo(uuid) to authenticated;

create or replace function public.venditori_dati_preventivo(p_preventivo_id uuid)
returns json language sql stable security definer set search_path = ''
as $fn$ select venditori.dati_preventivo(p_preventivo_id); $fn$;

revoke execute on function public.venditori_dati_preventivo(uuid) from public, anon;
grant execute on function public.venditori_dati_preventivo(uuid) to authenticated;
