-- Fase 1.7: le landing non hanno piu' bisogno della chiave di servizio.
--
-- Il primo impianto faceva leggere le pagine al server con la chiave di
-- servizio, che scavalca tutte le policy. Funziona, ma mette in mano al server
-- web un permesso enorme per fare una cosa piccola: leggere un annuncio.
--
-- dati_pagina() e' gia' il confine: restituisce solo i campi pubblicabili, con
-- il prezzo gia' scelto in base al tipo di pagina, e non lascia uscire prezzo
-- d'acquisto, margini, provvigioni ne' targa. Se e' sicura abbastanza da
-- mandare quei dati al browser, e' sicura abbastanza da essere chiamata dal
-- ruolo anonimo.
--
-- Risultato: se il server delle landing venisse compromesso, l'attaccante
-- otterrebbe gli annunci — che sono pubblici per definizione — e non
-- l'intero database delle altre applicazioni.
--
-- I codici restano imprevedibili (10 caratteri la pubblica, 24 la riservata),
-- quindi elencare le pagine riservate provando a caso resta impraticabile.

grant execute on function venditori.dati_pagina(text) to anon, authenticated;

-- Il conteggio delle aperture: inserisce un evento solo se il codice esiste.
-- Chi volesse gonfiare il contatore otterrebbe lo stesso risultato ricaricando
-- la pagina, quindi esporlo non aggiunge un problema che non ci fosse gia'.
-- Se un giorno i numeri dovessero contare davvero, la difesa e' un limite di
-- frequenza, non la segretezza di questa funzione.
grant execute on function venditori.registra_apertura(text) to anon, authenticated;
