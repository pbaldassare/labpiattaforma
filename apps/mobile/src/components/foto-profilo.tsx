import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { Testo as Text } from '@/components/testo';
import { urlFoto } from '@/lib/foto';
import { supabase } from '@/lib/supabase';
import { raggio, spazi, stiliTema, testi } from '@/lib/tema';

/**
 * La foto o il logo del venditore: quella che il cliente vede in cima alla
 * vetrina e accanto al nome in ogni pagina.
 *
 * Sta nella cartella del venditore dentro il secchio delle offerte, cosi'
 * valgono le stesse regole: ognuno scrive solo nella propria, tutti leggono.
 * Si ritaglia quadrata e si rimpicciolisce prima di caricarla: in pagina e'
 * un cerchio di un centinaio di pixel, una foto da 4000 non serve a nessuno.
 */
export function FotoProfilo({
  path,
  nome,
  onCambia,
}: {
  path: string | null;
  /** Per le iniziali quando la foto non c'e'. */
  nome: string;
  onCambia: (nuovo: string | null) => Promise<void>;
}) {
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const iniziali =
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || '?';

  async function scegli() {
    setErrore(null);
    const permesso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permesso.granted) {
      setErrore('Serve il permesso di accedere alle foto.');
      return;
    }
    const scelta = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (scelta.canceled || !scelta.assets[0]) return;

    setInCorso(true);
    try {
      const { data } = await supabase.auth.getUser();
      const utente = data.user?.id;
      if (!utente) throw new Error('Sessione scaduta.');

      const immagine = scelta.assets[0];
      // Ritaglio quadrato al centro: sul web l'editor del selettore non c'e'.
      const lato = Math.min(immagine.width, immagine.height);
      const ridotta = await ImageManipulator.manipulateAsync(
        immagine.uri,
        [
          {
            crop: {
              originX: Math.round((immagine.width - lato) / 2),
              originY: Math.round((immagine.height - lato) / 2),
              width: lato,
              height: lato,
            },
          },
          { resize: { width: 600, height: 600 } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      const contenuto = await (await fetch(ridotta.uri)).arrayBuffer();

      const nuovo = `${utente}/profilo/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('offerte')
        .upload(nuovo, contenuto, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;

      const vecchio = path;
      await onCambia(nuovo);
      // La vecchia si toglie solo dopo che la nuova e' salvata: se qualcosa va
      // storto in mezzo, resta almeno una foto valida.
      if (vecchio) void supabase.storage.from('offerte').remove([vecchio]);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Caricamento non riuscito.');
    } finally {
      setInCorso(false);
    }
  }

  async function togli() {
    if (!path) return;
    setErrore(null);
    setInCorso(true);
    try {
      const vecchio = path;
      await onCambia(null);
      void supabase.storage.from('offerte').remove([vecchio]);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non è stato possibile toglierla.');
    } finally {
      setInCorso(false);
    }
  }

  return (
    <View style={stili.contenitore}>
      <View style={stili.riga}>
        <Pressable onPress={() => void scegli()} disabled={inCorso} accessibilityRole="button" accessibilityLabel="Scegli la foto profilo">
          {path ? (
            <Image source={{ uri: urlFoto(path) }} style={stili.cerchio} />
          ) : (
            <View style={[stili.cerchio, stili.vuoto]}>
              <Text style={stili.iniziali}>{iniziali}</Text>
            </View>
          )}
          {inCorso && (
            <View style={[stili.cerchio, stili.velo]}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          )}
        </Pressable>

        <View style={stili.testi}>
          <Text style={stili.titolo}>Foto profilo</Text>
          <Text style={stili.spiegazione}>
            La vedono i clienti in cima alla tua vetrina e accanto al tuo nome in ogni offerta. Va
            bene il logo o una tua foto.
          </Text>
          <View style={stili.azioni}>
            <Pressable
              onPress={() => void scegli()}
              disabled={inCorso}
              style={({ pressed }) => [stili.tasto, pressed && { opacity: 0.6 }]}
            >
              <Text style={stili.tastoTesto}>{path ? 'Cambia' : 'Carica foto'}</Text>
            </Pressable>
            {path && (
              <Pressable
                onPress={() => void togli()}
                disabled={inCorso}
                style={({ pressed }) => [stili.tasto, stili.tastoTogli, pressed && { opacity: 0.6 }]}
              >
                <Text style={[stili.tastoTesto, stili.tastoTogliTesto]}>Togli</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
      {errore && <Text style={stili.errore}>{errore}</Text>}
    </View>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    contenitore: { gap: spazi.s },
    riga: { flexDirection: 'row', alignItems: 'center', gap: spazi.l },
    cerchio: { width: 88, height: 88, borderRadius: 44 },
    vuoto: { backgroundColor: c.primarioTenue, alignItems: 'center', justifyContent: 'center' },
    velo: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
    iniziali: { ...testi.titolo, color: c.primarioChiaro },
    testi: { flex: 1, gap: spazi.xs },
    titolo: { fontSize: 15, fontWeight: '700', color: c.testo },
    spiegazione: { ...testi.piccolo, color: c.testoTenue },
    azioni: { flexDirection: 'row', gap: spazi.s, marginTop: 2 },
    tasto: {
      paddingHorizontal: spazi.m,
      minHeight: 36,
      borderRadius: raggio.tondo,
      backgroundColor: c.superficieAlta,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tastoTesto: { fontSize: 14, fontWeight: '700', color: c.primarioChiaro },
    tastoTogli: { backgroundColor: c.azioneTenue },
    tastoTogliTesto: { color: c.azione },
    errore: { ...testi.piccolo, color: c.errore },
  })
);
