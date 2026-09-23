/**
 * Forma delle tabelle dello schema `venditori`.
 *
 * Scritti a mano finche' le tabelle sono poche: appena lo schema cresce
 * vanno rigenerati dal database, cosi' non possono divergere.
 */
import type { Modulo } from './moduli';

export type StatoVenditore = 'attivo' | 'sospeso';

export interface Venditore {
  user_id: string;
  slug: string;
  nome_visualizzato: string;
  logo_path: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email_pubblica: string | null;
  presentazione: string | null;
  ragione_sociale: string | null;
  piva_cf: string | null;
  /** Iscrizione RUI: e' del venditore, non del singolo prodotto assicurativo. */
  rui_numero: string | null;
  stato: StatoVenditore;
  created_at: string;
  updated_at: string;
}

/** Campi che il venditore compila: identita' e date le mette il database. */
export type VenditoreModificabile = Omit<
  Venditore,
  'user_id' | 'stato' | 'created_at' | 'updated_at'
>;

export interface SlugStorico {
  slug: string;
  user_id: string;
  dismesso_il: string;
}

export interface ModuloStato {
  user_id: string;
  modulo: Modulo;
  utilizzi_consumati: number;
  utilizzi_inclusi: number;
  acquistato_fino_a: string | null;
  origine_acquisto: string | null;
  created_at: string;
  updated_at: string;
}

/** Lo schema non e' `public`: i client vanno inizializzati con questo. */
export const SCHEMA_DB = 'venditori' as const;

/**
 * Messaggi che il trigger `gestisci_slug` restituisce, da tradurre per chi legge.
 */
export const ERRORI_SLUG: Record<string, string> = {
  slug_riservato: 'Questo indirizzo e’ riservato al funzionamento del sito.',
  slug_occupato: 'Questo indirizzo e’ gia’ di un altro venditore.',
  venditore_slug_formato: 'Indirizzo non valido: usa lettere, numeri e trattini.',
};
