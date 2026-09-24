import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ETICHETTA_MODULO, formattaEuro, urlPagina, urlVetrina } from '@lab/shared';

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

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <header className="border-bordo flex flex-col items-center gap-3 border-b py-10 text-center">
        {venditore.logo_path && (
          <div className="bg-tenue relative size-20 overflow-hidden rounded-full">
            <Image
              src={urlFoto(venditore.logo_path)}
              alt={venditore.nome}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
        )}
        <h1 className="font-display text-2xl text-balance sm:text-3xl">{venditore.nome}</h1>
        {venditore.presentazione && (
          <p className="text-testo-tenue max-w-lg text-pretty">{venditore.presentazione}</p>
        )}
        {venditore.telefono && (
          <a href={`tel:${venditore.telefono}`} className="font-semibold underline">
            {venditore.telefono}
          </a>
        )}
      </header>

      {moduli.length > 1 && (
        <nav className="flex flex-wrap gap-2 py-6" aria-label="Filtra per tipo">
          <Filtro attivo={scelto === null} href={`/${venditore.slug}`}>
            Tutto ({offerte.length})
          </Filtro>
          {moduli.map((m) => (
            <Filtro
              key={m}
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
        <ul className="grid grid-cols-1 gap-4 py-8 sm:grid-cols-2">
          {visibili.map((o) => (
            <SchedaOfferta key={o.codice} offerta={o} />
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
    </main>
  );
}

function Filtro({
  attivo,
  href,
  children,
}: {
  attivo: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={attivo ? 'true' : undefined}
      className={
        attivo
          ? 'bg-primario text-su-primario rounded-full px-4 py-1.5 text-sm font-semibold'
          : 'border-bordo bg-superficie hover:border-testo-tenue rounded-full border px-4 py-1.5 text-sm transition-colors'
      }
    >
      {children}
    </Link>
  );
}

function SchedaOfferta({ offerta }: { offerta: OffertaInVetrina }) {
  return (
    <li>
      <Link
        href={`/${urlPagina('', offerta.modulo, offerta.codice).replace(/^\//, '')}`}
        className="border-bordo bg-superficie hover:border-testo-tenue flex h-full flex-col overflow-hidden rounded-xl border transition-colors"
      >
        <div className="bg-tenue relative aspect-4/3 w-full">
          {offerta.copertina ? (
            <Image
              src={urlFoto(offerta.copertina)}
              alt={offerta.titolo}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="text-testo-tenue flex h-full items-center justify-center text-xs">
              Nessuna foto
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="font-semibold text-pretty">{offerta.titolo}</p>
          {offerta.prezzo_cent != null && (
            <p className="mt-auto text-xl font-bold">
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
