import { formattaNumero } from './offerta';

export type ServizioIncluso =
  | 'assicurazione'
  | 'manutenzione'
  | 'bollo'
  | 'gomme'
  | 'auto_sostitutiva'
  | 'assistenza';

export const SERVIZI: ServizioIncluso[] = [
  'assicurazione',
  'manutenzione',
  'bollo',
  'gomme',
  'auto_sostitutiva',
  'assistenza',
];

export const ETICHETTA_SERVIZIO: Record<ServizioIncluso, string> = {
  assicurazione: 'Assicurazione',
  manutenzione: 'Manutenzione',
  bollo: 'Bollo',
  gomme: 'Gomme',
  auto_sostitutiva: 'Auto sostitutiva',
  assistenza: 'Assistenza stradale',
};

/**
 * Cio' che non e' mai compreso, da dire chiaramente in pagina (§6.2).
 *
 * Il documento lo chiede esplicitamente, ed e' giusto: un canone che sembra
 * comprendere tutto e poi non comprende il carburante genera una telefonata
 * arrabbiata invece di una vendita.
 */
export const NON_COMPRESO = ['Carburante', 'Multe', 'Danni non coperti dall’assicurazione'];

export interface CellaCanone {
  durata_mesi: number;
  km_annui: number;
  canone_cent: number;
}

export interface DatiNoleggioLungo {
  marca: string;
  modello: string;
  allestimento: string | null;
  anticipo_cent: number | null;
  servizi: ServizioIncluso[];
  tempi_consegna: string | null;
  riscatto_previsto: boolean;
  riscatto_valore_cent: number | null;
  griglia: CellaCanone[];
  canone_minimo_cent: number | null;
}

/** Le durate disponibili, in ordine, senza ripetizioni. */
export function durateDisponibili(griglia: CellaCanone[]): number[] {
  return [...new Set(griglia.map((c) => c.durata_mesi))].sort((a, b) => a - b);
}

/** I chilometraggi disponibili per una certa durata. */
export function kmDisponibili(griglia: CellaCanone[], durata: number): number[] {
  return [
    ...new Set(griglia.filter((c) => c.durata_mesi === durata).map((c) => c.km_annui)),
  ].sort((a, b) => a - b);
}

/**
 * Il canone per una combinazione. Restituisce null se quella casella della
 * griglia non e' stata compilata: meglio non mostrare nulla che mostrare il
 * canone di un'altra durata.
 */
export function canonePer(
  griglia: CellaCanone[],
  durata: number,
  km: number
): number | null {
  return griglia.find((c) => c.durata_mesi === durata && c.km_annui === km)?.canone_cent ?? null;
}

// Niente Intl, per lo stesso motivo dei prezzi: su Hermes non e' garantito,
// e "15.000 km/anno" nella landing diverso da "15000 km/anno" nell'app fa
// sembrare due offerte diverse la stessa offerta.
export function formattaKm(km: number): string {
  return `${formattaNumero(km)} km/anno`;
}

export function formattaDurata(mesi: number): string {
  if (mesi % 12 === 0) {
    const anni = mesi / 12;
    return anni === 1 ? '1 anno' : `${anni} anni`;
  }
  return `${mesi} mesi`;
}
