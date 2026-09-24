'use client';

import { useMemo, useState } from 'react';
import {
  aGiorno,
  aggiungiGiorni,
  daGiorno,
  formattaEuro,
  formattaGiorno,
  giorniFra,
  giorniOccupati,
  nomeMese,
  periodoLibero,
  tariffaPerGiorni,
  totalePerGiorni,
  GIORNI_MASSIMI,
  type DatiNoleggioBreve,
  type PeriodoOccupato,
} from '@lab/shared';

import { Button } from '@/components/ui/button';

import { inviaPrenotazione, type EsitoPrenotazione } from './azioni';

/**
 * Calendario e prenotazione (§5.2).
 *
 * Il cliente sceglie il ritiro, poi la riconsegna, e vede il totale calcolarsi:
 * giorni per tariffa, con lo sconto applicato se supera le soglie. I giorni
 * gia' presi sono spenti e non si possono toccare.
 *
 * Quello che si ottiene qui e' un blocco temporaneo delle date, non una
 * prenotazione pagata: il pagamento del deposito e' il passo successivo e
 * richiede il conto su cui incassare, che non e' ancora deciso.
 */
export function Calendario({
  breve,
  occupati,
  codice,
}: {
  breve: DatiNoleggioBreve;
  occupati: PeriodoOccupato[];
  codice: string;
}) {
  const oggi = aGiorno(new Date());
  const primoMese = daGiorno(breve.disponibile_dal > oggi ? breve.disponibile_dal : oggi);

  const [mese, setMese] = useState(() => new Date(primoMese.getFullYear(), primoMese.getMonth(), 1));
  const [dal, setDal] = useState<string | null>(null);
  const [al, setAl] = useState<string | null>(null);
  const [esito, setEsito] = useState<EsitoPrenotazione>({ stato: 'fermo' });
  const [inCorso, setInCorso] = useState(false);

  const presi = useMemo(() => giorniOccupati(occupati), [occupati]);

  const primoGiornoUtile = breve.disponibile_dal > oggi ? breve.disponibile_dal : oggi;
  const ultimoGiornoUtile = breve.disponibile_al;

  function selezionabile(giorno: string): boolean {
    if (giorno < primoGiornoUtile || giorno > ultimoGiornoUtile) return false;
    return !presi.has(giorno);
  }

  function tocca(giorno: string) {
    setEsito({ stato: 'fermo' });

    // Primo tocco, o ricominciare da capo dopo aver scelto un periodo.
    if (!dal || al || giorno <= dal) {
      setDal(giorno);
      setAl(null);
      return;
    }

    // Il periodo non deve attraversare giorni gia' presi.
    if (!periodoLibero(dal, giorno, presi)) {
      setDal(giorno);
      setAl(null);
      return;
    }
    if (giorniFra(dal, giorno) > GIORNI_MASSIMI) return;
    setAl(giorno);
  }

  const giorni = dal && al ? giorniFra(dal, al) : 0;
  const tariffa = giorni > 0 ? tariffaPerGiorni(breve, giorni) : null;
  const totale = giorni > 0 ? totalePerGiorni(breve, giorni) : null;
  const scontata =
    tariffa != null && breve.tariffa_giorno_cent != null && tariffa < breve.tariffa_giorno_cent;

  async function prenota(dati: FormData) {
    if (!dal || !al) return;
    setInCorso(true);
    dati.set('codice', codice);
    dati.set('dal', dal);
    dati.set('al', al);
    const risposta = await inviaPrenotazione(dati);
    setEsito(risposta);
    setInCorso(false);
    if (risposta.stato === 'bloccata') {
      setDal(null);
      setAl(null);
    }
  }

  if (esito.stato === 'bloccata') {
    return (
      <div className="border-bordo bg-superficie rounded-xl border p-6 text-center">
        <p className="text-lg font-semibold">Date tenute per te</p>
        <p className="text-testo-tenue mt-2 text-sm">{esito.messaggio}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="border-bordo bg-superficie rounded-xl border p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMese(new Date(mese.getFullYear(), mese.getMonth() - 1, 1))}
            className="hover:bg-tenue flex size-10 cursor-pointer items-center justify-center rounded-lg"
            aria-label="Mese precedente"
          >
            ‹
          </button>
          <p className="font-semibold capitalize">{nomeMese(mese.getFullYear(), mese.getMonth())}</p>
          <button
            type="button"
            onClick={() => setMese(new Date(mese.getFullYear(), mese.getMonth() + 1, 1))}
            className="hover:bg-tenue flex size-10 cursor-pointer items-center justify-center rounded-lg"
            aria-label="Mese successivo"
          >
            ›
          </button>
        </div>

        <div className="text-testo-tenue mb-1 grid grid-cols-7 text-center text-xs">
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </div>

        <Griglia
          mese={mese}
          dal={dal}
          al={al}
          selezionabile={selezionabile}
          onTocca={tocca}
        />
      </div>

      {dal && !al && (
        <p className="text-testo-tenue text-center text-sm">
          Ritiro il {formattaGiorno(dal)}. Ora scegli quando riconsegni.
        </p>
      )}

      {dal && al && (
        <div className="border-bordo bg-superficie flex flex-col gap-3 rounded-xl border p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-testo-tenue text-sm">
              {formattaGiorno(dal)} → {formattaGiorno(al)}
            </span>
            <span className="text-sm font-semibold">
              {giorni} {giorni === 1 ? 'giorno' : 'giorni'}
            </span>
          </div>

          {tariffa != null && (
            <div className="text-testo-tenue flex items-baseline justify-between text-sm">
              <span>
                {formattaEuro(tariffa)} al giorno
                {scontata && <span className="text-emerald-700"> · tariffa ridotta</span>}
              </span>
            </div>
          )}

          {totale != null && (
            <div className="border-bordo flex items-baseline justify-between border-t pt-3">
              <span className="font-semibold">Totale</span>
              <span className="text-3xl font-bold">{formattaEuro(totale)}</span>
            </div>
          )}

          {breve.deposito_cent != null && breve.deposito_cent > 0 && (
            <p className="text-testo-tenue text-sm">
              Per tenere le date serve un deposito di {formattaEuro(breve.deposito_cent)}.
            </p>
          )}

          <form action={prenota} className="mt-2 flex flex-col gap-3">
            <input
              name="nome"
              required
              placeholder="Nome e cognome"
              autoComplete="name"
              className="border-bordo bg-sfondo min-h-11 rounded-lg border px-4"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="telefono"
                type="tel"
                placeholder="Telefono"
                autoComplete="tel"
                className="border-bordo bg-sfondo min-h-11 rounded-lg border px-4"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                autoComplete="email"
                className="border-bordo bg-sfondo min-h-11 rounded-lg border px-4"
              />
            </div>
            <label className="text-testo-tenue flex items-start gap-3 text-sm">
              <input type="checkbox" name="consenso" required className="mt-1 size-4" />
              <span>
                Acconsento al trattamento dei miei dati per essere ricontattato riguardo a questa
                prenotazione.
              </span>
            </label>

            {esito.stato === 'errore' && (
              <p role="alert" className="text-azione text-sm">
                {esito.messaggio}
              </p>
            )}

            <Button type="submit" size="lg" disabled={inCorso} className="w-full">
              {inCorso ? 'Un momento…' : 'Tieni queste date'}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function Griglia({
  mese,
  dal,
  al,
  selezionabile,
  onTocca,
}: {
  mese: Date;
  dal: string | null;
  al: string | null;
  selezionabile: (g: string) => boolean;
  onTocca: (g: string) => void;
}) {
  const primo = new Date(mese.getFullYear(), mese.getMonth(), 1);
  // getDay() mette la domenica a 0: in Italia la settimana comincia di lunedì.
  const scarto = (primo.getDay() + 6) % 7;
  const giorniNelMese = new Date(mese.getFullYear(), mese.getMonth() + 1, 0).getDate();

  const celle: (string | null)[] = [
    ...Array<null>(scarto).fill(null),
    ...Array.from({ length: giorniNelMese }, (_, i) =>
      aGiorno(new Date(mese.getFullYear(), mese.getMonth(), i + 1))
    ),
  ];

  return (
    <div className="grid grid-cols-7 gap-1">
      {celle.map((giorno, i) => {
        if (!giorno) return <span key={`vuoto-${i}`} />;

        const libero = selezionabile(giorno);
        const eInizio = giorno === dal;
        const eFine = giorno === al;
        const dentro = dal != null && al != null && giorno > dal && giorno < al;

        return (
          <button
            key={giorno}
            type="button"
            disabled={!libero}
            onClick={() => onTocca(giorno)}
            aria-label={formattaGiorno(giorno)}
            aria-pressed={eInizio || eFine || dentro}
            className={[
              'flex aspect-square cursor-pointer items-center justify-center rounded-lg text-sm transition-colors',
              !libero && 'text-testo-tenue cursor-not-allowed line-through opacity-40',
              libero && !eInizio && !eFine && !dentro && 'hover:bg-tenue',
              dentro && 'bg-tenue',
              (eInizio || eFine) && 'bg-primario text-su-primario font-semibold',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {daGiorno(giorno).getDate()}
          </button>
        );
      })}
    </div>
  );
}
