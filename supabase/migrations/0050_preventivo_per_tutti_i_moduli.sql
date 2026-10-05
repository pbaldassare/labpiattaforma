/*
 * Il preventivo per tutti i moduli, e la firma facoltativa.
 *
 * Fino a qui crea_preventivo leggeva il prezzo solo da offerta_vendita: su un
 * noleggio o una polizza non lo trovava e rispondeva
 * "prezzo_rivenditore_non_impostato", anche per un cliente privato. E
 * pretendeva la firma, che su un preventivo non serve: e' una proposta, non
 * un contratto. Se il cliente firma la si conserva, altrimenti niente.
 *
 * Il prezzo:
 *  - vendita: resta quello dell'offerta, pubblico o rivenditore secondo il
 *    cliente, e non si cambia a mano (e' la regola del §4.4);
 *  - noleggi e polizze: lo scrive il venditore, perche' dipende da date,
 *    durata, chilometri o dati del cliente. importo_preventivo() gli propone
 *    un punto di partenza: il totale della prenotazione, il canone piu' basso,
 *    il premio di partenza.
 *
 * La formula d'acquisto (contanti, finanziamento...) esiste solo nella
 * vendita: altrove resta vuota.
 */

alter table venditori.preventivo alter column formula drop not null;

-- ── Il prezzo da proporre ──────────────────────────────────────────────────

create or replace function venditori.importo_preventivo(p_pratica_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_utente  uuid := (select auth.uid());
  v_cliente uuid;
  v_tipo    venditori.tipo_cliente;
  v_offerta uuid;
  v_modulo  venditori.modulo;
  v_prezzo  bigint;
  v_fonte   text;
begin
  select p.cliente_id, c.tipo, p.offerta_id, p.modulo
    into v_cliente, v_tipo, v_offerta, v_modulo
    from venditori.pratica p
    join venditori.cliente c on c.id = p.cliente_id
   where p.id = p_pratica_id and p.user_id = v_utente;

  if v_modulo is null then raise exception 'pratica_non_tua'; end if;

  if v_modulo = 'vendita' then
    select case when v_tipo = 'rivenditore'
                then ov.prezzo_rivenditore_cent
                else ov.prezzo_pubblico_cent end
      into v_prezzo
      from venditori.offerta_vendita ov
     where ov.offerta_id = v_offerta;
    v_fonte := 'prezzo_offerta';

  elsif v_modulo = 'noleggio_breve' then
    -- Se il cliente ha tenuto delle date, il totale e' gia' calcolato.
    select pr.totale_cent into v_prezzo
      from venditori.prenotazione pr
     where pr.cliente_id = v_cliente and pr.offerta_id = v_offerta
     order by pr.created_at desc
     limit 1;
    if v_prezzo is not null then
      v_fonte := 'prenotazione';
    else
      select case when v_tipo = 'rivenditore'
                  then coalesce(b.tariffa_giorno_rivenditore_cent, b.tariffa_giorno_cent)
                  else b.tariffa_giorno_cent end
        into v_prezzo
        from venditori.offerta_noleggio_breve b
       where b.offerta_id = v_offerta;
      v_fonte := 'tariffa_giorno';
    end if;

  elsif v_modulo = 'noleggio_lungo' then
    select min(case when v_tipo = 'rivenditore'
                    then coalesce(c.canone_rivenditore_cent, c.canone_pubblico_cent)
                    else c.canone_pubblico_cent end)
      into v_prezzo
      from venditori.canone_lungo c
     where c.offerta_id = v_offerta;
    v_fonte := 'canone_minimo';

  else
    select a.premio_partenza_cent into v_prezzo
      from venditori.offerta_assicurazione a
     where a.offerta_id = v_offerta;
    v_fonte := 'premio_partenza';
  end if;

  return json_build_object(
    'modulo', v_modulo,
    'prezzo_cent', v_prezzo,
    'fonte', v_fonte,
    -- Solo nella vendita il prezzo non si tocca.
    'prezzo_fisso', v_modulo = 'vendita'
  );
end;
$fn$;

revoke execute on function venditori.importo_preventivo(uuid) from public, anon;
grant execute on function venditori.importo_preventivo(uuid) to authenticated;

-- ── La creazione ────────────────────────────────────────────────────────────

-- Una funzione nuova accanto alla vecchia invece di sostituirla: la vecchia
-- crea_preventivo resta per le versioni dell'app gia' aperte sui telefoni, e
-- la si potra' togliere quando nessuno la chiama piu'.
create or replace function venditori.crea_preventivo_v2(
  p_pratica_id  uuid,
  p_formula     venditori.formula_acquisto,
  p_firma       text,
  p_prezzo_cent bigint
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_utente  uuid := (select auth.uid());
  v_cliente venditori.tipo_cliente;
  v_offerta uuid;
  v_modulo  venditori.modulo;
  v_prezzo  bigint;
  v_firma   text := nullif(btrim(coalesce(p_firma, '')), '');
  v_numero  integer;
  v_id      uuid;
begin
  if v_utente is null then raise exception 'non_autenticato'; end if;

  select c.tipo, p.offerta_id, p.modulo
    into v_cliente, v_offerta, v_modulo
    from venditori.pratica p
    join venditori.cliente c on c.id = p.cliente_id
   where p.id = p_pratica_id and p.user_id = v_utente;

  if v_cliente is null then raise exception 'pratica_non_tua'; end if;
  if v_offerta is null then raise exception 'pratica_senza_offerta'; end if;

  if v_modulo = 'vendita' then
    -- La formula si sceglie fra quelle previste dal venditore; se non ne ha
    -- previste, il preventivo si fa senza.
    if exists (select 1 from venditori.offerta_formula f where f.offerta_id = v_offerta) then
      if p_formula is null or not exists (
        select 1 from venditori.offerta_formula f
         where f.offerta_id = v_offerta and f.formula = p_formula
      ) then
        raise exception 'formula_non_prevista';
      end if;
    elsif p_formula is not null then
      raise exception 'formula_non_prevista';
    end if;

    -- Il prezzo dipende da chi si ha davanti. Se il cliente e' un rivenditore
    -- ma il prezzo riservato manca, si blocca: mandargli il prezzo del cliente
    -- finale e' un errore che costa.
    select case when v_cliente = 'rivenditore'
                then ov.prezzo_rivenditore_cent
                else ov.prezzo_pubblico_cent end
      into v_prezzo
      from venditori.offerta_vendita ov
     where ov.offerta_id = v_offerta;

    if v_prezzo is null then
      raise exception '%', case when v_cliente = 'rivenditore'
                                then 'prezzo_rivenditore_non_impostato'
                                else 'prezzo_non_impostato' end;
    end if;
  else
    if p_formula is not null then raise exception 'formula_non_prevista'; end if;
    if p_prezzo_cent is null or p_prezzo_cent <= 0 then
      raise exception 'importo_mancante';
    end if;
    v_prezzo := p_prezzo_cent;
  end if;

  -- La firma e' facoltativa, ma se c'e' deve essere una firma: servono
  -- tratti veri, non un tocco sul riquadro.
  if v_firma is not null and length(v_firma) < 40 then
    raise exception 'firma_mancante';
  end if;

  select coalesce(max(pv.numero), 0) + 1 into v_numero
    from venditori.preventivo pv where pv.user_id = v_utente;

  insert into venditori.preventivo (
    user_id, pratica_id, numero, formula, tipo_cliente, prezzo_cent,
    firma_tracciato, firmato_il
  )
  values (v_utente, p_pratica_id, v_numero, p_formula, v_cliente, v_prezzo,
          v_firma, case when v_firma is not null then now() end)
  returning id into v_id;

  update venditori.pratica
     set stato = 'preventivo_inviato'
   where id = p_pratica_id and stato <> 'venduto';

  return v_id;
end;
$fn$;

revoke execute on function venditori.crea_preventivo_v2(uuid, venditori.formula_acquisto, text, bigint)
  from public, anon;
grant execute on function venditori.crea_preventivo_v2(uuid, venditori.formula_acquisto, text, bigint)
  to authenticated;

-- ── Il ponte su public ──────────────────────────────────────────────────────

create or replace function public.venditori_crea_preventivo_v2(
  p_pratica_id uuid, p_formula text, p_firma text, p_prezzo_cent bigint
)
returns uuid language sql volatile security definer set search_path = ''
as $fn$
  select venditori.crea_preventivo_v2(
    p_pratica_id, p_formula::venditori.formula_acquisto, p_firma, p_prezzo_cent);
$fn$;

create or replace function public.venditori_importo_preventivo(p_pratica_id uuid)
returns json language sql stable security definer set search_path = ''
as $fn$ select venditori.importo_preventivo(p_pratica_id); $fn$;

revoke execute on function public.venditori_crea_preventivo_v2(uuid, text, text, bigint) from public, anon;
revoke execute on function public.venditori_importo_preventivo(uuid) from public, anon;
grant execute on function public.venditori_crea_preventivo_v2(uuid, text, text, bigint) to authenticated;
grant execute on function public.venditori_importo_preventivo(uuid) to authenticated;
