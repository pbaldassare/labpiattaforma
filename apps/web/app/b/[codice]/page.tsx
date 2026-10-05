import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  formattaEuro,
  formattaEuroPreciso,
  formattaNumero,
  urlPagina,
  type PeriodoOccupato,
} from '@lab/shared';

import { CalendarDays, Gauge, IdCard, Route, Users, Wallet } from 'lucide-react';

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
  caricaDisponibilita,
  caricaPagina,
  offertaDisponibile,
  registraApertura,
  urlFoto,
  type DatiPagina,
} from '@/lib/landing';
import { qrSvg } from '@/lib/qr';

import { Calendario } from './calendario';

type Props = { params: Promise<{ codice: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codice } = await params;
  const dati = await caricaPagina(codice);
  if (!dati || !dati.breve) return { title: 'Offerta non disponibile' };

  const tariffa = dati.breve.tariffa_giorno_cent;
  const descrizione = tariffa
    ? `${dati.breve.modello} a noleggio da ${formattaEuro(tariffa)} al giorno. ${dati.venditore.nome}`
    : `${dati.breve.modello} a noleggio. ${dati.venditore.nome}`;

  return {
    title: `${dati.breve.modello} | ${dati.venditore.nome}`,
    description: descrizione,
    robots:
      dati.pagina.tipo === 'riservata' || !offertaDisponibile(dati)
        ? { index: false, follow: false }
        : { index: true, follow: true },
    openGraph: {
      title: dati.breve.modello,
      description: descrizione,
      type: 'website',
      images: dati.foto[0] ? [{ url: urlFoto(dati.foto[0]) }] : undefined,
    },
  };
}

export default async function PaginaNoleggioBreve({ params }: Props) {
  const { codice } = await params;
  const dati = await caricaPagina(codice);

  if (!dati || dati.offerta.modulo !== 'noleggio_breve' || !dati.breve) notFound();

  await registraApertura(codice);
  if (!offertaDisponibile(dati)) return <NonDisponibile dati={dati} />;

  const { breve, venditore, foto } = dati;
  const indirizzo = urlPagina(DOMINIO, 'noleggio_breve', codice);
  const qr = await qrSvg(indirizzo);

  // Il calendario si aggiorna da solo appena una prenotazione va a buon fine
  // (§5.2): la pagina e' resa dal server a ogni apertura, quindi legge sempre
  // la disponibilita' del momento.
  const disponibilita = await caricaDisponibilita(codice);
  const occupati: PeriodoOccupato[] = disponibilita?.occupati ?? [];

  const messaggio = `Ciao, vorrei noleggiare la ${breve.modello}.\n${indirizzo}`;

  return (
    <Pagina
      modulo="noleggio_breve"
      avviso={dati.pagina.tipo === 'riservata' ? 'Tariffe riservate agli operatori' : null}
    >
      <Copertina foto={foto[0]} alt={breve.modello} modulo="noleggio_breve" icona={CalendarDays} />

      <main className="mx-auto max-w-2xl px-4">
        <Intestazione
          sopra="Noleggio a breve termine"
          titolo={breve.modello}
          prezzo={breve.tariffa_giorno_cent != null ? formattaEuro(breve.tariffa_giorno_cent) : null}
          dopoIlPrezzo="al giorno"
        />

        <Sezione titolo="Quando ti serve" icona={CalendarDays}>
          <Calendario
            breve={breve}
            occupati={occupati}
            codice={codice}
            slugVenditore={venditore.slug}
          />
        </Sezione>

        <Riquadri>
          {breve.km_inclusi_giorno != null && (
            <Riquadro
              icona={Route}
              etichetta="Km inclusi"
              valore={`${formattaNumero(breve.km_inclusi_giorno)} al giorno`}
            />
          )}
          {/* Al km i centesimi sono tutto il prezzo: 0,30 € arrotondato all'euro
              diventerebbe "0 €". */}
          {breve.costo_km_extra_cent != null && (
            <Riquadro
              icona={Gauge}
              etichetta="Km in più"
              valore={`${formattaEuroPreciso(breve.costo_km_extra_cent)} al km`}
            />
          )}
          {breve.deposito_cent != null && breve.deposito_cent > 0 && (
            <Riquadro icona={Wallet} etichetta="Deposito" valore={formattaEuro(breve.deposito_cent)} />
          )}
          {breve.eta_minima != null && (
            <Riquadro icona={Users} etichetta="Età minima" valore={`${breve.eta_minima} anni`} />
          )}
          {breve.patente_anni != null && (
            <Riquadro icona={IdCard} etichetta="Patente da" valore={`${breve.patente_anni} anni`} />
          )}
        </Riquadri>

        <Galleria foto={foto.slice(1)} alt={breve.modello} />

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
      modulo="noleggio_breve"
      titolo="Offerta non più disponibile"
      testo={`${dati.offerta.titolo} non è più proposta da ${dati.venditore.nome}.`}
      vetrina={`${DOMINIO}/${dati.venditore.slug}`}
    />
  );
}
