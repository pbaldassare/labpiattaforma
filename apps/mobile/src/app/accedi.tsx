import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Testo as Text } from '@/components/testo';

import { Icona } from '@/components/icone';
import { supabase } from '@/lib/supabase';
import { TOCCO_MINIMO, caratteri, colori, raggio, spazi } from '@/lib/tema';

type Modo = 'accesso' | 'registrazione' | 'recupero';

/**
 * Dove porta il link della mail di recupero.
 *
 * Sta sul sito e non nell'app perche' una mail si apre dove capita, spesso sul
 * computer: una pagina web si apre sempre, un collegamento all'app no.
 */
const DOMINIO = process.env.EXPO_PUBLIC_DOMINIO_LANDING ?? 'https://dominio-da-decidere.it';

/**
 * Gli errori di Supabase in italiano.
 *
 * "over_email_send_rate_limit" e' il limite di invio del servizio di posta
 * compreso, che e' basso apposta: finche' non c'e' un mittente nostro, le mail
 * di conferma e di recupero smettono di partire dopo poche. Dirlo cosi' invece
 * di mostrare il messaggio tecnico, che al venditore non dice niente.
 */
function inItaliano(messaggio: string): string {
  if (messaggio === 'Invalid login credentials') return 'Email o password non corretti.';
  if (messaggio.includes('rate limit')) {
    return 'Il servizio di posta ha raggiunto il limite di invii. Riprova fra un’ora.';
  }
  if (messaggio.includes('User already registered')) {
    return 'Esiste già un account con questa email. Prova ad accedere.';
  }
  if (messaggio.includes('Email not confirmed')) {
    return 'Devi prima aprire la mail di conferma che ti abbiamo mandato.';
  }
  return messaggio;
}

const TITOLI: Record<Modo, { sottotitolo: string; azione: string }> = {
  accesso: { sottotitolo: 'Entra nel tuo spazio di lavoro.', azione: 'Accedi' },
  registrazione: {
    sottotitolo: 'Crea il tuo account da venditore.',
    azione: 'Crea account',
  },
  recupero: {
    sottotitolo: 'Scrivi la tua email: ti mandiamo il link per rifare la password.',
    azione: 'Mandami il link',
  },
};

export default function Accedi() {
  const [modo, setModo] = useState<Modo>('accesso');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostraPassword, setMostraPassword] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);

  function cambia(nuovo: Modo) {
    setModo(nuovo);
    setErrore(null);
    setAvviso(null);
  }

  async function invia() {
    setErrore(null);
    setAvviso(null);

    if (!email.trim()) {
      setErrore('Inserisci la tua email.');
      return;
    }
    if (modo !== 'recupero' && !password) {
      setErrore('Inserisci la password.');
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
        if (error) setErrore(inItaliano(error.message));
      } else if (modo === 'registrazione') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) {
          setErrore(inItaliano(error.message));
        } else {
          setAvviso('Ti abbiamo mandato una mail di conferma. Aprila per attivare l’account.');
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${DOMINIO.replace(/\/$/, '')}/reimposta`,
        });
        // Anche se l'indirizzo non esiste si risponde allo stesso modo: dire
        // "questa email non e' registrata" significa far sapere a chiunque
        // quali venditori hanno un account.
        if (error) {
          setErrore(inItaliano(error.message));
        } else {
          setAvviso(
            'Se quell’indirizzo ha un account, fra poco arriva la mail con il link per rifare la password.'
          );
        }
      }
    } finally {
      setInCorso(false);
    }
  }

  const testi = TITOLI[modo];

  return (
    <KeyboardAvoidingView
      style={stili.contenitore}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={stili.scorrimento} keyboardShouldPersistTaps="handled">
        <Text style={stili.titolo}>Lab Piattaforma</Text>
        <Text style={stili.sottotitolo}>{testi.sottotitolo}</Text>

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

        {modo !== 'recupero' && (
          <View style={stili.campo}>
            <View style={stili.rigaEtichetta}>
              <Text style={stili.etichetta}>Password</Text>
              {modo === 'accesso' && (
                <Pressable
                  onPress={() => cambia('recupero')}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text style={stili.dimenticata}>Password dimenticata?</Text>
                </Pressable>
              )}
            </View>

            {/* L'occhio dentro al campo: su un telefono la password si sbaglia
                a scrivere di continuo, e senza poterla rileggere si finisce a
                cancellare tutto e ricominciare. */}
            <View style={stili.conTasto}>
              <TextInput
                style={[stili.input, stili.inputConTasto]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!mostraPassword}
                autoCapitalize="none"
                autoComplete={modo === 'accesso' ? 'current-password' : 'new-password'}
                placeholder={modo === 'registrazione' ? 'Almeno 8 caratteri' : ''}
                placeholderTextColor={colori.testoTenue}
                onSubmitEditing={() => void invia()}
              />
              <Pressable
                onPress={() => setMostraPassword(!mostraPassword)}
                style={stili.occhio}
                accessibilityRole="button"
                accessibilityLabel={
                  mostraPassword ? 'Nascondi la password' : 'Mostra la password'
                }
                hitSlop={8}
              >
                <Icona
                  nome={mostraPassword ? 'occhioChiuso' : 'occhio'}
                  dimensione={20}
                  colore={colori.testoTenue}
                />
              </Pressable>
            </View>
          </View>
        )}

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
            <Text style={stili.bottoneTesto}>{testi.azione}</Text>
          )}
        </Pressable>

        <Pressable
          style={stili.cambioModo}
          onPress={() => cambia(modo === 'accesso' ? 'registrazione' : 'accesso')}
          accessibilityRole="button"
        >
          <Text style={stili.cambioModoTesto}>
            {modo === 'accesso'
              ? 'Non hai un account? Registrati'
              : modo === 'registrazione'
                ? 'Hai già un account? Accedi'
                : 'Torna all’accesso'}
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
  rigaEtichetta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  etichetta: { fontSize: 13, fontWeight: '600', color: colori.testo },
  dimenticata: { fontSize: 13, fontWeight: '600', color: colori.primario },
  input: {
    fontFamily: caratteri.normale,
    minHeight: TOCCO_MINIMO,
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: raggio.m,
    paddingHorizontal: spazi.m,
    fontSize: 16,
    color: colori.testo,
  },
  conTasto: { justifyContent: 'center' },
  // Spazio a destra per non scrivere sotto l'occhio.
  inputConTasto: { paddingRight: TOCCO_MINIMO + spazi.s },
  occhio: {
    position: 'absolute',
    right: 0,
    height: '100%',
    width: TOCCO_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errore: { color: colori.errore, fontSize: 14 },
  avviso: { color: colori.primario, fontSize: 14, lineHeight: 20 },
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
