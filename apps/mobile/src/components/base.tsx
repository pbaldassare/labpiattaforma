import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Icona as IconaBase, type NomeIcona } from '@/components/icone';
import { Simbolo } from '@/components/simboli';
import { Testo as Text } from '@/components/testo';
import {
  bagliore,
  colori,
  elevazione,
  raggio,
  spazi,
  stiliTema,
  testi,
  TOCCO_MINIMO,
  vetro,
  type NomeModulo,
} from '@/lib/tema';

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
 * Il blocco icona di un modulo.
 *
 * L'icona sta dentro un quadrato in sfumatura che getta il proprio colore
 * intorno a se': e' quello che distingue una tessera da un rettangolo con
 * dentro un simbolo. La dimensione cambia col contesto, il resto no.
 */
export function BloccoIcona({
  icona,
  modulo,
  gradiente,
  suGradiente = '#FFFFFF',
  dimensione = 44,
  spento,
}: {
  /** Per i blocchi che non sono di un modulo: si usa la famiglia generica. */
  icona?: NomeIcona;
  /** Con un modulo si disegna il suo simbolo su misura. */
  modulo?: NomeModulo;
  gradiente: readonly [string, string];
  suGradiente?: string;
  dimensione?: number;
  spento?: boolean;
}) {
  const lato = { width: dimensione, height: dimensione, borderRadius: dimensione * 0.34 };
  const dentro = dimensione * 0.52;

  if (spento) {
    return (
      <View style={[stili.bloccoSpento, lato]}>
        {modulo ? (
          <Simbolo modulo={modulo} dimensione={dentro} colore={colori.testoDebole} />
        ) : (
          icona && <IconaBase nome={icona} dimensione={dentro * 0.85} colore={colori.testoDebole} />
        )}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={gradiente as unknown as [string, string]}
      // In diagonale e non dall'alto in basso: la luce sembra arrivare da
      // qualche parte invece che da nessuna.
      start={{ x: 0.1, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[stili.blocco, lato, bagliore(gradiente[0], 0.5)]}
    >
      {/* Il riflesso: un velo chiaro sulla meta' alta. E' il dettaglio che
          distingue un blocco da un quadrato colorato. */}
      <View style={[stili.riflesso, { borderRadius: dimensione * 0.34 }]} pointerEvents="none" />
      {modulo ? (
        <Simbolo modulo={modulo} dimensione={dentro} colore={suGradiente} />
      ) : (
        icona && <IconaBase nome={icona} dimensione={dentro * 0.85} colore={suGradiente} />
      )}
    </LinearGradient>
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

const stili = stiliTema((c) => StyleSheet.create({
  scheda: {
    backgroundColor: c.superficie,
    borderRadius: raggio.l,
    padding: spazi.l,
    // La linea di luce in cima: fa sembrare la scheda illuminata invece che
    // dipinta. Si nota solo quando manca.
    ...vetro(c),
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
  cifraEtichetta: { ...testi.piccolo, color: c.testoTenue },

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
    backgroundColor: c.bordoTenue,
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
    borderColor: c.bordo,
    backgroundColor: c.superficie,
  },
  filtroAttivo: { backgroundColor: c.primario, borderColor: c.primario },
  filtroTesto: { fontSize: 13, color: c.testo },
  filtroTestoAttivo: { color: c.suPrimario, fontWeight: '600' },

  blocco: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  riflesso: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bloccoSpento: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bordoTenue,
    borderWidth: 1,
    borderColor: c.bordo,
  },

  vuotoTitolo: { ...testi.sottotitolo, color: c.testo },
  vuotoTesto: { ...testi.piccolo, color: c.testoTenue, textAlign: 'center', maxWidth: 260 },
}));
export { TOCCO_MINIMO };
