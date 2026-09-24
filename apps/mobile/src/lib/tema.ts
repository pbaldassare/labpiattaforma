import { Platform, type ViewStyle } from 'react-native';

/**
 * Palette dell'app: cruscotto notturno.
 *
 * Il grafite su fondo chiaro era corretto ma anonimo: sembrava un gestionale.
 * Qui si va sullo scuro, con la stessa logica di un quadro strumenti — fondo
 * profondo, superfici che salgono di tono, e pochi colori molto saturi che
 * vogliono dire qualcosa.
 *
 * I colori non sono decorazione: ogni modulo ha il suo, e su una schermata che
 * ne mostra quattro insieme si capisce a colpo d'occhio di cosa si sta
 * parlando senza leggere. Il rosso resta fuori da questo gioco: significa solo
 * "stai per rompere qualcosa".
 *
 * Nota per il futuro: lo scuro e' bello ma sotto il sole in piazzale legge
 * peggio del chiaro. Se il venditore si lamenta, la strada e' un tema chiaro
 * gemello, non l'abbandono di questi colori.
 */
export const colori = {
  /** Blu elettrico: l'azione principale. Bianco sopra sta a 4,6:1. */
  primario: '#2563EB',
  /** La versione accesa, per icone e bordi su fondo scuro. */
  primarioChiaro: '#60A5FA',
  suPrimario: '#FFFFFF',

  /**
   * Ambra per cio' che chiede attenzione senza essere un errore: una pratica
   * da richiamare, un cliente rivenditore. Distinta dal rosso, che qui
   * significa solo "qualcosa e' andato storto".
   */
  accento: '#FBBF24',
  accentoTenue: '#3B2F0B',

  /** Rosso d'azione: un solo pulsante per schermata, e solo se e' grave. */
  azione: '#EF4444',
  suAzione: '#FFFFFF',

  /** Il fondo, e le due superfici che ci salgono sopra. */
  sfondo: '#0A0E17',
  superficie: '#141A26',
  superficieAlta: '#1D2534',

  testo: '#F1F5F9',
  testoTenue: '#A3B1C6',
  testoDebole: '#6B7B93',

  bordo: '#27324A',
  bordoTenue: '#1B2333',

  errore: '#F87171',
  successo: '#34D399',
  successoTenue: '#0C2E24',
  azioneTenue: '#3B1418',
} as const;

/**
 * Un colore per modulo.
 *
 * Servono a riconoscere il modulo prima di leggerne il nome, quindi devono
 * essere distinguibili anche da chi confonde rosso e verde: qui sono distanti
 * per tinta e per luminosita', e non portano mai da soli un'informazione —
 * accanto c'e' sempre l'icona e il nome scritto.
 */
export const coloriModulo = {
  vendita: '#60A5FA',
  noleggio_breve: '#FB923C',
  noleggio_lungo: '#C084FC',
  assicurazioni: '#34D399',
} as const;

/**
 * Le sfumature.
 *
 * Una superficie piatta e' una superficie finta: due toni dello stesso colore,
 * anche vicinissimi, bastano a far sembrare che la luce arrivi da qualche
 * parte. Su fondo scuro e' la differenza fra una scheda e un rettangolo.
 */
export const gradienti = {
  vendita: ['#2563EB', '#1E40AF'],
  noleggio_breve: ['#EA580C', '#9A3412'],
  noleggio_lungo: ['#9333EA', '#6B21A8'],
  assicurazioni: ['#059669', '#065F46'],
  /** L'intestazione: il fondo che si schiarisce appena verso l'alto. */
  testa: ['#182133', '#0C1220'],
  azione: ['#3B82F6', '#2563EB'],
} as const;

/**
 * Il bagliore colorato sotto una tessera.
 *
 * Non e' un'ombra: e' la luce che il colore della tessera getta intorno a se'.
 * Su Android sotto la 28 l'ombra resta nera, e va bene lo stesso.
 */
export function bagliore(colore: string, forza = 0.35): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: colore,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: forza,
      shadowRadius: 14,
    },
    android: { shadowColor: colore, elevation: 8 },
    default: { boxShadow: `0 6px 18px ${colore}${Math.round(forza * 255).toString(16)}` } as ViewStyle,
  })!;
}

/**
 * La linea di luce in cima a una scheda.
 *
 * Un bordo chiaro di un pixel solo sul lato alto: e' il dettaglio che fa
 * sembrare la scheda illuminata invece che dipinta. Costa niente e si nota
 * solo quando manca.
 */
export const vetro: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: 'rgba(255,255,255,0.07)',
};

/** Lo stesso colore appena accennato, per i fondi delle pastiglie. */
export const coloriModuloTenue = {
  vendita: '#152744',
  noleggio_breve: '#3A2011',
  noleggio_lungo: '#2E1A44',
  assicurazioni: '#0C2E24',
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

export const raggio = { s: 10, m: 14, l: 18, xl: 24, tondo: 999 } as const;

/** Area minima toccabile: sotto i 44 punti il dito sbaglia. */
export const TOCCO_MINIMO = 44;

/**
 * Elevazione.
 *
 * Su fondo scuro l'ombra quasi non si vede: la gerarchia la fa il tono della
 * superficie, e l'ombra serve solo a staccare cio' che galleggia davvero. Per
 * questo qui e' piu' profonda e piu' nera di quanto sarebbe su fondo chiaro.
 */
function ombra(
  altezza: number,
  raggioOmbra: number,
  opacita: number,
  elevazioneAndroid: number
): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: altezza },
      shadowOpacity: opacita,
      shadowRadius: raggioOmbra,
    },
    android: { elevation: elevazioneAndroid },
    default: {
      boxShadow: `0 ${altezza}px ${raggioOmbra}px rgba(0,0,0,${opacita})`,
    } as ViewStyle,
  })!;
}

export const elevazione = {
  /** Schede in elenco: si staccano appena dallo sfondo. */
  bassa: ombra(1, 4, 0.3, 1),
  /** Schede principali e riquadri di riepilogo. */
  media: ombra(6, 16, 0.4, 4),
  /** Barre fisse e fogli che stanno sopra il contenuto. */
  alta: ombra(-2, 24, 0.5, 10),
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
 * decorazione: sullo scuro stanno stretti e pesanti, come su un contachilometri.
 */
export const testi = {
  cifra: { fontSize: 36, fontWeight: '700' as const, letterSpacing: -1 },
  titolo: { fontSize: 23, fontWeight: '700' as const, letterSpacing: -0.4 },
  sottotitolo: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  corpo: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  piccolo: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  etichetta: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
} as const;
