import { fn, type Modulo } from '@lab/shared';

import { supabase } from '@/lib/supabase';

/** Un modulo di un utente, come lo vede il back office. */
export interface ModuloUtente {
  modulo: Modulo;
  utilizzi_consumati: number;
  utilizzi_inclusi: number;
  acquistato_fino_a: string | null;
  /** 'admin' o 'pagamento': chi l'ha attivato l'ultima volta. */
  origine_acquisto: string | null;
}

export interface UtenteAdmin {
  id: string;
  email: string;
  creato_il: string;
  ultimo_accesso: string | null;
  /** Il nome della vetrina: null finche' l'utente non compila il profilo. */
  nome: string | null;
  moduli: ModuloUtente[];
}

export async function sonoAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc(fn('sono_admin'));
  return data === true;
}

export async function caricaUtenti(): Promise<UtenteAdmin[]> {
  const { data, error } = await supabase.rpc(fn('admin_utenti'));
  if (error) throw new Error(error.message);
  return (data as UtenteAdmin[] | null) ?? [];
}

/** fino_a null disattiva il modulo: si torna alle operazioni gratuite. */
export async function impostaModulo(
  utente: string,
  modulo: Modulo,
  finoA: Date | null
): Promise<void> {
  const { error } = await supabase.rpc(fn('admin_imposta_modulo'), {
    p_user: utente,
    p_modulo: modulo,
    p_fino_a: finoA ? finoA.toISOString() : null,
  });
  if (error) throw new Error(error.message);
}

const ERRORI_CREAZIONE: Record<string, string> = {
  email_non_valida: 'L’email non sembra valida.',
  password_corta: 'La password deve avere almeno 8 caratteri.',
  email_gia_usata: 'Esiste già un utente con questa email.',
  solo_admin: 'Solo un admin può creare utenti.',
};

/**
 * La creazione passa dalla Edge Function admin-crea-utente: serve la chiave di
 * servizio, che nell'app non c'e' e non deve esserci.
 */
export async function creaUtente(email: string, password: string): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-crea-utente', {
    body: { email, password },
  });
  if (!error) return;

  // Sulle risposte non 2xx il motivo sta nel corpo, non nel messaggio.
  let codice = error.message;
  const contesto = (error as { context?: Response }).context;
  if (contesto && typeof contesto.json === 'function') {
    try {
      const corpo = (await contesto.json()) as { errore?: string };
      if (corpo.errore) codice = corpo.errore;
    } catch {
      // corpo non leggibile: resta il messaggio generico
    }
  }
  throw new Error(ERRORI_CREAZIONE[codice] ?? codice);
}

/** Attivo vuol dire pagato e non ancora scaduto. */
export function moduloAttivo(m: ModuloUtente): boolean {
  return m.acquistato_fino_a != null && new Date(m.acquistato_fino_a) > new Date();
}

export function dataBreve(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Una riga dello storico: chi ha attivato o tolto un modulo, e quando. */
export interface Attivazione {
  modulo: Modulo;
  /** null: in quel momento il modulo e' stato disattivato. */
  fino_a: string | null;
  fonte: 'admin' | 'pagamento';
  creato_il: string;
  /** L'email dell'admin; null per i pagamenti. */
  creato_da: string | null;
}

export async function caricaStorico(utente: string): Promise<Attivazione[]> {
  const { data, error } = await supabase.rpc(fn('admin_storico'), { p_user: utente });
  if (error) throw new Error(error.message);
  return (data as Attivazione[] | null) ?? [];
}

/** Giorni interi da oggi a una data futura; 0 se e' oggi o gia' passata. */
export function giorniA(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function dataLunga(data: Date): string {
  return data.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Una riga dell'elenco generale: chi, quale card, fino a quando, da chi. */
export interface AttivazioneUtente extends Attivazione {
  id_utente: string;
  email: string;
  nome: string | null;
  /** L'identificativo del pagamento, quando ci sara'. */
  riferimento: string | null;
}

export async function caricaAttivazioni(
  fonte: 'pagamento' | 'admin' | null
): Promise<AttivazioneUtente[]> {
  const { data, error } = await supabase.rpc(fn('admin_attivazioni'), { p_fonte: fonte });
  if (error) throw new Error(error.message);
  return (data as AttivazioneUtente[] | null) ?? [];
}

/**
 * Legge una data scritta a mano, gg/mm/aaaa (anche con - o .), e la porta a
 * fine giornata: "fino al 31/12" deve valere per tutto il 31. null se non e'
 * una data vera o se e' gia' passata.
 */
export function leggiData(testo: string): Date | null {
  const m = testo.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const [giorno, mese, anno] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(anno, mese - 1, giorno, 23, 59, 59);
  // new Date corregge in silenzio il 31/02 in 3 marzo: qui va rifiutato.
  if (data.getDate() !== giorno || data.getMonth() !== mese - 1) return null;
  if (data <= new Date()) return null;
  return data;
}
