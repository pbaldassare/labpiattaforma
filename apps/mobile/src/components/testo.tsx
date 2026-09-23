import { StyleSheet, Text as TestoNativo, type TextProps } from 'react-native';

import { famigliaPerPeso } from '@/lib/tema';

/**
 * Testo dell'app.
 *
 * Esiste per un motivo solo: tradurre il peso richiesto dallo stile nella
 * famiglia giusta di Plus Jakarta Sans. Senza, ogni schermata dovrebbe
 * ricordarsi il nome del file del font, e prima o poi qualcuna se lo dimentica
 * tornando al carattere di sistema senza che nessuno se ne accorga.
 */
export function Testo({ style, ...resto }: TextProps) {
  const piatto = StyleSheet.flatten(style) ?? {};
  return (
    <TestoNativo
      {...resto}
      style={[style, { fontFamily: famigliaPerPeso(piatto.fontWeight), fontWeight: undefined }]}
    />
  );
}
