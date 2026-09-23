import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { SCHEMA_DB } from '@lab/shared';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const chiavePubblicabile = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !chiavePubblicabile) {
  throw new Error(
    'Mancano EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Copia .env.example in .env e compilale.'
  );
}

/**
 * Il token di sessione va nel portachiavi cifrato del telefono, non
 * nell'archivio normale: e' la chiave che apre tutti i dati del venditore.
 *
 * SecureStore rifiuta i valori oltre i 2048 byte e la sessione di Supabase
 * li supera spesso. Qui viene spezzata in pezzi e ricomposta alla lettura:
 * senza, l'utente verrebbe disconnesso in modo apparentemente casuale.
 */
const DIMENSIONE_PEZZO = 1800;

const archivioSicuro = {
  async getItem(chiave: string): Promise<string | null> {
    const numero = await SecureStore.getItemAsync(`${chiave}.n`);
    if (numero === null) {
      // Valore scritto prima della suddivisione in pezzi, o assente.
      return SecureStore.getItemAsync(chiave);
    }
    const pezzi: string[] = [];
    for (let i = 0; i < Number(numero); i++) {
      const pezzo = await SecureStore.getItemAsync(`${chiave}.${i}`);
      if (pezzo === null) return null; // archivio incoerente: meglio rifare il login
      pezzi.push(pezzo);
    }
    return pezzi.join('');
  },

  async setItem(chiave: string, valore: string): Promise<void> {
    await this.removeItem(chiave);
    const pezzi = valore.match(new RegExp(`.{1,${DIMENSIONE_PEZZO}}`, 'g')) ?? [];
    for (let i = 0; i < pezzi.length; i++) {
      await SecureStore.setItemAsync(`${chiave}.${i}`, pezzi[i]!);
    }
    await SecureStore.setItemAsync(`${chiave}.n`, String(pezzi.length));
  },

  async removeItem(chiave: string): Promise<void> {
    const numero = await SecureStore.getItemAsync(`${chiave}.n`);
    if (numero !== null) {
      for (let i = 0; i < Number(numero); i++) {
        await SecureStore.deleteItemAsync(`${chiave}.${i}`);
      }
      await SecureStore.deleteItemAsync(`${chiave}.n`);
    }
    await SecureStore.deleteItemAsync(chiave);
  },
};

export const supabase = createClient(url, chiavePubblicabile, {
  // Le tabelle dell'App Venditori non stanno in "public".
  db: { schema: SCHEMA_DB },
  auth: {
    storage: archivioSicuro,
    autoRefreshToken: true,
    persistSession: true,
    // Serve al web per leggere il token dall'indirizzo: su telefono rompe l'avvio.
    detectSessionInUrl: false,
  },
});

/**
 * Il rinnovo automatico del token va fermato quando l'app va in secondo piano
 * e ripreso al ritorno, altrimenti l'utente si ritrova disconnesso a caso.
 */
AppState.addEventListener('change', (stato) => {
  if (stato === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
