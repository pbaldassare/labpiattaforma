import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ETICHETTA_SERVIZIO,
  NON_COMPRESO,
  formattaEuro,
  urlPagina,
} from '@lab/shared';

import { Ban, Check, HandCoins, KeyRound, ShieldCheck, Truck, Wallet } from 'lucide-react';

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
    <Pagina
      modulo="noleggio_lungo"
      avviso={dati.pagina.tipo === 'riservata' ? 'Canoni riservati agli operatori' : null}
    >
      <Copertina foto={foto[0]} alt={dati.offerta.titolo} modulo="noleggio_lungo" icona={KeyRound} />

      <main className="mx-auto max-w-2xl px-4">
        {/* Il canone piu' basso con la dicitura "a partire da" (§6.2): e' il
            numero che fa fermare a leggere, ma non va spacciato per il prezzo. */}
        <Intestazione
          sopra={lungo.marca}
          titolo={lungo.modello}
          sotto={lungo.allestimento}
          primaDelPrezzo={lungo.canone_minimo_cent != null ? 'a partire da' : undefined}
          prezzo={lungo.canone_minimo_cent != null ? formattaEuro(lungo.canone_minimo_cent) : null}
          dopoIlPrezzo="al mese"
        />

        <BloccoCanone
          griglia={lungo.griglia}
          codice={codice}
          riservata={dati.pagina.tipo === 'riservata'}
          titolo={dati.offerta.titolo}
          slugVenditore={venditore.slug}
        />

        <Riquadri>
          {lungo.anticipo_cent != null && (
            <Riquadro icona={Wallet} etichetta="Anticipo" valore={formattaEuro(lungo.anticipo_cent)} />
          )}
          {lungo.tempi_consegna && (
            <Riquadro icona={Truck} etichetta="Consegna" valore={lungo.tempi_consegna} />
          )}
          {lungo.riscatto_previsto && (
            <Riquadro
              icona={HandCoins}
              etichetta="Riscatto finale"
              valore={
                lungo.riscatto_valore_cent != null
                  ? formattaEuro(lungo.riscatto_valore_cent)
                  : 'Previsto'
              }
            />
          )}
        </Riquadri>

        {lungo.servizi.length > 0 && (
          <Sezione titolo="Nel canone è compreso" icona={ShieldCheck}>
            <ul className="grid grid-cols-2 gap-2">
              {lungo.servizi.map((s) => (
                <li
                  key={s}
                  className="bg-m-tenue text-m-testo flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold"
                >
                  <Check className="size-4 shrink-0" strokeWidth={3} />
                  {ETICHETTA_SERVIZIO[s]}
                </li>
              ))}
            </ul>
          </Sezione>
        )}

        {/* Dirlo chiaramente e' una richiesta esplicita del documento (§6.2):
            un canone che sembra comprendere tutto e poi non comprende il
            carburante genera una telefonata arrabbiata invece di una vendita. */}
        <Sezione titolo="Non è compreso" icona={Ban}>
          <ul className="flex flex-wrap gap-2">
            {NON_COMPRESO.map((voce) => (
              <li
                key={voce}
                className="bg-superficie text-testo-tenue rounded-full px-3 py-1.5 text-sm ring-1 ring-slate-900/10"
              >
                {voce}
              </li>
            ))}
          </ul>
        </Sezione>

        <Galleria foto={foto.slice(1)} alt={dati.offerta.titolo} />

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
      modulo="noleggio_lungo"
      titolo="Offerta non più disponibile"
      testo={`${dati.offerta.titolo} non è più proposta da ${dati.venditore.nome}.`}
      vetrina={`${DOMINIO}/${dati.venditore.slug}`}
    />
  );
}
