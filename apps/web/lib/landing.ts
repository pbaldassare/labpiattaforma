import type {
  Alimentazione,
  DatiAssicurazione,
  DatiNoleggioBreve,
  DatiNoleggioLungo,
  PeriodoOccupato,
  Cambio,
  FormulaAcquisto,
  Modulo,
  StatoOfferta,
  TipoPagina,
} from '@lab/shared';

import { clientPubblico } from './supabase-server';

export const DOMINIO = process.env.DOMINIO_LANDING ?? 'http://localhost:3000';

/**
 * Forma restituita da `venditori.dati_pagina`.
 *
 * Contiene soltanto cio' che la pagina puo' mostrare: il prezzo e' gia' quello
 * giusto per il tipo di pagina, e prezzo d'acquisto, margini, provvigioni e
 * targa non arrivano nemmeno fin qui.
 */
export interface DatiPagina {
  pagina: {
    tipo: TipoPagina;
    codice: string;
    pubblicata: boolean;
  };
  offerta: {
    modulo: Modulo;
    titolo: string;
    stato: StatoOfferta;
  };
  venditore: {
    slug: string;
    nome: string;
    telefono: string | null;
    whatsapp: string | null;
    email: string | null;
    presentazione: string | null;
    logo_path: string | null;
    stato: 'attivo' | 'sospeso';
    /** Numero di iscrizione RUI, pubblico per legge (§7.4). */
    rui: string | null;
  };
  vendita: {
    marca: string;
    modello: string;
    chilometri: number | null;
    anno: number | null;
    alimentazione: Alimentazione | null;
    cambio: Cambio | null;
    prezzo_cent: number | null;
    /** Solo sulla pagina riservata. */
    prezzo_consigliato_cent: number | null;
  } | null;
  lungo: DatiNoleggioLungo | null;
  breve: DatiNoleggioBreve | null;
  assicurazione: DatiAssicurazione | null;
  foto: string[];
  formule: FormulaAcquisto[];
}

export async function caricaPagina(codice: string): Promise<DatiPagina | null> {
  const supabase = clientPubblico();
  // Passa dal ponte in "public": lo schema "venditori" non e' ancora esposto
  // nelle impostazioni Data API. La funzione richiamata e' comunque quella
  // vera, quindi il filtro dei dati e' lo stesso.
  const { data, error } = await supabase
    .schema('public')
    .rpc('venditori_dati_pagina', { p_codice: codice });

  if (error) throw error;
  return (data as DatiPagina | null) ?? null;
}

/**
 * Conta l'apertura. Non deve mai far fallire la pagina: se il conteggio si
 * rompe, il cliente deve comunque vedere l'auto.
 *
 * Conta anche le aperture dei motori di ricerca e le anteprime dei messaggi,
 * quindi il numero e' una misura di interesse, non di persone.
 */
export async function registraApertura(codice: string): Promise<void> {
  try {
    const supabase = clientPubblico();
    await supabase.schema('public').rpc('venditori_registra_apertura', { p_codice: codice });
  } catch {
    // volutamente silenzioso
  }
}

/** Le foto stanno in un bucket in lettura libera: indirizzo diretto, niente firma. */
export function urlFoto(path: string): string {
  const base = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  return `${base}/storage/v1/object/public/offerte/${path}`;
}

/** L'offerta e' ancora proponibile? */
export function offertaDisponibile(dati: DatiPagina): boolean {
  if (!dati.pagina.pubblicata) return false;
  if (dati.offerta.stato !== 'attiva') return false;
  if (dati.venditore.stato !== 'attivo') return false;

  // Se il venditore toglie il prezzo rivenditore da un'offerta che ne aveva
  // uno, la pagina riservata resta in piedi ma senza numero da mostrare.
  // La pagina non si cancella — il link puo' essere gia' in mano a qualcuno —
  // ma smette di proporre l'offerta.
  if (dati.vendita && dati.vendita.prezzo_cent == null) return false;

  return true;
}

/** Link che apre WhatsApp con il messaggio gia' scritto (documento §3.3). */
export function linkWhatsApp(numero: string, messaggio: string): string {
  const soloCifre = numero.replace(/[^\d]/g, '');
  return `https://wa.me/${soloCifre}?text=${encodeURIComponent(messaggio)}`;
}

export interface OffertaInVetrina {
  titolo: string;
  modulo: Modulo;
  codice: string;
  prezzo_cent: number | null;
  copertina: string | null;
  aggiornata: string;
}

export interface DatiVetrina {
  venditore: {
    slug: string;
    nome: string;
    presentazione: string | null;
    telefono: string | null;
    whatsapp: string | null;
    email: string | null;
    logo_path: string | null;
  };
  offerte: OffertaInVetrina[];
}

/** Quando lo slug e' stato abbandonato, al posto dei dati arriva quello nuovo. */
export type EsitoVetrina = DatiVetrina | { redirect_a: string } | null;

export async function caricaVetrina(slug: string): Promise<EsitoVetrina> {
  const supabase = clientPubblico();
  const { data, error } = await supabase
    .schema('public')
    .rpc('venditori_dati_vetrina', { p_slug: slug });

  if (error) throw error;
  return (data as EsitoVetrina) ?? null;
}

export function eRedirect(esito: EsitoVetrina): esito is { redirect_a: string } {
  return esito !== null && 'redirect_a' in esito;
}

/**
 * I giorni gia' occupati, letti a ogni apertura della pagina.
 *
 * Il calendario "si aggiorna da solo appena una prenotazione va a buon fine"
 * (§5.2): siccome la pagina e' resa dal server a ogni visita, lo fa senza
 * bisogno di alcun aggiornamento automatico.
 */
export async function caricaDisponibilita(
  codice: string
): Promise<{ occupati: PeriodoOccupato[] } | null> {
  const supabase = clientPubblico();
  const { data, error } = await supabase
    .schema('public')
    .rpc('venditori_disponibilita', { p_codice: codice });

  if (error) throw error;
  return (data as { occupati: PeriodoOccupato[] } | null) ?? null;
}
