import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ETICHETTA_MODULO, formattaEuro, urlPagina, urlVetrina, type Modulo } from '@lab/shared';
import {
  ArrowRight,
  CalendarDays,
  Car,
  KeyRound,
  Phone,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

import { BarraWhatsApp } from '@/components/landing';

import {
  DOMINIO,
  caricaVetrina,
  eRedirect,
  urlFoto,
  type DatiVetrina,
  type OffertaInVetrina,
} from '@/lib/landing';
import { qrSvg } from '@/lib/qr';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tipo?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { slug } = await params;
  const esito = await caricaVetrina(slug);

  if (!esito || eRedirect(esito)) return { title: 'Vetrina non trovata' };

  const { venditore, offerte } = esito;
  const descrizione =
    venditore.presentazione ??
    `${offerte.length} ${offerte.length === 1 ? 'offerta disponibile' : 'offerte disponibili'}.`;

  return {
    title: venditore.nome,
    description: descrizione,
    openGraph: { title: venditore.nome, description: descrizione, type: 'website' },
  };
}

export default async function Vetrina({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tipo } = await searchParams;
  const esito = await caricaVetrina(slug);

  if (!esito) notFound();

  // Slug abbandonato: si porta il visitatore su quello nuovo con un
  // reindirizzamento permanente, cosi' i QR gia' stampati restano validi e i
  // motori di ricerca aggiornano l'indirizzo invece di tenere due pagine.
  if (eRedirect(esito)) permanentRedirect(`/${esito.redirect_a}`);

  const { venditore, offerte } = esito;
  const indirizzo = urlVetrina(DOMINIO, venditore.slug);
  const qr = await qrSvg(indirizzo);

  // I filtri compaiono solo con piu' di un modulo in vetrina: con uno solo
  // sarebbero un bottone che non fa niente (documento §3.5).
  //
  // Filtrano con un parametro nell'indirizzo invece che con lo stato di un
  // componente: cosi' il venditore puo' mandare direttamente "solo i noleggi"
  // a un cliente, e la pagina resta leggibile anche senza JavaScript.
  const moduli = [...new Set(offerte.map((o) => o.modulo))];
  const scelto = moduli.find((m) => m === tipo) ?? null;
  const visibili = scelto ? offerte.filter((o) => o.modulo === scelto) : offerte;

  const iniziali = venditore.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

  return (
    <div className="relative min-h-screen overflow-x-clip pb-36">
      {/* La vetrina tiene insieme tutti i moduli: il fondo li mescola tutti e
          quattro, ogni scheda poi prende il colore del suo. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px]">
        <div className="bolla absolute -top-24 -left-20 size-80 rounded-full bg-lime-300/40 blur-3xl" />
        <div className="bolla absolute top-10 -right-24 size-80 rounded-full bg-orange-300/40 blur-3xl" style={{ ['--ritardo' as string]: '-3000ms' }} />
        <div className="bolla absolute top-80 -left-16 size-72 rounded-full bg-violet-300/35 blur-3xl" style={{ ['--ritardo' as string]: '-6000ms' }} />
        <div className="bolla absolute top-[460px] -right-10 size-72 rounded-full bg-sky-300/35 blur-3xl" style={{ ['--ritardo' as string]: '-8000ms' }} />
      </div>

      <main className="mx-auto w-full max-w-3xl px-4">
        <header className="entra flex flex-col items-center gap-4 pt-12 pb-6 text-center">
          {venditore.logo_path ? (
            <div className="bg-tenue relative size-24 overflow-hidden rounded-3xl shadow-xl ring-4 ring-white">
              <Image
                src={urlFoto(venditore.logo_path)}
                alt={venditore.nome}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
          ) : (
            <span className="font-display flex size-24 items-center justify-center rounded-3xl bg-linear-to-br from-lime-400 via-orange-400 to-violet-500 text-2xl font-bold text-white shadow-xl ring-4 ring-white">
              {iniziali}
            </span>
          )}
          <h1 className="font-display text-3xl text-balance sm:text-4xl">{venditore.nome}</h1>
          {venditore.presentazione && (
            <p className="text-testo-tenue max-w-lg text-lg text-pretty">{venditore.presentazione}</p>
          )}
          <p className="rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold shadow-sm ring-1 ring-slate-900/5">
            {offerte.length} {offerte.length === 1 ? 'offerta disponibile' : 'offerte disponibili'}
          </p>
          {venditore.telefono && (
            <a
              href={`tel:${venditore.telefono}`}
              className="flex min-h-12 items-center gap-2 rounded-2xl bg-white px-5 font-bold shadow-md ring-1 ring-slate-900/5 transition-transform hover:-translate-y-0.5"
            >
              <Phone className="size-4" strokeWidth={2.4} />
              Chiama {venditore.telefono}
            </a>
          )}
        </header>

        {moduli.length > 1 && (
          <nav className="entra flex flex-wrap justify-center gap-2 py-4" aria-label="Filtra per tipo" style={{ ['--ritardo' as string]: '150ms' }}>
            <Filtro attivo={scelto === null} href={`/${venditore.slug}`}>
              Tutto ({offerte.length})
            </Filtro>
            {moduli.map((m) => (
              <Filtro
                key={m}
                modulo={m}
                attivo={scelto === m}
                href={scelto === m ? `/${venditore.slug}` : `/${venditore.slug}?tipo=${m}`}
              >
                {ETICHETTA_MODULO[m]} ({offerte.filter((o) => o.modulo === m).length})
              </Filtro>
            ))}
          </nav>
        )}

        {visibili.length === 0 ? (
          <p className="text-testo-tenue py-16 text-center">
            Nessuna offerta disponibile in questo momento.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-5 py-6 sm:grid-cols-2">
            {visibili.map((o, i) => (
              <SchedaOfferta key={o.codice} offerta={o} indice={i} />
            ))}
          </ul>
        )}

        <footer className="rivela flex flex-col items-center gap-3 pt-8">
          <div className="rounded-3xl bg-white p-4 shadow-lg ring-1 ring-slate-900/5">
            <div className="size-32" aria-label="Codice QR di questa vetrina" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
          <p className="text-testo-tenue text-sm">Inquadra per riaprire questa vetrina</p>
          <Link href={`/${venditore.slug}/privacy`} className="text-testo-tenue text-sm underline">
            Come trattiamo i tuoi dati
          </Link>
        </footer>
      </main>

      <BarraWhatsApp
        numero={venditore.whatsapp}
        messaggio={`Ciao, ho visto le vostre offerte.\n${indirizzo}`}
      />
    </div>
  );
}

function Filtro({
  attivo,
  href,
  modulo,
  children,
}: {
  attivo: boolean;
  href: string;
  modulo?: Modulo;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={attivo ? 'true' : undefined}
      className={`${modulo ? `tema-${modulo}` : ''} ${
        attivo
          ? 'sfumatura-modulo text-m-su rounded-full px-4 py-2 text-sm font-bold shadow-md shadow-m2/30'
          : 'bg-superficie text-m-testo rounded-full px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-slate-900/10 transition-transform hover:-translate-y-0.5'
      }`}
    >
      {children}
    </Link>
  );
}

const ICONA_MODULO: Record<Modulo, LucideIcon> = {
  vendita: Car,
  noleggio_breve: CalendarDays,
  noleggio_lungo: KeyRound,
  assicurazioni: ShieldCheck,
};

function SchedaOfferta({ offerta, indice }: { offerta: OffertaInVetrina; indice: number }) {
  const Icona = ICONA_MODULO[offerta.modulo];
  return (
    <li className={`tema-${offerta.modulo} entra`} style={{ ['--ritardo' as string]: `${200 + indice * 80}ms` }}>
      <Link
        href={`/${urlPagina('', offerta.modulo, offerta.codice).replace(/^\//, '')}`}
        className="group bg-superficie flex h-full flex-col overflow-hidden rounded-3xl shadow-lg ring-1 shadow-m2/10 ring-slate-900/5 transition-all hover:-translate-y-1 hover:shadow-xl"
      >
        <div className="relative aspect-4/3 w-full overflow-hidden">
          {offerta.copertina ? (
            <Image
              src={urlFoto(offerta.copertina)}
              alt={offerta.titolo}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="sfumatura-modulo flex h-full items-center justify-center">
              <Icona className="text-m-su size-16 opacity-80" strokeWidth={1.4} />
            </div>
          )}
          <span className="sfumatura-modulo text-m-su absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase shadow-lg">
            <Icona className="size-3.5" strokeWidth={2.5} />
            {ETICHETTA_MODULO[offerta.modulo]}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <p className="text-lg font-bold text-pretty">{offerta.titolo}</p>
          <div className="mt-auto flex items-end justify-between gap-2">
            {offerta.prezzo_cent != null ? (
              <p className="flex items-baseline gap-1">
                {offerta.da_partire && <span className="text-testo-tenue text-xs">da</span>}
                <span className="testo-sfumato text-3xl font-extrabold tracking-tight">
                  {formattaEuro(offerta.prezzo_cent)}
                </span>
                {offerta.unita && <span className="text-testo-tenue text-xs">{offerta.unita}</span>}
              </p>
            ) : (
              <span />
            )}
            <span className="sfumatura-modulo text-m-su flex size-10 shrink-0 items-center justify-center rounded-full shadow-md transition-transform group-hover:translate-x-1">
              <ArrowRight className="size-5" strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

export type { DatiVetrina };
