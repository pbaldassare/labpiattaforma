import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  DESCRIZIONE_FORMULA,
  ETICHETTA_ALIMENTAZIONE,
  ETICHETTA_CAMBIO,
  ETICHETTA_FORMULA,
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

type Props = { params: Promise<{ codice: string }> };

const NUMERO_CHILOMETRI = new Intl.NumberFormat('it-IT');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codice } = await params;
  const dati = await caricaPagina(codice);

  if (!dati || !dati.vendita) return { title: 'Offerta non disponibile' };

  const titolo = dati.offerta.titolo;
  const prezzo = dati.vendita.prezzo_cent;
  const disponibile = offertaDisponibile(dati);

  // La maggior parte di queste pagine si apre da un messaggio WhatsApp:
  // l'anteprima con foto e prezzo e' il primo impatto, non un dettaglio.
  const descrizione = disponibile && prezzo
    ? `${titolo} — ${formattaEuro(prezzo)}. ${dati.venditore.nome}`
    : `${titolo} — offerta non piu' disponibile`;

  const copertina = dati.foto[0];

  return {
    title: `${titolo} | ${dati.venditore.nome}`,
    description: descrizione,
    // La pagina riservata non deve finire nei motori di ricerca (§3.7).
    robots:
      dati.pagina.tipo === 'riservata' || !disponibile
        ? { index: false, follow: false }
        : { index: true, follow: true },
    openGraph: {
      title: titolo,
      description: descrizione,
      type: 'website',
      images: copertina ? [{ url: urlFoto(copertina) }] : undefined,
    },
  };
}

export default async function PaginaVendita({ params }: Props) {
  const { codice } = await params;
  const dati = await caricaPagina(codice);

  if (!dati || dati.offerta.modulo !== 'vendita' || !dati.vendita) notFound();

  await registraApertura(codice);

  if (!offertaDisponibile(dati)) return <NonDisponibile dati={dati} />;

  const { vendita, venditore, foto } = dati;
  const indirizzo = urlPagina(DOMINIO, 'vendita', codice);
  const qr = await qrSvg(indirizzo);
  const prezzo = vendita.prezzo_cent;

  const messaggio = `Ciao, sono interessato alla ${dati.offerta.titolo}${
    prezzo ? ` a ${formattaEuro(prezzo)}` : ''
  }.\n${indirizzo}`;

  const dettagli = [
    vendita.chilometri != null && {
      etichetta: 'Chilometri',
      valore: `${NUMERO_CHILOMETRI.format(vendita.chilometri)} km`,
    },
    vendita.anno != null && { etichetta: 'Anno', valore: String(vendita.anno) },
    vendita.alimentazione && {
      etichetta: 'Alimentazione',
      valore: ETICHETTA_ALIMENTAZIONE[vendita.alimentazione],
    },
    vendita.cambio && { etichetta: 'Cambio', valore: ETICHETTA_CAMBIO[vendita.cambio] },
  ].filter(Boolean) as { etichetta: string; valore: string }[];

  const guadagno =
    vendita.prezzo_consigliato_cent != null && prezzo != null
      ? vendita.prezzo_consigliato_cent - prezzo
      : null;

  return (
    <div className="pb-28">
      {dati.pagina.tipo === 'riservata' && (
        <p className="bg-primario text-su-primario px-4 py-2 text-center text-sm font-semibold tracking-wide">
          Prezzo riservato agli operatori
        </p>
      )}

      {/* Foto grande in alto: e' quella che decide se il cliente continua a leggere. */}
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
            {vendita.marca}
          </p>
          <h1 className="font-display text-2xl leading-tight text-balance sm:text-3xl">
            {vendita.modello}
          </h1>
          {prezzo != null && (
            <p className="mt-2 text-4xl font-bold sm:text-5xl">{formattaEuro(prezzo)}</p>
          )}

          {guadagno != null && (
            <p className="text-testo-tenue mt-1 text-sm">
              Prezzo consigliato al pubblico{' '}
              <span className="text-testo font-semibold">
                {formattaEuro(vendita.prezzo_consigliato_cent!)}
              </span>
              {guadagno > 0 && <> · margine {formattaEuro(guadagno)}</>}
            </p>
          )}
        </header>

        {dettagli.length > 0 && (
          <section className="grid grid-cols-2 gap-px py-6">
            {dettagli.map((d) => (
              <div key={d.etichetta} className="bg-superficie border-bordo rounded-xl border p-4">
                <p className="text-testo-tenue text-xs tracking-wide uppercase">{d.etichetta}</p>
                <p className="mt-1 text-lg font-semibold">{d.valore}</p>
              </div>
            ))}
          </section>
        )}

        {dati.formule.length > 0 && (
          <section className="border-bordo flex flex-col gap-3 border-t py-6">
            <h2 className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
              Come puoi acquistarla
            </h2>
            <ul className="flex flex-col gap-2">
              {dati.formule.map((f) => (
                <li
                  key={f}
                  className="bg-superficie border-bordo flex flex-col rounded-xl border px-4 py-3"
                >
                  <span className="font-semibold">{ETICHETTA_FORMULA[f]}</span>
                  <span className="text-testo-tenue text-sm">{DESCRIZIONE_FORMULA[f]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

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
