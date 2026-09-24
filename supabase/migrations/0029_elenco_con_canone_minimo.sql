-- Fase 4.5: l'elenco delle offerte mostra anche i noleggi.
--
-- Prima univa solo la scheda vendita, quindi un'offerta di noleggio compariva
-- senza numero. Per il noleggio lungo il numero giusto e' il canone piu' basso:
-- e' lo stesso che comparira' in pagina come "a partire da".

create or replace view public.venditori_offerta_elenco
with (security_invoker = on) as
  select
    o.id, o.user_id, o.modulo, o.titolo, o.stato, o.copertina_path,
    o.created_at, o.updated_at,
    coalesce(ov.marca, ol.marca)     as marca,
    coalesce(ov.modello, ol.modello) as modello,
    ov.prezzo_pubblico_cent,
    ov.prezzo_rivenditore_cent,
    (select min(c.canone_pubblico_cent)
       from venditori.canone_lungo c where c.offerta_id = o.id) as canone_minimo_cent
  from venditori.offerta o
  left join venditori.offerta_vendita ov        on ov.offerta_id = o.id
  left join venditori.offerta_noleggio_lungo ol on ol.offerta_id = o.id;
