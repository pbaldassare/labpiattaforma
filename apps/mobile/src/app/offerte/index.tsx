import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Testo as Text } from '@/components/testo';
import { formattaEuro, type StatoOfferta } from '@lab/shared';

import { Bottone } from '@/components/modulo';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi } from '@/lib/tema';

interface RigaOfferta {
  id: string;
  titolo: string;
  stato: StatoOfferta;
  updated_at: string;
  vendita: { prezzo_pubblico_cent: number } | { prezzo_pubblico_cent: number }[] | null;
}

const ETICHETTA_STATO: Record<StatoOfferta, string> = {
  bozza: 'Bozza',
  attiva: 'Pubblicata',
  sospesa: 'Sospesa',
  venduta: 'Venduta',
};

const COLORE_STATO: Record<StatoOfferta, string> = {
  bozza: colori.testoTenue,
  attiva: colori.primario,
  sospesa: colori.accento,
  venduta: colori.testoTenue,
};

/** L'incorporamento puo' tornare oggetto o lista a seconda della relazione. */
function prezzoDi(riga: RigaOfferta): number | null {
  const v = Array.isArray(riga.vendita) ? riga.vendita[0] : riga.vendita;
  return v?.prezzo_pubblico_cent ?? null;
}

export default function Offerte() {
  const router = useRouter();
  const [righe, setRighe] = useState<RigaOfferta[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  // Al ritorno dal form l'elenco deve essere gia' aggiornato, non un istante dopo.
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const { data, error } = await supabase
          .from('offerta')
          .select('id, titolo, stato, updated_at, vendita:offerta_vendita(prezzo_pubblico_cent)')
          .eq('modulo', 'vendita')
          .order('updated_at', { ascending: false });

        if (!vivo) return;
        if (error) setErrore(error.message);
        else setRighe((data ?? []) as unknown as RigaOfferta[]);
        setCaricamento(false);
      })();
      return () => {
        vivo = false;
      };
    }, [])
  );

  if (caricamento) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  return (
    <View style={stili.contenitore}>
      <FlatList
        data={righe}
        keyExtractor={(r) => r.id}
        contentContainerStyle={stili.lista}
        ListEmptyComponent={
          <View style={stili.vuoto}>
            <Text style={stili.vuotoTitolo}>Nessuna offerta</Text>
            <Text style={stili.vuotoTesto}>
              Carica il primo mezzo: dalla scheda esce la pagina da mandare al cliente.
            </Text>
          </View>
        }
        ListHeaderComponent={
          errore ? <Text style={stili.errore}>{errore}</Text> : null
        }
        renderItem={({ item }) => {
          const prezzo = prezzoDi(item);
          return (
            <Link href={`/offerte/${item.id}`} asChild>
              <Pressable style={({ pressed }) => [stili.riga, pressed && stili.premuta]}>
                <View style={stili.rigaTesti}>
                  <Text style={stili.titolo} numberOfLines={1}>
                    {item.titolo}
                  </Text>
                  <Text style={[stili.stato, { color: COLORE_STATO[item.stato] }]}>
                    {ETICHETTA_STATO[item.stato]}
                  </Text>
                </View>
                {prezzo != null && <Text style={stili.prezzo}>{formattaEuro(prezzo)}</Text>}
              </Pressable>
            </Link>
          );
        }}
      />

      <View style={stili.barra}>
        <Bottone testo="Nuova offerta" onPress={() => router.push('/offerte/nuova')} />
      </View>
    </View>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: colori.sfondo },
  lista: { padding: spazi.l, gap: spazi.s, paddingBottom: spazi.xxl * 3 },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazi.m,
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.bordoTenue,
    borderRadius: raggio.m,
    padding: spazi.l,
  },
  premuta: { opacity: 0.8 },
  rigaTesti: { flex: 1, gap: 2 },
  titolo: { fontSize: 16, fontWeight: '600', color: colori.testo },
  stato: { fontSize: 12, fontWeight: '600' },
  prezzo: { fontSize: 16, fontWeight: '700', color: colori.testo },
  vuoto: { padding: spazi.xl, gap: spazi.s, alignItems: 'center' },
  vuotoTitolo: { fontSize: 17, fontWeight: '700', color: colori.testo },
  vuotoTesto: { fontSize: 14, color: colori.testoTenue, textAlign: 'center', lineHeight: 20 },
  errore: { color: colori.errore, fontSize: 13, paddingBottom: spazi.s },
  barra: {
    position: 'absolute',
    left: spazi.l,
    right: spazi.l,
    bottom: spazi.xl,
  },
});
