import type {
  Alimentazione,
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
  return (
    dati.pagina.pubblicata &&
    dati.offerta.stato === 'attiva' &&
    dati.venditore.stato === 'attivo'
  );
}

/** Link che apre WhatsApp con il messaggio gia' scritto (documento §3.3). */
export function linkWhatsApp(numero: string, messaggio: string): string {
  const soloCifre = numero.replace(/[^\d]/g, '');
  return `https://wa.me/${soloCifre}?text=${encodeURIComponent(messaggio)}`;
}
