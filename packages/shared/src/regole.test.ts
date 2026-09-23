import { describe, expect, it } from 'vitest';

import { PREFISSO_MODULO } from './moduli';
import { normalizzaSlug, proponiSlug, urlVetrina, validaSlug } from './slug';
import {
  analizzaEuro,
  euroInCentesimi,
  formattaEuro,
  formattaEuroPreciso,
  haPaginaRiservata,
  margineCent,
  prezzoPerCliente,
  urlPagina,
} from './offerta';

describe('slug della vetrina', () => {
  it('accetta gli indirizzi normali', () => {
    for (const buono of ['autosalone-rossi', 'mario-rossi', 'bt-motors', 'noleggi2000']) {
      expect(validaSlug(buono).valido, buono).toBe(true);
    }
  });

  it('rifiuta le forme che il database non accetterebbe', () => {
    for (const cattivo of ['ab', '-mario', 'mario-', 'mario--rossi', 'ciao!', 'con spazio', '']) {
      expect(validaSlug(cattivo).valido, cattivo).toBe(false);
    }
  });

  it('rifiuta i prefissi dei moduli, che sono lunghi un carattere', () => {
    // Non perche' siano riservati — quello lo sa solo il database — ma perche'
    // un carattere solo e' sotto la lunghezza minima.
    for (const prefisso of Object.values(PREFISSO_MODULO)) {
      expect(validaSlug(prefisso).valido, prefisso).toBe(false);
    }
  });

  it('normalizza come fa il trigger del database', () => {
    expect(normalizzaSlug('  Autosalone-Rossi  ')).toBe('autosalone-rossi');
  });

  it('propone uno slug leggibile partendo dal nome', () => {
    expect(proponiSlug('Autosalone Rossi')).toBe('autosalone-rossi');
    expect(proponiSlug('Città Motori S.r.l.')).toBe('citta-motori-s-r-l');
    expect(proponiSlug('  ---Ciao---  ')).toBe('ciao');
  });

  it('non produce mai uno slug che poi rifiuterebbe', () => {
    for (const nome of ['Autosalone Rossi', 'Città Motori S.r.l.', 'BT Motors 2000']) {
      expect(validaSlug(proponiSlug(nome)).valido, nome).toBe(true);
    }
  });

  it('compone la vetrina senza doppie barre', () => {
    expect(urlVetrina('https://esempio.it/', 'rossi')).toBe('https://esempio.it/rossi');
    expect(urlVetrina('https://esempio.it', 'rossi')).toBe('https://esempio.it/rossi');
  });
});

describe('denaro', () => {
  it('converte gli euro in centesimi senza errori di arrotondamento', () => {
    expect(euroInCentesimi(8900)).toBe(890000);
    expect(euroInCentesimi(19.99)).toBe(1999);
    // 0.1 + 0.2 in virgola mobile fa 0.30000000000000004: qui non deve succedere.
    expect(euroInCentesimi(0.1) + euroInCentesimi(0.2)).toBe(30);
  });

  it('formatta i prezzi in evidenza senza centesimi', () => {
    // Lo spazio prima del simbolo non e' separabile: il prezzo non deve mai
    // spezzarsi a fine riga lasciando l'euro da solo sotto.
    expect(formattaEuro(890000)).toBe('8.900 €');
    expect(formattaEuro(75000)).toBe('750 €');
    expect(formattaEuro(125000000)).toBe('1.250.000 €');
  });

  it('formatta i totali con i centesimi', () => {
    expect(formattaEuroPreciso(890050)).toBe('8.900,50 €');
    expect(formattaEuroPreciso(5)).toBe('0,05 €');
  });

  it('interpreta i prezzi come li scrive un venditore di fretta', () => {
    expect(analizzaEuro('8900')).toBe(890000);
    expect(analizzaEuro('8.900')).toBe(890000);
    expect(analizzaEuro(' 8 900 € ')).toBe(890000);
    expect(analizzaEuro('8900,50')).toBe(890050);
    expect(analizzaEuro('1.234,56')).toBe(123456);
    // Scritto all'inglese: il separatore decimale resta l'ultimo che compare.
    expect(analizzaEuro('1,234.56')).toBe(123456);
    expect(analizzaEuro('8,90')).toBe(890);
    expect(analizzaEuro('8,5')).toBe(850);
    expect(analizzaEuro('0')).toBe(0);
  });

  it('rifiuta quello che non e’ un prezzo, invece di inventarne uno', () => {
    expect(analizzaEuro('')).toBeNull();
    expect(analizzaEuro('   ')).toBeNull();
    expect(analizzaEuro('ottomilanovecento')).toBeNull();
    expect(analizzaEuro('89oo')).toBeNull();
    expect(analizzaEuro('12x')).toBeNull();
  });

  it('sopravvive al giro di andata e ritorno', () => {
    for (const centesimi of [0, 500, 890000, 123456, 125000000]) {
      expect(analizzaEuro(formattaEuroPreciso(centesimi))).toBe(centesimi);
    }
  });

  it('mostra i valori negativi con il segno, senza nasconderli', () => {
    expect(formattaEuro(-10000)).toBe('-100 €');
    expect(formattaEuroPreciso(-1050)).toBe('-10,50 €');
  });
});

describe('doppio listino', () => {
  const conRivenditore = { prezzo_pubblico_cent: 890000, prezzo_rivenditore_cent: 780000 };
  const senzaRivenditore = { prezzo_pubblico_cent: 890000, prezzo_rivenditore_cent: null };

  it('dà al privato il prezzo al pubblico', () => {
    expect(prezzoPerCliente(conRivenditore, 'privato')).toBe(890000);
    expect(prezzoPerCliente(senzaRivenditore, 'privato')).toBe(890000);
  });

  it('dà al rivenditore il prezzo riservato', () => {
    expect(prezzoPerCliente(conRivenditore, 'rivenditore')).toBe(780000);
  });

  it('non ripiega sul prezzo al pubblico se quello rivenditore manca', () => {
    // È il caso che il documento (§4.4) vuole bloccato: meglio fermare il
    // preventivo che mandare al rivenditore il prezzo del cliente finale.
    expect(prezzoPerCliente(senzaRivenditore, 'rivenditore')).toBeNull();
  });

  it('genera la pagina riservata solo con il prezzo rivenditore', () => {
    expect(haPaginaRiservata(conRivenditore)).toBe(true);
    expect(haPaginaRiservata(senzaRivenditore)).toBe(false);
  });
});

describe('margini', () => {
  it('calcola il margine sui due listini', () => {
    expect(margineCent(650000, 890000)).toBe(240000);
    expect(margineCent(650000, 780000)).toBe(130000);
  });

  it('non inventa un margine se manca il prezzo di acquisto', () => {
    expect(margineCent(null, 890000)).toBeNull();
    expect(margineCent(undefined, 890000)).toBeNull();
  });

  it('riporta il margine negativo invece di nasconderlo', () => {
    expect(margineCent(900000, 890000)).toBe(-10000);
  });
});

describe('indirizzi delle pagine', () => {
  it('usa la lettera giusta per ogni modulo', () => {
    expect(urlPagina('https://esempio.it', 'vendita', 'abc123')).toBe(
      'https://esempio.it/v/abc123'
    );
    expect(urlPagina('https://esempio.it', 'noleggio_breve', 'abc123')).toBe(
      'https://esempio.it/b/abc123'
    );
    expect(urlPagina('https://esempio.it', 'noleggio_lungo', 'abc123')).toBe(
      'https://esempio.it/l/abc123'
    );
    expect(urlPagina('https://esempio.it', 'assicurazioni', 'abc123')).toBe(
      'https://esempio.it/a/abc123'
    );
  });
});
