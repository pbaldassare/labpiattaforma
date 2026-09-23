# Lab Piattaforma — App Venditori

Strumento per il singolo venditore di veicoli. Carica un'offerta, ne esce una pagina web
con link e QR da mandare al cliente, e da lì arrivano i contatti da lavorare.

Quattro moduli acquistabili separatamente: **Vendita**, **Noleggio breve termine**,
**Noleggio lungo termine**, **Assicurazioni**.

## Com'è fatto

| Cartella | Cosa contiene |
|---|---|
| `apps/mobile` | L'app del venditore — Expo 57 + expo-router, iOS e Android |
| `apps/web` | Le landing pubbliche — Next.js 16 + Tailwind 4 |
| `packages/shared` | Tipi, costanti e validazioni usati da entrambi |
| `supabase/migrations` | Lo schema del database, una migration per passo |

Due superfici distinte per ragioni precise: l'app la usa solo il venditore ed è ottimizzata
per l'uso ripetuto; le landing le aprono i clienti da WhatsApp e devono caricare in fretta
ed essere indicizzabili.

La logica di calcolo (sconti a soglia, griglie canoni, margini, scelta del prezzo per tipo
cliente) vive in `packages/shared` perché serve in tre posti — nell'app mentre si scrive,
nella landing mentre il cliente sceglie, e sul server quando si conferma. Scritta tre volte,
prima o poi dà tre risultati diversi.

## Avvio

```bash
npm install
npm run dev
```

Oppure una superficie alla volta:

```bash
npm run dev:web      # landing su http://localhost:3000
npm run dev:mobile   # app venditore, Expo
```

Prima del primo avvio copia i file di esempio e compilali:

- `apps/mobile/.env.example` → `apps/mobile/.env`
- `apps/web/.env.example` → `apps/web/.env.local`

## Database

Le tabelle stanno nello schema **`venditori`**, non in `public`: lo stesso progetto Supabase
ospita altre applicazioni e `public` non va mai toccato.

Perché funzioni, `venditori` deve essere fra gli *Exposed schemas* nelle impostazioni API
del progetto. I client sono già inizializzati con `db: { schema: 'venditori' }`.

### Sicurezza

La chiave pubblicabile è dentro il bundle dell'app: chiunque la può leggere. **Le policy RLS
sono l'unica cosa che separa i dati di un venditore da quelli di un altro.** Regole seguite
in tutte le migration:

- RLS attiva su ogni tabella, una policy per operazione (mai `for all`)
- `to authenticated` sempre esplicito
- `(select auth.uid())` e mai `auth.uid()` nudo
- su `update` sia `using` che `with check`
- `user_id` con `default auth.uid()`: il client non manda mai la propria identità
- indice su ogni colonna usata dalle policy

Gli anonimi non hanno alcun permesso: le landing sono renderizzate dal server e leggono con
la chiave di servizio. L'accesso anonimo arriverà in Fase 1 e solo per due cose — l'invio del
form di contatto e il conteggio delle aperture.

La chiave di servizio bypassa ogni policy: vive solo sul server di `apps/web`, mai in una
variabile `NEXT_PUBLIC_` o `EXPO_PUBLIC_`.

## Stato

**Fase 0 — fondamenta: completata.** Schema, profilo del venditore, regole dello slug,
isolamento fra venditori, scheletro delle due app.

Prossima: Fase 1 — impianto offerta → landing e modulo Vendita completo.

## Note di sviluppo

- In `apps/mobile` le dipendenze si aggiungono con `npx expo install <pacchetto>`, non con
  `npm install`: è Expo a scegliere la versione compatibile con l'SDK.
- Le modifiche allo schema passano da una migration in `supabase/migrations`, mai da SQL
  eseguito a mano nell'editor.
