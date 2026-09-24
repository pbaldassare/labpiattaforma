import { ETICHETTA_MODULO, type Modulo } from './moduli';

/**
 * Cosa si puo' comprare quando finiscono le operazioni gratuite (§8.5).
 *
 * ATTENZIONE: gli importi qui sotto sono segnaposto, non prezzi decisi. Il
 * documento dice solo "il singolo modulo per un anno e il pacchetto con piu'
 * moduli a prezzo ridotto", senza cifre. Servono a far vedere com'e' fatta la
 * schermata; vanno sostituiti prima di qualunque uso vero, tenendo conto che
 * lo store trattiene la sua percentuale (§8.5, ultima riga).
 *
 * Stanno tutti qui e non sparsi nelle schermate proprio perche' il giorno in
 * cui i prezzi veri arrivano si cambia un file solo.
 */
export const PREZZI_DA_DECIDERE = true;

export interface Acquisto {
  codice: string;
  titolo: string;
  descrizione: string;
  prezzo_cent: number;
  periodo: string;
  /** Quanto si risparmia rispetto a comprare i moduli uno per uno. */
  risparmio_cent?: number;
  moduli: Modulo[] | 'uno';
}

const SINGOLO_CENT = 9900;
const PACCHETTO_CENT = 24900;

export function acquistiPer(modulo: Modulo): Acquisto[] {
  const tuttiSingoli = SINGOLO_CENT * 4;

  return [
    {
      codice: `modulo_${modulo}`,
      titolo: ETICHETTA_MODULO[modulo],
      descrizione:
        'Solo questo modulo, offerte e pagine senza limite. Gli altri restano come sono.',
      prezzo_cent: SINGOLO_CENT,
      periodo: 'per un anno',
      moduli: 'uno',
    },
    {
      codice: 'pacchetto_completo',
      titolo: 'Tutti e quattro',
      descrizione:
        'Vendita, noleggio breve, noleggio lungo e assicurazioni insieme, a meno di quanto costerebbero separati.',
      prezzo_cent: PACCHETTO_CENT,
      periodo: 'per un anno',
      risparmio_cent: tuttiSingoli - PACCHETTO_CENT,
      moduli: ['vendita', 'noleggio_breve', 'noleggio_lungo', 'assicurazioni'],
    },
  ];
}

/** Il messaggio del database quando il modulo e' finito. */
export const ERRORE_ESAURITO = 'modulo_esaurito';

export function eModuloEsaurito(messaggio: string | null | undefined): boolean {
  return (messaggio ?? '').includes(ERRORE_ESAURITO);
}
