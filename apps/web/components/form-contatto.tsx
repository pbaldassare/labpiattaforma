'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { inviaContatto, type EsitoContatto } from '@/lib/azioni-contatto';
import { BOTTONE_MODULO } from '@/lib/stile';

const INIZIALE: EsitoContatto = { stato: 'fermo' };

export function FormContatto({
  codice,
  riservata,
  messaggioIniziale,
  slugVenditore,
}: {
  codice: string;
  riservata: boolean;
  /** Precompilato dal noleggio lungo con la combinazione scelta (§6.2). */
  messaggioIniziale?: string;
  /** Serve a puntare l'informativa del venditore giusto. */
  slugVenditore?: string;
}) {
  const [esito, azione] = useActionState(inviaContatto, INIZIALE);

  if (esito.stato === 'inviato') {
    return (
      <div className="sfumatura-modulo text-m-su entra rounded-3xl p-6 text-center shadow-lg">
        <p className="text-2xl font-bold">Richiesta inviata!</p>
        <p className="mt-2 text-sm opacity-90">
          Ti richiamiamo al più presto. Se hai lasciato il numero, probabilmente su WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form action={azione} className="flex flex-col gap-4">
      <input type="hidden" name="codice" value={codice} />

      {/* Trappola per i riempimenti automatici: nascosta a chi guarda e a chi
          usa un lettore di schermo, visibile solo a chi legge il codice. */}
      <div aria-hidden className="hidden">
        <label htmlFor="ragione_sociale">Ragione sociale</label>
        <input id="ragione_sociale" name="ragione_sociale" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" required autoComplete="name" placeholder="Mario Rossi" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefono">Telefono</Label>
          <Input
            id="telefono"
            name="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="333 1234567"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="mario@esempio.it"
          />
        </div>
      </div>
      <p className="text-testo-tenue -mt-2 text-xs">Basta uno dei due.</p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="messaggio">Messaggio</Label>
        <Textarea
          id="messaggio"
          name="messaggio"
          rows={3}
          // key: cambiando la combinazione il campo si riscrive, a meno che il
          // cliente non l'abbia gia' modificato a mano. defaultValue da solo
          // non basterebbe, React non riapplica un valore non controllato.
          key={messaggioIniziale ?? 'vuoto'}
          defaultValue={messaggioIniziale}
          placeholder={
            riservata
              ? 'Sono un operatore, vorrei informazioni su questo mezzo.'
              : 'Sono interessato, quando posso vederla?'
          }
        />
      </div>

      <div className="flex items-start gap-3">
        <Checkbox id="consenso" name="consenso" required className="mt-1" />
        <Label htmlFor="consenso" className="text-testo-tenue text-sm leading-snug font-normal">
          Acconsento al trattamento dei miei dati per essere ricontattato riguardo a questa
          offerta.
          {/* Un consenso senza informativa non e' un consenso: il link deve
              stare qui, dove si spunta, non solo in fondo alla pagina. */}
          {slugVenditore && (
            <>
              {' '}
              <a
                href={`/${slugVenditore}/privacy`}
                target="_blank"
                rel="noopener"
                className="font-semibold underline"
              >
                Come li trattiamo
              </a>
              .
            </>
          )}
        </Label>
      </div>

      {esito.stato === 'errore' && (
        <p role="alert" className="text-azione text-sm">
          {esito.messaggio}
        </p>
      )}

      <BottoneInvio />
    </form>
  );
}

/**
 * Separato perche' useFormStatus legge lo stato del form che lo contiene:
 * dentro lo stesso componente del form non saprebbe cosa sta succedendo.
 */
function BottoneInvio() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={BOTTONE_MODULO}>
      {pending ? 'Invio…' : 'Invia la richiesta'}
    </button>
  );
}
