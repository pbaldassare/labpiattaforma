import { createClient } from '@supabase/supabase-js';
import { SCHEMA_DB } from '@lab/shared';

/**
 * Client per le landing, usato SOLO lato server.
 *
 * Le pagine pubbliche sono renderizzate dal server, quindi possono leggere con
 * la chiave di servizio senza esporre niente al browser: e' il motivo per cui
 * in questa fase i visitatori anonimi non hanno alcun permesso sul database.
 *
 * Questa chiave bypassa tutte le policy RLS. Se finisse in un file con
 * direttiva "use client", o in una variabile NEXT_PUBLIC_, l'intero database
 * sarebbe aperto a chiunque apra il sito.
 */
export function clientDiServizio() {
  const url = process.env.SUPABASE_URL;
  const chiave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chiave) {
    throw new Error(
      'Mancano SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nell’ambiente del server.'
    );
  }

  return createClient(url, chiave, {
    db: { schema: SCHEMA_DB },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
