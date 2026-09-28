import { Platform, StyleSheet, type ViewStyle } from 'react-native';

/**
 * Le due palette dell'app.
 *
 * Via il blu: e' il colore di ogni gestionale mai fatto, e su un'app per chi
 * vende auto non dice niente. Qui l'azione e' un verde acido — quello dei
 * caschi e delle livree — su un nero caldo, non bluastro.
 *
 * Il verde acido regge il testo scuro sopra in tutti e due i temi (oltre 13:1),
 * quindi il pulsante principale e' identico di giorno e di notte: cambia il
 * fondo intorno, non il gesto.
 *
 * I colori non sono decorazione: ogni modulo ha il suo, e su una schermata che
 * ne mostra quattro insieme si capisce di cosa si parla prima di leggere. Non
 * portano mai da soli un'informazione — accanto c'e' sempre l'icona e il nome.
 */
export interface Palette {
  primario: string;
  suPrimario: string;
  primarioChiaro: string;
  primarioTenue: string;

  accento: string;
  accentoTenue: string;

  azione: string;
  suAzione: string;
  azioneTenue: string;

  sfondo: string;
  superficie: string;
  superficieAlta: string;

  testo: string;
  testoTenue: string;
  testoDebole: string;

  bordo: string;
  bordoTenue: string;

  errore: string;
  successo: string;
  successoTenue: string;

  /** La linea di luce in cima alle schede. */
  lucidatura: string;
  /** Il colore dell'ombra: nera di notte, grigio caldo di giorno. */
  coloreOmbra: string;
  /** Quanto pesa l'ombra: tanto sul chiaro, poco sullo scuro. */
  pesoOmbra: number;
}

export const SCURO: Palette = {
  primario: '#C6F432',
  suPrimario: '#14161C',
  primarioChiaro: '#D7F95E',
  primarioTenue: '#495430',

  accento: '#FFB020',
  accentoTenue: '#584727',

  azione: '#FF5A5A',
  suAzione: '#FFFFFF',
  azioneTenue: '#573438',

  // Antracite polveroso, non nero. Due giri di prova per arrivarci: il
  // quasi-nero faceva sembrare l'app spenta, il grafite era ancora cupo. Qui
  // il grigio e' alzato e tirato verso il caldo — la polvere e' quel filo di
  // terra che gli toglie il freddo dell'acciaio.
  sfondo: '#383B41',
  superficie: '#43464D',
  superficieAlta: '#4E525A',

  // La scala del testo sale insieme al fondo. Non e' un dettaglio: con il
  // grigio piu' chiaro, il grigio del testo perde contrasto, e "4 giorni fa"
  // diventerebbe un'ombra. Questi tre livelli stanno tutti sopra 4,5:1 sulle
  // schede, che e' dove il testo piccolo vive davvero.
  testo: '#F7F8F9',
  testoTenue: '#C8CDD4',
  testoDebole: '#AEB4BD',

  bordo: '#5A5F68',
  bordoTenue: '#4A4E55',

  errore: '#FF7A7A',
  successo: '#34D399',
  successoTenue: '#2C4C44',

  lucidatura: 'rgba(255,255,255,0.1)',
  coloreOmbra: '#000000',
  pesoOmbra: 1,
};

export const CHIARO: Palette = {
  primario: '#C6F432',
  suPrimario: '#14161A',
  primarioChiaro: '#4D6B00',
  primarioTenue: '#F0FBD0',

  accento: '#B45309',
  accentoTenue: '#FEF3C7',

  azione: '#DC2626',
  suAzione: '#FFFFFF',
  azioneTenue: '#FEE2E2',

  // Bianco caldo, non azzurrino: fa coppia col nero caldo dell'altro tema.
  sfondo: '#F7F7F4',
  superficie: '#FFFFFF',
  superficieAlta: '#F1F1ED',

  testo: '#14161A',
  testoTenue: '#55606F',
  testoDebole: '#8A94A3',

  bordo: '#E4E4DF',
  bordoTenue: '#EFEFEA',

  errore: '#DC2626',
  successo: '#059669',
  successoTenue: '#D1FAE5',

  lucidatura: 'rgba(255,255,255,0.9)',
  coloreOmbra: '#1B1D22',
  pesoOmbra: 0.28,
};

export type NomeModulo = 'vendita' | 'noleggio_breve' | 'noleggio_lungo' | 'assicurazioni';

/**
 * Un colore per modulo, in due versioni.
 *
 * Sul chiaro servono toni piu' profondi: gli stessi dello scuro, su fondo
 * bianco, sarebbero illeggibili come testo.
 */
const MODULI_SCURO: Record<NomeModulo, string> = {
  vendita: '#C6F432',
  noleggio_breve: '#FF8A3D',
  noleggio_lungo: '#A78BFA',
  assicurazioni: '#38BDF8',
};

const MODULI_CHIARO: Record<NomeModulo, string> = {
  vendita: '#4D6B00',
  noleggio_breve: '#C2410C',
  noleggio_lungo: '#6D28D9',
  assicurazioni: '#0369A1',
};

const MODULI_TENUE_SCURO: Record<NomeModulo, string> = {
  vendita: '#485431',
  noleggio_breve: '#584033',
  noleggio_lungo: '#48405F',
  assicurazioni: '#354F5E',
};

const MODULI_TENUE_CHIARO: Record<NomeModulo, string> = {
  vendita: '#F0FBD0',
  noleggio_breve: '#FFEDD5',
  noleggio_lungo: '#EDE9FE',
  assicurazioni: '#E0F2FE',
};

/**
 * Le sfumature dei blocchi icona.
 *
 * Restano sature in tutti e due i temi: sono superfici piene con l'icona
 * sopra, non testo su fondo, quindi non cambiano col tema.
 */
export const gradienti: Record<NomeModulo | 'azione', readonly [string, string]> = {
  vendita: ['#C6F432', '#84CC16'],
  noleggio_breve: ['#FF8A3D', '#EA580C'],
  noleggio_lungo: ['#A78BFA', '#7C3AED'],
  assicurazioni: ['#38BDF8', '#0284C7'],
  azione: ['#D4FF3F', '#A3E635'],
};

/** Su un blocco cosi' acceso l'icona va scura o chiara secondo il colore. */
export const suGradiente: Record<NomeModulo | 'azione', string> = {
  vendita: '#14161A',
  noleggio_breve: '#FFFFFF',
  noleggio_lungo: '#FFFFFF',
  assicurazioni: '#FFFFFF',
  azione: '#14161A',
};

// ── La palette di adesso ────────────────────────────────────────────────────

/**
 * Sta in una variabile di modulo e non in un contesto React per una ragione
 * pratica: gli stili si scrivono al caricamento del file, quando nessun
 * contesto esiste ancora. Il fornitore del tema la cambia qui e rimonta
 * l'albero; tutto il resto la legge da qui.
 */
let schemaAttuale: 'chiaro' | 'scuro' = 'scuro';
let corrente: Palette = SCURO;
let moduli = MODULI_SCURO;
let moduliTenui = MODULI_TENUE_SCURO;

export function impostaPalette(schema: 'chiaro' | 'scuro'): void {
  if (schema === schemaAttuale) return;
  const chiaro = schema === 'chiaro';
  schemaAttuale = schema;
  corrente = chiaro ? CHIARO : SCURO;
  moduli = chiaro ? MODULI_CHIARO : MODULI_SCURO;
  moduliTenui = chiaro ? MODULI_TENUE_CHIARO : MODULI_TENUE_SCURO;
}

export function schemaCorrente(): 'chiaro' | 'scuro' {
  return schemaAttuale;
}

export function paletteCorrente(): Palette {
  return corrente;
}

/**
 * Un oggetto che si risolve quando lo si legge, non quando lo si scrive.
 *
 * Serve ai colori usati direttamente nel disegno — `colore={colori.testoTenue}`
 * — che vengono letti a ogni render e quindi seguono il tema da soli.
 *
 * NON basta dentro `StyleSheet.create`: li' il valore finisce in un oggetto
 * costruito al caricamento del file, e resta quello per sempre. Per gli stili
 * c'e' `stiliTema` qui sotto.
 */
function specchio<T extends object>(sorgente: () => T): T {
  return new Proxy({} as T, {
    get: (_b, chiave) => sorgente()[chiave as keyof T],
    ownKeys: () => Reflect.ownKeys(sorgente()),
    has: (_b, chiave) => chiave in sorgente(),
    getOwnPropertyDescriptor: (_b, chiave) => {
      const d = Object.getOwnPropertyDescriptor(sorgente(), chiave);
      return d && { ...d, configurable: true };
    },
  });
}

export const colori = specchio<Palette>(() => corrente);
export const coloriModulo = specchio<Record<NomeModulo, string>>(() => moduli);
export const coloriModuloTenue = specchio<Record<NomeModulo, string>>(() => moduliTenui);

/**
 * La sfumatura dell'intestazione.
 *
 * Questa il tema lo deve seguire, al contrario di quelle dei blocchi icona:
 * e' una superficie con sopra del testo, non un blocco pieno. Tenendola fissa
 * scura, sul tema chiaro il nome dell'attivita' diventava grigio su grigio.
 */
export function gradienteTesta(): readonly [string, string] {
  return corrente === CHIARO ? ['#FFFFFF', '#F2F2EE'] : ['#4A4E57', '#33363B'];
}

/**
 * Gli stili di una schermata, uno per tema.
 *
 * La fabbrica riceve la palette e viene chiamata una volta sola per tema: il
 * risultato resta in memoria. Quello che torna e' un oggetto che alla lettura
 * di `stili.qualcosa` sceglie la versione giusta — e la lettura avviene mentre
 * si disegna, quando il tema e' gia' deciso.
 */
export function stiliTema<T extends Record<string, unknown>>(fabbrica: (c: Palette) => T): T {
  const memoria = new Map<Palette, T>();
  return specchio<T>(() => {
    let fatti = memoria.get(corrente);
    if (!fatti) {
      fatti = fabbrica(corrente);
      memoria.set(corrente, fatti);
    }
    return fatti;
  });
}

// ── Misure ──────────────────────────────────────────────────────────────────

/**
 * Ritmo a 4: tutte le distanze sono multipli, cosi' gli elementi si allineano
 * anche quando nessuno li ha allineati di proposito.
 */
export const spazi = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const raggio = { s: 10, m: 14, l: 18, xl: 26, tondo: 999 } as const;

/** Area minima toccabile: sotto i 44 punti il dito sbaglia. */
export const TOCCO_MINIMO = 44;

function ombra(altezza: number, raggioOmbra: number, opacita: number, android: number): ViewStyle {
  const forza = opacita * corrente.pesoOmbra;
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: corrente.coloreOmbra,
      shadowOffset: { width: 0, height: altezza },
      shadowOpacity: forza,
      shadowRadius: raggioOmbra,
    },
    android: { elevation: android },
    default: {
      boxShadow: `0 ${altezza}px ${raggioOmbra}px ${corrente.coloreOmbra}${Math.round(forza * 255)
        .toString(16)
        .padStart(2, '0')}`,
    } as ViewStyle,
  })!;
}

/**
 * Elevazione.
 *
 * Sullo scuro l'ombra quasi non si vede e la gerarchia la fa il tono della
 * superficie; sul chiaro e' il contrario. Per questo il peso dipende dalla
 * palette invece di essere una costante buona per nessuno dei due.
 */
export const elevazione = specchio<{ bassa: ViewStyle; media: ViewStyle; alta: ViewStyle }>(() => ({
  bassa: ombra(1, 4, 0.3, 1),
  media: ombra(6, 16, 0.4, 4),
  alta: ombra(-2, 24, 0.5, 10),
}));

/** Il bagliore colorato sotto una tessera: la luce che il colore getta intorno. */
export function bagliore(colore: string, forza = 0.35): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: colore,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: forza,
      shadowRadius: 14,
    },
    android: { shadowColor: colore, elevation: 8 },
    default: {
      boxShadow: `0 6px 18px ${colore}${Math.round(forza * 255)
        .toString(16)
        .padStart(2, '0')}`,
    } as ViewStyle,
  })!;
}

/** La linea di luce in cima a una scheda: illuminata invece che dipinta. */
export function vetro(c: Palette): ViewStyle {
  return { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.lucidatura };
}

/** Durate del movimento: abbastanza corte da non far aspettare. */
export const durate = { istante: 120, breve: 200, media: 320 } as const;

// ── Caratteri ───────────────────────────────────────────────────────────────

/**
 * Due famiglie, due mestieri.
 *
 * Space Grotesk per titoli e numeri: lettere costruite col righello, cifre che
 * sembrano uscite da un quadro strumenti. E' la voce dell'app. Plus Jakarta
 * Sans per il testo lungo, dove serve solo leggere senza accorgersi del
 * carattere.
 *
 * Con i font caricati come file distinti "fontWeight" non basta: ogni peso e'
 * una famiglia a se', e il componente Testo traduce il peso nel nome giusto.
 */
export const caratteri = {
  normale: 'PlusJakartaSans_400Regular',
  medio: 'PlusJakartaSans_500Medium',
  forte: 'PlusJakartaSans_600SemiBold',
  grassetto: 'PlusJakartaSans_700Bold',

  mostraMedio: 'SpaceGrotesk_500Medium',
  mostraForte: 'SpaceGrotesk_600SemiBold',
  mostraGrassetto: 'SpaceGrotesk_700Bold',
} as const;

export function famigliaPerPeso(peso: string | number | undefined): string {
  switch (String(peso ?? '400')) {
    case '700':
    case '800':
    case '900':
    case 'bold':
      return caratteri.grassetto;
    case '600':
      return caratteri.forte;
    case '500':
      return caratteri.medio;
    default:
      return caratteri.normale;
  }
}

/**
 * Scala tipografica.
 *
 * Sei livelli con salti netti: se due livelli differiscono di due punti, non
 * sono due livelli, sono lo stesso livello scritto male.
 *
 * Titoli e cifre chiedono a mano il carattere da esposizione: sono le uniche
 * cose che devono avere una voce, il resto deve solo leggersi.
 */
export const testi = {
  cifra: {
    fontFamily: caratteri.mostraGrassetto,
    fontSize: 38,
    letterSpacing: -1.4,
  },
  titolo: {
    fontFamily: caratteri.mostraGrassetto,
    fontSize: 24,
    letterSpacing: -0.6,
  },
  sottotitolo: {
    fontFamily: caratteri.mostraForte,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  corpo: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  piccolo: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  etichetta: {
    fontFamily: caratteri.mostraForte,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;
