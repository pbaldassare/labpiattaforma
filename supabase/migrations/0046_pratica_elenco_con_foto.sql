/*
 * L'elenco delle pratiche porta anche la foto del mezzo.
 *
 * Una pratica senza il mezzo davanti e' un nome e uno stato: il venditore che
 * scorre l'elenco per capire chi richiamare riconosce prima l'auto della
 * riga di testo. E' la stessa copertina che il cliente ha visto in pagina,
 * quindi stanno guardando la stessa cosa.
 */
create or replace view public.venditori_pratica_elenco
with (security_invoker = on) as
  select
    p.id, p.user_id, p.stato, p.modulo, p.offerta_id, p.cliente_id,
    p.created_at, p.updated_at,
    c.nome     as cliente_nome,
    c.telefono as cliente_telefono,
    c.email    as cliente_email,
    c.tipo     as cliente_tipo,
    o.titolo   as offerta_titolo,
    ov.prezzo_pubblico_cent,
    ov.prezzo_rivenditore_cent,
    (select cs.testo from venditori.contatto_storico cs
      where cs.pratica_id = p.id order by cs.creato_il desc limit 1) as ultimo_messaggio,
    (select cs.creato_il from venditori.contatto_storico cs
      where cs.pratica_id = p.id order by cs.creato_il desc limit 1) as ultimo_contatto,
    (select min(pr.quando) from venditori.promemoria pr
      where pr.pratica_id = p.id and not pr.fatto) as prossimo_promemoria,
    (select pg.codice from venditori.pagina pg
      where pg.offerta_id = p.offerta_id
        and pg.tipo = (case when c.tipo = 'rivenditore' then 'riservata' else 'pubblica' end)::venditori.tipo_pagina
      limit 1) as codice_pagina,
    coalesce(
      o.copertina_path,
      (select f.path from venditori.offerta_foto f
        where f.offerta_id = p.offerta_id order by f.ordine limit 1)
    ) as foto_path
  from venditori.pratica p
  join venditori.cliente c on c.id = p.cliente_id
  left join venditori.offerta o on o.id = p.offerta_id
  left join venditori.offerta_vendita ov on ov.offerta_id = p.offerta_id;
