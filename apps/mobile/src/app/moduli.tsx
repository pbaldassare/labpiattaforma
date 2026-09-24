import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import {
  ETICHETTA_MODULO,
  UTILIZZI_GRATUITI_PER_MODULO,
  fn,
  type Modulo,
} from '@lab/shared';

import { Pillola, Scheda } from '@/components/base';
import { Icona, type NomeIcona } from '@/components/icone';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, testi } from '@/lib/tema';

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
  noleggio_breve: 'Da un giorno a un mese, con calendario e prenotazione pagata.',
  noleggio_lungo: 'Da uno a cinque anni: il canone lo calcola la pagina.',
  assicurazioni: 'Polizze con garanzie, massimali e scadenze da ricordare.',
};

const ICONA: Record<Modulo, NomeIcona> = {
  vendita: 'auto',
  noleggio_breve: 'calendario',
  noleggio_lungo: 'cartellino',
  assicurazioni: 'documento',
};

/** Dove porta il tocco. I moduli non ancora costruiti non portano da nessuna parte. */
const PRONTO: Record<Modulo, boolean> = {
  vendita: true,
  noleggio_lungo: true,
  noleggio_breve: false,
  assicurazioni: false,
};

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
          onPress={
            PRONTO[m.modulo]
              ? () =>
                  router.push(
                    m.modulo === 'vendita' ? '/offerte/nuova' : '/offerte/nuova-lungo'
                  )
              : undefined
          }
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
        <View style={[stili.quadrato, inArrivo && stili.quadratoSpento]}>
          <Icona
            nome={ICONA[stato.modulo]}
            dimensione={22}
            colore={inArrivo ? colori.testoDebole : colori.suPrimario}
          />
        </View>
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

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: colori.sfondo },
  contenuto: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxxl },
  introduzione: { ...testi.piccolo, color: colori.testoTenue, paddingBottom: spazi.xs },

  scheda: { gap: spazi.l },
  schedaInArrivo: { opacity: 0.6 },
  testa: { flexDirection: 'row', gap: spazi.m, alignItems: 'flex-start' },
  quadrato: {
    width: 44,
    height: 44,
    borderRadius: raggio.m,
    backgroundColor: colori.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quadratoSpento: { backgroundColor: colori.bordoTenue },
  testi: { flex: 1, gap: 2 },
  nome: { ...testi.sottotitolo, color: colori.testo },
  descrizione: { ...testi.piccolo, color: colori.testoTenue },

  numeri: { flexDirection: 'row', alignItems: 'center' },
  numero: { flex: 1, gap: 2 },
  numeroValore: { fontSize: 24, fontWeight: '700', color: colori.testo },
  numeroEtichetta: { fontSize: 11, color: colori.testoTenue },
  divisore: { width: 1, height: 32, backgroundColor: colori.bordo },

  utilizzi: { gap: spazi.xs },
  barra: {
    height: 4,
    borderRadius: raggio.tondo,
    backgroundColor: colori.bordoTenue,
    overflow: 'hidden',
  },
  barraPiena: { height: 4, borderRadius: raggio.tondo, backgroundColor: colori.primario },
  barraEsaurita: { backgroundColor: colori.azione },
  residui: { fontSize: 11, color: colori.testoTenue },
  residuiPochi: { color: colori.accento, fontWeight: '600' },
});
