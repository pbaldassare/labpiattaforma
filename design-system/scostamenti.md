# Dove ci siamo scostati dalla direzione generata

I due `MASTER.md` sono l'esito della skill UI/UX, rigenerabile. Questo file
elenca i punti in cui l'implementazione se ne discosta di proposito, con il
motivo: senza, al prossimo aggiornamento della direzione qualcuno li
"correggerebbe" riportando indietro i problemi.

## App venditore

**Niente teal: l'app usa il grafite delle landing.**
La prima versione seguiva il profilo "strumento di lavoro" della direzione
generata, che propone un teal. Era sbagliata per due motivi. Il verde acqua su
un'applicazione di compravendita auto stona, e basta guardarla per accorgersene.
E faceva sembrare l'app e le pagine pubbliche due prodotti diversi, mentre sono
lo stesso: il venditore passa dall'una alle altre tutto il giorno.

Il profilo *Automotive* della stessa direzione propone grafite `#1E293B` e
rosso, ed è quello giusto per entrambe le superfici. Lo sfondo `#F8FAFC` resta
appena tinto di blu-grigio invece che bianco puro: distingue la pagina dalle
schede senza dover disegnare bordi ovunque.

**L'ambra `#B45309` per ciò che chiede attenzione.**
Una pratica da richiamare, un cliente rivenditore. Tenuta distinta dal rosso,
che nell'app significa soltanto "qualcosa è andato storto": se le due cose
avessero lo stesso colore, un errore vero passerebbe inosservato.

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
