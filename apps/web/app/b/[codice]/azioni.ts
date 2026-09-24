'use server';

import { formattaEuro } from '@lab/shared';

import { clientPubblico } from '@/lib/supabase-server';

export interface EsitoPrenotazione {
  stato: 'fermo' | 'bloccata' | 'errore';
  messaggio?: string;
}

const ERRORI: Record<string, string> = {
  consenso_mancante: 'Serve la spunta sul trattamento dei dati.',
  nome_mancante: 'Scrivi il tuo nome.',
  recapito_mancante: 'Lascia almeno un recapito, telefono o email.',
  offerta_non_disponibile: 'Questo mezzo non è più disponibile.',
  date_incoerenti: 'La riconsegna deve venire dopo il ritiro.',
  fuori_disponibilita: 'Queste date sono fuori dal periodo disponibile.',
  durata_non_valida: 'Il noleggio breve va da un giorno a un mese.',
  date_gia_prenotate:
    'Qualcuno ha prenotato queste date un istante prima di te. Scegline altre.',
};

export async function inviaPrenotazione(dati: FormData): Promise<EsitoPrenotazione> {
  const codice = String(dati.get('codice') ?? '');
  const dal = String(dati.get('dal') ?? '');
  const al = String(dati.get('al') ?? '');
  const nome = String(dati.get('nome') ?? '').trim();
  const telefono = String(dati.get('telefono') ?? '').trim();
  const email = String(dati.get('email') ?? '').trim();
  const consenso = dati.get('consenso') === 'on';

  if (!nome) return { stato: 'errore', messaggio: ERRORI.nome_mancante };
  if (!telefono && !email) return { stato: 'errore', messaggio: ERRORI.recapito_mancante };
  if (!consenso) return { stato: 'errore', messaggio: ERRORI.consenso_mancante };

  const supabase = clientPubblico();
  const { data, error } = await supabase.schema('public').rpc('venditori_blocca_date', {
    p_codice: codice,
    p_dal: dal,
    p_al: al,
    p_nome: nome,
    p_telefono: telefono || null,
    p_email: email || null,
    p_consenso: consenso,
  });

  if (error) {
    const chiave = Object.keys(ERRORI).find((k) => error.message.includes(k));
    return {
      stato: 'errore',
      messaggio: chiave
        ? ERRORI[chiave]
        : 'Non siamo riusciti a tenere le date. Riprova fra poco.',
    };
  }

  const esito = data as {
    totale_cent: number;
    deposito_cent: number;
    blocco_minuti: number;
  } | null;

  // Il pagamento del deposito e' il passo successivo e non c'e' ancora: qui si
  // dice al cliente cosa sta succedendo davvero, invece di fargli credere che
  // la prenotazione sia conclusa.
  const deposito =
    esito && esito.deposito_cent > 0
      ? ` Ti richiamiamo per il deposito di ${formattaEuro(esito.deposito_cent)}.`
      : '';

  return {
    stato: 'bloccata',
    messaggio: `Le date sono tenute per ${esito?.blocco_minuti ?? 15} minuti.${deposito} Totale ${
      esito ? formattaEuro(esito.totale_cent) : ''
    }.`,
  };
}
