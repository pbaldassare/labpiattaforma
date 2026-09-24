-- La tariffa giornaliera dipende da quanti giorni dura il noleggio (§5.1).
create or replace function venditori.tariffa_per_giorni(
  p_offerta_id uuid,
  p_giorni     integer
)
returns bigint
language sql
stable
security definer
set search_path = ''
as $fn$
  select case
    when p_giorni > 15 then coalesce(b.tariffa_oltre_15_cent, b.tariffa_oltre_7_cent,
                                     b.tariffa_oltre_3_cent, b.tariffa_giorno_cent)
    when p_giorni > 7  then coalesce(b.tariffa_oltre_7_cent, b.tariffa_oltre_3_cent,
                                     b.tariffa_giorno_cent)
    when p_giorni > 3  then coalesce(b.tariffa_oltre_3_cent, b.tariffa_giorno_cent)
    else b.tariffa_giorno_cent
  end
  from venditori.offerta_noleggio_breve b where b.offerta_id = p_offerta_id;
$fn$;

-- I blocchi scaduti liberano le date da soli. Chiamata prima di leggere la
-- disponibilita' e prima di bloccare: cosi' non serve un lavoro pianificato,
-- e le date non restano occupate da chi ha abbandonato il pagamento.
create or replace function venditori.libera_blocchi_scaduti()
returns void
language sql
volatile
security definer
set search_path = ''
as $fn$
  update venditori.prenotazione
     set stato = 'scaduta'
   where stato = 'bloccata'
     and blocco_scade_il is not null
     and blocco_scade_il < now();
$fn$;

-- I giorni gia' occupati, per spegnerli nel calendario.
create or replace function venditori.disponibilita(p_codice text)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_offerta uuid;
  v_esito json;
begin
  perform venditori.libera_blocchi_scaduti();

  select o.id into v_offerta
    from venditori.pagina p
    join venditori.offerta o   on o.id = p.offerta_id
    join venditori.venditore v on v.user_id = o.user_id
   where p.codice = p_codice and p.pubblicata
     and o.stato = 'attiva' and v.stato = 'attivo';

  if v_offerta is null then return null; end if;

  select json_build_object(
    'occupati', coalesce((
      select json_agg(json_build_object(
               'dal', lower(pr.periodo),
               'al',  upper(pr.periodo)
             ) order by lower(pr.periodo))
        from venditori.prenotazione pr
       where pr.offerta_id = v_offerta
         and pr.stato in ('bloccata', 'confermata')
         and upper(pr.periodo) >= current_date
    ), '[]'::json)
  ) into v_esito;

  return v_esito;
end;
$fn$;

revoke execute on function venditori.disponibilita(text) from public;
grant execute on function venditori.disponibilita(text) to anon, authenticated;

/*
 * Tiene le date mentre il cliente completa la richiesta (§5.3).
 *
 * Il documento chiede di ricontrollare la sovrapposizione lato server subito
 * prima del pagamento, non solo alla selezione: fra la scelta delle date e la
 * conferma puo' prenotare qualcun altro. Qui il ricontrollo non serve, perche'
 * il vincolo di esclusione sulla tabella rende la sovrapposizione impossibile
 * per costruzione: se due richieste arrivano insieme, una delle due fallisce.
 */
create or replace function venditori.blocca_date(
  p_codice   text,
  p_dal      date,
  p_al       date,
  p_nome     text,
  p_telefono text,
  p_email    text,
  p_consenso boolean
)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_offerta   uuid;
  v_venditore uuid;
  v_dal_lim   date;
  v_al_lim    date;
  v_giorni    integer;
  v_tariffa   bigint;
  v_totale    bigint;
  v_deposito  bigint;
  v_id        uuid;
  v_minuti    constant integer := 15;
begin
  if p_consenso is not true then raise exception 'consenso_mancante'; end if;
  if btrim(coalesce(p_nome, '')) = '' then raise exception 'nome_mancante'; end if;
  if coalesce(btrim(p_telefono), '') = '' and coalesce(btrim(p_email), '') = '' then
    raise exception 'recapito_mancante';
  end if;

  perform venditori.libera_blocchi_scaduti();

  select o.id, o.user_id, b.disponibile_dal, b.disponibile_al, b.deposito_cent
    into v_offerta, v_venditore, v_dal_lim, v_al_lim, v_deposito
    from venditori.pagina p
    join venditori.offerta o   on o.id = p.offerta_id
    join venditori.venditore v on v.user_id = o.user_id
    join venditori.offerta_noleggio_breve b on b.offerta_id = o.id
   where p.codice = p_codice and p.pubblicata
     and o.stato = 'attiva' and v.stato = 'attivo';

  if v_offerta is null then raise exception 'offerta_non_disponibile'; end if;

  if p_al <= p_dal then raise exception 'date_incoerenti'; end if;
  if p_dal < greatest(v_dal_lim, current_date) or p_al > v_al_lim + 1 then
    raise exception 'fuori_disponibilita';
  end if;

  v_giorni := p_al - p_dal;
  -- Breve termine: da un giorno a un mese (§5.3).
  if v_giorni < 1 or v_giorni > 30 then raise exception 'durata_non_valida'; end if;

  v_tariffa := venditori.tariffa_per_giorni(v_offerta, v_giorni);
  v_totale  := v_tariffa * v_giorni;

  insert into venditori.prenotazione (
    offerta_id, user_id, periodo, nome, telefono, email,
    giorni, tariffa_applicata_cent, totale_cent, deposito_cent,
    stato, blocco_scade_il
  )
  values (
    v_offerta, v_venditore, daterange(p_dal, p_al, '[)'),
    btrim(p_nome), nullif(btrim(coalesce(p_telefono, '')), ''),
    lower(nullif(btrim(coalesce(p_email, '')), '')),
    v_giorni, v_tariffa, v_totale, coalesce(v_deposito, 0),
    'bloccata', now() + make_interval(mins => v_minuti)
  )
  returning id into v_id;

  return json_build_object(
    'prenotazione_id', v_id,
    'giorni', v_giorni,
    'tariffa_cent', v_tariffa,
    'totale_cent', v_totale,
    'deposito_cent', coalesce(v_deposito, 0),
    'blocco_minuti', v_minuti
  );
exception
  when exclusion_violation then
    -- Qualcuno ha prenotato quelle date un istante prima.
    raise exception 'date_gia_prenotate';
end;
$fn$;

revoke execute on function venditori.blocca_date(text, date, date, text, text, text, boolean) from public;
grant execute on function venditori.blocca_date(text, date, date, text, text, text, boolean) to anon, authenticated;

create or replace function public.venditori_disponibilita(p_codice text)
returns json language sql volatile security definer set search_path = ''
as $fn$ select venditori.disponibilita(p_codice); $fn$;

create or replace function public.venditori_blocca_date(
  p_codice text, p_dal date, p_al date,
  p_nome text, p_telefono text, p_email text, p_consenso boolean
)
returns json language sql volatile security definer set search_path = ''
as $fn$ select venditori.blocca_date(p_codice, p_dal, p_al, p_nome, p_telefono, p_email, p_consenso); $fn$;

revoke execute on function public.venditori_disponibilita(text) from public;
revoke execute on function public.venditori_blocca_date(text, date, date, text, text, text, boolean) from public;
grant execute on function public.venditori_disponibilita(text) to anon, authenticated;
grant execute on function public.venditori_blocca_date(text, date, date, text, text, text, boolean) to anon, authenticated;
