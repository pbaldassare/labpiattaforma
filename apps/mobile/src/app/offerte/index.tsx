import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Testo as Text } from '@/components/testo';
import {
  ETICHETTA_MODULO,
  formattaEuro,
  type Modulo,
  type StatoOfferta,
} from '@lab/shared';

import { Bottone } from '@/components/modulo';
import { fn, tab } from '@lab/shared';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi } from '@/lib/tema';

interface RigaOfferta {
  id: string;
  titolo: string;
  modulo: Modulo;
  stato: StatoOfferta;
  updated_at: string;
  prezzo_pubblico_cent: number | null;
  canone_minimo_cent: number | null;
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
          // Vista che unisce gia' offerta e scheda veicolo: PostgREST non sa
          // dedurre le relazioni fra viste, e all'elenco serve un prezzo solo.
          .from(tab('offerta_elenco'))
          .select('id, titolo, modulo, stato, updated_at, prezzo_pubblico_cent, canone_minimo_cent')
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
          // Vendita: il prezzo. Noleggio: il canone piu' basso, con "da".
          const prezzo = item.prezzo_pubblico_cent ?? item.canone_minimo_cent;
          const eCanone = item.prezzo_pubblico_cent == null && item.canone_minimo_cent != null;
          // Non Link asChild: sul web non porta lo stile dentro Pressable.
          return (
            <Pressable
              onPress={() => router.push(`/offerte/${item.id}`)}
              style={({ pressed }) => [stili.riga, pressed && stili.premuta]}
            >
                <View style={stili.rigaTesti}>
                  <Text style={stili.titolo} numberOfLines={1}>
                    {item.titolo}
                  </Text>
                  <Text style={[stili.stato, { color: COLORE_STATO[item.stato] }]}>
                    {ETICHETTA_MODULO[item.modulo]} · {ETICHETTA_STATO[item.stato]}
                  </Text>
                </View>
                {prezzo != null && (
                  <View style={stili.colonnaPrezzo}>
                    {eCanone && <Text style={stili.daQui}>da</Text>}
                    <Text style={stili.prezzo}>{formattaEuro(prezzo)}</Text>
                    {eCanone && <Text style={stili.alMese}>al mese</Text>}
                  </View>
                )}
            </Pressable>
          );
        }}
      />

      {/* Due bottoni invece di uno con menu: con due moduli attivi e' un tocco
          in meno, e si vede subito quali moduli esistono. */}
      <View style={stili.barra}>
        <Bottone testo="Nuova vendita" onPress={() => router.push('/offerte/nuova')} />
        <Bottone
          tenue
          testo="Nuovo noleggio lungo"
          onPress={() => router.push('/offerte/nuova-lungo')}
        />
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
  colonnaPrezzo: { alignItems: 'flex-end' },
  daQui: { fontSize: 11, color: colori.testoTenue },
  alMese: { fontSize: 11, color: colori.testoTenue },
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
    gap: spazi.s,
  },
});
