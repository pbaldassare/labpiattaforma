# Mettere online il progetto

Servono due indirizzi, perché sono due cose diverse:

| Cosa | Chi la guarda | Dove va |
| --- | --- | --- |
| **Le landing** — vetrina, pagine offerta, informativa | i clienti del venditore | `apps/web`, Next.js |
| **L'app venditore** | il venditore | `apps/mobile`, esportata per il web |

L'app è scritta in React Native ma esce anche come sito: `expo export --platform web`
genera un file HTML per ogni schermata. Non serve nessuno store — è un indirizzo
che si apre dal telefono e si può aggiungere alla schermata iniziale.

---

## 0. Il passaggio che non posso fare io

Mettere qualcosa online vuol dire metterlo su un account, e un account è tuo.
Serve **un comando solo**, dato da te, una volta:

```bash
npx vercel login
```

Si apre il browser, scegli GitHub o la mail, e finisce lì. Da quel momento tutto
il resto — creare i due progetti, impostare le variabili, costruire, pubblicare —
si fa da riga di comando senza più toccare niente a mano.

> **Senza account non si può, e non per pigrizia: l'ho provato.** Vercel permette
> un deploy anonimo (`vercel deploy --temporary`), ma ha due difetti che lo
> rendono inutile qui: **scade in 60 minuti** se non lo si rivendica con un
> account, e **non riesce a caricare le landing**, perché Next.js 16 produce una
> funzione annidata per ogni rotta (`functions/a/[codice].func`) e il caricamento
> anonimo quelle cartelle le salta. L'app venditore, che è tutta statica, invece
> passerebbe. Non vale la pena: un indirizzo che muore in un'ora non si manda a
> un cliente.

Il deposito è su GitHub (`pbaldassare/labpiattaforma`), **pubblico**, e il ramo
`fase-0-fondamenta` va spinto prima di importare:

```bash
git push -u origin fase-0-fondamenta
```

---

## 1. I due progetti su Vercel

Dallo stesso deposito si creano **due** progetti. La cosa che cambia è la
cartella di partenza.

### Progetto A — le landing

- **Root Directory**: `apps/web`
- Framework: Next.js (lo riconosce da solo)
- Il resto lo dice `apps/web/vercel.json`

### Progetto B — l'app venditore

- **Root Directory**: `apps/mobile`
- Framework: **Other**
- Il resto lo dice `apps/mobile/vercel.json`: comando di costruzione, cartella
  di uscita e le tre regole per gli indirizzi che contengono un identificativo
  (`/offerte/<id>` e compagnia), che altrimenti darebbero 404.

> Perché `installCommand` punta a `../..`: è un monorepo, e le dipendenze
> stanno nella radice. Senza, Vercel installerebbe solo quelle della singola
> applicazione e la costruzione fallirebbe.

> Se la costruzione si ferma su `ERESOLVE` lamentando `@types/react`, è perché
> `apps/web` fissa `@types/react` a `19.2.18` mentre `@types/react-dom` è a
> `^19.2.7`, e da sé risale a una versione che ne pretende una più nuova. Il
> `package-lock.json` della radice tiene insieme le due cose; se mai dovesse
> succedere, basta fissare anche `@types/react-dom` a `19.2.7`.

---

## 2. Le variabili d'ambiente

Si impostano su Vercel, **per ogni progetto**, prima della prima costruzione.
Quelle dell'app finiscono dentro il pacchetto: vanno messe prima, non dopo.

### Progetto A — landing

```
SUPABASE_URL=https://gdeyyyirgriwknkcqcwl.supabase.co
SUPABASE_PUBLISHABLE_KEY=<la chiave pubblicabile>
NEXT_PUBLIC_SUPABASE_URL=https://gdeyyyirgriwknkcqcwl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<la stessa chiave>
DOMINIO_LANDING=https://<indirizzo del progetto A>
```

### Progetto B — app venditore

```
EXPO_PUBLIC_SUPABASE_URL=https://gdeyyyirgriwknkcqcwl.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<la chiave pubblicabile>
EXPO_PUBLIC_DOMINIO_LANDING=https://<indirizzo del progetto A>
```

`DOMINIO_LANDING` è l'indirizzo che finisce nei QR, nei link che il venditore
manda su WhatsApp e nella mail di recupero password. Se resta `localhost` i
clienti ricevono link che non si aprono.

L'uovo e la gallina: `DOMINIO_LANDING` è l'indirizzo del progetto A, che si
conosce solo dopo averlo creato. Quindi **prima il progetto A**, poi si prende
il suo indirizzo, lo si mette nelle variabili dei due progetti e si ricostruisce.

**Mai** mettere qui la chiave di servizio di Supabase: scavalca ogni regola di
accesso, e non serve — le landing leggono con la chiave pubblicabile e tutto
quello che mostrano passa da `dati_pagina`, che filtra i dati interni.

---

## 3. Due cose da dire a Supabase

Nel pannello del progetto, **Authentication → URL Configuration**:

- **Site URL**: l'indirizzo del progetto B (l'app).
- **Redirect URLs**: aggiungere `https://<progetto A>/reimposta`.

Senza la seconda, il link della mail "password dimenticata" viene rifiutato.

---

## 4. Cosa vede il cliente

- **App venditore** → l'indirizzo del progetto B. Si entra con le credenziali
  di prova, e dal telefono si può aggiungere alla schermata iniziale: si apre
  a tutto schermo come un'applicazione.
- **Vetrina** → `https://<progetto A>/demo-verona`
- **Una pagina offerta** → si copia dall'app, dalla scheda dell'offerta.

---

## Quando ci sarà un dominio vero

Si aggiunge su Vercel al progetto A, si cambia `DOMINIO_LANDING` nei due
progetti e si rigenerano le pagine. I codici delle pagine già create non
cambiano, quindi **i QR già stampati continuano a funzionare** solo se il
dominio vecchio resta attivo o reindirizza: vale la pena deciderlo prima di
stampare qualcosa.
