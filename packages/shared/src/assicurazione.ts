export type TipoRischio = 'auto' | 'casa' | 'infortuni' | 'altro';

export const TIPI_RISCHIO: TipoRischio[] = ['auto', 'casa', 'infortuni', 'altro'];

export const ETICHETTA_RISCHIO: Record<TipoRischio, string> = {
  auto: 'Auto',
  casa: 'Casa',
  infortuni: 'Infortuni',
  altro: 'Altro',
};

export interface Garanzia {
  nome: string;
  /** false = la riga "non compreso" della tabella (§7.2). */
  inclusa: boolean;
  dettaglio: string | null;
}

export interface DatiAssicurazione {
  compagnia: string;
  nome_prodotto: string;
  tipo_rischio: TipoRischio;
  premio_partenza_cent: number;
  massimale_cent: number | null;
  franchigia_cent: number | null;
  durata_mesi: number | null;
  documenti_informativi: string[];
  garanzie: Garanzia[];
}

/**
 * Garanzie proposte quando si crea una polizza auto.
 *
 * Sono un punto di partenza da correggere, non un elenco definitivo: servono a
 * evitare la pagina bianca, che e' il motivo per cui certi prodotti restano in
 * bozza per settimane.
 */
export const GARANZIE_AUTO_PROPOSTE: Garanzia[] = [
  { nome: 'Responsabilità civile', inclusa: true, dettaglio: null },
  { nome: 'Assistenza stradale', inclusa: true, dettaglio: null },
  { nome: 'Tutela legale', inclusa: true, dettaglio: null },
  { nome: 'Furto e incendio', inclusa: false, dettaglio: null },
  { nome: 'Kasko', inclusa: false, dettaglio: null },
  { nome: 'Atti vandalici', inclusa: false, dettaglio: null },
];

/**
 * Le domande del questionario per il preventivo auto (§7.3).
 *
 * Qui sono dati e non campi scritti a mano nella schermata: per le altre
 * tipologie di rischio ne serviranno altre, e cambiarle non deve voler dire
 * riscrivere un modulo.
 */
export const QUESTIONARIO_AUTO = [
  { chiave: 'targa', etichetta: 'Targa', tipo: 'testo' as const },
  { chiave: 'immatricolazione', etichetta: 'Data di immatricolazione', tipo: 'data' as const },
  { chiave: 'classe_merito', etichetta: 'Classe di merito', tipo: 'numero' as const },
  { chiave: 'guidatori', etichetta: 'Chi guida', tipo: 'testo' as const },
];

/** Documenti che il cliente deve portare per una polizza auto (§7.3). */
export const DOCUMENTI_POLIZZA = [
  'Attestato di rischio',
  'Documento d’identità',
  'Libretto di circolazione',
];

export function formattaDurataPolizza(mesi: number | null): string | null {
  if (mesi == null) return null;
  if (mesi === 12) return 'Annuale';
  if (mesi === 6) return 'Semestrale';
  if (mesi % 12 === 0) return `${mesi / 12} anni`;
  return `${mesi} mesi`;
}
