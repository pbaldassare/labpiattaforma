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
