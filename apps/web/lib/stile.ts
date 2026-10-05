/**
 * Il pulsante principale delle landing, nel colore del modulo.
 *
 * Una stringa e non il Button di shadcn: le sue classi si sommerebbero a
 * queste invece di cederle il posto (cn non fonde le classi Tailwind), e
 * altezza e colore dipenderebbero dall'ordine del CSS.
 */
export const BOTTONE_MODULO =
  'sfumatura-modulo text-m-su riflesso inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold shadow-lg shadow-m2/25 transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60';
