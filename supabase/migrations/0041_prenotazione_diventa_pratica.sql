/*
 * Una prenotazione e' un contatto, e finora non lo era.
 *
 * Chi bloccava le date finiva solo in `prenotazione`: nessun cliente, nessuna
 * pratica, nessun contatto contato. Il venditore apriva l'app e non vedeva
 * niente, mentre un cliente stava aspettando di essere richiamato per il
 * deposito. E' il contrario di quello che serve.
 *
 * Il riconoscimento del cliente e l'apertura della pratica erano scritti
 * dentro invia_contatto. Qui diventano due funzioni a se', cosi' il form di
 * contatto e la prenotazione si comportano allo stesso modo invece di avere
 * due copie della stessa regola che col tempo divergono.
 */

-- Il cliente si riconosce dal recapito, invece di creare un doppione a ogni
-- messaggio. Chi si era presentato come privato e poi scrive dalla pagina
-- riservata e' un operatore: il declassamento contrario non avviene mai.
create or replace function venditori.riconosci_cliente(
  p_venditore uuid,
  p_nome      text,
  p_telefono  text,
  p_email     text,
  p_tipo      venditori.tipo_cliente
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_cliente uuid;
begin
  select c.id into v_cliente
    from venditori.cliente c
   where c.user_id = p_venditore
     and ( (p_telefono is not null and c.telefono = p_telefono)
        or (p_email is not null and c.email = p_email) )
   limit 1;

  if v_cliente is null then
    insert into venditori.cliente (user_id, nome, telefono, email, tipo)
    values (p_venditore, p_nome, p_telefono, p_email, p_tipo)
    returning id into v_cliente;
  else
    update venditori.cliente
       set telefono = coalesce(telefono, p_telefono),
           email    = coalesce(email, p_email),
           tipo     = case when p_tipo = 'rivenditore' then 'rivenditore' else tipo end
     where id = v_cliente;
  end if;

  return v_cliente;
end;
$fn$;

/*
 * Una pratica per cliente e offerta.
 *
 * Se esiste gia', lo stato avanza solo in avanti: chi ha gia' prenotato non
 * torna "da richiamare" perche' ha riscritto dal form, e una pratica che il
 * venditore ha chiuso a mano non si riapre da sola.
 */
create or replace function venditori.apri_pratica(
  p_venditore uuid,
  p_cliente   uuid,
  p_offerta   uuid,
  p_modulo    venditori.modulo,
  p_stato     venditori.stato_pratica
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_pratica uuid;
  v_stato   venditori.stato_pratica;
begin
  select pr.id, pr.stato into v_pratica, v_stato
    from venditori.pratica pr
   where pr.cliente_id = p_cliente and pr.offerta_id = p_offerta;

  if v_pratica is null then
    insert into venditori.pratica (user_id, cliente_id, offerta_id, modulo, stato)
    values (p_venditore, p_cliente, p_offerta, p_modulo, p_stato)
    returning id into v_pratica;
    return v_pratica;
  end if;

  if p_stato = 'prenotato' and v_stato in ('da_richiamare', 'in_trattativa', 'preventivo_inviato')
  then
    update venditori.pratica set stato = 'prenotato' where id = v_pratica;
  end if;

  return v_pratica;
end;
$fn$;

revoke execute on function venditori.riconosci_cliente(uuid, text, text, text, venditori.tipo_cliente) from public, anon, authenticated;
revoke execute on function venditori.apri_pratica(uuid, uuid, uuid, venditori.modulo, venditori.stato_pratica) from public, anon, authenticated;

-- invia_contatto adesso usa le due funzioni, invece della propria copia.
create or replace function venditori.invia_contatto(
  p_codice    text,
  p_nome      text,
  p_telefono  text,
  p_email     text,
  p_messaggio text,
  p_consenso  boolean
)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_pagina_id  uuid;
  v_tipo_pag   venditori.tipo_pagina;
  v_offerta_id uuid;
  v_venditore  uuid;
  v_modulo     venditori.modulo;
  v_cliente    uuid;
  v_pratica    uuid;
  v_tipo       venditori.tipo_cliente;
  v_telefono   text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_email      text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_nome       text := btrim(coalesce(p_nome, ''));
begin
  if p_consenso is not true then raise exception 'consenso_mancante'; end if;
  if v_nome = '' then raise exception 'nome_mancante'; end if;
  if v_telefono is null and v_email is null then raise exception 'recapito_mancante'; end if;

  select p.id, p.tipo, o.id, o.user_id, o.modulo
    into v_pagina_id, v_tipo_pag, v_offerta_id, v_venditore, v_modulo
    from venditori.pagina p
    join venditori.offerta o   on o.id = p.offerta_id
    join venditori.venditore v on v.user_id = o.user_id
   where p.codice = p_codice
     and p.pubblicata
     and o.stato = 'attiva'
     and v.stato = 'attivo';

  if v_pagina_id is null then raise exception 'offerta_non_disponibile'; end if;

  -- Chi scrive dalla pagina riservata e' un operatore, non un privato (§3.4).
  v_tipo := case when v_tipo_pag = 'riservata' then 'rivenditore' else 'privato' end;

  -- Protezione minima: stesso recapito, stessa offerta, entro un minuto.
  -- Non si segnala nulla: un doppio invio per impazienza non deve sembrare un
  -- errore, e chi tenta di inondare non deve sapere che lo stiamo fermando.
  if exists (
    select 1
      from venditori.contatto_storico cs
      join venditori.pratica pr on pr.id = cs.pratica_id
      join venditori.cliente cl on cl.id = pr.cliente_id
     where pr.offerta_id = v_offerta_id
       and cs.origine = 'form'
       and cs.creato_il > now() - interval '1 minute'
       and ( (v_telefono is not null and cl.telefono = v_telefono)
          or (v_email is not null and cl.email = v_email) )
  ) then
    return json_build_object('ok', true);
  end if;

  v_cliente := venditori.riconosci_cliente(v_venditore, v_nome, v_telefono, v_email, v_tipo);
  v_pratica := venditori.apri_pratica(
    v_venditore, v_cliente, v_offerta_id, v_modulo, 'da_richiamare'
  );

  insert into venditori.contatto_storico (pratica_id, origine, testo)
  values (v_pratica, 'form', nullif(btrim(coalesce(p_messaggio, '')), ''));

  insert into venditori.evento_pagina (pagina_id, tipo)
  values (v_pagina_id, 'contatto');

  return json_build_object('ok', true);
end;
$fn$;

revoke execute on function venditori.invia_contatto(text, text, text, text, text, boolean) from public;
grant execute on function venditori.invia_contatto(text, text, text, text, text, boolean) to anon, authenticated;

-- blocca_date: le date tenute diventano un cliente, una pratica "prenotato" e
-- un contatto contato, come qualunque altra cosa che arriva da una pagina.
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
      'Ha tenuto le date dal %s al %s: %s giorni, totale %s euro.',
      to_char(p_dal, 'DD/MM/YYYY'), to_char(p_al, 'DD/MM/YYYY'),
      v_giorni, trim(to_char(v_totale / 100.0, '999G999D99'))
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
