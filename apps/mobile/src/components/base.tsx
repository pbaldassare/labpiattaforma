import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icona as IconaBase, type NomeIcona } from '@/components/icone';
import { Testo as Text } from '@/components/testo';
import { TOCCO_MINIMO, colori, elevazione, raggio, spazi, testi } from '@/lib/tema';

/**
 * Mattoni comuni dell'interfaccia.
 *
 * Esistono per una ragione sola: fare in modo che due cose dello stesso livello
 * abbiano lo stesso aspetto. Quando ogni schermata si disegna le proprie schede,
 * dopo cinque schermate ci sono cinque raggi di bordo diversi e nessuno se n'e'
 * accorto.
 */

// ── Scheda ──────────────────────────────────────────────────────────────────

export function Scheda({
  children,
  onPress,
  rilievo = 'bassa',
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  rilievo?: 'bassa' | 'media';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const base = [stili.scheda, elevazione[rilievo], style];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      // Solo opacita': un translate sposterebbe le righe vicine e farebbe
      // sobbalzare l'elenco a ogni tocco.
      style={({ pressed }) => [...base, pressed && stili.premuta]}
    >
      {children}
    </Pressable>
  );
}

// ── Pillola ─────────────────────────────────────────────────────────────────

type Tono = 'neutro' | 'attenzione' | 'successo' | 'azione';

const TONI: Record<Tono, { sfondo: string; testo: string }> = {
  neutro: { sfondo: colori.superficieAlta, testo: colori.testoTenue },
  attenzione: { sfondo: colori.accentoTenue, testo: colori.accento },
  successo: { sfondo: colori.successoTenue, testo: colori.successo },
  azione: { sfondo: colori.azioneTenue, testo: colori.azione },
};

export function Pillola({ testo, tono = 'neutro' }: { testo: string; tono?: Tono }) {
  const c = TONI[tono];
  return (
    <View style={[stili.pillola, { backgroundColor: c.sfondo }]}>
      <Text style={[stili.pillolaTesto, { color: c.testo }]}>{testo}</Text>
    </View>
  );
}

// ── Cifra ───────────────────────────────────────────────────────────────────

/**
 * Un numero con la sua etichetta.
 *
 * I numeri sono il contenuto di questa app, non una decorazione: hanno una
 * dimensione propria nella scala tipografica e stanno sopra l'etichetta, non
 * di fianco, perche' si leggano per primi.
 */
export function Cifra({
  numero,
  etichetta,
  icona,
  tono,
  onPress,
}: {
  numero: number | string;
  etichetta: string;
  icona?: NomeIcona;
  tono?: Tono;
  onPress?: () => void;
}) {
  const colore = tono ? TONI[tono].testo : colori.testo;
  const contenuto = (
    <>
      {icona && <IconaBase nome={icona} dimensione={18} colore={colori.testoDebole} />}
      <Text style={[stili.cifra, { color: colore }]}>{numero}</Text>
      <Text style={stili.cifraEtichetta}>{etichetta}</Text>
    </>
  );

  return (
    <Scheda onPress={onPress} style={stili.riquadroCifra} accessibilityLabel={`${numero} ${etichetta}`}>
      {contenuto}
    </Scheda>
  );
}

// ── Riga di elenco ──────────────────────────────────────────────────────────

export function Iniziali({ nome, tono = 'neutro' }: { nome: string; tono?: Tono }) {
  const lettere = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
  const c = TONI[tono];
  return (
    <View style={[stili.iniziali, { backgroundColor: c.sfondo }]}>
      <Text style={[stili.inizialiTesto, { color: c.testo }]}>{lettere}</Text>
    </View>
  );
}

export function Pastiglia({ icona, tono = 'neutro' }: { icona: NomeIcona; tono?: Tono }) {
  const c = TONI[tono];
  return (
    <View style={[stili.iniziali, { backgroundColor: c.sfondo }]}>
      <IconaBase nome={icona} dimensione={20} colore={c.testo} />
    </View>
  );
}

/**
 * La barra dei filtri in cima a un elenco.
 *
 * Scorre in orizzontale perche' le voci sono poche ma i loro nomi sono lunghi:
 * "Noleggio lungo termine (3)" non entra in un quarto di schermo, e mandarle a
 * capo farebbe saltare l'altezza della barra a ogni cambio di filtro.
 */
export function Filtri<T extends string>({
  valore,
  opzioni,
  onCambia,
}: {
  valore: T | null;
  opzioni: { valore: T | null; etichetta: string }[];
  onCambia: (v: T | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={stili.barraFiltri}
      contentContainerStyle={stili.filtri}
    >
      {opzioni.map((o) => {
        const attivo = valore === o.valore;
        return (
          <Pressable
            key={o.valore ?? 'tutti'}
            onPress={() => onCambia(attivo && o.valore != null ? null : o.valore)}
            style={[stili.filtro, attivo && stili.filtroAttivo]}
            accessibilityRole="button"
            accessibilityState={{ selected: attivo }}
          >
            <Text style={[stili.filtroTesto, attivo && stili.filtroTestoAttivo]}>
              {o.etichetta}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Vuoto({
  icona,
  titolo,
  testo,
}: {
  icona?: NomeIcona;
  titolo: string;
  testo: string;
}) {
  return (
    <View style={stili.vuoto}>
      {icona && (
        <View style={stili.vuotoIcona}>
          <IconaBase nome={icona} dimensione={28} colore={colori.testoDebole} />
        </View>
      )}
      <Text style={stili.vuotoTitolo}>{titolo}</Text>
      <Text style={stili.vuotoTesto}>{testo}</Text>
    </View>
  );
}

const stili = StyleSheet.create({
  scheda: {
    backgroundColor: colori.superficie,
    borderRadius: raggio.l,
    padding: spazi.l,
  },
  premuta: { opacity: 0.7 },

  pillola: {
    alignSelf: 'flex-start',
    paddingHorizontal: spazi.s,
    paddingVertical: 3,
    borderRadius: raggio.tondo,
  },
  pillolaTesto: { ...testi.etichetta, fontSize: 10 },

  riquadroCifra: { flex: 1, gap: spazi.xs, paddingVertical: spazi.l },
  cifra: { ...testi.cifra },
  cifraEtichetta: { ...testi.piccolo, color: colori.testoTenue },

  iniziali: {
    width: 40,
    height: 40,
    borderRadius: raggio.tondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inizialiTesto: { fontSize: 14, fontWeight: '700' },

  vuoto: {
    alignItems: 'center',
    gap: spazi.s,
    paddingVertical: spazi.xxxl,
    paddingHorizontal: spazi.xl,
  },
  vuotoIcona: {
    width: 64,
    height: 64,
    borderRadius: raggio.tondo,
    backgroundColor: colori.bordoTenue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spazi.xs,
  },
  // alignItems: senza, il contenitore orizzontale stira i filtri per tutta
  // l'altezza disponibile e diventano rettangoli alti.
  barraFiltri: { flexGrow: 0 },
  filtri: {
    paddingHorizontal: spazi.l,
    paddingVertical: spazi.m,
    gap: spazi.s,
    alignItems: 'center',
  },
  filtro: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spazi.m,
    borderRadius: raggio.s,
    borderWidth: 1,
    borderColor: colori.bordo,
    backgroundColor: colori.superficie,
  },
  filtroAttivo: { backgroundColor: colori.primario, borderColor: colori.primario },
  filtroTesto: { fontSize: 13, color: colori.testo },
  filtroTestoAttivo: { color: colori.suPrimario, fontWeight: '600' },

  vuotoTitolo: { ...testi.sottotitolo, color: colori.testo },
  vuotoTesto: { ...testi.piccolo, color: colori.testoTenue, textAlign: 'center', maxWidth: 260 },
});

export { TOCCO_MINIMO };
