import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ETICHETTA_RISCHIO,
  formattaDurataPolizza,
  formattaEuro,
  urlPagina,
} from '@lab/shared';

import { FormContatto } from '@/components/form-contatto';
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codice } = await params;
  const dati = await caricaPagina(codice);
  if (!dati || !dati.assicurazione) return { title: 'Polizza non disponibile' };

  const a = dati.assicurazione;
  const descrizione = `${a.compagnia} ${a.nome_prodotto} da ${formattaEuro(
    a.premio_partenza_cent
  )}. ${dati.venditore.nome}`;

  return {
    title: `${a.nome_prodotto} | ${dati.venditore.nome}`,
    description: descrizione,
    robots: offertaDisponibile(dati) ? { index: true, follow: true } : { index: false },
    openGraph: { title: a.nome_prodotto, description: descrizione, type: 'website' },
  };
}

export default async function PaginaAssicurazione({ params }: Props) {
  const { codice } = await params;
  const dati = await caricaPagina(codice);

  if (!dati || dati.offerta.modulo !== 'assicurazioni' || !dati.assicurazione) notFound();

  await registraApertura(codice);
  if (!offertaDisponibile(dati)) return <NonDisponibile dati={dati} />;

  const a = dati.assicurazione;
  const { venditore } = dati;
  const indirizzo = urlPagina(DOMINIO, 'assicurazioni', codice);
  const qr = await qrSvg(indirizzo);

  const comprese = a.garanzie.filter((g) => g.inclusa);
  const escluse = a.garanzie.filter((g) => !g.inclusa);
  const durata = formattaDurataPolizza(a.durata_mesi);

  const messaggio = `Ciao, vorrei un preventivo per ${a.nome_prodotto} di ${a.compagnia}.\n${indirizzo}`;

  return (
    <div className="pb-28">
      <main className="mx-auto max-w-2xl px-4">
        <header className="border-bordo flex flex-col gap-2 border-b py-10">
          <p className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
            {a.compagnia} · {ETICHETTA_RISCHIO[a.tipo_rischio]}
          </p>
          <h1 className="font-display text-2xl leading-tight text-balance sm:text-3xl">
            {a.nome_prodotto}
          </h1>

          {/* "Il numero mostrato e' quello di partenza, il preventivo esatto lo
              fa il venditore" (§7.2): dirlo evita la telefonata arrabbiata. */}
          <p className="mt-2">
            <span className="text-testo-tenue text-sm">a partire da </span>
            <span className="text-4xl font-bold sm:text-5xl">
              {formattaEuro(a.premio_partenza_cent)}
            </span>
            {durata && <span className="text-testo-tenue text-sm"> · {durata.toLowerCase()}</span>}
          </p>
          <p className="text-testo-tenue text-sm">
            Il premio esatto dipende dai tuoi dati: scrivici e te lo calcoliamo.
          </p>
        </header>

        {(a.massimale_cent != null || a.franchigia_cent != null) && (
          <section className="grid grid-cols-2 gap-2 py-6">
            {a.massimale_cent != null && (
              <Riquadro etichetta="Massimale" valore={formattaEuro(a.massimale_cent)} />
            )}
            {a.franchigia_cent != null && (
              <Riquadro etichetta="Franchigia" valore={formattaEuro(a.franchigia_cent)} />
            )}
          </section>
        )}

        {comprese.length > 0 && (
          <section className="border-bordo flex flex-col gap-3 border-t py-6">
            <h2 className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
              Cosa copre
            </h2>
            <ul className="flex flex-col gap-2">
              {comprese.map((g) => (
                <li
                  key={g.nome}
                  className="bg-superficie border-bordo flex items-start gap-3 rounded-xl border px-4 py-3"
                >
                  <SegnoSi />
                  <div>
                    <p className="font-semibold">{g.nome}</p>
                    {g.dettaglio && <p className="text-testo-tenue text-sm">{g.dettaglio}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {escluse.length > 0 && (
          <section className="border-bordo flex flex-col gap-3 border-t py-6">
            <h2 className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
              Cosa non copre
            </h2>
            <ul className="flex flex-col gap-2">
              {escluse.map((g) => (
                <li key={g.nome} className="flex items-start gap-3 px-4 py-2">
                  <SegnoNo />
                  <div>
                    <p className="text-testo-tenue">{g.nome}</p>
                    {g.dettaglio && <p className="text-testo-tenue text-sm">{g.dettaglio}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {a.documenti_informativi.length > 0 && (
          <section className="border-bordo flex flex-col gap-3 border-t py-6">
            <h2 className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
              Documenti informativi
            </h2>
            <ul className="flex flex-col gap-2">
              {a.documenti_informativi.map((d, i) => (
                <li key={d}>
                  <a
                    href={urlFoto(d)}
                    className="font-semibold underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Documento {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="contatto" className="border-bordo flex flex-col gap-4 border-t py-6">
          <h2 className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
            Chiedi il preventivo
          </h2>
          <FormContatto
            codice={codice}
            riservata={false}
            messaggioIniziale={`Vorrei un preventivo per ${a.nome_prodotto} di ${a.compagnia}.`}
            slugVenditore={venditore.slug}
          />
        </section>

        <section className="border-bordo flex items-center gap-4 border-t py-6">
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{venditore.nome}</p>
            {venditore.telefono && (
              <a href={`tel:${venditore.telefono}`} className="text-sm font-semibold underline">
                {venditore.telefono}
              </a>
            )}
            {/* Obbligatorio per chi intermedia polizze (§7.4). */}
            {venditore.rui && (
              <p className="text-testo-tenue text-xs">
                Iscrizione RUI n. {venditore.rui}
              </p>
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

function SegnoSi() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className="mt-0.5 size-5 shrink-0 fill-none stroke-current stroke-2 text-emerald-600"
    >
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SegnoNo() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className="text-testo-tenue mt-0.5 size-5 shrink-0 fill-none stroke-current stroke-2"
    >
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}

function NonDisponibile({ dati }: { dati: DatiPagina }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl">Polizza non più disponibile</h1>
      <p className="text-testo-tenue">
        {dati.offerta.titolo} non è più proposta da {dati.venditore.nome}.
      </p>
      <a href={`${DOMINIO}/${dati.venditore.slug}`} className="font-semibold underline">
        Vedi le altre offerte
      </a>
    </main>
  );
}
