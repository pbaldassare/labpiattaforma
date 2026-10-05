# Dove ci siamo scostati dalla direzione generata

I due `MASTER.md` sono l'esito della skill UI/UX, rigenerabile. Questo file
elenca i punti in cui l'implementazione se ne discosta di proposito, con il
motivo: senza, al prossimo aggiornamento della direzione qualcuno li
"correggerebbe" riportando indietro i problemi.

## App venditore

**Cruscotto notturno: fondo scuro e un colore per modulo.**
La direzione generata propone, per l'automotive, grafite `#1E293B` e rosso su
fondo chiaro. È corretta ma anonima: nell'app sembrava un gestionale. La
versione che usiamo è scura — fondo `#0A0E17`, superfici che salgono di tono —
con blu elettrico `#2563EB` come azione e ambra `#FBBF24` per l'attenzione.

**Solo l'app.** Le landing restano chiare: sono la superficie di vendita, le
guarda un cliente per trenta secondi da un link, e lì il chiaro funziona. Le
due superfici non devono per forza avere lo stesso fondo — devono avere la
stessa famiglia di forme, la stessa tipografia e lo stesso rosso d'azione.

I colori non sono decorazione. Ogni modulo ha il suo (vendita blu, noleggio
breve arancio, noleggio lungo viola, assicurazioni verde), così una schermata
che ne mostra quattro insieme si legge senza leggere. Non portano mai da soli
un'informazione: accanto c'è sempre l'icona e il nome scritto, perché chi
confonde i colori deve poter usare l'app lo stesso.

**Due cose da sapere prima di cambiare idea.**
Il blu pieno regge solo sotto il bianco: come testo o icona su fondo scuro sta
sotto 4,5:1, e lì va usato `#60A5FA`. E lo scuro, sotto il sole in piazzale,
legge peggio del chiaro: se il venditore se ne lamenta la strada è un tema
chiaro gemello, non buttare via questi colori.

## Storia: perché non il teal

**Niente teal: prima l'app aveva preso il grafite delle landing.**
La prima versione seguiva il profilo "strumento di lavoro" della direzione
generata, che propone un teal. Era sbagliata per due motivi. Il verde acqua su
un'applicazione di compravendita auto stona, e basta guardarla per accorgersene.
E faceva sembrare l'app e le pagine pubbliche due prodotti diversi, mentre sono
lo stesso: il venditore passa dall'una alle altre tutto il giorno.

Il profilo *Automotive* della stessa direzione propone grafite `#1E293B` e
rosso: è stato il passo intermedio, prima dello scuro descritto qui sopra. La
regola che resta valida è quella: app e pagine pubbliche sono lo stesso
prodotto, e il venditore ci passa in mezzo tutto il giorno.

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

**I quattro colori dei moduli, anche sulle landing.**
La direzione dava alle pagine pubbliche solo grafite e rosso. Restano, ma il
prezzo, l'etichetta del modulo e il bordo che si accende al passaggio prendono
il colore del modulo, lo stesso dell'app: chi passa dall'app alla pagina
riconosce il verde della vendita e il viola del lungo termine. Sul chiaro i
toni sono quelli profondi (reggono il 4,5:1 come testo), le sfumature piene
restano sature in tutti e due i temi perche' sono superfici, non testo. La
vetrina ha un'intestazione grafite con i quattro colori che filtrano dai
bordi, in movimento lento; con "riduci movimento" si ferma.

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
