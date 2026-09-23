# Dove ci siamo scostati dalla direzione generata

I due `MASTER.md` sono l'esito della skill UI/UX, rigenerabile. Questo file
elenca i punti in cui l'implementazione se ne discosta di proposito, con il
motivo: senza, al prossimo aggiornamento della direzione qualcuno li
"correggerebbe" riportando indietro i problemi.

## App venditore

**Il teal dei fondi è `#0F766E`, non `#0D9488`.**
Col testo bianco sopra, `#0D9488` dà un contrasto di 3,7:1, sotto il minimo di
4,5:1 richiesto per il testo normale. Il tono chiaro resta in uso per bordi,
dettagli e l'interruttore di pubblicazione, dove non ci va testo sopra.

**Plus Jakarta Sans è applicata tramite un componente, non negli stili.**
Con i font caricati come file distinti, `fontWeight` non seleziona il peso: ogni
peso è una famiglia a sé. Il componente `Testo` traduce il peso richiesto nel
nome giusto, così le schermate continuano a scrivere `fontWeight: '600'` e non
devono conoscere i nomi dei file.

## Landing

**Syncopate solo per i titoli, e nessun monospace nel corpo.**
La direzione proponeva Syncopate + Space Mono. Syncopate è azzeccato per il
modello del veicolo — largo, meccanico, automobilistico — ma illeggibile come
testo corrente. E un monospace nel corpo rende faticosi proprio i numeri che
devono convincere: prezzo, chilometri, anno. Il corpo usa Inter.

**Il movimento è ridotto rispetto al profilo "Motion-Driven".**
Queste pagine si aprono quasi sempre da un messaggio WhatsApp, su rete mobile.
Le animazioni d'ingresso restano, parallasse e transizioni di pagina no: costano
più di quanto rendano su un telefono che sta caricando una foto grande.

## Regole valide per entrambe

- Nessuna emoji al posto delle icone
- Contrasto del testo almeno 4,5:1
- Focus visibile da tastiera
- Aree toccabili di almeno 44×44 punti
- `prefers-reduced-motion` rispettato
