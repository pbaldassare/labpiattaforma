import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { fn } from '@lab/shared';

import { Scheda } from '@/components/base';
import { Icona, type NomeIcona } from '@/components/icone';
import { Sezione } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, stiliTema, testi } from '@/lib/tema';

/**
 * I numeri del venditore (§8.4).
 *
 * "Poche cifre in una schermata sola": servono a capire quali annunci
 * funzionano, non a fare statistica. Percio' niente grafici e niente
 * percentuali, ma le cifre grandi e la frase che dice cosa significano.
 *
 * Aperture e contatti sono divisi fra pagina pubblica e riservata: sono due
 * pubblici diversi, e un mezzo che gira fra i rivenditori ma non fra i privati
 * e' un'informazione che il totale nasconderebbe.
 */
interface Numeri {
  offerte_attive: number;
  da_richiamare: number;
  in_corso: number;
  pratiche_chiuse: number;
  aperture: number;
  aperture_pubbliche: number;
  aperture_riservate: number;
  contatti: number;
  contatti_pubblici: number;
  contatti_riservati: number;
  prenotazioni: number;
  clienti: number;
}

export default function NumeriVenditore() {
  const router = useRouter();
  const [n, setNumeri] = useState<Numeri | null>(null);
  const [caricato, setCaricato] = useState(false);
  const [aggiornando, setAggiornando] = useState(false);

  const carica = useCallback(async () => {
    const { data } = await supabase.rpc(fn('cruscotto'));
    setNumeri((data as Numeri | null) ?? null);
    setCaricato(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carica();
    }, [carica])
  );

  if (!caricato) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  if (!n) {
    return (
      <View style={stili.centrato}>
        <Text style={stili.nulla}>Non siamo riusciti a leggere i numeri.</Text>
      </View>
    );
  }

  // Quanti di quelli che aprono poi scrivono. E' l'unico rapporto che serve
  // davvero: dice se il prezzo tiene o se la pagina non convince.
  const risposta = n.aperture > 0 ? Math.round((n.contatti / n.aperture) * 100) : null;

  return (
    <ScrollView
      style={stili.contenitore}
      contentContainerStyle={stili.contenuto}
      refreshControl={
        <RefreshControl
          refreshing={aggiornando}
          onRefresh={() => {
            setAggiornando(true);
            void carica().finally(() => setAggiornando(false));
          }}
        />
      }
    >
      <Grande
        numero={n.aperture}
        etichetta={n.aperture === 1 ? 'apertura delle tue pagine' : 'aperture delle tue pagine'}
        icona="occhio"
        dettaglio={
          n.aperture > 0
            ? `${n.aperture_pubbliche} dal pubblico · ${n.aperture_riservate} dai rivenditori`
            : 'Manda il link di un’offerta e qui comincia a contare.'
        }
      />

      <Grande
        numero={n.contatti}
        etichetta={n.contatti === 1 ? 'contatto ricevuto' : 'contatti ricevuti'}
        icona="messaggio"
        tono="accento"
        dettaglio={
          n.contatti > 0
            ? `${n.contatti_pubblici} dal pubblico · ${n.contatti_riservati} dai rivenditori`
            : 'Chi compila il form su una tua pagina finisce qui.'
        }
      />

      {risposta != null && (
        <Scheda style={stili.risposta}>
          <Text style={stili.rispostaCifra}>{risposta}%</Text>
          <Text style={stili.rispostaTesto}>
            di chi apre una tua pagina poi ti scrive. Se scende su un’offerta sola, di solito è
            il prezzo.
          </Text>
        </Scheda>
      )}

      <Sezione titolo="Il tuo lavoro">
        <View style={stili.griglia}>
          <Riquadro
            numero={n.offerte_attive}
            etichetta="offerte attive"
            icona="auto"
            onPress={() => router.push('/offerte')}
          />
          <Riquadro
            numero={n.prenotazioni}
            etichetta="prenotazioni"
            icona="calendario"
          />
          <Riquadro
            numero={n.da_richiamare}
            etichetta="da richiamare"
            icona="telefona"
            urgente={n.da_richiamare > 0}
            onPress={() => router.push('/pratiche')}
          />
          <Riquadro
            numero={n.in_corso}
            etichetta="pratiche in corso"
            icona="messaggio"
            onPress={() => router.push('/pratiche')}
          />
          <Riquadro
            numero={n.pratiche_chiuse}
            etichetta="pratiche chiuse"
            icona="spunta"
            onPress={() => router.push('/pratiche')}
          />
          <Riquadro
            numero={n.clienti}
            etichetta="clienti"
            icona="utenti"
            onPress={() => router.push('/clienti')}
          />
        </View>
      </Sezione>
    </ScrollView>
  );
}

function Grande({
  numero,
  etichetta,
  dettaglio,
  icona,
  tono,
}: {
  numero: number;
  etichetta: string;
  dettaglio: string;
  icona: NomeIcona;
  tono?: 'accento';
}) {
  const colore = tono === 'accento' ? colori.accento : colori.primarioChiaro;
  return (
    <Scheda rilievo="media" style={stili.grande}>
      <View style={stili.grandeTesta}>
        {/* Icona scura sul colore acceso: il bianco su questi toni si perde. */}
        <View style={[stili.pastiglia, { backgroundColor: colore }]}>
          <Icona nome={icona} dimensione={18} colore={colori.sfondo} />
        </View>
        <Text style={stili.grandeEtichetta}>{etichetta}</Text>
      </View>
      <Text style={[stili.grandeCifra, { color: colore }]}>{numero}</Text>
      <Text style={stili.grandeDettaglio}>{dettaglio}</Text>
    </Scheda>
  );
}

function Riquadro({
  numero,
  etichetta,
  icona,
  urgente,
  onPress,
}: {
  numero: number;
  etichetta: string;
  icona: NomeIcona;
  urgente?: boolean;
  onPress?: () => void;
}) {
  return (
    <Scheda
      onPress={onPress}
      style={stili.riquadro}
      accessibilityLabel={`${numero} ${etichetta}`}
    >
      <Icona
        nome={icona}
        dimensione={16}
        colore={urgente ? colori.accento : colori.testoDebole}
      />
      <Text style={[stili.riquadroCifra, urgente && { color: colori.accento }]}>{numero}</Text>
      <Text style={stili.riquadroEtichetta}>{etichetta}</Text>
    </Scheda>
  );
}

const stili = stiliTema((c) => StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: c.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
  contenuto: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxxl },
  nulla: { ...testi.corpo, color: c.testoTenue, textAlign: 'center' },

  grande: { gap: spazi.xs },
  grandeTesta: { flexDirection: 'row', alignItems: 'center', gap: spazi.s },
  pastiglia: {
    width: 32,
    height: 32,
    borderRadius: raggio.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grandeEtichetta: { ...testi.piccolo, color: c.testoTenue, flex: 1 },
  grandeCifra: { fontSize: 44, lineHeight: 50, fontWeight: '800' },
  grandeDettaglio: { fontSize: 13, color: c.testoTenue, lineHeight: 18 },

  risposta: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },
  rispostaCifra: { fontSize: 30, fontWeight: '800', color: c.testo },
  rispostaTesto: { flex: 1, fontSize: 13, color: c.testoTenue, lineHeight: 18 },

  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazi.s },
  riquadro: { width: '47.5%', flexGrow: 1, gap: 2, paddingVertical: spazi.m },
  riquadroCifra: { fontSize: 26, fontWeight: '700', color: c.testo },
  riquadroEtichetta: { fontSize: 12, color: c.testoTenue },
}));