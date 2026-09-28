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
import { useTema, type Preferenza } from '@/lib/contesto-tema';
import { Icona, type NomeIcona } from '@/components/icone';
import { supabase } from '@/lib/supabase';
import {
  caratteri,
  colori,
  raggio,
  spazi,
  stiliTema,
  testi,
  TOCCO_MINIMO,
} from '@/lib/tema';

const DOMINIO = process.env.EXPO_PUBLIC_DOMINIO_LANDING ?? 'https://dominio-da-decidere.it';

type StatoSlug =
  | { tipo: 'vuoto' }
  | { tipo: 'controllo' }
  | { tipo: 'libero' }
  | { tipo: 'occupato'; motivo: string };

export default function Profilo() {
  const { preferenza, scegli } = useTema();
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

        {/* Il tema sta nel profilo perche' e' una preferenza di chi usa l'app,
            non un'impostazione di un'offerta. "Come il telefono" e' la scelta
            predefinita: chi lo tiene scuro di sera se lo aspetta anche qui. */}
        <View style={stili.tema}>
          <Text style={stili.etichettaTema}>Aspetto</Text>
          <View style={stili.scelteTema}>
            {SCELTE_TEMA.map((t) => {
              const attiva = preferenza === t.valore;
              return (
                <Pressable
                  key={t.valore}
                  onPress={() => scegli(t.valore)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: attiva }}
                  style={({ pressed }) => [
                    stili.sceltaTema,
                    attiva && stili.sceltaTemaAttiva,
                    pressed && stili.bottonePremuto,
                  ]}
                >
                  <Icona
                    nome={t.icona}
                    dimensione={18}
                    colore={attiva ? colori.suPrimario : colori.testoTenue}
                  />
                  <Text style={[stili.sceltaTemaTesto, attiva && stili.sceltaTemaTestoAttivo]}>
                    {t.etichetta}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
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

/** Le tre scelte dell'aspetto, con l'icona che le fa riconoscere da sole. */
const SCELTE_TEMA: { valore: Preferenza; etichetta: string; icona: NomeIcona }[] = [
  { valore: 'sistema', etichetta: 'Come il telefono', icona: 'impostazioni' },
  { valore: 'chiaro', etichetta: 'Chiaro', icona: 'sole' },
  { valore: 'scuro', etichetta: 'Scuro', icona: 'luna' },
];

const stili = stiliTema((c) => StyleSheet.create({
  tema: { gap: spazi.s, paddingTop: spazi.xxl },
  etichettaTema: { ...testi.etichetta, color: c.testoDebole },
  scelteTema: { flexDirection: 'row', gap: spazi.s },
  sceltaTema: {
    flex: 1,
    minHeight: TOCCO_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spazi.s,
    borderRadius: raggio.m,
    borderWidth: 1,
    borderColor: c.bordo,
    backgroundColor: c.superficie,
  },
  sceltaTemaAttiva: { backgroundColor: c.primario, borderColor: c.primario },
  sceltaTemaTesto: { fontSize: 12, fontWeight: '600', color: c.testoTenue, textAlign: 'center' },
  sceltaTemaTestoAttivo: { color: c.suPrimario },
  contenitore: { flex: 1, backgroundColor: c.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
  scorrimento: { padding: spazi.xl, gap: spazi.l, paddingBottom: spazi.xxl * 2 },
  campo: { gap: spazi.xs },
  etichetta: { fontSize: 13, fontWeight: '600', color: c.testo },
  input: {
    fontFamily: caratteri.normale,
    minHeight: TOCCO_MINIMO,
    backgroundColor: c.superficie,
    borderWidth: 1,
    borderColor: c.bordo,
    borderRadius: raggio.m,
    paddingHorizontal: spazi.m,
    paddingVertical: spazi.s,
    fontSize: 16,
    color: c.testo,
  },
  inputAlto: { minHeight: TOCCO_MINIMO * 2, textAlignVertical: 'top' },
  anteprimaUrl: { fontSize: 13, color: c.primarioChiaro, fontWeight: '600' },
  aiuto: { fontSize: 12, color: c.testoTenue, lineHeight: 17 },
  errore: { color: c.errore, fontSize: 13 },
  avviso: { color: c.primarioChiaro, fontSize: 13, fontWeight: '600' },
  bottone: {
    minHeight: TOCCO_MINIMO,
    backgroundColor: c.primario,
    borderRadius: raggio.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spazi.s,
  },
  bottonePremuto: { opacity: 0.85 },
  bottoneTesto: { color: c.suPrimario, fontSize: 16, fontWeight: '600' },
}));