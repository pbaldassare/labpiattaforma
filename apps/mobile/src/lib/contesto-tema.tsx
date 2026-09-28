import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { impostaPalette, paletteCorrente, schemaCorrente, type Palette } from '@/lib/tema';

/**
 * Il tema, chiaro o scuro, scelto dal venditore.
 *
 * "Come il telefono" e' la voce predefinita: chi tiene il telefono scuro di
 * sera si aspetta che anche questa app lo faccia, senza doverlo dire. Le altre
 * due servono a chi vuole decidere — per esempio a chi lavora in piazzale al
 * sole, dove lo scuro legge peggio del chiaro.
 */
export type Preferenza = 'sistema' | 'chiaro' | 'scuro';

const CHIAVE = 'lab.tema';

interface Tema {
  colori: Palette;
  /** Quello che si vede adesso, gia' risolto. */
  schema: 'chiaro' | 'scuro';
  preferenza: Preferenza;
  scegli: (p: Preferenza) => void;
  /** Cambia a ogni cambio di tema: serve a rimontare l'albero. */
  chiave: string;
}

const Contesto = createContext<Tema | null>(null);

export function FornitoreTema({ children }: { children: ReactNode }) {
  const diSistema = useColorScheme();
  const [preferenza, setPreferenza] = useState<Preferenza>('sistema');

  const schema: 'chiaro' | 'scuro' =
    preferenza === 'sistema' ? (diSistema === 'light' ? 'chiaro' : 'scuro') : preferenza;

  // La palette si imposta durante il disegno, prima che i figli leggano gli
  // stili: se lo si facesse in un effetto, il primo disegno userebbe ancora
  // quella vecchia e si vedrebbe un lampo del tema sbagliato.
  if (schemaCorrente() !== schema) impostaPalette(schema);

  // Si legge una volta sola all'avvio. Se la lettura fallisce non succede
  // niente di grave: resta "come il telefono", che e' la scelta ragionevole.
  useEffect(() => {
    let vivo = true;
    void AsyncStorage.getItem(CHIAVE)
      .then((salvata) => {
        if (!vivo) return;
        if (salvata === 'chiaro' || salvata === 'scuro' || salvata === 'sistema') {
          setPreferenza(salvata);
        }
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const scegli = useCallback((p: Preferenza) => {
    setPreferenza(p);
    void AsyncStorage.setItem(CHIAVE, p).catch(() => {});
    // Lo dice anche a React Native, cosi' i componenti di sistema — la barra
    // di stato, i menu nativi — seguono la scelta invece di restare indietro.
    // Dirlo anche a React Native fa seguire la scelta ai componenti di
    // sistema — la barra di stato, i menu nativi. Su web la funzione non
    // esiste: li' il tema lo decide comunque il nostro fornitore, quindi si
    // salta invece di far esplodere l'app.
    if (typeof Appearance.setColorScheme === 'function') {
      // Con "come il telefono" si toglie l'imposizione e si torna a seguirlo:
      // il tipo non prevede null, ma e' proprio il valore che la azzera.
      Appearance.setColorScheme(
        (p === 'sistema' ? null : p === 'scuro' ? 'dark' : 'light') as 'dark' | 'light'
      );
    }
  }, []);

  const valore = useMemo<Tema>(
    () => ({
      colori: paletteCorrente(),
      schema,
      preferenza,
      scegli,
      chiave: `tema-${schema}`,
    }),
    [schema, preferenza, scegli]
  );

  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useTema(): Tema {
  const t = useContext(Contesto);
  if (!t) throw new Error('useTema usato fuori dal FornitoreTema');
  return t;
}
