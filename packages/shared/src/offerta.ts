import type { Modulo, TipoCliente } from './moduli';
import { PREFISSO_MODULO } from './moduli';

export type StatoOfferta = 'bozza' | 'attiva' | 'sospesa' | 'venduta';
export type TipoPagina = 'pubblica' | 'riservata';
export type Alimentazione =
  | 'benzina'
  | 'diesel'
  | 'gpl'
  | 'metano'
  | 'ibrida'
  | 'elettrica'
  | 'altro';
export type Cambio = 'manuale' | 'automatico';
export type Provenienza = 'proprio' | 'fornitore';
export type FormulaAcquisto = 'contanti' | 'finanziamento' | 'permuta' | 'noleggio_lungo';

export interface Offerta {
  id: string;
  user_id: string;
  modulo: Modulo;
  titolo: string;
  stato: StatoOfferta;
  copertina_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface OffertaVendita {
  offerta_id: string;
  marca: string;
  modello: string;
  targa: string | null;
  chilometri: number | null;
  anno: number | null;
  alimentazione: Alimentazione | null;
  cambio: Cambio | null;
  /** Mai pubblicato: serve solo a calcolare il margine del venditore. */
  prezzo_acquisto_cent: number | null;
  prezzo_pubblico_cent: number;
  /** Senza questo la pagina riservata non si genera. */
  prezzo_rivenditore_cent: number | null;
  provenienza: Provenienza;
  fornitore_nome: string | null;
}

export interface Pagina {
  id: string;
  offerta_id: string;
  tipo: TipoPagina;
  codice: string;
  pubblicata: boolean;
  created_at: string;
}

export interface ContatoriPagina {
  pagina_id: string;
  offerta_id: string;
  tipo: TipoPagina;
  codice: string;
  pubblicata: boolean;
  aperture: number;
  contatti: number;
}

export const ETICHETTA_ALIMENTAZIONE: Record<Alimentazione, string> = {
  benzina: 'Benzina',
  diesel: 'Diesel',
  gpl: 'GPL',
  metano: 'Metano',
  ibrida: 'Ibrida',
  elettrica: 'Elettrica',
  altro: 'Altro',
};

export const ETICHETTA_CAMBIO: Record<Cambio, string> = {
  manuale: 'Manuale',
  automatico: 'Automatico',
};

export const ETICHETTA_FORMULA: Record<FormulaAcquisto, string> = {
  contanti: 'Contanti',
  finanziamento: 'Finanziamento',
  permuta: 'Permuta',
  noleggio_lungo: 'Passaggio a noleggio lungo',
};

/**
 * Quello che la formula dice al cliente sulla pagina (documento §4.2).
 */
export const DESCRIZIONE_FORMULA: Record<FormulaAcquisto, string> = {
  contanti: 'Pagamento immediato',
  finanziamento: 'Rata mensile con la finanziaria convenzionata',
  permuta: 'Valutazione dell’usato del cliente',
  noleggio_lungo: 'Canone mensile invece dell’acquisto',
};

/**
 * Provvigioni indicate nel prototipo. Il documento (§9) le segna come da
 * confermare, quindi qui sono solo il valore proposto quando si crea
 * un'offerta: il dato vero vive in `offerta_formula`, modificabile.
 */
export const PROVVIGIONE_PROPOSTA_CENT: Record<FormulaAcquisto, number> = {
  contanti: 20000,
  finanziamento: 55000,
  permuta: 30000,
  noleggio_lungo: 35000,
};

// ── Denaro ──────────────────────────────────────────────────────────────────
// Sempre in centesimi e interi: sommare e scontare prezzi in virgola mobile
// produce totali sbagliati di qualche centesimo, che sui preventivi si vede.

export function euroInCentesimi(euro: number): number {
  return Math.round(euro * 100);
}

/**
 * Interpreta un prezzo scritto a mano dal venditore.
 *
 * Sul telefono si scrive in fretta e ognuno ha le sue abitudini: "8900",
 * "8.900", "8 900 €", "8900,50". Il punto in italiano separa le migliaia e la
 * virgola i decimali, ma capita di scrivere all'inglese, quindi il separatore
 * decimale viene riconosciuto da come e' fatto il numero e non per convenzione.
 *
 * Restituisce null se non e' un numero: meglio far correggere il venditore che
 * salvare un prezzo inventato.
 */
/**
 * Da centesimi a come si scrive in un campo: 4400 -> "44", 3050 -> "30,50".
 *
 * E' il contrario di analizzaEuro, e serve a riaprire un'offerta per
 * correggerla: il campo deve ritrovare esattamente quello che il venditore
 * aveva scritto, senza zeri di troppo da cancellare a mano.
 *
 * Virgola e non punto: e' il separatore decimale italiano, ed e' quello che
 * analizzaEuro si aspetta di rileggere.
 */
export function perCampo(centesimi: number | null | undefined): string {
  if (centesimi == null) return '';
  const segno = centesimi < 0 ? '-' : '';
  const assoluto = Math.abs(Math.round(centesimi));
  const euro = Math.floor(assoluto / 100);
  const resto = assoluto % 100;
  if (resto === 0) return `${segno}${euro}`;
  return `${segno}${euro},${String(resto).padStart(2, '0')}`;
}

export function analizzaEuro(testo: string): number | null {
  const pulito = testo.replace(/[\s €.,]/g, (c) => (c === '.' || c === ',' ? c : ''));
  if (pulito === '') return null;

  const ultimoPunto = pulito.lastIndexOf('.');
  const ultimaVirgola = pulito.lastIndexOf(',');

  // Con entrambi, il separatore decimale e' quello piu' a destra.
  // Con uno solo, e' decimale se ha al massimo due cifre dopo: "8.900" sono
  // ottomilanovecento euro, "8,90" sono otto euro e novanta.
  let posizioneDecimale = -1;
  if (ultimoPunto >= 0 && ultimaVirgola >= 0) {
    posizioneDecimale = Math.max(ultimoPunto, ultimaVirgola);
  } else if (ultimoPunto >= 0 || ultimaVirgola >= 0) {
    const unico = Math.max(ultimoPunto, ultimaVirgola);
    if (pulito.length - unico - 1 <= 2) posizioneDecimale = unico;
  }

  const parteIntera =
    posizioneDecimale >= 0 ? pulito.slice(0, posizioneDecimale) : pulito;
  const parteDecimale =
    posizioneDecimale >= 0 ? pulito.slice(posizioneDecimale + 1) : '';

  const interoPulito = parteIntera.replace(/[.,]/g, '');
  const segno = interoPulito.startsWith('-') ? -1 : 1;
  const cifreIntere = interoPulito.replace(/^-/, '');

  if (!/^\d*$/.test(cifreIntere) || !/^\d*$/.test(parteDecimale)) return null;
  if (cifreIntere === '' && parteDecimale === '') return null;

  const centesimi =
    Number(cifreIntere || '0') * 100 + Number(parteDecimale.padEnd(2, '0').slice(0, 2) || '0');

  return segno * centesimi;
}

export function centesimiInEuro(centesimi: number): number {
  return centesimi / 100;
}

/**
 * Formattazione scritta a mano invece che con Intl.
 *
 * Intl darebbe lo stesso risultato sul server e sul browser, ma sull'app gira
 * Hermes, il cui supporto a Intl e' parziale e cambia fra Android e iOS: lo
 * stesso prezzo rischierebbe di comparire come "8.900 €" sulla landing e
 * "8900 €" nell'app. Su un numero che il cliente confronta con quello che gli
 * ha detto il venditore, non e' un dettaglio.
 *
 * In piu' Intl in italiano non raggruppa le migliaia sui numeri di quattro
 * cifre se non glielo si chiede, e l'opzione per chiederlo e' recente.
 */
const SPAZIO_UNITO = ' ';

export function raggruppaMigliaia(intero: string): string {
  return intero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Un numero intero con le migliaia separate: 84000 -> "84.000". */
export function formattaNumero(n: number): string {
  const segno = n < 0 ? '-' : '';
  return `${segno}${raggruppaMigliaia(String(Math.abs(Math.round(n))))}`;
}

/** Per i prezzi in evidenza: "8.900 €" si legge meglio di "8.900,00 €". */
export function formattaEuro(centesimi: number): string {
  const segno = centesimi < 0 ? '-' : '';
  const euro = Math.round(Math.abs(centesimi) / 100);
  return `${segno}${raggruppaMigliaia(String(euro))}${SPAZIO_UNITO}€`;
}

/** Per preventivi e totali, dove i centesimi contano. */
export function formattaEuroPreciso(centesimi: number): string {
  const segno = centesimi < 0 ? '-' : '';
  const assoluto = Math.abs(Math.round(centesimi));
  const euro = Math.floor(assoluto / 100);
  const resto = String(assoluto % 100).padStart(2, '0');
  return `${segno}${raggruppaMigliaia(String(euro))},${resto}${SPAZIO_UNITO}€`;
}

// ── Prezzi e margini ────────────────────────────────────────────────────────

/**
 * Il prezzo da applicare dipende da chi ha davanti (documento §3.7).
 * Restituisce null se il cliente e' un rivenditore ma il prezzo rivenditore
 * non e' stato compilato: in quel caso il preventivo va bloccato, non
 * ripiegato sul prezzo al pubblico.
 */
export function prezzoPerCliente(
  vendita: Pick<OffertaVendita, 'prezzo_pubblico_cent' | 'prezzo_rivenditore_cent'>,
  tipoCliente: TipoCliente
): number | null {
  if (tipoCliente === 'rivenditore') {
    return vendita.prezzo_rivenditore_cent;
  }
  return vendita.prezzo_pubblico_cent;
}

/** Margine sul prezzo indicato; null se manca il prezzo d'acquisto. */
export function margineCent(
  prezzoAcquistoCent: number | null | undefined,
  prezzoVenditaCent: number | null | undefined
): number | null {
  if (prezzoAcquistoCent == null || prezzoVenditaCent == null) return null;
  return prezzoVenditaCent - prezzoAcquistoCent;
}

/** La pagina riservata esiste solo se c'e' un prezzo per i rivenditori. */
export function haPaginaRiservata(
  vendita: Pick<OffertaVendita, 'prezzo_rivenditore_cent'>
): boolean {
  return vendita.prezzo_rivenditore_cent != null;
}

// ── Indirizzi ───────────────────────────────────────────────────────────────

/** dominio.it/v/{codice} — la lettera dipende dal modulo. */
export function urlPagina(dominio: string, modulo: Modulo, codice: string): string {
  return `${dominio.replace(/\/$/, '')}/${PREFISSO_MODULO[modulo]}/${codice}`;
}

/** Il messaggio WhatsApp gia' scritto, con i segnaposto sostituiti (§4.3). */
export function messaggioWhatsApp(
  modello: string,
  prezzoCent: number,
  url: string,
  nomeCliente?: string
): string {
  const saluto = nomeCliente ? `Ciao ${nomeCliente}, ` : 'Ciao, ';
  return `${saluto}ecco la ${modello} di cui parlavamo: ${formattaEuro(prezzoCent)}.\n${url}`;
}
