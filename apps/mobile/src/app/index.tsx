import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { urlVetrina, type Venditore } from '@lab/shared';

import { supabase } from '@/lib/supabase';
import { TOCCO_MINIMO, colori, raggio, spazi } from '@/lib/tema';

const DOMINIO = process.env.EXPO_PUBLIC_DOMINIO_LANDING ?? 'https://dominio-da-decidere.it';

export default function Home() {
  const [venditore, setVenditore] = useState<Venditore | null>(null);
  const [caricato, setCaricato] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('venditore').select('*').maybeSingle<Venditore>();
      setVenditore(data ?? null);
      setCaricato(true);
    })();
  }, []);

  if (!caricato) return <View style={stili.contenitore} />;

  return (
    <ScrollView style={stili.contenitore} contentContainerStyle={stili.contenuto}>
      {venditore ? (
        <View style={stili.scheda}>
          <Text style={stili.nome}>{venditore.nome_visualizzato}</Text>
          <Text style={stili.url}>{urlVetrina(DOMINIO, venditore.slug)}</Text>
          {venditore.presentazione ? (
            <Text style={stili.presentazione}>{venditore.presentazione}</Text>
          ) : null}
        </View>
      ) : (
        <View style={stili.scheda}>
          <Text style={stili.nome}>Benvenuto</Text>
          <Text style={stili.presentazione}>
            Compila il profilo e scegli l’indirizzo della tua vetrina: è da lì che i clienti
            ti troveranno.
          </Text>
        </View>
      )}

      <Link href="/profilo" asChild>
        <Pressable style={({ pressed }) => [stili.bottone, pressed && stili.premuto]}>
          <Text style={stili.bottoneTesto}>
            {venditore ? 'Modifica il profilo' : 'Compila il profilo'}
          </Text>
        </Pressable>
      </Link>

      <Pressable
        style={({ pressed }) => [stili.bottoneTenue, pressed && stili.premuto]}
        onPress={() => void supabase.auth.signOut()}
        accessibilityRole="button"
      >
        <Text style={stili.bottoneTenueTesto}>Esci</Text>
      </Pressable>
    </ScrollView>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  contenuto: { padding: spazi.xl, gap: spazi.l },
  scheda: {
    backgroundColor: colori.superficie,
    borderRadius: raggio.l,
    borderWidth: 1,
    borderColor: colori.bordoTenue,
    padding: spazi.l,
    gap: spazi.xs,
  },
  nome: { fontSize: 20, fontWeight: '700', color: colori.testo },
  url: { fontSize: 13, fontWeight: '600', color: colori.primario },
  presentazione: { fontSize: 14, color: colori.testoTenue, lineHeight: 20 },
  bottone: {
    minHeight: TOCCO_MINIMO,
    backgroundColor: colori.primario,
    borderRadius: raggio.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneTesto: { color: colori.suPrimario, fontSize: 16, fontWeight: '600' },
  bottoneTenue: {
    minHeight: TOCCO_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottoneTenueTesto: { color: colori.testoTenue, fontSize: 14, fontWeight: '600' },
  premuto: { opacity: 0.85 },
});
