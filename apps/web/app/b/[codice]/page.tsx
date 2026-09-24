import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  formattaEuro,
  formattaEuroPreciso,
  formattaNumero,
  urlPagina,
  type PeriodoOccupato,
} from '@lab/shared';

import {
  DOMINIO,
  caricaDisponibilita,
  caricaPagina,
  linkWhatsApp,
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
    <div className="pb-28">
      {dati.pagina.tipo === 'riservata' && (
        <p className="bg-primario text-su-primario px-4 py-2 text-center text-sm font-semibold tracking-wide">
          Tariffe riservate agli operatori
        </p>
      )}

      <div className="bg-tenue relative aspect-4/3 w-full sm:aspect-16/9">
        {foto[0] ? (
          <Image
            src={urlFoto(foto[0])}
            alt={breve.modello}
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
            Noleggio
          </p>
          <h1 className="font-display text-2xl leading-tight text-balance sm:text-3xl">
            {breve.modello}
          </h1>
          {breve.tariffa_giorno_cent != null && (
            <p className="mt-2">
              <span className="text-4xl font-bold sm:text-5xl">
                {formattaEuro(breve.tariffa_giorno_cent)}
              </span>
              <span className="text-testo-tenue text-sm"> al giorno</span>
            </p>
          )}
        </header>

        <section className="border-bordo flex flex-col gap-4 border-t py-6">
          <h2 className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
            Quando ti serve
          </h2>
          <Calendario breve={breve} occupati={occupati} codice={codice} />
        </section>

        <section className="border-bordo grid grid-cols-2 gap-2 border-t py-6">
          {breve.km_inclusi_giorno != null && (
            <Riquadro
              etichetta="Km inclusi"
              valore={`${formattaNumero(breve.km_inclusi_giorno)} al giorno`}
            />
          )}
          {/* Al km i centesimi sono tutto il prezzo: 0,30 € arrotondato all'euro
              diventerebbe "0 €". */}
          {breve.costo_km_extra_cent != null && (
            <Riquadro
              etichetta="Km in più"
              valore={`${formattaEuroPreciso(breve.costo_km_extra_cent)} al km`}
            />
          )}
          {breve.deposito_cent != null && breve.deposito_cent > 0 && (
            <Riquadro etichetta="Deposito" valore={formattaEuro(breve.deposito_cent)} />
          )}
          {breve.eta_minima != null && (
            <Riquadro etichetta="Età minima" valore={`${breve.eta_minima} anni`} />
          )}
          {breve.patente_anni != null && (
            <Riquadro etichetta="Patente da" valore={`${breve.patente_anni} anni`} />
          )}
        </section>

        {foto.length > 1 && (
          <section className="border-bordo border-t py-6">
            <div className="grid grid-cols-2 gap-2">
              {foto.slice(1).map((path) => (
                <div key={path} className="bg-tenue relative aspect-4/3 overflow-hidden rounded-xl">
                  <Image
                    src={urlFoto(path)}
                    alt={breve.modello}
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
