import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import {
  ETICHETTA_MODULO,
  UTILIZZI_GRATUITI_PER_MODULO,
  fn,
  type Modulo,
} from '@lab/shared';

import { Pillola, Scheda , BloccoIcona } from '@/components/base';
import { Testo as Text } from '@/components/testo';

import { supabase } from '@/lib/supabase';
import {
  colori,
  coloriModulo,
  raggio,
  spazi,
  stiliTema,
  testi,
  gradienti,
  suGradiente,
} from '@/lib/tema';

interface StatoModulo {
  modulo: Modulo;
  offerte_attive: number;
  pratiche_aperte: number;
  utilizzi_consumati: number;
  utilizzi_inclusi: number;
  acquistato_fino_a: string | null;
}

/** Cosa fa ciascun modulo, detto in una riga al venditore. */
const DESCRIZIONE: Record<Modulo, string> = {
  vendita: 'Metti in vendita un mezzo e mandane la pagina al cliente.',
  noleggio_breve: 'Da un giorno a un mese, con calendario e date bloccate al volo.',
  noleggio_lungo: 'Da uno a cinque anni: il canone lo calcola la pagina.',
  assicurazioni: 'Polizze con garanzie, massimali e scadenze da ricordare.',
};

/** Dove porta il tocco. I moduli non ancora costruiti non portano da nessuna parte. */
const PRONTO: Record<Modulo, boolean> = {
  vendita: true,
  noleggio_lungo: true,
  assicurazioni: true,
  noleggio_breve: true,
};

/** Dove porta ciascun modulo per creare una nuova offerta. */
const DOVE = {
  vendita: '/offerte/nuova',
  noleggio_breve: '/offerte/nuova-breve',
  noleggio_lungo: '/offerte/nuova-lungo',
  assicurazioni: '/offerte/nuova-assicurazione',
} as const satisfies Record<Modulo, string>;

export default function Moduli() {
  const router = useRouter();
  const [moduli, setModuli] = useState<StatoModulo[]>([]);
  const [caricato, setCaricato] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const { data } = await supabase.rpc(fn('stato_moduli'));
        setModuli((data as StatoModulo[] | null) ?? []);
        setCaricato(true);
      })();
    }, [])
  );

  /** Modulo finito: si apre il blocco, non un form che poi rifiuta. */
  function apri(m: StatoModulo) {
    const esaurito =
      m.acquistato_fino_a == null && m.utilizzi_consumati >= m.utilizzi_inclusi;
    if (esaurito) {
      router.push({ pathname: '/blocco', params: { modulo: m.modulo } });
      return;
    }
    router.push(DOVE[m.modulo]);
  }

  if (!caricato) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  return (
    <ScrollView style={stili.contenitore} contentContainerStyle={stili.contenuto}>
      <Text style={stili.introduzione}>
        Ogni modulo si attiva e si paga per conto suo. Le prime{' '}
        {UTILIZZI_GRATUITI_PER_MODULO} operazioni di ciascuno sono comprese.
      </Text>

      {moduli.map((m) => (
        <SchedaModulo
          key={m.modulo}
          stato={m}
          onPress={PRONTO[m.modulo] ? () => apri(m) : undefined}
        />
      ))}
    </ScrollView>
  );
}

function SchedaModulo({ stato, onPress }: { stato: StatoModulo; onPress?: () => void }) {
  const residui = Math.max(0, stato.utilizzi_inclusi - stato.utilizzi_consumati);
  const acquistato = stato.acquistato_fino_a != null;
  const inArrivo = !PRONTO[stato.modulo];

  return (
    <Scheda
      rilievo="media"
      onPress={onPress}
      style={[stili.scheda, inArrivo && stili.schedaInArrivo]}
      accessibilityLabel={ETICHETTA_MODULO[stato.modulo]}
    >
      <View style={stili.testa}>
        <BloccoIcona
          modulo={stato.modulo}
          gradiente={gradienti[stato.modulo]}
          suGradiente={suGradiente[stato.modulo]}
          dimensione={48}
          spento={inArrivo}
        />
        <View style={stili.testi}>
          <Text style={stili.nome}>{ETICHETTA_MODULO[stato.modulo]}</Text>
          <Text style={stili.descrizione}>{DESCRIZIONE[stato.modulo]}</Text>
        </View>
      </View>

      {inArrivo ? (
        <Pillola testo="in arrivo" />
      ) : (
        <>
          <View style={stili.numeri}>
            <Numero valore={stato.offerte_attive} etichetta="offerte attive" />
            <View style={stili.divisore} />
            <Numero valore={stato.pratiche_aperte} etichetta="pratiche aperte" />
          </View>

          {/* Il contatore degli utilizzi, sempre visibile come chiede il §8.5. */}
          <View style={stili.utilizzi}>
            {acquistato ? (
              <Pillola testo="attivo" tono="successo" />
            ) : (
              <>
                <View style={stili.barra}>
                  <View
                    style={[
                      stili.barraPiena,
                      { backgroundColor: coloriModulo[stato.modulo] },
                      {
                        width: `${Math.min(100, (stato.utilizzi_consumati / Math.max(1, stato.utilizzi_inclusi)) * 100)}%`,
                      },
                      residui === 0 && stili.barraEsaurita,
                    ]}
                  />
                </View>
                <Text style={[stili.residui, residui <= 1 && stili.residuiPochi]}>
                  {residui === 0
                    ? 'operazioni gratuite esaurite'
                    : `${residui} ${residui === 1 ? 'operazione gratuita' : 'operazioni gratuite'}`}
                </Text>
              </>
            )}
          </View>
        </>
      )}
    </Scheda>
  );
}

function Numero({ valore, etichetta }: { valore: number; etichetta: string }) {
  return (
    <View style={stili.numero}>
      <Text style={stili.numeroValore}>{valore}</Text>
      <Text style={stili.numeroEtichetta}>{etichetta}</Text>
    </View>
  );
}

const stili = stiliTema((c) => StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: c.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
  contenuto: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxxl },
  introduzione: { ...testi.piccolo, color: c.testoTenue, paddingBottom: spazi.xs },

  scheda: { gap: spazi.l },
  schedaInArrivo: { opacity: 0.6 },
  testa: { flexDirection: 'row', gap: spazi.m, alignItems: 'flex-start' },
  quadrato: {
    width: 44,
    height: 44,
    borderRadius: raggio.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quadratoSpento: { backgroundColor: c.bordoTenue },
  testi: { flex: 1, gap: 2 },
  nome: { ...testi.sottotitolo, color: c.testo },
  descrizione: { ...testi.piccolo, color: c.testoTenue },

  numeri: { flexDirection: 'row', alignItems: 'center' },
  numero: { flex: 1, gap: 2 },
  numeroValore: { fontSize: 24, fontWeight: '700', color: c.testo },
  numeroEtichetta: { fontSize: 11, color: c.testoTenue },
  divisore: { width: 1, height: 32, backgroundColor: c.bordo },

  utilizzi: { gap: spazi.xs },
  barra: {
    height: 4,
    borderRadius: raggio.tondo,
    backgroundColor: c.bordoTenue,
    overflow: 'hidden',
  },
  barraPiena: { height: 4, borderRadius: raggio.tondo },
  barraEsaurita: { backgroundColor: c.azione },
  residui: { fontSize: 11, color: c.testoTenue },
  residuiPochi: { color: c.accento, fontWeight: '600' },
}));