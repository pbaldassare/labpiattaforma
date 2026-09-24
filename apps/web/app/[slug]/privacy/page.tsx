import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';

import { DOMINIO, caricaVetrina, eRedirect } from '@/lib/landing';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const esito = await caricaVetrina(slug);
  if (!esito || eRedirect(esito)) return { title: 'Pagina non trovata' };

  return {
    title: `Trattamento dei dati | ${esito.venditore.nome}`,
    // Non va indicizzata: e' una pagina di servizio, e nei risultati di
    // ricerca toglierebbe posto alle offerte.
    robots: { index: false, follow: true },
  };
}

/**
 * L'informativa sul trattamento dei dati.
 *
 * Il form di contatto chiede un consenso, e un consenso senza informativa non
 * e' un consenso: serve poter leggere chi tratta i dati, quali, perche' e come
 * farseli cancellare.
 *
 * E' una per venditore e non una sola per la piattaforma perche' il titolare
 * del trattamento e' il venditore: i dati del cliente arrivano a lui, e' lui
 * che richiama. Nome e recapiti vengono dal suo profilo, quindi la pagina si
 * compila da sola man mano che lo compila.
 *
 * I DA_COMPLETARE sono le cose che solo il venditore puo' sapere: ragione
 * sociale, partita IVA, sede, per quanto tiene i dati. Restano in vista, e
 * volutamente antipatici da guardare, perche' una pagina del genere pubblicata
 * a meta' e' peggio che non averla.
 */
const DA_COMPLETARE = 'da completare';

export default async function Privacy({ params }: Props) {
  const { slug } = await params;
  const esito = await caricaVetrina(slug);

  if (!esito) notFound();
  if (eRedirect(esito)) permanentRedirect(`/${esito.redirect_a}/privacy`);

  const { venditore } = esito;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <Link href={`/${venditore.slug}`} className="text-testo-tenue text-sm hover:underline">
        ← {venditore.nome}
      </Link>

      <h1 className="font-display mt-6 text-2xl text-balance sm:text-3xl">
        Come trattiamo i tuoi dati
      </h1>
      <p className="text-testo-tenue mt-3">
        Questa pagina spiega cosa succede ai dati che lasci quando scrivi da una di queste pagine.
      </p>

      <Sezione titolo="Chi tratta i tuoi dati">
        <p>
          Il titolare del trattamento è <strong>{venditore.nome}</strong>
          {', '}
          <Segnaposto>ragione sociale, partita IVA e sede legale</Segnaposto>.
        </p>
        <p>
          Puoi scrivere o telefonare per qualunque richiesta sui tuoi dati:
          {venditore.telefono && (
            <>
              {' '}
              <a href={`tel:${venditore.telefono}`} className="font-semibold underline">
                {venditore.telefono}
              </a>
            </>
          )}
          {venditore.email && (
            <>
              {venditore.telefono ? ', ' : ' '}
              <a href={`mailto:${venditore.email}`} className="font-semibold underline">
                {venditore.email}
              </a>
            </>
          )}
          .
        </p>
      </Sezione>

      <Sezione titolo="Quali dati raccogliamo">
        <p>Solo quelli che scrivi tu nel modulo:</p>
        <Elenco
          voci={[
            'il nome che lasci;',
            'il telefono, l’email, o tutti e due: servono a ricontattarti;',
            'il messaggio, se ne scrivi uno;',
            'per una prenotazione, le date che hai scelto e l’importo del noleggio.',
          ]}
        />
        <p>
          Contiamo anche quante volte una pagina viene aperta, ma è un conteggio e basta: non
          registriamo chi l’ha aperta, da dove, né con quale dispositivo. Non usiamo cookie di
          profilazione e non c’è pubblicità.
        </p>
      </Sezione>

      <Sezione titolo="Perché">
        <p>
          Per richiamarti riguardo all’offerta che stavi guardando, e per tenere traccia di quello
          che ci siamo detti. Niente altro: i tuoi dati non vengono venduti, ceduti o usati per
          mandarti pubblicità.
        </p>
        <p>
          La base giuridica è il tuo consenso, quello che spunti prima di mandare il modulo. Puoi
          ritirarlo quando vuoi, e da quel momento smettiamo.
        </p>
      </Sezione>

      <Sezione titolo="Dove finiscono">
        <p>
          Su server nell’Unione Europea (Francoforte, Germania), gestiti per nostro conto da
          Supabase come responsabile del trattamento. Non escono dall’Unione Europea.
        </p>
        <p>
          Li vede chi lavora con {venditore.nome} per risponderti. Nessun altro, salvo obblighi di
          legge.
        </p>
      </Sezione>

      <Sezione titolo="Per quanto tempo">
        <p>
          <Segnaposto>per quanto tempo i dati vengono conservati</Segnaposto>. Quando ce lo chiedi,
          li cancelliamo prima.
        </p>
      </Sezione>

      <Sezione titolo="Cosa puoi chiedere">
        <p>
          Di sapere quali dati abbiamo su di te, di correggerli, di cancellarli, di riceverne una
          copia, di limitarne l’uso o di opporti al trattamento. Basta chiedere ai recapiti qui
          sopra: rispondiamo entro un mese.
        </p>
        <p>
          Se pensi che qualcosa non vada, puoi rivolgerti al Garante per la protezione dei dati
          personali (
          <a
            href="https://www.garanteprivacy.it"
            className="underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            garanteprivacy.it
          </a>
          ).
        </p>
      </Sezione>

      <footer className="border-bordo text-testo-tenue mt-12 border-t pt-6 text-sm">
        <p>
          {DOMINIO.replace(/^https?:\/\//, '')}/{venditore.slug}
        </p>
      </footer>
    </main>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="border-bordo mt-8 border-t pt-8">
      <h2 className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
        {titolo}
      </h2>
      <div className="mt-3 flex flex-col gap-3 leading-relaxed text-pretty">{children}</div>
    </section>
  );
}

function Elenco({ voci }: { voci: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5">
      {voci.map((v) => (
        <li key={v}>{v}</li>
      ))}
    </ul>
  );
}

/** Quello che manca si vede: una informativa a metà è peggio che nessuna. */
function Segnaposto({ children }: { children: React.ReactNode }) {
  return (
    <mark className="bg-accento-tenue text-accento rounded px-1.5 py-0.5 text-sm font-semibold">
      [{DA_COMPLETARE}: {children}]
    </mark>
  );
}
