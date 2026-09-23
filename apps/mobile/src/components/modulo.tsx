import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Testo as Text } from '@/components/testo';

import { TOCCO_MINIMO, caratteri, colori, raggio, spazi } from '@/lib/tema';

/**
 * Pezzi di modulo condivisi fra le schermate.
 *
 * Il venditore compila questi campi in piedi in piazzale, spesso con una mano
 * sola: aree toccabili generose, etichette sempre visibili (mai solo dentro il
 * campo, o spariscono appena si inizia a scrivere) ed errori accanto al campo
 * che li riguarda.
 */

export function Campo({
  etichetta,
  errore,
  aiuto,
  obbligatorio,
  children,
}: {
  etichetta: string;
  errore?: string | null;
  aiuto?: string;
  obbligatorio?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={stili.campo}>
      <Text style={stili.etichetta}>
        {etichetta}
        {obbligatorio ? <Text style={stili.obbligatorio}> *</Text> : null}
      </Text>
      {children}
      {aiuto && !errore ? <Text style={stili.aiuto}>{aiuto}</Text> : null}
      {errore ? <Text style={stili.errore}>{errore}</Text> : null}
    </View>
  );
}

export function Input({ style, ...resto }: TextInputProps) {
  return (
    <TextInput
      style={[stili.input, style]}
      placeholderTextColor={colori.testoTenue}
      {...resto}
    />
  );
}

/** Selezione fra poche opzioni: più rapida di un menu a tendina da toccare due volte. */
export function Scelta<T extends string>({
  valore,
  opzioni,
  onCambia,
  consentiVuoto = true,
}: {
  valore: T | null;
  opzioni: { valore: T; etichetta: string }[];
  onCambia: (v: T | null) => void;
  consentiVuoto?: boolean;
}) {
  return (
    <View style={stili.scelte}>
      {opzioni.map((o) => {
        const attiva = valore === o.valore;
        return (
          <Pressable
            key={o.valore}
            onPress={() => onCambia(attiva && consentiVuoto ? null : o.valore)}
            style={[stili.scelta, attiva && stili.sceltaAttiva]}
            accessibilityRole="button"
            accessibilityState={{ selected: attiva }}
          >
            <Text style={[stili.sceltaTesto, attiva && stili.sceltaTestoAttivo]}>
              {o.etichetta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Bottone({
  testo,
  onPress,
  inCorso,
  disabilitato,
  tenue,
}: {
  testo: string;
  onPress: () => void;
  inCorso?: boolean;
  disabilitato?: boolean;
  tenue?: boolean;
}) {
  const spento = disabilitato || inCorso;
  return (
    <Pressable
      onPress={onPress}
      disabled={spento}
      accessibilityRole="button"
      style={({ pressed }) => [
        tenue ? stili.bottoneTenue : stili.bottone,
        pressed && !spento && stili.premuto,
        spento && stili.spento,
      ]}
    >
      {inCorso ? (
        <ActivityIndicator color={tenue ? colori.primario : colori.suPrimario} />
      ) : (
        <Text style={tenue ? stili.bottoneTenueTesto : stili.bottoneTesto}>{testo}</Text>
      )}
    </Pressable>
  );
}

export function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <View style={stili.sezione}>
      <Text style={stili.titoloSezione}>{titolo}</Text>
      {children}
    </View>
  );
}

const stili = StyleSheet.create({
  campo: { gap: spazi.xs },
  etichetta: { fontSize: 13, fontWeight: '600', color: colori.testo },
  obbligatorio: { color: colori.accento },
  aiuto: { fontSize: 12, color: colori.testoTenue, lineHeight: 17 },
  errore: { fontSize: 12, color: colori.errore },
  input: {
    fontFamily: caratteri.normale,
    minHeight: TOCCO_MINIMO,
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: raggio.m,
    paddingHorizontal: spazi.m,
    paddingVertical: spazi.s,
    fontSize: 16,
    color: colori.testo,
  },
  scelte: { flexDirection: 'row', flexWrap: 'wrap', gap: spazi.s },
  scelta: {
    minHeight: TOCCO_MINIMO,
    justifyContent: 'center',
    paddingHorizontal: spazi.l,
    borderRadius: raggio.m,
    borderWidth: 1,
    borderColor: colori.bordo,
    backgroundColor: colori.superficie,
  },
  sceltaAttiva: { backgroundColor: colori.primario, borderColor: colori.primario },
  sceltaTesto: { fontSize: 15, color: colori.testo },
  sceltaTestoAttivo: { color: colori.suPrimario, fontWeight: '600' },
  bottone: {
    minHeight: TOCCO_MINIMO,
    backgroundColor: colori.primario,
    borderRadius: raggio.m,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spazi.l,
  },
  bottoneTesto: { color: colori.suPrimario, fontSize: 16, fontWeight: '600' },
  bottoneTenue: {
    minHeight: TOCCO_MINIMO,
    borderRadius: raggio.m,
    borderWidth: 1,
    borderColor: colori.bordo,
    backgroundColor: colori.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spazi.l,
  },
  bottoneTenueTesto: { color: colori.primario, fontSize: 15, fontWeight: '600' },
  premuto: { opacity: 0.85 },
  spento: { opacity: 0.5 },
  sezione: { gap: spazi.m, paddingTop: spazi.l },
  titoloSezione: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colori.testoTenue,
  },
});
