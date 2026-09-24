/**
 * Token visivi dell'app venditore.
 *
 * Direzione "Minimalism & Swiss": densa, poco movimento, tutto raggiungibile
 * col pollice. E' volutamente diversa da quella delle landing, che devono
 * vendere: qui si lavora.
 */
/**
 * Palette dell'app: grafite, la stessa famiglia delle landing.
 *
 * La prima versione usava il teal del profilo "strumento di lavoro". Era
 * sbagliata per due motivi: il verde acqua su un'app di compravendita auto
 * stona, e faceva sembrare l'app e le pagine due prodotti diversi. Il profilo
 * Automotive della direzione grafica e' grafite e rosso, ed e' quello giusto
 * per entrambe le superfici.
 *
 * Lo sfondo resta appena tinto di blu-grigio invece che bianco puro: distingue
 * la pagina dalle schede senza dover disegnare bordi ovunque.
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
  sfondo: '#F8FAFC',
  superficie: '#FFFFFF',
  testo: '#0F172A',
  testoTenue: '#475569',
  bordo: '#E2E8F0',
  bordoTenue: '#EEF2F6',
  errore: '#DC2626',
} as const;

export const spazi = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const raggio = { s: 8, m: 12, l: 16 } as const;

/** Area minima toccabile: sotto i 44 punti il dito sbaglia. */
export const TOCCO_MINIMO = 44;

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
