import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ETICHETTA_MODULO, formattaEuro, urlPagina, urlVetrina, type Modulo } from '@lab/shared';

import {
  DOMINIO,
  caricaVetrina,
  eRedirect,
  urlFoto,
  type DatiVetrina,
  type OffertaInVetrina,
} from '@/lib/landing';
import { qrSvg } from '@/lib/qr';
import { MarchioModulo, classeModulo } from '@/components/modulo';
import { cn } from '@/lib/utils';

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

  const quante = (m: string) => offerte.filter((o) => o.modulo === m).length;

  return (
    <main className="w-full pb-16">
      {/* L'intestazione prende tutta la larghezza e il colore: e' la prima
          cosa che si vede arrivando da WhatsApp, e deve dire subito che qui
          c'e' qualcuno che vende, non un elenco. */}
      <header className="testa-vetrina">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-12 text-center sm:py-16">
          {venditore.logo_path && (
            <div
              className="comparsa relative size-24 overflow-hidden rounded-full ring-4 ring-white/15 shadow-xl"
              style={{ '--i': 0 } as React.CSSProperties}
            >
              <Image
                src={urlFoto(venditore.logo_path)}
                alt={venditore.nome}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
          )}
          <h1
            className="comparsa font-display text-3xl text-balance sm:text-4xl"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            {venditore.nome}
          </h1>
          {venditore.presentazione && (
            <p
              className="comparsa text-testa-testo-tenue max-w-lg text-pretty"
              style={{ '--i': 2 } as React.CSSProperties}
            >
              {venditore.presentazione}
            </p>
          )}

          {/* I moduli presenti, uno accanto all'altro col loro colore: a colpo
              d'occhio si capisce se qui si vende, si noleggia o tutte e due. */}
          {moduli.length > 0 && (
            <ul
              className="comparsa flex flex-wrap justify-center gap-2"
              style={{ '--i': 3 } as React.CSSProperties}
              aria-label="Cosa trovi qui"
            >
              {moduli.map((m) => (
                <li key={m}>
                  <MarchioModulo modulo={m} pieno />
                </li>
              ))}
            </ul>
          )}

          <div
            className="comparsa mt-2 flex flex-wrap items-center justify-center gap-3"
            style={{ '--i': 4 } as React.CSSProperties}
          >
            {venditore.whatsapp && (
              <a
                href={`https://wa.me/${venditore.whatsapp.replace(/[^\d]/g, '')}`}
                className="bg-azione text-su-azione flex min-h-11 items-center justify-center rounded-full px-6 font-semibold shadow-lg shadow-red-900/30 transition-[transform,opacity] hover:-translate-y-0.5 hover:opacity-90"
              >
                Scrivi su WhatsApp
              </a>
            )}
            {venditore.telefono && (
              <a
                href={`tel:${venditore.telefono}`}
                className="flex min-h-11 items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 font-semibold backdrop-blur transition-colors hover:bg-white/20"
              >
                {venditore.telefono}
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4">
        {moduli.length > 1 && (
          <nav className="flex flex-wrap gap-2 py-6" aria-label="Filtra per tipo">
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
                {ETICHETTA_MODULO[m]} ({quante(m)})
              </Filtro>
            ))}
          </nav>
        )}

        {visibili.length === 0 ? (
          <p className="text-testo-tenue py-16 text-center">
            Nessuna offerta disponibile in questo momento.
          </p>
        ) : (
          <ul className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', moduli.length > 1 ? 'pb-8' : 'py-8')}>
            {visibili.map((o, i) => (
              <SchedaOfferta key={o.codice} offerta={o} indice={i} />
            ))}
          </ul>
        )}

      <footer className="border-bordo flex flex-col items-center gap-3 border-t py-10">
        <div className="size-32" aria-label="Codice QR di questa vetrina" dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="text-testo-tenue text-sm">{indirizzo}</p>
        <Link
          href={`/${venditore.slug}/privacy`}
          className="text-testo-tenue text-sm underline"
        >
          Come trattiamo i tuoi dati
        </Link>
      </footer>
      </div>
    </main>
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
  /** Il filtro di un modulo si accende del suo colore; "Tutto" resta grafite. */
  modulo?: Modulo;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={attivo ? 'true' : undefined}
      className={cn(
        modulo && classeModulo(modulo),
        'flex min-h-10 items-center rounded-full px-4 text-sm transition-[background-color,border-color,color,transform] duration-200',
        attivo
          ? modulo
            ? 'sfumatura-modulo font-semibold shadow-md'
            : 'bg-primario text-su-primario font-semibold shadow-md'
          : modulo
            ? 'border-bordo bg-superficie hover:border-modulo hover:text-modulo border font-medium'
            : 'border-bordo bg-superficie hover:border-testo-tenue border font-medium'
      )}
    >
      {children}
    </Link>
  );
}

function SchedaOfferta({ offerta, indice }: { offerta: OffertaInVetrina; indice: number }) {
  return (
    <li
      className={cn(classeModulo(offerta.modulo), 'comparsa')}
      style={{ '--i': indice } as React.CSSProperties}
    >
      <Link
        href={`/${urlPagina('', offerta.modulo, offerta.codice).replace(/^\//, '')}`}
        className="scheda-offerta border-bordo bg-superficie flex h-full flex-col overflow-hidden rounded-2xl border"
      >
        <div className="bg-tenue relative aspect-4/3 w-full overflow-hidden">
          {offerta.copertina ? (
            <Image
              src={urlFoto(offerta.copertina)}
              alt={offerta.titolo}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="foto-offerta object-cover"
            />
          ) : (
            <div className="sfumatura-modulo flex h-full items-center justify-center text-sm font-semibold opacity-90">
              {ETICHETTA_MODULO[offerta.modulo]}
            </div>
          )}
          <MarchioModulo modulo={offerta.modulo} pieno className="absolute top-3 left-3" />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="font-semibold text-pretty">{offerta.titolo}</p>
          {offerta.prezzo_cent != null && (
            <p className="text-modulo mt-auto pt-2 text-2xl font-bold">
              {offerta.da_partire && (
                <span className="text-testo-tenue text-xs font-normal">da </span>
              )}
              {formattaEuro(offerta.prezzo_cent)}
              {offerta.unita && (
                <span className="text-testo-tenue text-xs font-normal"> {offerta.unita}</span>
              )}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

export type { DatiVetrina };
