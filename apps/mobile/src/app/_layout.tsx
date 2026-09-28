import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { Icona } from '@/components/icone';
import { FornitoreTema, useTema } from '@/lib/contesto-tema';
import { supabase } from '@/lib/supabase';
import { colori, raggio } from '@/lib/tema';

/**
 * Il tasto per tornare alla home da qualunque punto.
 *
 * Usa `navigate` e non `push`: se la home e' gia' nella pila ci torna sopra
 * invece di impilarne una seconda, altrimenti dopo dieci tocchi il tasto
 * indietro dovrebbe attraversare dieci home.
 */
function TastoCasa() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.navigate('/')}
      accessibilityRole="button"
      accessibilityLabel="Torna alla home"
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: 36,
          height: 36,
          borderRadius: raggio.tondo,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colori.bordoTenue,
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Icona nome="casa" dimensione={18} colore={colori.primarioChiaro} />
    </Pressable>
  );
}

function Pile() {
  const [sessione, setSessione] = useState<Session | null>(null);
  const [caricato, setCaricato] = useState(false);
  const segmenti = useSegments();
  const router = useRouter();
  const { colori, schema, chiave } = useTema();

  /*
   * Il tema della navigazione.
   *
   * La barra in alto e il fondo sotto le schermate li disegna il navigatore
   * con i propri colori, non con i nostri: senza questo, col tema scuro
   * restava una striscia chiara in cima e un lampo bianco fra una schermata e
   * l'altra. Expo Router porta con se' i due temi di partenza, e qui si
   * sovrascrivono i colori che si vedono davvero.
   */
  const temaNavigazione = useMemo(() => {
    const base = schema === 'scuro' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: schema === 'scuro',
      colors: {
        ...base.colors,
        primary: colori.primario,
        background: colori.sfondo,
        card: colori.sfondo,
        text: colori.testo,
        border: colori.bordo,
        notification: colori.azione,
      },
    };
  }, [schema, colori]);

  // Plus Jakarta Sans: finche' non e' pronto si mostra il caricamento, invece
  // di far comparire tutto col carattere di sistema e poi saltare.
  const [fontPronti] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    // Space Grotesk: la voce dell'app, su titoli e numeri.
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
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
    <ThemeProvider value={temaNavigazione}>
      <StatusBar style={schema === 'chiaro' ? 'dark' : 'light'} />
      <Stack
      /* La chiave cambia col tema e rimonta l'albero: gli stili di ogni
         schermata si ricostruiscono sulla palette nuova, che altrimenti
         resterebbe quella letta al primo disegno. */
      key={chiave}
      // Il tasto casa sta nell'intestazione, su ogni schermata tranne la home
      // stessa: e' l'unico posto sempre visibile che non copre niente e non
      // litiga con le barre in fondo (i form, l'elenco offerte) ne' con la
      // tastiera aperta.
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colori.sfondo },
        headerTintColor: colori.testo,
        contentStyle: { backgroundColor: colori.sfondo },
        headerRight:
          route.name === 'index' || route.name === 'accedi' ? undefined : () => <TastoCasa />,
      })}
    >
      <Stack.Screen name="accedi" options={{ title: 'Accedi', headerShown: false }} />
      <Stack.Screen name="index" options={{ title: 'Lab Piattaforma' }} />
      <Stack.Screen name="profilo" options={{ title: 'Il tuo profilo' }} />
      <Stack.Screen name="moduli" options={{ title: 'I tuoi moduli' }} />
      <Stack.Screen name="numeri" options={{ title: 'I tuoi numeri' }} />
      <Stack.Screen name="blocco" options={{ title: 'Attiva il modulo' }} />
      <Stack.Screen name="clienti" options={{ title: 'I tuoi clienti' }} />
      <Stack.Screen name="offerte/index" options={{ title: 'Le tue offerte' }} />
      <Stack.Screen name="offerte/nuova" options={{ title: 'Nuova offerta · Vendita' }} />
      <Stack.Screen name="offerte/nuova-lungo" options={{ title: 'Nuova offerta · Noleggio lungo' }} />
      <Stack.Screen name="offerte/nuova-breve" options={{ title: 'Nuova offerta · Noleggio breve' }} />
      <Stack.Screen
        name="offerte/nuova-assicurazione"
        options={{ title: 'Nuova polizza' }}
      />
      <Stack.Screen name="offerte/[id]" options={{ title: 'Offerta' }} />
      <Stack.Screen name="pratiche/index" options={{ title: 'Le tue pratiche' }} />
      <Stack.Screen name="pratiche/[id]" options={{ title: 'Pratica' }} />
      <Stack.Screen name="preventivo/[pratica]" options={{ title: 'Preventivo' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function Layout() {
  return (
    <FornitoreTema>
      <Pile />
    </FornitoreTema>
  );
}
