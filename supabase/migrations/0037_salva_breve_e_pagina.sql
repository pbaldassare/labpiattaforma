create or replace function venditori.salva_offerta_noleggio_breve(
  p_dati json, p_offerta_id uuid default null
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $fn$
declare
  v_utente uuid := (select auth.uid());
  v_offerta uuid := p_offerta_id;
  v_nuova boolean := p_offerta_id is null;
  v_titolo text;
begin
  if v_utente is null then raise exception 'non_autenticato'; end if;
  if btrim(coalesce(p_dati->>'modello','')) = '' then raise exception 'modello_obbligatorio'; end if;

  v_titolo := btrim(coalesce(p_dati->>'modello',''));

  if v_nuova then
    insert into venditori.offerta (user_id, modulo, titolo, stato)
    values (v_utente, 'noleggio_breve', v_titolo,
            coalesce((p_dati->>'stato')::venditori.stato_offerta, 'bozza'))
    returning id into v_offerta;
  else
    if not venditori.offerta_mia(v_offerta) then raise exception 'offerta_non_tua'; end if;
    update venditori.offerta
       set titolo = v_titolo,
           stato = coalesce((p_dati->>'stato')::venditori.stato_offerta, stato)
     where id = v_offerta;
  end if;

  insert into venditori.offerta_noleggio_breve (
    offerta_id, modello, targa, disponibile_dal, disponibile_al,
    tariffa_giorno_cent, tariffa_giorno_rivenditore_cent,
    tariffa_oltre_3_cent, tariffa_oltre_7_cent, tariffa_oltre_15_cent,
    km_inclusi_giorno, costo_km_extra_cent, deposito_cent, eta_minima, patente_anni
  )
  values (
    v_offerta,
    p_dati->>'modello',
    nullif(upper(btrim(coalesce(p_dati->>'targa',''))), ''),
    (p_dati->>'disponibile_dal')::date,
    (p_dati->>'disponibile_al')::date,
    (p_dati->>'tariffa_giorno_cent')::bigint,
    (p_dati->>'tariffa_giorno_rivenditore_cent')::bigint,
    (p_dati->>'tariffa_oltre_3_cent')::bigint,
    (p_dati->>'tariffa_oltre_7_cent')::bigint,
    (p_dati->>'tariffa_oltre_15_cent')::bigint,
    (p_dati->>'km_inclusi_giorno')::integer,
    (p_dati->>'costo_km_extra_cent')::bigint,
    (p_dati->>'deposito_cent')::bigint,
    (p_dati->>'eta_minima')::smallint,
    (p_dati->>'patente_anni')::smallint
  )
  on conflict (offerta_id) do update set
    modello = excluded.modello, targa = excluded.targa,
    disponibile_dal = excluded.disponibile_dal, disponibile_al = excluded.disponibile_al,
    tariffa_giorno_cent = excluded.tariffa_giorno_cent,
    tariffa_giorno_rivenditore_cent = excluded.tariffa_giorno_rivenditore_cent,
    tariffa_oltre_3_cent = excluded.tariffa_oltre_3_cent,
    tariffa_oltre_7_cent = excluded.tariffa_oltre_7_cent,
    tariffa_oltre_15_cent = excluded.tariffa_oltre_15_cent,
    km_inclusi_giorno = excluded.km_inclusi_giorno,
    costo_km_extra_cent = excluded.costo_km_extra_cent,
    deposito_cent = excluded.deposito_cent,
    eta_minima = excluded.eta_minima, patente_anni = excluded.patente_anni;

  if v_nuova then
    insert into venditori.modulo_stato (user_id, modulo, utilizzi_consumati)
    values (v_utente, 'noleggio_breve', 1)
    on conflict (user_id, modulo) do update
      set utilizzi_consumati = venditori.modulo_stato.utilizzi_consumati + 1;
  end if;

  perform venditori.genera_pagine(v_offerta);
  return v_offerta;
end;
$fn$;

revoke execute on function venditori.salva_offerta_noleggio_breve(json, uuid) from public, anon;
grant execute on function venditori.salva_offerta_noleggio_breve(json, uuid) to authenticated;

create or replace function public.venditori_salva_offerta_noleggio_breve(
  p_dati json, p_offerta_id uuid default null
)
returns uuid language sql volatile security definer set search_path = ''
as $fn$ select venditori.salva_offerta_noleggio_breve(p_dati, p_offerta_id); $fn$;

revoke execute on function public.venditori_salva_offerta_noleggio_breve(json, uuid) from public, anon;
grant execute on function public.venditori_salva_offerta_noleggio_breve(json, uuid) to authenticated;

-- genera_pagine: anche il noleggio breve ha la sua tariffa riservata.
create or replace function venditori.genera_pagine(p_offerta_id uuid)
returns setof venditori.pagina
language plpgsql volatile security definer set search_path = ''
as $fn$
declare
  v_modulo venditori.modulo;
  v_riservato boolean := false;
begin
  if not venditori.offerta_mia(p_offerta_id) then raise exception 'offerta_non_tua'; end if;

  select o.modulo into v_modulo from venditori.offerta o where o.id = p_offerta_id;

  insert into venditori.pagina (offerta_id, tipo, codice)
  values (p_offerta_id, 'pubblica', venditori.nuovo_codice(10))
  on conflict (offerta_id, tipo) do nothing;

  if v_modulo = 'vendita' then
    select ov.prezzo_rivenditore_cent is not null into v_riservato
      from venditori.offerta_vendita ov where ov.offerta_id = p_offerta_id;
  elsif v_modulo = 'noleggio_lungo' then
    select exists (
      select 1 from venditori.canone_lungo c
       where c.offerta_id = p_offerta_id and c.canone_rivenditore_cent is not null
    ) into v_riservato;
  elsif v_modulo = 'noleggio_breve' then
    select b.tariffa_giorno_rivenditore_cent is not null into v_riservato
      from venditori.offerta_noleggio_breve b where b.offerta_id = p_offerta_id;
  end if;

  if coalesce(v_riservato, false) then
    insert into venditori.pagina (offerta_id, tipo, codice)
    values (p_offerta_id, 'riservata', venditori.nuovo_codice(24))
    on conflict (offerta_id, tipo) do nothing;
  end if;

  return query
    select p.* from venditori.pagina p where p.offerta_id = p_offerta_id order by p.tipo;
end;
$fn$;
