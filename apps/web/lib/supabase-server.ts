import { createClient } from '@supabase/supabase-js';
import { SCHEMA_DB } from '@lab/shared';

function url(): string {
  const valore = process.env.SUPABASE_URL;
  if (!valore) throw new Error('Manca SUPABASE_URL nell’ambiente del server.');
  return valore;
}

/**
 * Client delle landing.
 *
 * Usa la chiave pubblicabile, non quella di servizio: tutto cio' che serve
 * alle pagine passa da `venditori.dati_pagina`, che restituisce solo i campi
 * pubblicabili. Dare al server web una chiave che scavalca ogni policy, per
 * leggere degli annunci che sono pubblici per definizione, sarebbe un rischio
 * senza contropartita.
 */
export function clientPubblico() {
  const chiave = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!chiave) {
    throw new Error('Manca SUPABASE_PUBLISHABLE_KEY nell’ambiente del server.');
  }

  return createClient(url(), chiave, {
    db: { schema: SCHEMA_DB },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Client con la chiave di servizio: bypassa tutte le policy RLS.
 *
 * Serve solo per le operazioni che nessun ruolo pubblico puo' fare, e va
 * chiamato esclusivamente dentro codice che gira sul server. Se finisse in un
 * file con direttiva "use client", o la chiave in una variabile NEXT_PUBLIC_,
 * l'intero database sarebbe aperto a chiunque apra il sito.
 */
export function clientDiServizio() {
  const chiave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chiave) {
    throw new Error('Manca SUPABASE_SERVICE_ROLE_KEY nell’ambiente del server.');
  }

  return createClient(url(), chiave, {
    db: { schema: SCHEMA_DB },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
