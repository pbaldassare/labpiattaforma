const URL_SUPABASE = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

/** Il bucket e' in lettura libera: indirizzo diretto, niente firma. */
export function urlFoto(path: string): string {
  return `${URL_SUPABASE.replace(/\/$/, '')}/storage/v1/object/public/offerte/${path}`;
}
