import type { Metadata } from 'next';
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
  Calendar,
  Car,
  Check,
  Cog,
  Fuel,
  Gauge,
  MessageCircle,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import {
  BarraWhatsApp,
  Copertina,
  Galleria,
  Intestazione,
  NonDisponibile as PaginaNonDisponibile,
  Pagina,
  Piede,
  Riquadri,
  Riquadro,
  SchedaVenditore,
  Sezione,
} from '@/components/landing';
import {
  DOMINIO,
  caricaPagina,
  offertaDisponibile,
  registraApertura,
  urlFoto,
  type DatiPagina,
} from '@/lib/landing';
import { qrSvg } from '@/lib/qr';

import { FormContatto } from '@/components/form-contatto';

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

  const ICONA_DETTAGLIO: Record<string, LucideIcon> = {
    Chilometri: Gauge,
    Anno: Calendar,
    Alimentazione: Fuel,
    Cambio: Cog,
  };

  return (
    <Pagina
      modulo="vendita"
      avviso={dati.pagina.tipo === 'riservata' ? 'Prezzo riservato agli operatori' : null}
    >
      {/* Foto grande in alto: e' quella che decide se il cliente continua a leggere. */}
      <Copertina foto={foto[0]} alt={dati.offerta.titolo} modulo="vendita" icona={Car} />

      <main className="mx-auto max-w-2xl px-4">
        <Intestazione
          sopra={vendita.marca}
          titolo={vendita.modello}
          prezzo={prezzo != null ? formattaEuro(prezzo) : null}
        >
          {guadagno != null && (
            <p className="text-testo-tenue mt-1 text-sm">
              Prezzo consigliato al pubblico{' '}
              <span className="text-testo font-semibold">
                {formattaEuro(vendita.prezzo_consigliato_cent!)}
              </span>
              {guadagno > 0 && (
                <span className="bg-m-tenue text-m-testo ml-2 rounded-full px-2 py-0.5 text-xs font-bold">
                  margine {formattaEuro(guadagno)}
                </span>
              )}
            </p>
          )}
        </Intestazione>

        {dettagli.length > 0 && (
          <Riquadri>
            {dettagli.map((d) => (
              <Riquadro
                key={d.etichetta}
                icona={ICONA_DETTAGLIO[d.etichetta] ?? Car}
                etichetta={d.etichetta}
                valore={d.valore}
              />
            ))}
          </Riquadri>
        )}

        {dati.formule.length > 0 && (
          <Sezione titolo="Come puoi acquistarla" icona={Wallet}>
            <ul className="flex flex-col gap-3">
              {dati.formule.map((f) => (
                <li
                  key={f}
                  className="bg-superficie flex items-start gap-3 rounded-2xl p-4 shadow-md ring-1 shadow-m2/10 ring-slate-900/5"
                >
                  <span className="bg-m-tenue text-m-testo flex size-8 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-bold">{ETICHETTA_FORMULA[f]}</span>
                    <span className="text-testo-tenue text-sm">{DESCRIZIONE_FORMULA[f]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Sezione>
        )}

        <Galleria foto={foto.slice(1)} alt={dati.offerta.titolo} />

        <Sezione titolo="Chiedi informazioni" icona={MessageCircle} id="contatto">
          <div className="bg-superficie rounded-3xl p-5 shadow-md ring-1 shadow-m2/10 ring-slate-900/5">
            <FormContatto
              codice={codice}
              riservata={dati.pagina.tipo === 'riservata'}
              slugVenditore={venditore.slug}
            />
          </div>
        </Sezione>

        <SchedaVenditore venditore={venditore} qr={qr} />
        <Piede slug={venditore.slug} />
      </main>

      <BarraWhatsApp numero={venditore.whatsapp} messaggio={messaggio} />
    </Pagina>
  );
}

function NonDisponibile({ dati }: { dati: DatiPagina }) {
  return (
    <PaginaNonDisponibile
      modulo="vendita"
      titolo="Offerta non più disponibile"
      testo={`${dati.offerta.titolo} non è più proposta da ${dati.venditore.nome}.`}
      vetrina={`${DOMINIO}/${dati.venditore.slug}`}
    />
  );
}
