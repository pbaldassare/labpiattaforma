/**
 * I quattro moduli dell'app, acquistabili separatamente.
 * Devono restare allineati al tipo `venditori.modulo` nel database.
 */
export const MODULI = [
  'vendita',
  'noleggio_breve',
  'noleggio_lungo',
  'assicurazioni',
] as const;

export type Modulo = (typeof MODULI)[number];

export const ETICHETTA_MODULO: Record<Modulo, string> = {
  vendita: 'Vendita',
  noleggio_breve: 'Noleggio breve termine',
  noleggio_lungo: 'Noleggio lungo termine',
  assicurazioni: 'Assicurazioni',
};

/**
 * Prima lettera dell'indirizzo delle pagine pubbliche: dominio.it/v/{codice}.
 * Sono anche slug riservati: un venditore che si chiamasse "v" renderebbe
 * irraggiungibili tutte le pagine di vendita.
 */
export const PREFISSO_MODULO: Record<Modulo, string> = {
  vendita: 'v',
  noleggio_breve: 'b',
  noleggio_lungo: 'l',
  assicurazioni: 'a',
};

/** Operazioni gratuite prima del blocco, per modulo (documento §8.5). */
export const UTILIZZI_GRATUITI_PER_MODULO = 5;

export type TipoCliente = 'privato' | 'rivenditore';
