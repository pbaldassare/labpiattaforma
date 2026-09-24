import { Platform, type ViewStyle } from 'react-native';

/**
 * Palette dell'app: grafite, la stessa famiglia delle landing.
 *
 * La prima versione usava il teal del profilo "strumento di lavoro". Era
 * sbagliata per due motivi: il verde acqua su un'app di compravendita auto
 * stona, e faceva sembrare l'app e le pagine due prodotti diversi. Il profilo
 * Automotive della direzione grafica e' grafite e rosso, ed e' quello giusto
 * per entrambe le superfici.
 */
export const colori = {
  primario: '#1E293B',
  primarioChiaro: '#475569',
  suPrimario: '#FFFFFF',
  /**
   * Ambra per cio' che chiede attenzione senza essere un errore: una pratica
   * da richiamare, un cliente rivenditore. Tenuta distinta dal rosso, che qui
   * significa solo "qualcosa e' andato storto".
   */
  accento: '#B45309',
  accentoTenue: '#FEF3C7',
  /** Rosso d'azione, lo stesso delle landing: un solo pulsante per schermata. */
  azione: '#DC2626',
  suAzione: '#FFFFFF',
  sfondo: '#F8FAFC',
  superficie: '#FFFFFF',
  testo: '#0F172A',
  testoTenue: '#475569',
  testoDebole: '#94A3B8',
  bordo: '#E2E8F0',
  bordoTenue: '#EEF2F6',
  errore: '#DC2626',
  successo: '#15803D',
} as const;

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

export const raggio = { s: 8, m: 12, l: 16, xl: 20, tondo: 999 } as const;

/** Area minima toccabile: sotto i 44 punti il dito sbaglia. */
export const TOCCO_MINIMO = 44;

/**
 * Elevazione.
 *
 * Su iOS l'ombra si descrive con quattro proprieta', su Android con un numero
 * solo: qui sono raccolte perche' nessuna schermata debba ricordarselo, e
 * perche' due schede allo stesso livello gerarchico abbiano la stessa ombra.
 *
 * Senza, tutto resta piatto e la gerarchia si affida ai bordi da un pixel —
 * che su uno schermo di telefono, alla luce del sole, non si vedono.
 */
function ombra(
  altezza: number,
  raggioOmbra: number,
  opacita: number,
  elevazioneAndroid: number
): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: altezza },
      shadowOpacity: opacita,
      shadowRadius: raggioOmbra,
    },
    android: { elevation: elevazioneAndroid },
    default: {
      boxShadow: `0 ${altezza}px ${raggioOmbra}px rgba(15,23,42,${opacita})`,
    } as ViewStyle,
  })!;
}

export const elevazione = {
  /** Schede in elenco: si staccano appena dallo sfondo. */
  bassa: ombra(1, 3, 0.06, 1),
  /** Schede principali e riquadri di riepilogo. */
  media: ombra(4, 10, 0.08, 3),
  /** Barre fisse e fogli che stanno sopra il contenuto. */
  alta: ombra(-2, 16, 0.1, 8),
} as const;

/** Durate del movimento: abbastanza corte da non far aspettare. */
export const durate = { istante: 120, breve: 200, media: 320 } as const;

/**
 * Plus Jakarta Sans, la famiglia indicata dalla direzione grafica per gli
 * strumenti di lavoro: leggibile in piccolo, numeri chiari, niente carattere.
 *
 * Con i font caricati come file distinti, "fontWeight" non basta: ogni peso e'
 * una famiglia a se'. Per questo il peso richiesto viene tradotto nel nome
 * giusto dal componente Testo, invece di sparpagliare nomi di file negli stili.
 */
export const caratteri = {
  normale: 'PlusJakartaSans_400Regular',
  medio: 'PlusJakartaSans_500Medium',
  forte: 'PlusJakartaSans_600SemiBold',
  grassetto: 'PlusJakartaSans_700Bold',
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
 * sono due livelli, sono lo stesso livello scritto male. I numeri in evidenza
 * hanno una voce propria perche' su questa app sono il contenuto, non una
 * decorazione.
 */
export const testi = {
  cifra: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.5 },
  titolo: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  sottotitolo: { fontSize: 17, fontWeight: '600' as const },
  corpo: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  piccolo: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  etichetta: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
} as const;
