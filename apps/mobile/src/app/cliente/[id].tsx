import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { tab, type TipoCliente } from '@lab/shared';

import { Bottone, Campo, Input, Scelta } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, spazi, stiliTema, testi } from '@/lib/tema';

const ERRORI: Record<string, string> = {
  cliente_almeno_un_recapito: 'Serve almeno un recapito: telefono o email.',
  cliente_nome_non_vuoto: 'Serve il nome.',
};

/**
 * La scheda di un cliente da correggere o completare: chi cambia numero, chi
 * la mail la da' solo dopo, chi si scopre rivenditore alla seconda telefonata.
 */
export default function ModificaCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [caricato, setCaricato] = useState(false);
  const [nome, setNome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [tipo, setTipo] = useState<TipoCliente>('privato');
  const [note, setNote] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data, error } = await supabase
        .from(tab('cliente'))
        .select('nome, telefono, email, tipo, note')
        .eq('id', id)
        .maybeSingle();
      if (!vivo) return;
      if (error) setErrore(error.message);
      if (data) {
        setNome(data.nome ?? '');
        setTelefono(data.telefono ?? '');
        setEmail(data.email ?? '');
        setTipo((data.tipo as TipoCliente) ?? 'privato');
        setNote(data.note ?? '');
      }
      setCaricato(true);
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  async function salva() {
    setErrore(null);
    if (!nome.trim()) {
      setErrore(ERRORI.cliente_nome_non_vuoto!);
      return;
    }
    if (!telefono.trim() && !email.trim()) {
      setErrore(ERRORI.cliente_almeno_un_recapito!);
      return;
    }

    setInCorso(true);
    const { error } = await supabase
      .from(tab('cliente'))
      .update({
        nome: nome.trim(),
        telefono: telefono.trim() || null,
        email: email.trim().toLowerCase() || null,
        tipo,
        note: note.trim() || null,
      })
      .eq('id', id);
    setInCorso(false);

    if (error) {
      const chiave = Object.keys(ERRORI).find((k) => error.message.includes(k));
      setErrore(chiave ? ERRORI[chiave]! : error.message);
      return;
    }
    router.back();
  }

  if (!caricato) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={stili.contenitore}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: nome || 'Cliente' }} />
      <ScrollView contentContainerStyle={stili.contenuto} keyboardShouldPersistTaps="handled">
        <Campo etichetta="Nome e cognome" obbligatorio>
          <Input value={nome} onChangeText={setNome} autoComplete="name" />
        </Campo>

        <Campo etichetta="Telefono" aiuto="Basta uno fra telefono ed email.">
          <Input
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            inputMode="tel"
            placeholder="333 1234567"
          />
        </Campo>

        <Campo etichetta="Email">
          <Input
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="nome@esempio.it"
          />
        </Campo>

        <Campo
          etichetta="Tipo di cliente"
          aiuto="Ai rivenditori vanno i prezzi riservati agli operatori."
        >
          <Scelta
            valore={tipo}
            consentiVuoto={false}
            onCambia={(v) => v && setTipo(v)}
            opzioni={[
              { valore: 'privato', etichetta: 'Privato' },
              { valore: 'rivenditore', etichetta: 'Rivenditore' },
            ]}
          />
        </Campo>

        <Campo etichetta="Note">
          <Input
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Cerca una station wagon, chiamare dopo le 18"
            style={stili.note}
          />
        </Campo>

        {errore && <Text style={stili.errore}>{errore}</Text>}

        <Bottone testo="Salva le modifiche" icona="spunta" inCorso={inCorso} onPress={() => void salva()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    contenitore: { flex: 1, backgroundColor: c.sfondo },
    centrato: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
    contenuto: { padding: spazi.l, gap: spazi.l, paddingBottom: spazi.xxxl },
    note: { minHeight: 90, textAlignVertical: 'top', paddingTop: spazi.m },
    errore: { ...testi.piccolo, color: c.errore },
  })
);
