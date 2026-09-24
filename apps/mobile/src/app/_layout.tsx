import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { colori } from '@/lib/tema';

export default function Layout() {
  const [sessione, setSessione] = useState<Session | null>(null);
  const [caricato, setCaricato] = useState(false);
  const segmenti = useSegments();
  const router = useRouter();

  // Plus Jakarta Sans: finche' non e' pronto si mostra il caricamento, invece
  // di far comparire tutto col carattere di sistema e poi saltare.
  const [fontPronti] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessione(data.session);
      setCaricato(true);
    });

    const { data: iscrizione } = supabase.auth.onAuthStateChange((_evento, nuova) => {
      setSessione(nuova);
    });

    return () => iscrizione.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!caricato) return;

    const suSchermataDiAccesso = segmenti[0] === 'accedi';

    if (!sessione && !suSchermataDiAccesso) {
      router.replace('/accedi');
    } else if (sessione && suSchermataDiAccesso) {
      router.replace('/');
    }
  }, [caricato, sessione, segmenti, router]);

  if (!caricato || !fontPronti) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colori.sfondo }}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colori.sfondo },
        headerTintColor: colori.testo,
        contentStyle: { backgroundColor: colori.sfondo },
      }}
    >
      <Stack.Screen name="accedi" options={{ title: 'Accedi', headerShown: false }} />
      <Stack.Screen name="index" options={{ title: 'Lab Piattaforma' }} />
      <Stack.Screen name="profilo" options={{ title: 'Il tuo profilo' }} />
      <Stack.Screen name="moduli" options={{ title: 'I tuoi moduli' }} />
      <Stack.Screen name="offerte/index" options={{ title: 'Le tue offerte' }} />
      <Stack.Screen name="offerte/nuova" options={{ title: 'Nuova offerta · Vendita' }} />
      <Stack.Screen name="offerte/nuova-lungo" options={{ title: 'Nuova offerta · Noleggio lungo' }} />
      <Stack.Screen
        name="offerte/nuova-assicurazione"
        options={{ title: 'Nuova polizza' }}
      />
      <Stack.Screen name="offerte/[id]" options={{ title: 'Offerta' }} />
      <Stack.Screen name="pratiche/index" options={{ title: 'Le tue pratiche' }} />
      <Stack.Screen name="pratiche/[id]" options={{ title: 'Pratica' }} />
      <Stack.Screen name="preventivo/[pratica]" options={{ title: 'Preventivo' }} />
    </Stack>
  );
}
