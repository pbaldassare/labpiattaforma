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

## 1. I due progetti su Vercel

Dallo stesso deposito GitHub (`pbaldassare/labpiattaforma`) si creano **due**
progetti. La cosa che cambia è la cartella di partenza.

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
