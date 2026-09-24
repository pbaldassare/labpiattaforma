-- Fase 2.6: elenco delle pratiche e storico, pronti da leggere.
--
-- La vista porta gia' il nome del cliente, il titolo dell'offerta, l'ultimo
-- messaggio e il prossimo promemoria: sono le cose che il venditore guarda
-- nell'elenco, e chiederle una per una sarebbe una richiesta per riga.

create view public.venditori_pratica_elenco
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
      where pr.pratica_id = p.id and not pr.fatto) as prossimo_promemoria
  from venditori.pratica p
  join venditori.cliente c on c.id = p.cliente_id
  left join venditori.offerta o on o.id = p.offerta_id
  left join venditori.offerta_vendita ov on ov.offerta_id = p.offerta_id;

grant select on public.venditori_pratica_elenco to authenticated;

create view public.venditori_storico_pratica
with (security_invoker = on) as
  select cs.id, cs.pratica_id, cs.origine, cs.testo, cs.creato_il, p.user_id
  from venditori.contatto_storico cs
  join venditori.pratica p on p.id = cs.pratica_id;

grant select on public.venditori_storico_pratica to authenticated;
