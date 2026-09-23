import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { TOCCO_MINIMO, colori, raggio, spazi } from '@/lib/tema';

type Modo = 'accesso' | 'registrazione';

export default function Accedi() {
  const [modo, setModo] = useState<Modo>('accesso');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);

  async function invia() {
    setErrore(null);
    setAvviso(null);

    if (!email.trim() || !password) {
      setErrore('Inserisci email e password.');
      return;
    }
    if (modo === 'registrazione' && password.length < 8) {
      setErrore('La password deve avere almeno 8 caratteri.');
      return;
    }

    setInCorso(true);
    try {
      if (modo === 'accesso') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrore(
            error.message === 'Invalid login credentials'
              ? 'Email o password non corretti.'
              : error.message
          );
        }
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) {
          setErrore(error.message);
        } else {
          setAvviso(
            'Ti abbiamo mandato una mail di conferma. Aprila per attivare l’account.'
          );
        }
      }
    } finally {
      setInCorso(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={stili.contenitore}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={stili.scorrimento} keyboardShouldPersistTaps="handled">
        <Text style={stili.titolo}>Lab Piattaforma</Text>
        <Text style={stili.sottotitolo}>
          {modo === 'accesso'
            ? 'Entra nel tuo spazio di lavoro.'
            : 'Crea il tuo account da venditore.'}
        </Text>

        <View style={stili.campo}>
          <Text style={stili.etichetta}>Email</Text>
          <TextInput
            style={stili.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            placeholder="nome@esempio.it"
            placeholderTextColor={colori.testoTenue}
          />
        </View>

        <View style={stili.campo}>
          <Text style={stili.etichetta}>Password</Text>
          <TextInput
            style={stili.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={modo === 'accesso' ? 'current-password' : 'new-password'}
            placeholder={modo === 'registrazione' ? 'Almeno 8 caratteri' : ''}
            placeholderTextColor={colori.testoTenue}
          />
        </View>

        {errore ? <Text style={stili.errore}>{errore}</Text> : null}
        {avviso ? <Text style={stili.avviso}>{avviso}</Text> : null}

        <Pressable
          style={({ pressed }) => [stili.bottone, pressed && stili.bottonePremuto]}
          onPress={invia}
          disabled={inCorso}
          accessibilityRole="button"
        >
          {inCorso ? (
            <ActivityIndicator color={colori.suPrimario} />
          ) : (
            <Text style={stili.bottoneTesto}>
              {modo === 'accesso' ? 'Accedi' : 'Crea account'}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={stili.cambioModo}
          onPress={() => {
            setModo(modo === 'accesso' ? 'registrazione' : 'accesso');
            setErrore(null);
            setAvviso(null);
          }}
          accessibilityRole="button"
        >
          <Text style={stili.cambioModoTesto}>
            {modo === 'accesso'
              ? 'Non hai un account? Registrati'
              : 'Hai gia’ un account? Accedi'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  scorrimento: { padding: spazi.xl, paddingTop: spazi.xxl * 2, gap: spazi.l },
  titolo: { fontSize: 28, fontWeight: '700', color: colori.testo },
  sottotitolo: { fontSize: 15, color: colori.testoTenue, marginBottom: spazi.l },
  campo: { gap: spazi.xs },
  etichetta: { fontSize: 13, fontWeight: '600', color: colori.testo },
  input: {
    minHeight: TOCCO_MINIMO,
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: raggio.m,
    paddingHorizontal: spazi.m,
    fontSize: 16,
    color: colori.testo,
  },
  errore: { color: colori.errore, fontSize: 14 },
  avviso: { color: colori.primario, fontSize: 14 },
  bottone: {
    minHeight: TOCCO_MINIMO,
    backgroundColor: colori.primario,
    borderRadius: raggio.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spazi.s,
  },
  bottonePremuto: { opacity: 0.85 },
  bottoneTesto: { color: colori.suPrimario, fontSize: 16, fontWeight: '600' },
  cambioModo: { minHeight: TOCCO_MINIMO, alignItems: 'center', justifyContent: 'center' },
  cambioModoTesto: { color: colori.primario, fontSize: 14, fontWeight: '600' },
});
