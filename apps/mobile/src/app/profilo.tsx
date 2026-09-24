import { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  ERRORI_SLUG,
  normalizzaSlug,
  proponiSlug,
  urlVetrina,
  validaSlug,
  type Venditore,
} from '@lab/shared';

import { fn, tab } from '@lab/shared';
import { supabase } from '@/lib/supabase';
import { TOCCO_MINIMO, caratteri, colori, raggio, spazi } from '@/lib/tema';

const DOMINIO = process.env.EXPO_PUBLIC_DOMINIO_LANDING ?? 'https://dominio-da-decidere.it';

type StatoSlug =
  | { tipo: 'vuoto' }
  | { tipo: 'controllo' }
  | { tipo: 'libero' }
  | { tipo: 'occupato'; motivo: string };

export default function Profilo() {
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [esisteGia, setEsisteGia] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);

  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [slugToccato, setSlugToccato] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [presentazione, setPresentazione] = useState('');
  const [statoSlug, setStatoSlug] = useState<StatoSlug>({ tipo: 'vuoto' });

  const attesa = useRef<ReturnType<typeof setTimeout> | null>(null);

  const verificaSlug = useCallback((valore: string) => {
    const pulito = normalizzaSlug(valore);
    setSlug(pulito);

    if (attesa.current) clearTimeout(attesa.current);

    if (pulito.length === 0) {
      setStatoSlug({ tipo: 'vuoto' });
      return;
    }

    const forma = validaSlug(pulito);
    if (!forma.valido) {
      setStatoSlug({ tipo: 'occupato', motivo: forma.motivo });
      return;
    }

    setStatoSlug({ tipo: 'controllo' });
    // Se sia libero lo sa solo il database: le policy impediscono (giustamente)
    // di leggere i profili altrui, quindi si chiede a lui.
    attesa.current = setTimeout(async () => {
      const { data, error } = await supabase.rpc(fn('slug_disponibile'), { p_slug: pulito });
      if (error) {
        setStatoSlug({ tipo: 'occupato', motivo: 'Non riesco a verificarlo adesso.' });
      } else if (data === true) {
        setStatoSlug({ tipo: 'libero' });
      } else {
        setStatoSlug({ tipo: 'occupato', motivo: ERRORI_SLUG.slug_occupato! });
      }
    }, 400);
  }, []);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from(tab('venditore'))
        .select('*')
        .maybeSingle<Venditore>();

      if (error) setErrore(error.message);
      if (data) {
        setEsisteGia(true);
        setNome(data.nome_visualizzato);
        setSlug(data.slug);
        setSlugToccato(true);
        setTelefono(data.telefono ?? '');
        setWhatsapp(data.whatsapp ?? '');
        setPresentazione(data.presentazione ?? '');
      }
      setCaricamento(false);
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (attesa.current) clearTimeout(attesa.current);
    };
  }, []);

  /** Finché non lo tocca, lo slug segue il nome: un campo in meno da compilare. */
  function cambiaNome(valore: string) {
    setNome(valore);
    if (!slugToccato) verificaSlug(proponiSlug(valore));
  }

  async function salva() {
    setErrore(null);
    setSalvato(false);

    if (!nome.trim()) {
      setErrore('Serve il nome che vedranno i tuoi clienti.');
      return;
    }
    const forma = validaSlug(slug);
    if (!forma.valido) {
      setErrore(forma.motivo);
      return;
    }

    setSalvataggio(true);
    const valori = {
      nome_visualizzato: nome.trim(),
      slug: normalizzaSlug(slug),
      telefono: telefono.trim() || null,
      whatsapp: whatsapp.trim() || null,
      presentazione: presentazione.trim() || null,
    };

    // user_id lo mette il database con auth.uid(): il client non lo manda mai,
    // così non può sbagliarlo né falsificarlo.
    const { error } = esisteGia
      ? await supabase.from(tab('venditore')).update(valori).select().single()
      : await supabase.from(tab('venditore')).insert(valori).select().single();

    setSalvataggio(false);

    if (error) {
      setErrore(ERRORI_SLUG[error.message] ?? error.message);
      return;
    }
    setEsisteGia(true);
    setSalvato(true);
  }

  if (caricamento) {
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
      <ScrollView contentContainerStyle={stili.scorrimento} keyboardShouldPersistTaps="handled">
        <View style={stili.campo}>
          <Text style={stili.etichetta}>Nome che vedono i clienti</Text>
          <TextInput
            style={stili.input}
            value={nome}
            onChangeText={cambiaNome}
            placeholder="Autosalone Rossi"
            placeholderTextColor={colori.testoTenue}
          />
        </View>

        <View style={stili.campo}>
          <Text style={stili.etichetta}>Indirizzo della tua vetrina</Text>
          <TextInput
            style={stili.input}
            value={slug}
            onChangeText={(v) => {
              setSlugToccato(true);
              verificaSlug(v);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="autosalone-rossi"
            placeholderTextColor={colori.testoTenue}
          />
          <Text style={stili.anteprimaUrl}>{urlVetrina(DOMINIO, slug || '…')}</Text>
          <EsitoSlug stato={statoSlug} />
          <Text style={stili.aiuto}>
            È l’indirizzo che finisce sui QR e sui biglietti da visita. Puoi cambiarlo quando
            vuoi: il vecchio continuerà a funzionare.
          </Text>
        </View>

        <View style={stili.campo}>
          <Text style={stili.etichetta}>Telefono</Text>
          <TextInput
            style={stili.input}
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            inputMode="tel"
          />
        </View>

        <View style={stili.campo}>
          <Text style={stili.etichetta}>WhatsApp</Text>
          <TextInput
            style={stili.input}
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
            inputMode="tel"
          />
        </View>

        <View style={stili.campo}>
          <Text style={stili.etichetta}>Una riga di presentazione</Text>
          <TextInput
            style={[stili.input, stili.inputAlto]}
            value={presentazione}
            onChangeText={setPresentazione}
            multiline
            placeholder="Auto usate garantite, dal 1998 a Verona."
            placeholderTextColor={colori.testoTenue}
          />
        </View>

        {errore ? <Text style={stili.errore}>{errore}</Text> : null}
        {salvato ? <Text style={stili.avviso}>Profilo salvato.</Text> : null}

        <Pressable
          style={({ pressed }) => [stili.bottone, pressed && stili.bottonePremuto]}
          onPress={salva}
          disabled={salvataggio || statoSlug.tipo === 'controllo'}
          accessibilityRole="button"
        >
          {salvataggio ? (
            <ActivityIndicator color={colori.suPrimario} />
          ) : (
            <Text style={stili.bottoneTesto}>Salva</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EsitoSlug({ stato }: { stato: StatoSlug }) {
  if (stato.tipo === 'vuoto') return null;
  if (stato.tipo === 'controllo') {
    return <Text style={stili.aiuto}>Controllo se è libero…</Text>;
  }
  if (stato.tipo === 'libero') {
    return <Text style={stili.avviso}>Libero, è tuo.</Text>;
  }
  return <Text style={stili.errore}>{stato.motivo}</Text>;
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: colori.sfondo },
  scorrimento: { padding: spazi.xl, gap: spazi.l, paddingBottom: spazi.xxl * 2 },
  campo: { gap: spazi.xs },
  etichetta: { fontSize: 13, fontWeight: '600', color: colori.testo },
  input: {
    fontFamily: caratteri.normale,
    minHeight: TOCCO_MINIMO,
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: raggio.m,
    paddingHorizontal: spazi.m,
    paddingVertical: spazi.s,
    fontSize: 16,
    color: colori.testo,
  },
  inputAlto: { minHeight: TOCCO_MINIMO * 2, textAlignVertical: 'top' },
  anteprimaUrl: { fontSize: 13, color: colori.primarioChiaro, fontWeight: '600' },
  aiuto: { fontSize: 12, color: colori.testoTenue, lineHeight: 17 },
  errore: { color: colori.errore, fontSize: 13 },
  avviso: { color: colori.primarioChiaro, fontSize: 13, fontWeight: '600' },
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
});
