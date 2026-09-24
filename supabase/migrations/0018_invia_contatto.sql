-- Fase 2.3: il form di contatto diventa un cliente da richiamare (§3.4).
--
-- Tutto in una funzione sola: riconoscere il cliente, aprire la pratica,
-- salvare il messaggio e contare il contatto devono riuscire o fallire insieme.
-- La chiama il ruolo anonimo dalle landing, quindi ogni controllo sta qui.

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

  -- L'offerta dev'essere davvero proponibile: pagina pubblicata, offerta
  -- attiva, venditore attivo. Un link vecchio non deve generare contatti.
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

  -- Il cliente si riconosce dal recapito invece di creare un doppione.
  select c.id into v_cliente
    from venditori.cliente c
   where c.user_id = v_venditore
     and ( (v_telefono is not null and c.telefono = v_telefono)
        or (v_email is not null and c.email = v_email) )
   limit 1;

  if v_cliente is null then
    insert into venditori.cliente (user_id, nome, telefono, email, tipo)
    values (v_venditore, v_nome, v_telefono, v_email, v_tipo)
    returning id into v_cliente;
  else
    -- Chi si era presentato come privato e poi scrive dalla pagina riservata
    -- e' un operatore: il declassamento contrario non avviene mai.
    update venditori.cliente
       set telefono = coalesce(telefono, v_telefono),
           email    = coalesce(email, v_email),
           tipo     = case when v_tipo = 'rivenditore' then 'rivenditore' else tipo end
     where id = v_cliente;
  end if;

  select pr.id into v_pratica
    from venditori.pratica pr
   where pr.cliente_id = v_cliente and pr.offerta_id = v_offerta_id;

  if v_pratica is null then
    insert into venditori.pratica (user_id, cliente_id, offerta_id, modulo, stato)
    values (v_venditore, v_cliente, v_offerta_id, v_modulo, 'da_richiamare')
    returning id into v_pratica;
  end if;

  insert into venditori.contatto_storico (pratica_id, origine, testo)
  values (v_pratica, 'form', nullif(btrim(coalesce(p_messaggio, '')), ''));

  insert into venditori.evento_pagina (pagina_id, tipo)
  values (v_pagina_id, 'contatto');

  return json_build_object('ok', true);
end;
$fn$;

revoke execute on function venditori.invia_contatto(text, text, text, text, text, boolean) from public;
grant execute on function venditori.invia_contatto(text, text, text, text, text, boolean) to anon, authenticated;

create or replace function public.venditori_invia_contatto(
  p_codice text, p_nome text, p_telefono text, p_email text,
  p_messaggio text, p_consenso boolean
)
returns json
language sql
volatile
security definer
set search_path = ''
as $fn$
  select venditori.invia_contatto(p_codice, p_nome, p_telefono, p_email, p_messaggio, p_consenso);
$fn$;

revoke execute on function public.venditori_invia_contatto(text, text, text, text, text, boolean) from public;
grant execute on function public.venditori_invia_contatto(text, text, text, text, text, boolean) to anon, authenticated;
