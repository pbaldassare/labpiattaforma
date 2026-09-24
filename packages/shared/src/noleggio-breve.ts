export interface DatiNoleggioBreve {
  modello: string;
  disponibile_dal: string;
  disponibile_al: string;
  tariffa_giorno_cent: number | null;
  tariffa_oltre_3_cent: number | null;
  tariffa_oltre_7_cent: number | null;
  tariffa_oltre_15_cent: number | null;
  km_inclusi_giorno: number | null;
  costo_km_extra_cent: number | null;
  deposito_cent: number | null;
  eta_minima: number | null;
  patente_anni: number | null;
}

export interface PeriodoOccupato {
  dal: string;
  al: string;
}

/** Breve termine: da un giorno a un mese (§5.3). */
export const GIORNI_MINIMI = 1;
export const GIORNI_MASSIMI = 30;

/**
 * La tariffa giornaliera cambia con la durata (§5.1).
 *
 * Deve dare lo stesso risultato della funzione `tariffa_per_giorni` nel
 * database: qui serve a mostrare il totale mentre il cliente sceglie le date,
 * la' a calcolare quello che paga davvero. Se divergessero, il cliente
 * vedrebbe un prezzo e ne pagherebbe un altro.
 */
export function tariffaPerGiorni(breve: DatiNoleggioBreve, giorni: number): number | null {
  const { tariffa_giorno_cent, tariffa_oltre_3_cent, tariffa_oltre_7_cent, tariffa_oltre_15_cent } =
    breve;

  if (giorni > 15) {
    return tariffa_oltre_15_cent ?? tariffa_oltre_7_cent ?? tariffa_oltre_3_cent ?? tariffa_giorno_cent;
  }
  if (giorni > 7) return tariffa_oltre_7_cent ?? tariffa_oltre_3_cent ?? tariffa_giorno_cent;
  if (giorni > 3) return tariffa_oltre_3_cent ?? tariffa_giorno_cent;
  return tariffa_giorno_cent;
}

export function totalePerGiorni(breve: DatiNoleggioBreve, giorni: number): number | null {
  const tariffa = tariffaPerGiorni(breve, giorni);
  return tariffa == null ? null : tariffa * giorni;
}

// ── Date ────────────────────────────────────────────────────────────────────
// Tutte in forma "AAAA-MM-GG", senza fuso orario: un noleggio comincia il 5
// marzo indipendentemente da dove si trova chi guarda la pagina.

export function aGiorno(d: Date): string {
  const mese = String(d.getMonth() + 1).padStart(2, '0');
  const giorno = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mese}-${giorno}`;
}

export function daGiorno(s: string): Date {
  const [a, m, g] = s.split('-').map(Number);
  return new Date(a!, (m ?? 1) - 1, g ?? 1);
}

export function giorniFra(dal: string, al: string): number {
  const ms = daGiorno(al).getTime() - daGiorno(dal).getTime();
  return Math.round(ms / 86_400_000);
}

export function aggiungiGiorni(s: string, quanti: number): string {
  const d = daGiorno(s);
  d.setDate(d.getDate() + quanti);
  return aGiorno(d);
}

/**
 * I giorni occupati, uno per uno.
 *
 * I periodi hanno l'estremo finale escluso: chi riconsegna il 10 libera il 10
 * per chi ritira quel giorno. Espanderli in un insieme rende immediato
 * spegnere le caselle del calendario.
 */
export function giorniOccupati(periodi: PeriodoOccupato[]): Set<string> {
  const occupati = new Set<string>();
  for (const p of periodi) {
    let giorno = p.dal.slice(0, 10);
    const fine = p.al.slice(0, 10);
    // Guardia contro periodi malformati: meglio un calendario incompleto che
    // un ciclo infinito nella pagina del cliente.
    for (let i = 0; giorno < fine && i < 400; i++) {
      occupati.add(giorno);
      giorno = aggiungiGiorni(giorno, 1);
    }
  }
  return occupati;
}

/** Il periodo scelto tocca un giorno gia' preso? */
export function periodoLibero(
  dal: string,
  al: string,
  occupati: Set<string>
): boolean {
  let giorno = dal;
  for (let i = 0; giorno < al && i < 400; i++) {
    if (occupati.has(giorno)) return false;
    giorno = aggiungiGiorni(giorno, 1);
  }
  return true;
}

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/** Scritto a mano, come le altre formattazioni: Hermes non garantisce Intl. */
export function nomeMese(anno: number, mese: number): string {
  return `${MESI[mese]} ${anno}`;
}

export function formattaGiorno(s: string): string {
  const d = daGiorno(s);
  return `${d.getDate()} ${MESI[d.getMonth()]}`;
}
