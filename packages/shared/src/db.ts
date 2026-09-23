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

/**
 * Ponte temporaneo verso lo schema `public`.
 *
 * Le tabelle vivono in `venditori`, ma quello schema non risulta esposto dalle
 * API del progetto: il pannello e l'API di gestione lo registrano, PostgREST
 * continua a servirne quattro anche dopo un riavvio completo. E' un difetto
 * della piattaforma, non una configurazione sbagliata.
 *
 * Finche' dura, si passa da viste e funzioni in `public` con prefisso
 * `venditori_`. Le viste sono security_invoker, quindi le policy applicate
 * restano quelle delle tabelle vere: non e' un buco, e' un cambio di indirizzo.
 *
 * Per tornare indietro basta mettere false qui: nessun altro file cambia.
 */
export const PONTE_PUBLIC = true;

export const SCHEMA_DB = PONTE_PUBLIC ? 'public' : 'venditori';

/** Nome con cui l'API conosce una tabella. */
export function tab(nome: string): string {
  return PONTE_PUBLIC ? `venditori_${nome}` : nome;
}

/** Nome con cui l'API conosce una funzione. */
export function fn(nome: string): string {
  return PONTE_PUBLIC ? `venditori_${nome}` : nome;
}

/**
 * Messaggi che il trigger `gestisci_slug` restituisce, da tradurre per chi legge.
 */
export const ERRORI_SLUG: Record<string, string> = {
  slug_riservato: 'Questo indirizzo e’ riservato al funzionamento del sito.',
  slug_occupato: 'Questo indirizzo e’ gia’ di un altro venditore.',
  venditore_slug_formato: 'Indirizzo non valido: usa lettere, numeri e trattini.',
};
