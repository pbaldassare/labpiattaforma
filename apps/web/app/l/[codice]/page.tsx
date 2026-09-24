import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  ETICHETTA_SERVIZIO,
  NON_COMPRESO,
  formattaEuro,
  urlPagina,
} from '@lab/shared';

import {
  DOMINIO,
  caricaPagina,
  linkWhatsApp,
  offertaDisponibile,
  registraApertura,
  urlFoto,
  type DatiPagina,
} from '@/lib/landing';
import { qrSvg } from '@/lib/qr';

import { BloccoCanone } from './blocco-canone';

type Props = { params: Promise<{ codice: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codice } = await params;
  const dati = await caricaPagina(codice);

  if (!dati || !dati.lungo) return { title: 'Offerta non disponibile' };

  const minimo = dati.lungo.canone_minimo_cent;
  const descrizione = minimo
    ? `${dati.offerta.titolo} in noleggio da ${formattaEuro(minimo)} al mese. ${dati.venditore.nome}`
    : `${dati.offerta.titolo} in noleggio a lungo termine. ${dati.venditore.nome}`;

  return {
    title: `${dati.offerta.titolo} | ${dati.venditore.nome}`,
    description: descrizione,
    robots:
      dati.pagina.tipo === 'riservata' || !offertaDisponibile(dati)
        ? { index: false, follow: false }
        : { index: true, follow: true },
    openGraph: {
      title: dati.offerta.titolo,
      description: descrizione,
      type: 'website',
      images: dati.foto[0] ? [{ url: urlFoto(dati.foto[0]) }] : undefined,
    },
  };
}

export default async function PaginaNoleggioLungo({ params }: Props) {
  const { codice } = await params;
  const dati = await caricaPagina(codice);

  if (!dati || dati.offerta.modulo !== 'noleggio_lungo' || !dati.lungo) notFound();

  await registraApertura(codice);
  if (!offertaDisponibile(dati)) return <NonDisponibile dati={dati} />;

  const { lungo, venditore, foto } = dati;
  const indirizzo = urlPagina(DOMINIO, 'noleggio_lungo', codice);
  const qr = await qrSvg(indirizzo);

  const messaggio = `Ciao, sono interessato al noleggio della ${dati.offerta.titolo}.\n${indirizzo}`;

  return (
    <div className="pb-28">
      {dati.pagina.tipo === 'riservata' && (
        <p className="bg-primario text-su-primario px-4 py-2 text-center text-sm font-semibold tracking-wide">
          Canoni riservati agli operatori
        </p>
      )}

      <div className="bg-tenue relative aspect-4/3 w-full sm:aspect-16/9">
        {foto[0] ? (
          <Image
            src={urlFoto(foto[0])}
            alt={dati.offerta.titolo}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="text-testo-tenue flex h-full items-center justify-center text-sm">
            Nessuna foto
          </div>
        )}
      </div>

      <main className="mx-auto max-w-2xl px-4">
        <header className="border-bordo flex flex-col gap-2 border-b py-6">
          <p className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
            {lungo.marca}
          </p>
          <h1 className="font-display text-2xl leading-tight text-balance sm:text-3xl">
            {lungo.modello}
          </h1>
          {lungo.allestimento && (
            <p className="text-testo-tenue text-sm">{lungo.allestimento}</p>
          )}

          {/* Il canone piu' basso con la dicitura "a partire da" (§6.2): e' il
              numero che fa fermare a leggere, ma non va spacciato per il prezzo. */}
          {lungo.canone_minimo_cent != null && (
            <p className="mt-2">
              <span className="text-testo-tenue text-sm">a partire da </span>
              <span className="text-4xl font-bold sm:text-5xl">
                {formattaEuro(lungo.canone_minimo_cent)}
              </span>
              <span className="text-testo-tenue text-sm"> al mese</span>
            </p>
          )}
        </header>

        <BloccoCanone
          griglia={lungo.griglia}
          codice={codice}
          riservata={dati.pagina.tipo === 'riservata'}
          titolo={dati.offerta.titolo}
          slugVenditore={venditore.slug}
        />

        <section className="border-bordo grid grid-cols-2 gap-2 border-t py-6">
          {lungo.anticipo_cent != null && (
            <Riquadro etichetta="Anticipo" valore={formattaEuro(lungo.anticipo_cent)} />
          )}
          {lungo.tempi_consegna && (
            <Riquadro etichetta="Consegna" valore={lungo.tempi_consegna} />
          )}
          {lungo.riscatto_previsto && (
            <Riquadro
              etichetta="Riscatto finale"
              valore={
                lungo.riscatto_valore_cent != null
                  ? formattaEuro(lungo.riscatto_valore_cent)
                  : 'Previsto'
              }
            />
          )}
        </section>

        {lungo.servizi.length > 0 && (
          <section className="border-bordo flex flex-col gap-3 border-t py-6">
            <h2 className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
              Nel canone è compreso
            </h2>
            <ul className="grid grid-cols-2 gap-2">
              {lungo.servizi.map((s) => (
                <li
                  key={s}
                  className="bg-superficie border-bordo rounded-xl border px-3 py-2 text-sm font-medium"
                >
                  {ETICHETTA_SERVIZIO[s]}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Dirlo chiaramente e' una richiesta esplicita del documento (§6.2):
            un canone che sembra comprendere tutto e poi non comprende il
            carburante genera una telefonata arrabbiata invece di una vendita. */}
        <section className="border-bordo flex flex-col gap-2 border-t py-6">
          <h2 className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
            Non è compreso
          </h2>
          <p className="text-testo-tenue text-sm">{NON_COMPRESO.join(' · ')}</p>
        </section>

        {foto.length > 1 && (
          <section className="border-bordo border-t py-6">
            <div className="grid grid-cols-2 gap-2">
              {foto.slice(1).map((path) => (
                <div key={path} className="bg-tenue relative aspect-4/3 overflow-hidden rounded-xl">
                  <Image
                    src={urlFoto(path)}
                    alt={dati.offerta.titolo}
                    fill
                    loading="lazy"
                    sizes="(min-width: 640px) 320px, 50vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="border-bordo flex items-center gap-4 border-t py-6">
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{venditore.nome}</p>
            {venditore.presentazione && (
              <p className="text-testo-tenue text-sm">{venditore.presentazione}</p>
            )}
            {venditore.telefono && (
              <a href={`tel:${venditore.telefono}`} className="text-sm font-semibold underline">
                {venditore.telefono}
              </a>
            )}
          </div>
          <div
            className="ml-auto size-24 shrink-0"
            aria-label="Codice QR di questa pagina"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        </section>

        <footer className="border-bordo border-t py-6">
          <a
            href={`/${venditore.slug}/privacy`}
            className="text-testo-tenue text-sm underline"
          >
            Come trattiamo i tuoi dati
          </a>
        </footer>
      </main>

      {venditore.whatsapp && (
        <div className="border-bordo bg-sfondo/95 fixed inset-x-0 bottom-0 border-t p-4 backdrop-blur">
          <a
            href={linkWhatsApp(venditore.whatsapp, messaggio)}
            className="bg-azione text-su-azione mx-auto flex min-h-12 max-w-2xl items-center justify-center rounded-xl px-6 font-semibold transition-opacity hover:opacity-90"
          >
            Scrivi su WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}

function Riquadro({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="bg-superficie border-bordo rounded-xl border p-4">
      <p className="text-testo-tenue text-xs tracking-wide uppercase">{etichetta}</p>
      <p className="mt-1 text-lg font-semibold">{valore}</p>
    </div>
  );
}

function NonDisponibile({ dati }: { dati: DatiPagina }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl">Offerta non più disponibile</h1>
      <p className="text-testo-tenue">
        {dati.offerta.titolo} non è più proposta da {dati.venditore.nome}.
      </p>
      <a href={`${DOMINIO}/${dati.venditore.slug}`} className="font-semibold underline">
        Vedi le altre offerte
      </a>
    </main>
  );
}
