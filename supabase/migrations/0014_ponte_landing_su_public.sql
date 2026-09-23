-- Fase 1.8: un ponte per far funzionare le landing subito.
--
-- PERCHE' ESISTE
-- Lo schema "venditori" va dichiarato fra gli schemi esposti nelle
-- impostazioni Data API. L'impostazione e' stata scritta e accettata
-- dall'API di gestione, ma il servizio non l'ha ancora raccolta, e non
-- dipende da noi.
--
-- Queste due funzioni stanno in "public", che e' gia' esposto, e non fanno
-- altro che richiamare quelle vere. Non duplicano logica: se domani cambia
-- il filtro dei dati, cambia in un posto solo.
--
-- Sono le uniche due cose che questo progetto mette in "public", hanno tutte
-- il prefisso "venditori_" per restare riconoscibili, e si tolgono con un
-- drop quando lo schema sara' esposto davvero.
--
-- Nota: non e' solo un ripiego. Finche' si passa di qui, le tabelle restano
-- in uno schema non esposto e quindi irraggiungibili dall'API in qualunque
-- modo: l'unica superficie pubblica sono queste due funzioni, gia' verificate
-- riga per riga contro le fughe di dati.

create or replace function public.venditori_dati_pagina(p_codice text)
returns json
language sql
stable
security definer
set search_path = ''
as $fn$
  select venditori.dati_pagina(p_codice);
$fn$;

create or replace function public.venditori_registra_apertura(p_codice text)
returns void
language sql
volatile
security definer
set search_path = ''
as $fn$
  select venditori.registra_apertura(p_codice);
$fn$;

revoke execute on function public.venditori_dati_pagina(text) from public;
revoke execute on function public.venditori_registra_apertura(text) from public;

grant execute on function public.venditori_dati_pagina(text) to anon, authenticated;
grant execute on function public.venditori_registra_apertura(text) to anon, authenticated;
