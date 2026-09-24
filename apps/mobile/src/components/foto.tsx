import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { tab } from '@lab/shared';

import { Pillola } from '@/components/base';
import { Icona } from '@/components/icone';
import { Bottone } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { urlFoto } from '@/lib/foto';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, testi } from '@/lib/tema';

export interface Foto {
  id: string;
  path: string;
  ordine: number;
}

/**
 * Le foto di un'offerta.
 *
 * La prima e' la copertina: e' quella che compare in vetrina e nell'anteprima
 * dei messaggi, quindi si puo' cambiare con un tocco invece di dover
 * riordinare tutto.
 *
 * Le immagini vengono ridotte prima di partire: una foto da telefono pesa
 * quattro megabyte, e il cliente che apre la pagina sotto rete mobile aspetta
 * quattro megabyte. A 1600 pixel di lato lungo non si vede differenza su uno
 * schermo, e pesa dieci volte meno.
 */
export function Fotografie({
  offertaId,
  foto,
  onCambiate,
}: {
  offertaId: string;
  foto: Foto[];
  onCambiate: () => void;
}) {
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const aggiungi = useCallback(async () => {
    setErrore(null);

    const permesso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permesso.granted) {
      setErrore('Serve il permesso di accedere alle foto.');
      return;
    }

    const scelta = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 1,
    });
    if (scelta.canceled) return;

    setInCorso(true);
    try {
      const { data: sessione } = await supabase.auth.getUser();
      const utente = sessione.user?.id;
      if (!utente) throw new Error('Sessione scaduta.');

      let ordine = foto.reduce((max, f) => Math.max(max, f.ordine), -1);

      for (const immagine of scelta.assets) {
        const ridotta = await ImageManipulator.manipulateAsync(
          immagine.uri,
          [{ resize: { width: 1600 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        const risposta = await fetch(ridotta.uri);
        const contenuto = await risposta.arrayBuffer();

        // Il percorso comincia con l'identita' del venditore: e' cio' che
        // impedisce di scrivere sulle foto di un altro (policy sullo storage).
        const nome = `${utente}/${offertaId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.jpg`;

        const { error: erroreCarico } = await supabase.storage
          .from('offerte')
          .upload(nome, contenuto, { contentType: 'image/jpeg', upsert: false });
        if (erroreCarico) throw erroreCarico;

        ordine += 1;
        const { error: erroreRiga } = await supabase
          .from(tab('offerta_foto'))
          .insert({ offerta_id: offertaId, path: nome, ordine });
        if (erroreRiga) throw erroreRiga;
      }

      onCambiate();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Caricamento non riuscito.');
    } finally {
      setInCorso(false);
    }
  }, [foto, offertaId, onCambiate]);

  async function elimina(f: Foto) {
    setInCorso(true);
    await supabase.storage.from('offerte').remove([f.path]);
    await supabase.from(tab('offerta_foto')).delete().eq('id', f.id);
    setInCorso(false);
    onCambiate();
  }

  /** La copertina si sceglie mettendo quella foto al primo posto. */
  async function faiCopertina(f: Foto) {
    if (f.ordine === 0) return;
    setInCorso(true);
    const riordinate = [f, ...foto.filter((x) => x.id !== f.id)];
    for (let i = 0; i < riordinate.length; i++) {
      // Ordini negativi come passaggio intermedio: il vincolo di unicita' su
      // (offerta, ordine) non permette di scambiare due valori direttamente.
      await supabase
        .from(tab('offerta_foto'))
        .update({ ordine: -1 - i })
        .eq('id', riordinate[i]!.id);
    }
    for (let i = 0; i < riordinate.length; i++) {
      await supabase.from(tab('offerta_foto')).update({ ordine: i }).eq('id', riordinate[i]!.id);
    }
    setInCorso(false);
    onCambiate();
  }

  return (
    <View style={stili.contenitore}>
      {foto.length === 0 ? (
        <Pressable
          onPress={() => void aggiungi()}
          style={({ pressed }) => [stili.vuoto, pressed && stili.premuto]}
          accessibilityRole="button"
          accessibilityLabel="Aggiungi le foto"
        >
          <Icona nome="piu" dimensione={24} colore={colori.testoDebole} />
          <Text style={stili.vuotoTesto}>
            Aggiungi le foto. La prima diventa la copertina: è quella che il cliente vede per
            prima.
          </Text>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.striscia}>
          {foto.map((f) => (
            <View key={f.id} style={stili.riquadro}>
              <Image source={{ uri: urlFoto(f.path) }} style={stili.immagine} />

              {f.ordine === 0 ? (
                <View style={stili.etichettaCopertina}>
                  <Pillola testo="copertina" tono="successo" />
                </View>
              ) : (
                <Pressable
                  onPress={() => void faiCopertina(f)}
                  style={stili.azioneCopertina}
                  accessibilityRole="button"
                  accessibilityLabel="Usa come copertina"
                >
                  <Text style={stili.azioneCopertinaTesto}>copertina</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => void elimina(f)}
                style={stili.elimina}
                accessibilityRole="button"
                accessibilityLabel="Togli questa foto"
              >
                <Icona nome="attenzione" dimensione={14} colore={colori.suPrimario} />
              </Pressable>
            </View>
          ))}

          <Pressable
            onPress={() => void aggiungi()}
            style={({ pressed }) => [stili.aggiungi, pressed && stili.premuto]}
            accessibilityRole="button"
            accessibilityLabel="Aggiungi altre foto"
          >
            <Icona nome="piu" dimensione={22} colore={colori.testoTenue} />
          </Pressable>
        </ScrollView>
      )}

      {inCorso && (
        <View style={stili.caricamento}>
          <ActivityIndicator color={colori.primario} />
          <Text style={stili.caricamentoTesto}>Sto caricando…</Text>
        </View>
      )}

      {errore ? <Text style={stili.errore}>{errore}</Text> : null}

      {foto.length > 0 && !inCorso && (
        <Bottone tenue testo="Aggiungi foto" icona="piu" onPress={() => void aggiungi()} />
      )}
    </View>
  );
}

const stili = StyleSheet.create({
  contenitore: { gap: spazi.s },
  striscia: { gap: spazi.s, paddingRight: spazi.s },

  vuoto: {
    height: 140,
    borderRadius: raggio.l,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colori.bordo,
    backgroundColor: colori.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spazi.s,
    paddingHorizontal: spazi.xl,
  },
  vuotoTesto: { ...testi.piccolo, color: colori.testoTenue, textAlign: 'center' },
  premuto: { opacity: 0.75 },

  riquadro: {
    width: 120,
    height: 140,
    borderRadius: raggio.m,
    overflow: 'hidden',
    backgroundColor: colori.bordoTenue,
  },
  immagine: { width: '100%', height: '100%' },
  etichettaCopertina: { position: 'absolute', top: spazi.xs, left: spazi.xs },
  azioneCopertina: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.75)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  azioneCopertinaTesto: { color: colori.suPrimario, fontSize: 11, fontWeight: '600' },
  elimina: {
    position: 'absolute',
    top: spazi.xs,
    right: spazi.xs,
    width: 26,
    height: 26,
    borderRadius: raggio.tondo,
    backgroundColor: 'rgba(15,23,42,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  aggiungi: {
    width: 80,
    height: 140,
    borderRadius: raggio.m,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colori.bordo,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colori.superficie,
  },

  caricamento: { flexDirection: 'row', alignItems: 'center', gap: spazi.s },
  caricamentoTesto: { ...testi.piccolo, color: colori.testoTenue },
  errore: { fontSize: 13, color: colori.errore },
});
