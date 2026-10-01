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

## 0. Dove va cosa

Tutto sta su **Cloudflare**, collegato al deposito GitHub
(`pbaldassare/labpiattaforma`, ramo `main`): ogni spinta su `main` ricostruisce
e ripubblica da sola.

| Cosa | Su Cloudflare è | Perché |
| --- | --- | --- |
| Landing (`apps/web`) | un **Worker** | le pagine leggono Supabase a ogni richiesta: serve codice che gira sul server, e Next.js su Cloudflare passa da [OpenNext](https://opennext.js.org/cloudflare) |
| App venditore (`apps/mobile`) | un progetto **Pages** | è tutta statica: file HTML, niente server |

È un monorepo con i workspace di npm: le dipendenze si installano **dalla
radice**, quindi in entrambi i progetti la cartella di partenza resta la radice
del deposito e il comando di costruzione sceglie il workspace.

La versione di Node la fissa `.node-version` (22).

---

## 1. I due progetti su Cloudflare

Dal pannello: **Workers & Pages → Create**.

### Progetto A — le landing (Worker)

**Import a repository** → `labpiattaforma`, poi:

- **Project name**: `labpiattaforma-landing` — deve coincidere con `name` in
  `apps/web/wrangler.jsonc`, altrimenti la pubblicazione si rifiuta.
- **Root directory**: `/` (vuoto)
- **Build command**: `npm run build:cf --workspace @lab/web`
- **Deploy command**: `npm run deploy:cf --workspace @lab/web`
- **Production branch**: `main`

Il resto lo dice `apps/web/wrangler.jsonc`. Le foto di `next/image` le
ridimensiona Cloudflare Images (il collegamento `IMAGES`): nel piano gratuito
sono 5.000 trasformazioni diverse al mese, poi le foto restano non ottimizzate.

Per provarlo in locale come girerà su Cloudflare:

```bash
npm run preview --workspace @lab/web
```

### Progetto B — l'app venditore (Pages)

**Pages → Connect to Git** → `labpiattaforma`, poi:

- **Framework preset**: None
- **Root directory**: `/` (vuoto)
- **Build command**: `npm run build:web --workspace @lab/mobile`
- **Build output directory**: `apps/mobile/dist`
- **Production branch**: `main`

Le regole per gli indirizzi stanno in `apps/mobile/public/` e finiscono nella
cartella pubblicata:

- `_redirects` — gli indirizzi con un identificativo (`/offerte/<id>` e
  compagnia) puntano al file `offerte/[id].html`, che altrimenti darebbe 404;
- `_headers` — le intestazioni di sicurezza.

`build:web` copia anche `+not-found.html` in `404.html`: è il nome che Pages
cerca per le pagine che non esistono.

> Se la costruzione si ferma su `Cannot find module '../lightningcss.linux-x64-gnu.node'`
> (o su `@next/swc`), il `package-lock.json` è stato rigenerato su un Mac con un
> npm che salta i binari delle altre piattaforme. Si rigenera da zero —
> `rm -rf node_modules package-lock.json && npm install` — e si controlla che
> nel file compaiano sia `lightningcss-linux-x64-gnu` sia `lightningcss-darwin-arm64`.

---

## 2. Le variabili d'ambiente

Si impostano su Cloudflare, **per ogni progetto**, prima della prima
costruzione. Quelle con prefisso `NEXT_PUBLIC_` ed `EXPO_PUBLIC_` finiscono
dentro il pacchetto: vanno messe prima, non dopo.

### Progetto A — landing

Il Worker ha due elenchi: **Settings → Build → Variables** (servono mentre
si costruisce) e **Settings → Variables and Secrets** (servono mentre gira).
Queste vanno in **tutti e due**:

```
SUPABASE_URL=https://gdeyyyirgriwknkcqcwl.supabase.co
SUPABASE_PUBLISHABLE_KEY=<la chiave pubblicabile>
NEXT_PUBLIC_SUPABASE_URL=https://gdeyyyirgriwknkcqcwl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<la stessa chiave>
DOMINIO_LANDING=https://<indirizzo del progetto A>
```

### Progetto B — app venditore

**Settings → Variables and Secrets**, ambiente Production:

```
EXPO_PUBLIC_SUPABASE_URL=https://gdeyyyirgriwknkcqcwl.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<la chiave pubblicabile>
EXPO_PUBLIC_DOMINIO_LANDING=https://<indirizzo del progetto A>
```

`DOMINIO_LANDING` è l'indirizzo che finisce nei QR, nei link che il venditore
manda su WhatsApp e nella mail di recupero password. Se resta `localhost` i
clienti ricevono link che non si aprono.

L'uovo e la gallina: `DOMINIO_LANDING` è l'indirizzo del progetto A
(`labpiattaforma-landing.<account>.workers.dev`), che si conosce solo dopo
averlo creato. Quindi **prima il progetto A**, poi si prende il suo indirizzo,
lo si mette nelle variabili dei due progetti e si ricostruisce.

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

Si aggiunge su Cloudflare al progetto A (**Settings → Domains & Routes**), si cambia `DOMINIO_LANDING` nei due
progetti e si rigenerano le pagine. I codici delle pagine già create non
cambiano, quindi **i QR già stampati continuano a funzionare** solo se il
dominio vecchio resta attivo o reindirizza: vale la pena deciderlo prima di
stampare qualcosa.
