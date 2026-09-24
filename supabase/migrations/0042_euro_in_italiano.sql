/*
 * Gli importi scritti dal database, in italiano.
 *
 * `to_char` segue la lingua del server, che qui non e' l'italiano: il totale
 * di una prenotazione finiva nello storico della pratica come "590.00 euro".
 * Scritto a mano si sa esattamente cosa esce, ed e' la stessa regola che
 * l'app applica in `formattaEuroPreciso`: punto per le migliaia, virgola per
 * i centesimi.
 *
 * Serve anche ai preventivi e ai contratti, che scrivono importi dentro
 * frasi.
 */
create or replace function venditori.euro(p_cent bigint)
returns text
language sql
immutable
set search_path = ''
as $fn$
  select case when p_cent < 0 then '-' else '' end
      -- Le migliaia: si rovescia il numero, si mette un punto ogni tre cifre,
      -- si rovescia di nuovo. Senza rovesciarlo il raggruppamento partirebbe
      -- da sinistra e su 5900 darebbe "590.0".
      || reverse(regexp_replace(reverse((abs(p_cent) / 100)::text), '(\d{3})(?=\d)', '\1.', 'g'))
      || ',' || lpad((abs(p_cent) % 100)::text, 2, '0')
      || ' €';
$fn$;

grant execute on function venditori.euro(bigint) to authenticated;

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
  v_pagina_id uuid;
  v_tipo_pag  venditori.tipo_pagina;
  v_offerta   uuid;
  v_venditore uuid;
  v_modulo    venditori.modulo;
  v_dal_lim   date;
  v_al_lim    date;
  v_giorni    integer;
  v_tariffa   bigint;
  v_totale    bigint;
  v_deposito  bigint;
  v_cliente   uuid;
  v_pratica   uuid;
  v_id        uuid;
  v_tipo      venditori.tipo_cliente;
  v_telefono  text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_email     text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_nome      text := btrim(coalesce(p_nome, ''));
  v_minuti    constant integer := 15;
begin
  if p_consenso is not true then raise exception 'consenso_mancante'; end if;
  if v_nome = '' then raise exception 'nome_mancante'; end if;
  if v_telefono is null and v_email is null then raise exception 'recapito_mancante'; end if;

  perform venditori.libera_blocchi_scaduti();

  select p.id, p.tipo, o.id, o.user_id, o.modulo,
         b.disponibile_dal, b.disponibile_al, b.deposito_cent
    into v_pagina_id, v_tipo_pag, v_offerta, v_venditore, v_modulo,
         v_dal_lim, v_al_lim, v_deposito
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

  v_tipo := case when v_tipo_pag = 'riservata' then 'rivenditore' else 'privato' end;
  v_cliente := venditori.riconosci_cliente(v_venditore, v_nome, v_telefono, v_email, v_tipo);

  -- L'inserimento viene prima della pratica: se le date sono gia' prese deve
  -- fallire tutto, senza lasciare in giro una pratica per una prenotazione che
  -- non esiste.
  insert into venditori.prenotazione (
    offerta_id, user_id, cliente_id, periodo, nome, telefono, email,
    giorni, tariffa_applicata_cent, totale_cent, deposito_cent,
    stato, blocco_scade_il
  )
  values (
    v_offerta, v_venditore, v_cliente, daterange(p_dal, p_al, '[)'),
    v_nome, v_telefono, v_email,
    v_giorni, v_tariffa, v_totale, coalesce(v_deposito, 0),
    'bloccata', now() + make_interval(mins => v_minuti)
  )
  returning id into v_id;

  v_pratica := venditori.apri_pratica(v_venditore, v_cliente, v_offerta, v_modulo, 'prenotato');

  -- Il venditore deve sapere cosa ha tenuto il cliente senza aprire altro.
  insert into venditori.contatto_storico (pratica_id, origine, testo)
  values (
    v_pratica, 'form',
    format(
      'Ha tenuto le date dal %s al %s: %s giorni, totale %s.',
      to_char(p_dal, 'DD/MM/YYYY'), to_char(p_al, 'DD/MM/YYYY'),
      v_giorni, venditori.euro(v_totale)
    )
  );

  insert into venditori.evento_pagina (pagina_id, tipo)
  values (v_pagina_id, 'contatto');

  return json_build_object(
    'prenotazione_id', v_id,
    'pratica_id', v_pratica,
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
