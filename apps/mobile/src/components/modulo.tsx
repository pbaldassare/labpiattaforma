import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Icona, type NomeIcona } from '@/components/icone';
import { Testo as Text } from '@/components/testo';
import {
  TOCCO_MINIMO,
  caratteri,
  colori,
  elevazione,
  raggio,
  spazi,
  testi,
} from '@/lib/tema';

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
      placeholderTextColor={colori.testoDebole}
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
            style={({ pressed }) => [
              stili.scelta,
              attiva && stili.sceltaAttiva,
              pressed && stili.premuto,
            ]}
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

type Tipo = 'pieno' | 'azione' | 'tenue' | 'nudo';

/**
 * Un solo pulsante d'azione per schermata, come chiede il pattern della
 * direzione grafica: "azione" è rosso e va usato per il gesto che chiude il
 * lavoro, "pieno" per tutto il resto.
 */
export function Bottone({
  testo,
  onPress,
  tipo = 'pieno',
  icona,
  inCorso,
  disabilitato,
  /** Retrocompatibilità: `tenue` era un booleano. */
  tenue,
}: {
  testo: string;
  onPress: () => void;
  tipo?: Tipo;
  icona?: NomeIcona;
  inCorso?: boolean;
  disabilitato?: boolean;
  tenue?: boolean;
}) {
  const scelto: Tipo = tenue ? 'tenue' : tipo;
  const spento = disabilitato || inCorso;
  // Sul fondo scuro dei bottoni tenui il blu pieno starebbe sotto il contrasto
  // minimo: li' serve la versione accesa. Il pieno regge solo sotto il bianco.
  const colorePrimoPiano =
    scelto === 'tenue' || scelto === 'nudo' ? colori.primarioChiaro : colori.suPrimario;

  return (
    <Pressable
      onPress={onPress}
      disabled={spento}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!spento }}
      style={({ pressed }) => [
        stili.bottone,
        scelto === 'pieno' && stili.bottonePieno,
        scelto === 'azione' && stili.bottoneAzione,
        scelto === 'tenue' && stili.bottoneTenue,
        scelto === 'nudo' && stili.bottoneNudo,
        (scelto === 'pieno' || scelto === 'azione') && !spento && elevazione.bassa,
        pressed && !spento && stili.premuto,
        spento && stili.spento,
      ]}
    >
      {inCorso ? (
        <ActivityIndicator color={colorePrimoPiano} />
      ) : (
        <>
          {icona && <Icona nome={icona} dimensione={18} colore={colorePrimoPiano} />}
          <Text style={[stili.bottoneTesto, { color: colorePrimoPiano }]}>{testo}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Sezione({
  titolo,
  azione,
  children,
}: {
  titolo: string;
  azione?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={stili.sezione}>
      <View style={stili.testaSezione}>
        <Text style={stili.titoloSezione}>{titolo}</Text>
        {azione}
      </View>
      {children}
    </View>
  );
}

const stili = StyleSheet.create({
  campo: { gap: spazi.xs },
  etichetta: { fontSize: 13, fontWeight: '600', color: colori.testo },
  obbligatorio: { color: colori.azione },
  aiuto: { fontSize: 12, lineHeight: 17, color: colori.testoTenue },
  errore: { fontSize: 12, color: colori.errore },

  input: {
    minHeight: TOCCO_MINIMO + 4,
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: raggio.m,
    paddingHorizontal: spazi.l,
    paddingVertical: spazi.m,
    fontSize: 16,
    color: colori.testo,
    fontFamily: caratteri.normale,
  },

  scelte: { flexDirection: 'row', flexWrap: 'wrap', gap: spazi.s },
  scelta: {
    minHeight: TOCCO_MINIMO,
    justifyContent: 'center',
    paddingHorizontal: spazi.l,
    borderRadius: raggio.tondo,
    borderWidth: 1,
    borderColor: colori.bordo,
    backgroundColor: colori.superficie,
  },
  sceltaAttiva: { backgroundColor: colori.primario, borderColor: colori.primario },
  sceltaTesto: { fontSize: 14, fontWeight: '500', color: colori.testo },
  sceltaTestoAttivo: { color: colori.suPrimario, fontWeight: '600' },

  bottone: {
    minHeight: TOCCO_MINIMO + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spazi.s,
    borderRadius: raggio.m,
    paddingHorizontal: spazi.xl,
  },
  bottonePieno: { backgroundColor: colori.primario },
  bottoneAzione: { backgroundColor: colori.azione },
  bottoneTenue: {
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  bottoneNudo: { backgroundColor: 'transparent' },
  bottoneTesto: { fontSize: 16, fontWeight: '600' },

  premuto: { opacity: 0.75 },
  spento: { opacity: 0.4 },

  sezione: { gap: spazi.m, paddingTop: spazi.xl },
  testaSezione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titoloSezione: { ...testi.etichetta, color: colori.testoTenue },
});
