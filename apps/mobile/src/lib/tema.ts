/**
 * Token visivi dell'app venditore.
 *
 * Direzione "Minimalism & Swiss": densa, poco movimento, tutto raggiungibile
 * col pollice. E' volutamente diversa da quella delle landing, che devono
 * vendere: qui si lavora.
 */
export const colori = {
  /**
   * Il teal indicato dalla direzione grafica (#0D9488) porta il testo bianco a
   * 3.7:1, sotto il minimo di 4.5:1. Per i fondi con scritte sopra si usa il
   * tono piu' scuro; quello chiaro resta per bordi e dettagli.
   */
  primario: '#0F766E',
  primarioChiaro: '#0D9488',
  suPrimario: '#FFFFFF',
  accento: '#EA580C',
  sfondo: '#F0FDFA',
  superficie: '#FFFFFF',
  testo: '#134E4A',
  testoTenue: '#475569',
  bordo: '#99F6E4',
  bordoTenue: '#E8F1F4',
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
