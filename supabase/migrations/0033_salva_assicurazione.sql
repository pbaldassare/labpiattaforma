-- Fase 5.2: salvataggio di una polizza, con il vincolo RUI.
--
-- Chi intermedia polizze dev'essere iscritto al RUI (§7.4): non e' una regola
-- di cortesia, senza iscrizione l'attivita' e' abusiva. Si blocca solo la
-- pubblicazione, non la bozza: il venditore puo' preparare il prodotto mentre
-- aspetta il numero.

create or replace function venditori.salva_offerta_assicurazione(
  p_dati       json,
  p_offerta_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_utente uuid := (select auth.uid());
  v_offerta uuid := p_offerta_id;
  v_titolo text;
  v_nuova boolean := p_offerta_id is null;
  v_stato venditori.stato_offerta;
  v_rui text;
begin
  if v_utente is null then raise exception 'non_autenticato'; end if;

  if btrim(coalesce(p_dati->>'compagnia','')) = ''
     or btrim(coalesce(p_dati->>'nome_prodotto','')) = '' then
    raise exception 'compagnia_e_prodotto_obbligatori';
  end if;

  v_stato := coalesce((p_dati->>'stato')::venditori.stato_offerta, 'bozza');

  if v_stato = 'attiva' then
    select v.rui_numero into v_rui
      from venditori.venditore v where v.user_id = v_utente;
    if v_rui is null or btrim(v_rui) = '' then
      raise exception 'rui_mancante';
    end if;
  end if;

  v_titolo := btrim(
    coalesce(p_dati->>'compagnia','') || ' ' || coalesce(p_dati->>'nome_prodotto','')
  );

  if v_nuova then
    insert into venditori.offerta (user_id, modulo, titolo, stato)
    values (v_utente, 'assicurazioni', v_titolo, v_stato)
    returning id into v_offerta;
  else
    if not venditori.offerta_mia(v_offerta) then raise exception 'offerta_non_tua'; end if;
    update venditori.offerta set titolo = v_titolo, stato = v_stato where id = v_offerta;
  end if;

  insert into venditori.offerta_assicurazione (
    offerta_id, compagnia, nome_prodotto, tipo_rischio, premio_partenza_cent,
    provvigione_cent, massimale_cent, franchigia_cent, durata_mesi, documenti_informativi
  )
  values (
    v_offerta,
    p_dati->>'compagnia',
    p_dati->>'nome_prodotto',
    coalesce((p_dati->>'tipo_rischio')::venditori.tipo_rischio, 'auto'),
    (p_dati->>'premio_partenza_cent')::bigint,
    (p_dati->>'provvigione_cent')::bigint,
    (p_dati->>'massimale_cent')::bigint,
    (p_dati->>'franchigia_cent')::bigint,
    (p_dati->>'durata_mesi')::smallint,
    coalesce((
      select array_agg(d) from json_array_elements_text(
        coalesce(p_dati->'documenti_informativi','[]'::json)) as d
    ), '{}')
  )
  on conflict (offerta_id) do update set
    compagnia             = excluded.compagnia,
    nome_prodotto         = excluded.nome_prodotto,
    tipo_rischio          = excluded.tipo_rischio,
    premio_partenza_cent  = excluded.premio_partenza_cent,
    provvigione_cent      = excluded.provvigione_cent,
    massimale_cent        = excluded.massimale_cent,
    franchigia_cent       = excluded.franchigia_cent,
    durata_mesi           = excluded.durata_mesi,
    documenti_informativi = excluded.documenti_informativi;

  -- Le garanzie si riscrivono per intero, mantenendo l'ordine in cui il
  -- venditore le ha messe: e' quello in cui le legge il cliente.
  delete from venditori.garanzia where offerta_id = v_offerta;

  insert into venditori.garanzia (offerta_id, ordine, nome, inclusa, dettaglio)
  select
    v_offerta,
    (ordinalita - 1)::smallint,
    g->>'nome',
    coalesce((g->>'inclusa')::boolean, true),
    nullif(btrim(coalesce(g->>'dettaglio','')), '')
  from json_array_elements(coalesce(p_dati->'garanzie','[]'::json))
       with ordinality as t(g, ordinalita)
  where btrim(coalesce(g->>'nome','')) <> '';

  if v_nuova then
    insert into venditori.modulo_stato (user_id, modulo, utilizzi_consumati)
    values (v_utente, 'assicurazioni', 1)
    on conflict (user_id, modulo) do update
      set utilizzi_consumati = venditori.modulo_stato.utilizzi_consumati + 1;
  end if;

  perform venditori.genera_pagine(v_offerta);
  return v_offerta;
end;
$fn$;

revoke execute on function venditori.salva_offerta_assicurazione(json, uuid) from public, anon;
grant execute on function venditori.salva_offerta_assicurazione(json, uuid) to authenticated;

create or replace function public.venditori_salva_offerta_assicurazione(
  p_dati json, p_offerta_id uuid default null
)
returns uuid language sql volatile security definer set search_path = ''
as $fn$ select venditori.salva_offerta_assicurazione(p_dati, p_offerta_id); $fn$;

revoke execute on function public.venditori_salva_offerta_assicurazione(json, uuid) from public, anon;
grant execute on function public.venditori_salva_offerta_assicurazione(json, uuid) to authenticated;
