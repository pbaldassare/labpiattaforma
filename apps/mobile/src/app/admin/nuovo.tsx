import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { Campo, Bottone, Input } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { creaUtente } from '@/lib/admin';
import { spazi, stiliTema, testi } from '@/lib/tema';

/**
 * Un utente nuovo nasce gia' confermato: email e password le consegna l'admin,
 * non c'e' una mail da aspettare. Al primo accesso l'utente compila il profilo.
 */
export default function NuovoUtente() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function crea() {
    setErrore(null);
    if (!email.trim()) {
      setErrore('Serve l’email.');
      return;
    }
    if (password.length < 8) {
      setErrore('La password deve avere almeno 8 caratteri.');
      return;
    }

    setInCorso(true);
    try {
      await creaUtente(email.trim(), password);
      router.back();
    } catch (e) {
      setErrore((e as Error).message);
    }
    setInCorso(false);
  }

  return (
    <KeyboardAvoidingView
      style={stili.contenitore}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={stili.contenuto} keyboardShouldPersistTaps="handled">
        <Text style={stili.introduzione}>
          L’utente entra subito con queste credenziali. Mandagliele tu: il sistema non invia
          nessuna mail.
        </Text>

        <Campo etichetta="Email" obbligatorio>
          <Input
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            inputMode="email"
            placeholder="nome@azienda.it"
          />
        </Campo>

        <Campo etichetta="Password" obbligatorio aiuto="Almeno 8 caratteri." errore={errore}>
          <Input
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Campo>

        <Bottone testo="Crea utente" icona="spunta" onPress={() => void crea()} inCorso={inCorso} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    contenitore: { flex: 1, backgroundColor: c.sfondo },
    contenuto: { padding: spazi.l, gap: spazi.l },
    introduzione: { ...testi.piccolo, color: c.testoTenue },
  })
);
