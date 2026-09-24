-- Fase 4.3: salvataggio dell'offerta di noleggio lungo, e generazione pagine
-- che sa distinguere i moduli.

create or replace function venditori.salva_offerta_noleggio_lungo(
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
  if v_utente is null then raise exception 'non_autenticato'; end if;

  v_titolo := btrim(
    coalesce(p_dati->>'marca', '') || ' ' || coalesce(p_dati->>'modello', '') || ' ' ||
    coalesce(p_dati->>'allestimento', '')
  );
  if btrim(coalesce(p_dati->>'marca','')) = ''
     or btrim(coalesce(p_dati->>'modello','')) = '' then
    raise exception 'marca_e_modello_obbligatori';
  end if;

  if v_nuova then
    insert into venditori.offerta (user_id, modulo, titolo, stato)
    values (v_utente, 'noleggio_lungo', v_titolo,
            coalesce((p_dati->>'stato')::venditori.stato_offerta, 'bozza'))
    returning id into v_offerta;
  else
    if not venditori.offerta_mia(v_offerta) then raise exception 'offerta_non_tua'; end if;
    update venditori.offerta
       set titolo = v_titolo,
           stato  = coalesce((p_dati->>'stato')::venditori.stato_offerta, stato)
     where id = v_offerta;
  end if;

  insert into venditori.offerta_noleggio_lungo (
    offerta_id, marca, modello, allestimento, anticipo_cent, servizi,
    tempi_consegna, riscatto_previsto, riscatto_valore_cent
  )
  values (
    v_offerta,
    p_dati->>'marca',
    p_dati->>'modello',
    nullif(btrim(coalesce(p_dati->>'allestimento','')), ''),
    (p_dati->>'anticipo_cent')::bigint,
    coalesce((
      select array_agg(s::text::venditori.servizio_incluso)
        from json_array_elements_text(coalesce(p_dati->'servizi','[]'::json)) as s
    ), '{}'),
    nullif(btrim(coalesce(p_dati->>'tempi_consegna','')), ''),
    coalesce((p_dati->>'riscatto_previsto')::boolean, false),
    (p_dati->>'riscatto_valore_cent')::bigint
  )
  on conflict (offerta_id) do update set
    marca                = excluded.marca,
    modello              = excluded.modello,
    allestimento         = excluded.allestimento,
    anticipo_cent        = excluded.anticipo_cent,
    servizi              = excluded.servizi,
    tempi_consegna       = excluded.tempi_consegna,
    riscatto_previsto    = excluded.riscatto_previsto,
    riscatto_valore_cent = excluded.riscatto_valore_cent;

  -- La griglia si riscrive per intero: togliere una durata dal modulo deve
  -- toglierla anche dai selettori della pagina.
  delete from venditori.canone_lungo where offerta_id = v_offerta;

  insert into venditori.canone_lungo (
    offerta_id, durata_mesi, km_annui, canone_pubblico_cent, canone_rivenditore_cent
  )
  select
    v_offerta,
    (c->>'durata_mesi')::smallint,
    (c->>'km_annui')::integer,
    (c->>'canone_pubblico_cent')::bigint,
    (c->>'canone_rivenditore_cent')::bigint
  from json_array_elements(coalesce(p_dati->'griglia','[]'::json)) as c
  where (c->>'canone_pubblico_cent') is not null
    and (c->>'canone_pubblico_cent') <> '';

  if v_nuova then
    insert into venditori.modulo_stato (user_id, modulo, utilizzi_consumati)
    values (v_utente, 'noleggio_lungo', 1)
    on conflict (user_id, modulo) do update
      set utilizzi_consumati = venditori.modulo_stato.utilizzi_consumati + 1;
  end if;

  perform venditori.genera_pagine(v_offerta);
  return v_offerta;
end;
$fn$;

revoke execute on function venditori.salva_offerta_noleggio_lungo(json, uuid) from public, anon;
grant execute on function venditori.salva_offerta_noleggio_lungo(json, uuid) to authenticated;

-- genera_pagine deve sapere, per ogni modulo, dove sta il prezzo riservato:
-- nella vendita e' una colonna, nel noleggio lungo e' una riga della griglia.
create or replace function venditori.genera_pagine(p_offerta_id uuid)
returns setof venditori.pagina
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_modulo venditori.modulo;
  v_riservato boolean := false;
begin
  if not venditori.offerta_mia(p_offerta_id) then
    raise exception 'offerta_non_tua';
  end if;

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

create or replace function public.venditori_salva_offerta_noleggio_lungo(
  p_dati json, p_offerta_id uuid default null
)
returns uuid language sql volatile security definer set search_path = ''
as $fn$ select venditori.salva_offerta_noleggio_lungo(p_dati, p_offerta_id); $fn$;

revoke execute on function public.venditori_salva_offerta_noleggio_lungo(json, uuid) from public, anon;
grant execute on function public.venditori_salva_offerta_noleggio_lungo(json, uuid) to authenticated;
