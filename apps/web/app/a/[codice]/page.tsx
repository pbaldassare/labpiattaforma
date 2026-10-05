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
  Check,
  Coins,
  FileText,
  MessageCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';

import {
  BarraWhatsApp,
  FasciaColore,
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
    <Pagina modulo="assicurazioni">
      <FasciaColore modulo="assicurazioni" icona={ShieldCheck} />

      <main className="mx-auto max-w-2xl px-4">
        {/* "Il numero mostrato e' quello di partenza, il preventivo esatto lo
            fa il venditore" (§7.2): dirlo evita la telefonata arrabbiata. */}
        <Intestazione
          sopra={`${a.compagnia} · ${ETICHETTA_RISCHIO[a.tipo_rischio]}`}
          titolo={a.nome_prodotto}
          primaDelPrezzo="a partire da"
          prezzo={formattaEuro(a.premio_partenza_cent)}
          dopoIlPrezzo={durata ? durata.toLowerCase() : undefined}
        >
          <p className="bg-m-tenue text-m-testo mt-2 rounded-xl px-3 py-2 text-sm font-medium">
            Il premio esatto dipende dai tuoi dati: scrivici e te lo calcoliamo.
          </p>
        </Intestazione>

        {(a.massimale_cent != null || a.franchigia_cent != null) && (
          <Riquadri>
            {a.massimale_cent != null && (
              <Riquadro icona={Shield} etichetta="Massimale" valore={formattaEuro(a.massimale_cent)} />
            )}
            {a.franchigia_cent != null && (
              <Riquadro icona={Coins} etichetta="Franchigia" valore={formattaEuro(a.franchigia_cent)} />
            )}
          </Riquadri>
        )}

        {comprese.length > 0 && (
          <Sezione titolo="Cosa copre" icona={ShieldCheck}>
            <ul className="flex flex-col gap-2">
              {comprese.map((g) => (
                <li
                  key={g.nome}
                  className="bg-superficie flex items-start gap-3 rounded-2xl p-4 shadow-md ring-1 shadow-m2/10 ring-slate-900/5"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="font-bold">{g.nome}</p>
                    {g.dettaglio && <p className="text-testo-tenue text-sm">{g.dettaglio}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Sezione>
        )}

        {escluse.length > 0 && (
          <Sezione titolo="Cosa non copre" icona={ShieldAlert}>
            <ul className="flex flex-col gap-2">
              {escluse.map((g) => (
                <li key={g.nome} className="flex items-start gap-3 rounded-2xl px-4 py-2">
                  <span className="bg-tenue text-testo-tenue flex size-7 shrink-0 items-center justify-center rounded-full">
                    <X className="size-4" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-testo-tenue">{g.nome}</p>
                    {g.dettaglio && <p className="text-testo-tenue text-sm">{g.dettaglio}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Sezione>
        )}

        {a.documenti_informativi.length > 0 && (
          <Sezione titolo="Documenti informativi" icona={FileText}>
            <ul className="flex flex-col gap-2">
              {a.documenti_informativi.map((d, i) => (
                <li key={d}>
                  <a
                    href={urlFoto(d)}
                    className="bg-superficie text-m-testo flex items-center gap-3 rounded-2xl p-4 font-semibold shadow-sm ring-1 ring-slate-900/5"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText className="size-5" />
                    Documento {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          </Sezione>
        )}

        <Sezione titolo="Chiedi il preventivo" icona={MessageCircle} id="contatto">
          <div className="bg-superficie rounded-3xl p-5 shadow-md ring-1 shadow-m2/10 ring-slate-900/5">
            <FormContatto
              codice={codice}
              riservata={false}
              messaggioIniziale={`Vorrei un preventivo per ${a.nome_prodotto} di ${a.compagnia}.`}
              slugVenditore={venditore.slug}
            />
          </div>
        </Sezione>

        <SchedaVenditore venditore={venditore} qr={qr}>
          {/* Obbligatorio per chi intermedia polizze (§7.4). */}
          {venditore.rui && (
            <p className="mt-1 text-xs font-semibold opacity-90">Iscrizione RUI n. {venditore.rui}</p>
          )}
        </SchedaVenditore>
        <Piede slug={venditore.slug} />
      </main>

      <BarraWhatsApp numero={venditore.whatsapp} messaggio={messaggio} />
    </Pagina>
  );
}

function NonDisponibile({ dati }: { dati: DatiPagina }) {
  return (
    <PaginaNonDisponibile
      modulo="assicurazioni"
      titolo="Polizza non più disponibile"
      testo={`${dati.offerta.titolo} non è più proposta da ${dati.venditore.nome}.`}
      vetrina={`${DOMINIO}/${dati.venditore.slug}`}
    />
  );
}
