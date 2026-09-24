import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ETICHETTA_STATO_PRATICA,
  quandoBreve,
  tab,
  type StatoPratica,
  type TipoCliente,
} from '@lab/shared';

import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { TOCCO_MINIMO, colori, raggio, spazi } from '@/lib/tema';

interface RigaPratica {
  id: string;
  stato: StatoPratica;
  cliente_nome: string;
  cliente_tipo: TipoCliente;
  offerta_titolo: string | null;
  ultimo_messaggio: string | null;
  ultimo_contatto: string | null;
}

/** L'ordine in cui il venditore li guarda: prima chi aspetta una risposta. */
const ORDINE: StatoPratica[] = [
  'da_richiamare',
  'in_trattativa',
  'preventivo_inviato',
  'prenotato',
  'venduto',
  'chiuso',
];

export default function Pratiche() {
  const router = useRouter();
  const [righe, setRighe] = useState<RigaPratica[]>([]);
  const [filtro, setFiltro] = useState<StatoPratica | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const { data, error } = await supabase
          .from(tab('pratica_elenco'))
          .select(
            'id, stato, cliente_nome, cliente_tipo, offerta_titolo, ultimo_messaggio, ultimo_contatto'
          )
          .order('ultimo_contatto', { ascending: false, nullsFirst: false });

        if (!vivo) return;
        if (error) setErrore(error.message);
        else setRighe((data ?? []) as unknown as RigaPratica[]);
        setCaricamento(false);
      })();
      return () => {
        vivo = false;
      };
    }, [])
  );

  const visibili = filtro ? righe.filter((r) => r.stato === filtro) : righe;
  const conteggi = ORDINE.map((s) => ({ stato: s, quanti: righe.filter((r) => r.stato === s).length }));

  if (caricamento) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  return (
    <View style={stili.contenitore}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={stili.filtri}
      >
        <Filtro
          etichetta={`Tutte (${righe.length})`}
          attivo={filtro === null}
          onPress={() => setFiltro(null)}
        />
        {conteggi
          .filter((c) => c.quanti > 0)
          .map((c) => (
            <Filtro
              key={c.stato}
              etichetta={`${ETICHETTA_STATO_PRATICA[c.stato]} (${c.quanti})`}
              attivo={filtro === c.stato}
              onPress={() => setFiltro(filtro === c.stato ? null : c.stato)}
            />
          ))}
      </ScrollView>

      <FlatList
        data={visibili}
        keyExtractor={(r) => r.id}
        contentContainerStyle={stili.lista}
        ListHeaderComponent={errore ? <Text style={stili.errore}>{errore}</Text> : null}
        ListEmptyComponent={
          <View style={stili.vuoto}>
            <Text style={stili.vuotoTitolo}>Nessuna pratica</Text>
            <Text style={stili.vuotoTesto}>
              Quando un cliente compila il form su una tua pagina, lo trovi qui già pronto da
              richiamare.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/pratiche/${item.id}`)}
            style={({ pressed }) => [stili.riga, pressed && stili.premuta]}
          >
            <View style={stili.testa}>
              <Text style={stili.nome} numberOfLines={1}>
                {item.cliente_nome}
              </Text>
              {item.cliente_tipo === 'rivenditore' && (
                <Text style={stili.etichettaRivenditore}>rivenditore</Text>
              )}
              <Text style={stili.quando}>{quandoBreve(item.ultimo_contatto)}</Text>
            </View>

            {item.offerta_titolo && (
              <Text style={stili.offerta} numberOfLines={1}>
                {item.offerta_titolo}
              </Text>
            )}

            {item.ultimo_messaggio && (
              <Text style={stili.messaggio} numberOfLines={2}>
                {item.ultimo_messaggio}
              </Text>
            )}

            <Text style={[stili.stato, item.stato === 'da_richiamare' && stili.statoUrgente]}>
              {ETICHETTA_STATO_PRATICA[item.stato]}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function Filtro({
  etichetta,
  attivo,
  onPress,
}: {
  etichetta: string;
  attivo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[stili.filtro, attivo && stili.filtroAttivo]}
      accessibilityRole="button"
      accessibilityState={{ selected: attivo }}
    >
      <Text style={[stili.filtroTesto, attivo && stili.filtroTestoAttivo]}>{etichetta}</Text>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: colori.sfondo },
  filtri: { paddingHorizontal: spazi.l, paddingVertical: spazi.m, gap: spazi.s },
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
  lista: { paddingHorizontal: spazi.l, paddingBottom: spazi.xxl, gap: spazi.s },
  riga: {
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.bordoTenue,
    borderRadius: raggio.m,
    padding: spazi.l,
    gap: spazi.xs,
    minHeight: TOCCO_MINIMO,
  },
  premuta: { opacity: 0.8 },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazi.s },
  nome: { fontSize: 16, fontWeight: '700', color: colori.testo, flexShrink: 1 },
  etichettaRivenditore: {
    fontSize: 11,
    fontWeight: '600',
    color: colori.accento,
    textTransform: 'uppercase',
  },
  quando: { fontSize: 12, color: colori.testoTenue, marginLeft: 'auto' },
  offerta: { fontSize: 13, color: colori.primario, fontWeight: '600' },
  messaggio: { fontSize: 13, color: colori.testoTenue, lineHeight: 18 },
  stato: { fontSize: 12, fontWeight: '600', color: colori.testoTenue, marginTop: spazi.xs },
  statoUrgente: { color: colori.accento },
  vuoto: { padding: spazi.xl, gap: spazi.s, alignItems: 'center' },
  vuotoTitolo: { fontSize: 17, fontWeight: '700', color: colori.testo },
  vuotoTesto: { fontSize: 14, color: colori.testoTenue, textAlign: 'center', lineHeight: 20 },
  errore: { color: colori.errore, fontSize: 13, paddingBottom: spazi.s },
});
