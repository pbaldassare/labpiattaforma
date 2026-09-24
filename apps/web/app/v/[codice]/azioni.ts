'use server';

import { clientPubblico } from '@/lib/supabase-server';

export interface EsitoContatto {
  stato: 'fermo' | 'inviato' | 'errore';
  messaggio?: string;
}

const ERRORI: Record<string, string> = {
  consenso_mancante: 'Serve la spunta sul trattamento dei dati.',
  nome_mancante: 'Scrivi il tuo nome.',
  recapito_mancante: 'Lascia almeno un recapito, telefono o email.',
  offerta_non_disponibile: 'Questa offerta non è più disponibile.',
};

export async function inviaContatto(
  _precedente: EsitoContatto,
  dati: FormData
): Promise<EsitoContatto> {
  // Trappola per i riempimenti automatici: e' un campo nascosto agli occhi ma
  // non ai programmi, che lo compilano perche' lo trovano nel codice. Se e'
  // pieno si finge che sia andato tutto bene, senza scrivere niente: dire "sei
  // stato bloccato" servirebbe solo a chi tenta, per capire come riprovare.
  if ((dati.get('ragione_sociale') as string | null)?.trim()) {
    return { stato: 'inviato' };
  }

  const codice = String(dati.get('codice') ?? '');
  const nome = String(dati.get('nome') ?? '').trim();
  const telefono = String(dati.get('telefono') ?? '').trim();
  const email = String(dati.get('email') ?? '').trim();
  const messaggio = String(dati.get('messaggio') ?? '').trim();
  const consenso = dati.get('consenso') === 'on';

  if (!nome) return { stato: 'errore', messaggio: ERRORI.nome_mancante };
  if (!telefono && !email) return { stato: 'errore', messaggio: ERRORI.recapito_mancante };
  if (!consenso) return { stato: 'errore', messaggio: ERRORI.consenso_mancante };

  const supabase = clientPubblico();
  const { error } = await supabase.schema('public').rpc('venditori_invia_contatto', {
    p_codice: codice,
    p_nome: nome,
    p_telefono: telefono || null,
    p_email: email || null,
    p_messaggio: messaggio || null,
    p_consenso: consenso,
  });

  if (error) {
    const chiave = Object.keys(ERRORI).find((k) => error.message.includes(k));
    return {
      stato: 'errore',
      messaggio: chiave
        ? ERRORI[chiave]
        : 'Non siamo riusciti a mandare la richiesta. Riprova fra poco.',
    };
  }

  return { stato: 'inviato' };
}
