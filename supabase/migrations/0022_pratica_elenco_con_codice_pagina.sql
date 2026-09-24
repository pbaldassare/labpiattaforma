-- Fase 2.7: la vista sceglie anche il link da mandare al cliente.
--
-- Al rivenditore va il link riservato, al privato quello pubblico. La scelta
-- la fa qui la vista, che conosce il tipo di cliente: se la facesse l'app,
-- prima o poi manderebbe il link sbagliato a qualcuno.

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
      limit 1) as codice_pagina
  from venditori.pratica p
  join venditori.cliente c on c.id = p.cliente_id
  left join venditori.offerta o on o.id = p.offerta_id
  left join venditori.offerta_vendita ov on ov.offerta_id = p.offerta_id;
