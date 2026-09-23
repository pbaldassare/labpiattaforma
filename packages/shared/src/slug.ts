/**
 * Regole dell'indirizzo della vetrina del venditore: dominio.it/{slug}.
 *
 * Lo stesso controllo vive in tre punti — qui, nel vincolo della tabella
 * `venditori.venditore` e nella funzione `venditori.slug_disponibile` — perche'
 * il database non puo' fidarsi di una validazione che gira sul telefono.
 * Questa copia serve solo a dare risposta immediata mentre si digita.
 */

export const SLUG_LUNGHEZZA_MIN = 3;
export const SLUG_LUNGHEZZA_MAX = 40;

const FORMATO_SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** Toglie spazi e maiuscole, come fa il trigger del database. */
export function normalizzaSlug(valore: string): string {
  return valore.trim().toLowerCase();
}

/** Trasforma un nome libero in una proposta di slug: "Autosalone Rossi" -> "autosalone-rossi". */
export function proponiSlug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, SLUG_LUNGHEZZA_MAX)
    .replace(/-$/, '');
}

export type EsitoSlug = { valido: true } | { valido: false; motivo: string };

/**
 * Controlla solo la forma. Se l'indirizzo sia libero lo sa soltanto il
 * database: va chiesto con la funzione `slug_disponibile`.
 */
export function validaSlug(valore: string): EsitoSlug {
  const slug = normalizzaSlug(valore);

  if (slug.length === 0) {
    return { valido: false, motivo: 'Scegli un indirizzo per la tua vetrina.' };
  }
  if (slug.length < SLUG_LUNGHEZZA_MIN) {
    return { valido: false, motivo: `Servono almeno ${SLUG_LUNGHEZZA_MIN} caratteri.` };
  }
  if (slug.length > SLUG_LUNGHEZZA_MAX) {
    return { valido: false, motivo: `Al massimo ${SLUG_LUNGHEZZA_MAX} caratteri.` };
  }
  if (/[^a-z0-9-]/.test(slug)) {
    return { valido: false, motivo: 'Solo lettere, numeri e trattini: niente spazi, accenti o simboli.' };
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valido: false, motivo: "Non puo’ iniziare ne’ finire con un trattino." };
  }
  if (slug.includes('--')) {
    return { valido: false, motivo: 'Niente trattini doppi.' };
  }
  if (!FORMATO_SLUG.test(slug)) {
    return { valido: false, motivo: 'Indirizzo non valido.' };
  }
  return { valido: true };
}

/** Indirizzo completo della vetrina, per copia, QR e anteprima. */
export function urlVetrina(dominio: string, slug: string): string {
  return `${dominio.replace(/\/$/, '')}/${slug}`;
}
