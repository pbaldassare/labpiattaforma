import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import { ETICHETTA_MODULO, type Modulo } from '@lab/shared';
import { MessageCircle, Phone, type LucideIcon } from 'lucide-react';

import { linkWhatsApp, urlFoto, type DatiPagina } from '@/lib/landing';

/**
 * I pezzi comuni delle quattro landing di prodotto.
 *
 * Stanno qui e non copiati in ogni pagina perche' sono la stessa pagina con
 * contenuti diversi: un ritocco al pulsante WhatsApp deve valere per tutte e
 * quattro, non per quella che ci si ricorda di aprire.
 *
 * Il colore lo decide la classe tema-<modulo> messa da Pagina: tutto quello
 * che sta dentro usa m1, m2, m-testo e m-tenue senza sapere quale modulo sia.
 */

type Venditore = DatiPagina['venditore'];

/** Il ritardo di comparsa, scritto come variabile CSS per la classe .entra. */
function ritardo(ms: number): CSSProperties {
  return { '--ritardo': `${ms}ms` } as CSSProperties;
}

export function Pagina({
  modulo,
  avviso,
  children,
}: {
  modulo: Modulo;
  /** La fascia in cima per le pagine riservate agli operatori. */
  avviso?: string | null;
  children: ReactNode;
}) {
  return (
    <div
      className={`tema-${modulo} from-m-tenue via-sfondo to-sfondo relative min-h-screen overflow-x-clip bg-linear-to-b pb-36`}
    >
      {/* Due macchie di colore sfumate che si muovono piano dietro a tutto:
          danno vita al fondo senza competere col contenuto. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]">
        <div className="bolla bg-m1/45 absolute -top-24 -left-24 size-80 rounded-full blur-3xl" />
        <div
          className="bolla bg-m2/30 absolute top-80 -right-28 size-96 rounded-full blur-3xl"
          style={ritardo(-4000)}
        />
        <div
          className="bolla bg-m1/30 absolute top-[620px] -left-20 size-72 rounded-full blur-3xl"
          style={ritardo(-7000)}
        />
      </div>

      {avviso && (
        <p className="sfumatura-modulo text-m-su px-4 py-2 text-center text-sm font-semibold tracking-wide">
          {avviso}
        </p>
      )}
      {children}
    </div>
  );
}

/**
 * La foto grande in alto, che entra con un leggero zoom e sfuma nella pagina.
 * Senza foto, al suo posto una fascia nel colore del modulo con l'icona.
 */
export function Copertina({
  foto,
  alt,
  modulo,
  icona: Icona,
}: {
  foto: string | null | undefined;
  alt: string;
  modulo: Modulo;
  icona: LucideIcon;
}) {
  return (
    <div className="relative aspect-4/3 w-full overflow-hidden sm:aspect-16/9">
      {foto ? (
        <Image
          src={urlFoto(foto)}
          alt={alt}
          fill
          priority
          sizes="100vw"
          className="zoom-lento object-cover"
        />
      ) : (
        <div className="sfumatura-modulo flex h-full items-center justify-center">
          <Icona className="text-m-su size-24 opacity-80" strokeWidth={1.4} />
        </div>
      )}
      {/* La sfumatura in basso fa da letto alla scheda che sale sulla foto. */}
      <div className="from-sfondo absolute inset-x-0 bottom-0 h-28 bg-linear-to-t to-transparent" />
      <Etichetta modulo={modulo} icona={Icona} className="entra absolute top-4 left-4" />
    </div>
  );
}

/** Per le pagine senza foto (le polizze): la fascia colorata e' piu' bassa. */
export function FasciaColore({ modulo, icona: Icona }: { modulo: Modulo; icona: LucideIcon }) {
  return (
    <div className="sfumatura-modulo relative h-44 w-full overflow-hidden">
      <Icona
        aria-hidden
        className="text-m-su bolla absolute -right-6 -bottom-10 size-48 opacity-25"
        strokeWidth={1.2}
      />
      <Etichetta modulo={modulo} icona={Icona} className="entra absolute top-4 left-4" />
    </div>
  );
}

function Etichetta({
  modulo,
  icona: Icona,
  className,
}: {
  modulo: Modulo;
  icona: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={`sfumatura-modulo text-m-su inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase shadow-lg shadow-m2/30 ${className ?? ''}`}
    >
      <Icona className="size-3.5" strokeWidth={2.5} />
      {ETICHETTA_MODULO[modulo]}
    </span>
  );
}

/**
 * Titolo e prezzo, in una scheda che sale sopra la copertina.
 * Il prezzo e' il numero che fa fermare a leggere: grande e nel colore del modulo.
 */
export function Intestazione({
  sopra,
  titolo,
  sotto,
  prezzo,
  primaDelPrezzo,
  dopoIlPrezzo,
  children,
}: {
  sopra?: string | null;
  titolo: string;
  sotto?: string | null;
  prezzo?: string | null;
  primaDelPrezzo?: string;
  dopoIlPrezzo?: string;
  children?: ReactNode;
}) {
  return (
    <header
      className="entra bg-superficie relative -mt-14 flex flex-col gap-2 overflow-hidden rounded-3xl p-6 pt-7 shadow-2xl ring-1 shadow-m2/15 ring-slate-900/5"
      style={ritardo(150)}
    >
      <span aria-hidden className="sfumatura-modulo absolute inset-x-0 top-0 h-1.5" />
      {sopra && (
        <p className="text-m-testo text-xs font-bold tracking-[0.2em] uppercase">{sopra}</p>
      )}
      <h1 className="font-display text-2xl leading-tight text-balance sm:text-3xl">{titolo}</h1>
      {sotto && <p className="text-testo-tenue text-sm">{sotto}</p>}

      {prezzo && (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
          {primaDelPrezzo && <span className="text-testo-tenue text-sm">{primaDelPrezzo}</span>}
          <span className="testo-sfumato text-5xl font-extrabold tracking-tight sm:text-6xl">
            {prezzo}
          </span>
          {dopoIlPrezzo && <span className="text-testo-tenue text-sm">{dopoIlPrezzo}</span>}
        </p>
      )}
      {children}
    </header>
  );
}

export function Sezione({
  titolo,
  icona: Icona,
  id,
  children,
}: {
  titolo: string;
  icona: LucideIcon;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="rivela flex flex-col gap-4 pt-10">
      <h2 className="flex items-center gap-3">
        <span className="sfumatura-modulo text-m-su flex size-10 items-center justify-center rounded-2xl shadow-md shadow-m2/25">
          <Icona className="size-5" strokeWidth={2.2} />
        </span>
        <span className="text-xl font-extrabold tracking-tight">{titolo}</span>
      </h2>
      {children}
    </section>
  );
}

export function Riquadri({ children }: { children: ReactNode }) {
  return <div className="rivela grid grid-cols-2 gap-3 pt-6">{children}</div>;
}

export function Riquadro({
  etichetta,
  valore,
  icona: Icona,
}: {
  etichetta: string;
  valore: string;
  icona: LucideIcon;
}) {
  return (
    <div className="bg-superficie flex flex-col gap-3 rounded-2xl p-4 shadow-md ring-1 shadow-m2/10 ring-slate-900/5 transition-transform hover:-translate-y-1">
      <span className="sfumatura-modulo text-m-su flex size-10 items-center justify-center rounded-xl shadow-md shadow-m2/20">
        <Icona className="size-5" strokeWidth={2.2} />
      </span>
      <div>
        <p className="text-testo-tenue text-xs font-medium tracking-wide uppercase">{etichetta}</p>
        <p className="mt-0.5 text-lg leading-snug font-bold">{valore}</p>
      </div>
    </div>
  );
}

export function Galleria({ foto, alt }: { foto: string[]; alt: string }) {
  if (foto.length === 0) return null;
  return (
    <div className="rivela grid grid-cols-2 gap-3 pt-10">
      {foto.map((path, i) => (
        <div
          key={path}
          className={`bg-tenue group relative overflow-hidden rounded-2xl shadow-sm ${
            // La prima a tutta larghezza se sono dispari: niente buco in fondo.
            foto.length % 2 === 1 && i === 0 ? 'col-span-2 aspect-16/9' : 'aspect-4/3'
          }`}
        >
          <Image
            src={urlFoto(path)}
            alt={alt}
            fill
            loading="lazy"
            sizes="(min-width: 640px) 320px, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ))}
    </div>
  );
}

/** Chi propone l'offerta: iniziali colorate, telefono a un tocco e il QR della pagina. */
export function SchedaVenditore({
  venditore,
  qr,
  children,
}: {
  venditore: Venditore;
  qr: string;
  /** Righe in piu' sotto il nome, come il numero RUI per le polizze. */
  children?: ReactNode;
}) {
  const iniziali = venditore.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

  return (
    <section className="rivela pt-10">
      <div className="sfumatura-modulo text-m-su relative overflow-hidden rounded-3xl p-5 shadow-xl shadow-m2/25">
        <div aria-hidden className="bolla absolute -top-16 -right-16 size-48 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex flex-col gap-5">
          <div className="flex items-center gap-4">
            {venditore.logo_path ? (
              <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white/70">
                <Image
                  src={urlFoto(venditore.logo_path)}
                  alt={venditore.nome}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </span>
            ) : (
              <span className="font-display flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/25 text-lg font-bold backdrop-blur">
                {iniziali}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Ti segue</p>
              <p className="truncate text-xl font-extrabold">{venditore.nome}</p>
              {venditore.presentazione && (
                <p className="text-sm opacity-90">{venditore.presentazione}</p>
              )}
              {children}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {venditore.telefono ? (
              <a
                href={`tel:${venditore.telefono}`}
                className="bg-superficie text-m-testo flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 font-bold shadow-md transition-transform hover:-translate-y-0.5"
              >
                <Phone className="size-4" strokeWidth={2.4} />
                Chiama
              </a>
            ) : (
              <span className="flex-1" />
            )}
            <div
              className="size-20 shrink-0 rounded-xl bg-white p-1.5 shadow-md"
              aria-label="Codice QR di questa pagina"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Piede({ slug }: { slug: string }) {
  return (
    <footer className="pt-10 pb-4 text-center">
      <a href={`/${slug}/privacy`} className="text-testo-tenue text-sm underline">
        Come trattiamo i tuoi dati
      </a>
    </footer>
  );
}

/**
 * Il pulsante WhatsApp, sempre a portata di pollice.
 *
 * Verde WhatsApp e non nel colore del modulo: e' il segno che tutti
 * riconoscono, e dice gia' prima di leggerlo dove porta il tocco.
 */
export function BarraWhatsApp({
  numero,
  messaggio,
  testo = 'Scrivi su WhatsApp',
}: {
  numero: string | null;
  messaggio: string;
  testo?: string;
}) {
  if (!numero) return null;
  return (
    <div className="sale fixed inset-x-0 bottom-0 z-20 px-4 pt-6 pb-4">
      <div className="from-sfondo pointer-events-none absolute inset-0 bg-linear-to-t via-sfondo/80 to-transparent" />
      <a
        href={linkWhatsApp(numero, messaggio)}
        className="riflesso alone relative mx-auto flex min-h-14 max-w-2xl items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-6 text-base font-bold text-white shadow-xl shadow-[#25D366]/30 transition-transform hover:-translate-y-0.5"
      >
        <MessageCircle className="size-5" strokeWidth={2.4} />
        {testo}
      </a>
    </div>
  );
}

/** La pagina di un'offerta ritirata: niente vicolo cieco, si torna alla vetrina. */
export function NonDisponibile({
  modulo,
  titolo,
  testo,
  vetrina,
}: {
  modulo: Modulo;
  titolo: string;
  testo: string;
  vetrina: string;
}) {
  return (
    <main
      className={`tema-${modulo} mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center`}
    >
      <h1 className="font-display text-2xl">{titolo}</h1>
      <p className="text-testo-tenue">{testo}</p>
      <a href={vetrina} className="sfumatura-modulo text-m-su rounded-2xl px-6 py-3 font-semibold">
        Vedi le altre offerte
      </a>
    </main>
  );
}
