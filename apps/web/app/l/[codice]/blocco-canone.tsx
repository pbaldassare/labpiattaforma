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
}: {
  griglia: CellaCanone[];
  codice: string;
  riservata: boolean;
  titolo: string;
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
      <section id="contatto" className="border-bordo flex flex-col gap-4 border-t py-6">
        <h2 className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
          Chiedi informazioni
        </h2>
        <FormContatto codice={codice} riservata={riservata} />
      </section>
    );
  }

  return (
    <>
      <section className="border-bordo flex flex-col gap-6 border-t py-6">
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
          className="border-bordo bg-superficie rounded-xl border p-6 text-center"
          aria-live="polite"
        >
          {canone != null ? (
            <>
              <p className="text-4xl font-bold sm:text-5xl">{formattaEuro(canone)}</p>
              <p className="text-testo-tenue mt-1 text-sm">al mese</p>
            </>
          ) : (
            <p className="text-testo-tenue text-sm">
              Per questa combinazione non c’è ancora un canone: scrivici e te lo calcoliamo.
            </p>
          )}
        </div>
      </section>

      <section id="contatto" className="border-bordo flex flex-col gap-4 border-t py-6">
        <h2 className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
          Richiedi il preventivo
        </h2>
        <FormContatto codice={codice} riservata={riservata} messaggioIniziale={messaggio} />
      </section>
    </>
  );
}

function Gruppo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-testo-tenue text-sm font-semibold tracking-widest uppercase">
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
        'min-h-11 cursor-pointer rounded-xl border px-4 text-sm font-medium transition-colors',
        attiva
          ? 'bg-primario text-su-primario border-primario'
          : 'bg-superficie border-bordo hover:border-testo-tenue',
      ].join(' ')}
    >
      {etichetta}
    </button>
  );
}
