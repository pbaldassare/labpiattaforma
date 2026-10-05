'use client';

import { useMemo, useState } from 'react';
import {
  canonePer,
  durateDisponibili,
  formattaDurata,
  formattaEuro,
  formattaKm,
  kmDisponibili,
  type CellaCanone,
} from '@lab/shared';

import { MessageCircle, SlidersHorizontal } from 'lucide-react';

import { FormContatto } from '@/components/form-contatto';

/**
 * I due selettori del noleggio lungo e il form, insieme (§6.2).
 *
 * Stanno nello stesso componente perche' condividono una cosa sola ma
 * importante: la combinazione scelta. Quando il cliente preme "richiedi
 * preventivo", il messaggio e' gia' scritto con durata, chilometri e canone —
 * cosi' la richiesta arriva al venditore completa, e lui non deve richiamare
 * per chiedere cosa aveva selezionato.
 */
export function BloccoCanone({
  griglia,
  codice,
  riservata,
  titolo,
  slugVenditore,
}: {
  griglia: CellaCanone[];
  codice: string;
  riservata: boolean;
  titolo: string;
  slugVenditore: string;
}) {
  const durate = useMemo(() => durateDisponibili(griglia), [griglia]);
  const [durata, setDurata] = useState(durate[0] ?? 0);

  const km = useMemo(() => kmDisponibili(griglia, durata), [griglia, durata]);
  const [kmScelti, setKmScelti] = useState(km[0] ?? 0);

  // Cambiando durata, il chilometraggio scelto potrebbe non esistere piu' in
  // griglia: si ripiega sul primo disponibile invece di mostrare il vuoto.
  const kmEffettivi = km.includes(kmScelti) ? kmScelti : (km[0] ?? 0);
  const canone = canonePer(griglia, durata, kmEffettivi);

  const messaggio =
    canone != null
      ? `Sono interessato alla ${titolo}: ${formattaDurata(durata)}, ${formattaKm(
          kmEffettivi
        )}, ${formattaEuro(canone)} al mese.`
      : `Sono interessato alla ${titolo}: ${formattaDurata(durata)}, ${formattaKm(kmEffettivi)}.`;

  if (durate.length === 0) {
    return (
      <section id="contatto" className="rivela flex flex-col gap-4 pt-10">
        <h2 className="flex items-center gap-3">
          <span className="sfumatura-modulo text-m-su flex size-10 items-center justify-center rounded-2xl shadow-md shadow-m2/25">
            <MessageCircle className="size-5" strokeWidth={2.2} />
          </span>
          <span className="text-xl font-extrabold tracking-tight">Chiedi informazioni</span>
        </h2>
        <div className="bg-superficie rounded-3xl p-5 shadow-md ring-1 shadow-m2/10 ring-slate-900/5">
          <FormContatto codice={codice} riservata={riservata} slugVenditore={slugVenditore} />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rivela bg-superficie mt-10 flex flex-col gap-6 rounded-3xl p-5 shadow-md ring-1 shadow-m2/10 ring-slate-900/5">
        <h2 className="flex items-center gap-3">
          <span className="sfumatura-modulo text-m-su flex size-10 items-center justify-center rounded-2xl shadow-md shadow-m2/25">
            <SlidersHorizontal className="size-5" strokeWidth={2.2} />
          </span>
          <span className="text-xl font-extrabold tracking-tight">Componi il tuo canone</span>
        </h2>
        <Gruppo titolo="Per quanto tempo">
          {durate.map((d) => (
            <Opzione
              key={d}
              attiva={d === durata}
              etichetta={formattaDurata(d)}
              onClick={() => setDurata(d)}
            />
          ))}
        </Gruppo>

        <Gruppo titolo="Quanti chilometri all’anno">
          {km.map((k) => (
            <Opzione
              key={k}
              attiva={k === kmEffettivi}
              etichetta={formattaKm(k)}
              onClick={() => setKmScelti(k)}
            />
          ))}
        </Gruppo>

        <div
          className="sfumatura-modulo text-m-su relative overflow-hidden rounded-2xl p-6 text-center shadow-lg shadow-m2/25"
          aria-live="polite"
        >
          {canone != null ? (
            <>
              {/* key: a ogni combinazione il numero rientra, e l'occhio vede che e' cambiato. */}
              <p key={canone} className="entra text-5xl font-extrabold tracking-tight sm:text-6xl">
                {formattaEuro(canone)}
              </p>
              <p className="mt-1 text-sm font-semibold opacity-90">al mese</p>
            </>
          ) : (
            <p className="text-sm font-semibold">
              Per questa combinazione non c’è ancora un canone: scrivici e te lo calcoliamo.
            </p>
          )}
        </div>
      </section>

      <section id="contatto" className="rivela flex flex-col gap-4 pt-10">
        <h2 className="flex items-center gap-3">
          <span className="sfumatura-modulo text-m-su flex size-10 items-center justify-center rounded-2xl shadow-md shadow-m2/25">
            <MessageCircle className="size-5" strokeWidth={2.2} />
          </span>
          <span className="text-xl font-extrabold tracking-tight">Richiedi il preventivo</span>
        </h2>
        <div className="bg-superficie rounded-3xl p-5 shadow-md ring-1 shadow-m2/10 ring-slate-900/5">
          <FormContatto
            codice={codice}
            riservata={riservata}
            messaggioIniziale={messaggio}
            slugVenditore={slugVenditore}
          />
        </div>
      </section>
    </>
  );
}

function Gruppo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-m-testo mb-3 text-xs font-bold tracking-[0.2em] uppercase">
        {titolo}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Opzione({
  attiva,
  etichetta,
  onClick,
}: {
  attiva: boolean;
  etichetta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={attiva}
      className={[
        'min-h-11 cursor-pointer rounded-xl border px-4 text-sm font-semibold transition-all',
        attiva
          ? 'sfumatura-modulo text-m-su scale-105 border-transparent shadow-md shadow-m2/30'
          : 'bg-superficie border-bordo hover:border-m2 hover:text-m-testo',
      ].join(' ')}
    >
      {etichetta}
    </button>
  );
}
