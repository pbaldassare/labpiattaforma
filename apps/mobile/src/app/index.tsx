import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { tab, urlVetrina, type Venditore } from '@lab/shared';

import { Bottone } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi } from '@/lib/tema';

const DOMINIO = process.env.EXPO_PUBLIC_DOMINIO_LANDING ?? 'https://dominio-da-decidere.it';

export default function Home() {
  const router = useRouter();
  const [venditore, setVenditore] = useState<Venditore | null>(null);
  const [caricato, setCaricato] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from(tab('venditore')).select('*').maybeSingle<Venditore>();
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
          <Text style={stili.url} numberOfLines={1}>
            {urlVetrina(DOMINIO, venditore.slug)}
          </Text>
          {venditore.presentazione ? (
            <Text style={stili.presentazione}>{venditore.presentazione}</Text>
          ) : null}
        </View>
      ) : (
        <View style={stili.scheda}>
          <Text style={stili.nome}>Benvenuto</Text>
          <Text style={stili.presentazione}>
            Compila il profilo e scegli l’indirizzo della tua vetrina: è da lì che i clienti ti
            troveranno.
          </Text>
        </View>
      )}

      {/* Link asChild non porta lo stile a Pressable sul web: meglio il bottone
          normale con una navigazione esplicita, come in tutte le altre schermate. */}
      <Bottone testo="Le tue pratiche" onPress={() => router.push('/pratiche')} />
      <Bottone tenue testo="Le tue offerte" onPress={() => router.push('/offerte')} />
      <Bottone
        tenue
        testo={venditore ? 'Modifica il profilo' : 'Compila il profilo'}
        onPress={() => router.push('/profilo')}
      />
      <Bottone tenue testo="Esci" onPress={() => void supabase.auth.signOut()} />
    </ScrollView>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  contenuto: { padding: spazi.xl, gap: spazi.m },
  scheda: {
    backgroundColor: colori.superficie,
    borderRadius: raggio.l,
    borderWidth: 1,
    borderColor: colori.bordoTenue,
    padding: spazi.l,
    gap: spazi.xs,
    marginBottom: spazi.s,
  },
  nome: { fontSize: 20, fontWeight: '700', color: colori.testo },
  url: { fontSize: 13, fontWeight: '600', color: colori.primario },
  presentazione: { fontSize: 14, color: colori.testoTenue, lineHeight: 20 },
});
