-- Fase 1.9: salvare un'offerta di vendita in un'unica operazione.
--
-- Salvare significa toccare quattro tabelle (offerta, offerta_vendita,
-- offerta_formula, modulo_stato) e poi generare le pagine. Fatto dal client in
-- cinque chiamate separate, basta perdere la rete a meta' per ritrovarsi
-- un'offerta senza scheda veicolo, o con le formule di prima.
--
-- Qui e' una funzione sola, quindi o riesce tutto o non cambia niente.

create or replace function venditori.salva_offerta_vendita(
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
  v_utente  uuid := (select auth.uid());
  v_offerta uuid := p_offerta_id;
  v_titolo  text;
  v_nuova   boolean := p_offerta_id is null;
begin
  if v_utente is null then
    raise exception 'non_autenticato';
  end if;

  v_titolo := btrim(
    coalesce(p_dati->>'marca', '') || ' ' || coalesce(p_dati->>'modello', '')
  );
  if v_titolo = '' then
    raise exception 'marca_e_modello_obbligatori';
  end if;

  if v_nuova then
    insert into venditori.offerta (user_id, modulo, titolo, stato)
    values (
      v_utente,
      'vendita',
      v_titolo,
      coalesce((p_dati->>'stato')::venditori.stato_offerta, 'bozza')
    )
    returning id into v_offerta;
  else
    if not venditori.offerta_mia(v_offerta) then
      raise exception 'offerta_non_tua';
    end if;
    update venditori.offerta
       set titolo = v_titolo,
           stato  = coalesce((p_dati->>'stato')::venditori.stato_offerta, stato)
     where id = v_offerta;
  end if;

  insert into venditori.offerta_vendita (
    offerta_id, marca, modello, targa, chilometri, anno, alimentazione, cambio,
    prezzo_acquisto_cent, prezzo_pubblico_cent, prezzo_rivenditore_cent,
    provenienza, fornitore_nome
  )
  values (
    v_offerta,
    p_dati->>'marca',
    p_dati->>'modello',
    nullif(btrim(coalesce(p_dati->>'targa', '')), ''),
    (p_dati->>'chilometri')::integer,
    (p_dati->>'anno')::smallint,
    (p_dati->>'alimentazione')::venditori.alimentazione,
    (p_dati->>'cambio')::venditori.cambio,
    (p_dati->>'prezzo_acquisto_cent')::bigint,
    (p_dati->>'prezzo_pubblico_cent')::bigint,
    (p_dati->>'prezzo_rivenditore_cent')::bigint,
    coalesce((p_dati->>'provenienza')::venditori.provenienza, 'proprio'),
    nullif(btrim(coalesce(p_dati->>'fornitore_nome', '')), '')
  )
  on conflict (offerta_id) do update set
    marca                   = excluded.marca,
    modello                 = excluded.modello,
    targa                   = excluded.targa,
    chilometri              = excluded.chilometri,
    anno                    = excluded.anno,
    alimentazione           = excluded.alimentazione,
    cambio                  = excluded.cambio,
    prezzo_acquisto_cent    = excluded.prezzo_acquisto_cent,
    prezzo_pubblico_cent    = excluded.prezzo_pubblico_cent,
    prezzo_rivenditore_cent = excluded.prezzo_rivenditore_cent,
    provenienza             = excluded.provenienza,
    fornitore_nome          = excluded.fornitore_nome;

  -- Le formule si riscrivono per intero: toglierne una dal modulo deve
  -- toglierla anche dalla pagina.
  delete from venditori.offerta_formula where offerta_id = v_offerta;

  insert into venditori.offerta_formula (offerta_id, formula, provvigione_cent)
  select
    v_offerta,
    (f->>'formula')::venditori.formula_acquisto,
    coalesce((f->>'provvigione_cent')::bigint, 0)
  from json_array_elements(coalesce(p_dati->'formule', '[]'::json)) as f;

  -- Il salvataggio consuma un utilizzo del modulo (documento §4.1).
  -- Solo alla creazione: correggere un errore di battitura non deve costare.
  if v_nuova then
    insert into venditori.modulo_stato (user_id, modulo, utilizzi_consumati)
    values (v_utente, 'vendita', 1)
    on conflict (user_id, modulo) do update
      set utilizzi_consumati = venditori.modulo_stato.utilizzi_consumati + 1;
  end if;

  -- Le pagine nascono qui: la riservata solo se c'e' il prezzo rivenditore.
  perform venditori.genera_pagine(v_offerta);

  return v_offerta;
end;
$fn$;

revoke execute on function venditori.salva_offerta_vendita(json, uuid) from public, anon;
grant execute on function venditori.salva_offerta_vendita(json, uuid) to authenticated;
