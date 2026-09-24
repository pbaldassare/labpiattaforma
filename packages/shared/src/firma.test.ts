import { describe, expect, it } from 'vitest';

import { firmaValida, type PuntoFirma } from './pratica';

/** Una firma verosimile: tanti punti su un'onda ampia. */
function firmaVera(): PuntoFirma[] {
  return Array.from({ length: 40 }, (_, i) => ({
    x: i * 6,
    y: 50 + Math.sin(i / 3) * 30,
  }));
}

describe('cosa conta come firma', () => {
  it('accetta una firma normale', () => {
    expect(firmaValida(firmaVera())).toBe(true);
  });

  it('rifiuta il riquadro solo sfiorato', () => {
    expect(firmaValida([])).toBe(false);
    expect(firmaValida([{ x: 10, y: 10 }])).toBe(false);
  });

  it('rifiuta un dito appoggiato: tanti punti ma tutti nello stesso posto', () => {
    const fermo = Array.from({ length: 60 }, () => ({ x: 100, y: 80 }));
    expect(firmaValida(fermo)).toBe(false);
  });

  it('rifiuta un trattino troppo corto', () => {
    const corto = Array.from({ length: 20 }, (_, i) => ({ x: 100 + i, y: 80 }));
    expect(firmaValida(corto)).toBe(false);
  });

  it('accetta una firma alta e stretta', () => {
    // Una sigla verticale e' comunque una firma.
    const verticale = Array.from({ length: 20 }, (_, i) => ({ x: 100, y: 20 + i * 5 }));
    expect(firmaValida(verticale)).toBe(true);
  });

  it('rifiuta coordinate non numeriche', () => {
    // E' il caso che si presenta quando la piattaforma non riporta le
    // posizioni: meglio rifiutare che salvare una firma fatta di NaN.
    const rotta = Array.from({ length: 30 }, () => ({ x: NaN, y: NaN }));
    expect(firmaValida(rotta)).toBe(false);
  });
});
