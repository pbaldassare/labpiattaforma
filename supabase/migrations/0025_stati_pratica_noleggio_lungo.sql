-- Fase 4.1: gli stati che il noleggio lungo aggiunge alle pratiche (§6.3).
--
-- Qui la richiesta non diventa subito una trattativa: prima la societa' di
-- noleggio deve valutare il cliente, e puo' dire di no.
--
-- Nota: aggiungere valori a un enum va fatto in una migration a parte, perche'
-- non si possono usare nella stessa transazione in cui li si crea.

alter type venditori.stato_pratica add value if not exists 'da_valutare' before 'da_richiamare';
alter type venditori.stato_pratica add value if not exists 'respinta' after 'chiuso';
