import type { Modulo, TipoCliente } from './moduli';

export type StatoPratica =
  | 'da_richiamare'
  | 'in_trattativa'
  | 'preventivo_inviato'
  | 'venduto'
  | 'prenotato'
  | 'chiuso';

export type OrigineContatto = 'form' | 'chiamata' | 'nota';

export const ETICHETTA_STATO_PRATICA: Record<StatoPratica, string> = {
  da_richiamare: 'Da richiamare',
  in_trattativa: 'In trattativa',
  preventivo_inviato: 'Preventivo inviato',
  venduto: 'Venduto',
  prenotato: 'Prenotato',
  chiuso: 'Chiuso',
};

export const ETICHETTA_ORIGINE: Record<OrigineContatto, string> = {
  form: 'Richiesta dal sito',
  chiamata: 'Telefonata',
  nota: 'Appunto',
};

export interface Cliente {
  id: string;
  user_id: string;
  nome: string;
  telefono: string | null;
  email: string | null;
  tipo: TipoCliente;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pratica {
  id: string;
  user_id: string;
  cliente_id: string;
  offerta_id: string | null;
  modulo: Modulo;
  stato: StatoPratica;
  created_at: string;
  updated_at: string;
}

export interface VoceStorico {
  id: number;
  pratica_id: string;
  origine: OrigineContatto;
  testo: string | null;
  creato_il: string;
}

export interface Promemoria {
  id: string;
  user_id: string;
  pratica_id: string | null;
  quando: string;
  motivo: string;
  fatto: boolean;
  created_at: string;
}

/**
 * Quanto tempo fa, detto come lo direbbe una persona.
 *
 * Scritto a mano e non con Intl.RelativeTimeFormat perche' su Hermes, il motore
 * dell'app, quel formato non e' garantito: lo stesso contatto comparirebbe
 * "2 ore fa" sulla landing e con una data intera nell'app.
 */
export function quandoBreve(iso: string | null | undefined, adesso = Date.now()): string {
  if (!iso) return '';
  const quando = new Date(iso).getTime();
  if (Number.isNaN(quando)) return '';

  const minuti = Math.floor((adesso - quando) / 60000);
  if (minuti < 1) return 'adesso';
  if (minuti < 60) return `${minuti} min fa`;

  const ore = Math.floor(minuti / 60);
  if (ore < 24) return `${ore} h fa`;

  const giorni = Math.floor(ore / 24);
  if (giorni === 1) return 'ieri';
  if (giorni < 7) return `${giorni} giorni fa`;

  return new Date(quando).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}
