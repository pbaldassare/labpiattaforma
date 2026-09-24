-- Fase 2.5: elenco delle offerte con il prezzo, in una vista sola.
--
-- PostgREST non sa dedurre le relazioni fra viste, quindi l'app non potrebbe
-- chiedere offerta e scheda veicolo insieme. All'elenco serve comunque un
-- prezzo solo: tanto vale unirli qui.

create view public.venditori_offerta_elenco
with (security_invoker = on) as
  select
    o.id, o.user_id, o.modulo, o.titolo, o.stato, o.copertina_path,
    o.created_at, o.updated_at,
    ov.marca, ov.modello,
    ov.prezzo_pubblico_cent, ov.prezzo_rivenditore_cent
  from venditori.offerta o
  left join venditori.offerta_vendita ov on ov.offerta_id = o.id;

grant select on public.venditori_offerta_elenco to authenticated;
