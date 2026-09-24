import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, View } from 'react-native';
import {
  ETICHETTA_MODULO,
  formattaEuro,
  tab,
  type Modulo,
  type StatoOfferta,
} from '@lab/shared';

import { Filtri, Pillola, Scheda, Vuoto } from '@/components/base';
import { Icona, type NomeIcona } from '@/components/icone';
import { Bottone } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { urlFoto } from '@/lib/foto';
import { supabase } from '@/lib/supabase';
import { colori, coloriModulo, coloriModuloTenue, raggio, spazi, testi } from '@/lib/tema';

interface RigaOfferta {
  id: string;
  titolo: string;
  modulo: Modulo;
  stato: StatoOfferta;
  updated_at: string;
  prezzo_pubblico_cent: number | null;
  canone_minimo_cent: number | null;
  tariffa_giorno_cent: number | null;
  premio_partenza_cent: number | null;
  foto_path: string | null;
  quante_foto: number;
}

const ETICHETTA_STATO: Record<StatoOfferta, string> = {
  bozza: 'Bozza',
  attiva: 'Pubblicata',
  sospesa: 'Sospesa',
  venduta: 'Venduta',
};

const ICONA_MODULO: Record<Modulo, NomeIcona> = {
  vendita: 'auto',
  noleggio_breve: 'calendario',
  noleggio_lungo: 'cartellino',
  assicurazioni: 'documento',
};

/**
 * Il numero da mostrare cambia da modulo a modulo, e con lui la parola che gli
 * sta accanto: un canone senza "al mese" e una tariffa senza "al giorno" si
 * leggono come un prezzo di vendita.
 */
function cifra(r: RigaOfferta): { prima?: string; valore: string; dopo?: string } | null {
  if (r.prezzo_pubblico_cent != null) return { valore: formattaEuro(r.prezzo_pubblico_cent) };
  if (r.tariffa_giorno_cent != null) {
    return { valore: formattaEuro(r.tariffa_giorno_cent), dopo: 'al giorno' };
  }
  if (r.canone_minimo_cent != null) {
    return { prima: 'da', valore: formattaEuro(r.canone_minimo_cent), dopo: 'al mese' };
  }
  if (r.premio_partenza_cent != null) {
    return { prima: 'da', valore: formattaEuro(r.premio_partenza_cent), dopo: "all'anno" };
  }
  return null;
}

export default function Offerte() {
  const router = useRouter();
  const [righe, setRighe] = useState<RigaOfferta[]>([]);
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  // Al ritorno dal form l'elenco deve essere gia' aggiornato, non un istante dopo.
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const { data, error } = await supabase
          // Vista che unisce gia' offerta e schede dei quattro moduli:
          // PostgREST non sa dedurre le relazioni fra viste.
          .from(tab('offerta_elenco'))
          .select(
            'id, titolo, modulo, stato, updated_at, prezzo_pubblico_cent, canone_minimo_cent, tariffa_giorno_cent, premio_partenza_cent, foto_path, quante_foto'
          )
          .order('updated_at', { ascending: false });

        if (!vivo) return;
        if (error) setErrore(error.message);
        else setRighe((data ?? []) as unknown as RigaOfferta[]);
        setCaricamento(false);
      })();
      return () => {
        vivo = false;
      };
    }, [])
  );

  // I filtri mostrano solo i moduli che il venditore usa davvero: una barra
  // con quattro voci di cui tre vuote non aiuta nessuno.
  const filtri = useMemo(() => {
    const usati = (['vendita', 'noleggio_breve', 'noleggio_lungo', 'assicurazioni'] as Modulo[])
      .map((m) => ({ m, quante: righe.filter((r) => r.modulo === m).length }))
      .filter((x) => x.quante > 0);

    return [
      { valore: null, etichetta: `Tutte (${righe.length})` },
      ...usati.map((x) => ({
        valore: x.m,
        etichetta: `${ETICHETTA_MODULO[x.m]} (${x.quante})`,
      })),
    ];
  }, [righe]);

  const visibili = modulo ? righe.filter((r) => r.modulo === modulo) : righe;

  if (caricamento) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  return (
    <View style={stili.contenitore}>
      {filtri.length > 2 && (
        <Filtri valore={modulo} opzioni={filtri} onCambia={setModulo} />
      )}

      <FlatList
        data={visibili}
        keyExtractor={(r) => r.id}
        contentContainerStyle={stili.lista}
        ListHeaderComponent={errore ? <Text style={stili.errore}>{errore}</Text> : null}
        ListEmptyComponent={
          <Vuoto
            icona="auto"
            titolo="Nessuna offerta"
            testo="Carica il primo mezzo: dalla scheda esce la pagina da mandare al cliente."
          />
        }
        renderItem={({ item }) => (
          <SchedaOfferta item={item} onPress={() => router.push(`/offerte/${item.id}`)} />
        )}
      />

      {/* Quattro moduli sono troppi per quattro bottoni in fondo allo schermo:
          da "I tuoi moduli" si sceglie quale, e si vede quanto resta di ognuno. */}
      <View style={stili.barra}>
        <Bottone testo="Nuova offerta" icona="piu" onPress={() => router.push('/moduli')} />
      </View>
    </View>
  );
}

function SchedaOfferta({ item, onPress }: { item: RigaOfferta; onPress: () => void }) {
  const numero = cifra(item);
  const bozza = item.stato === 'bozza';

  return (
    <Scheda rilievo="bassa" onPress={onPress} style={stili.scheda} accessibilityLabel={item.titolo}>
      <View style={stili.foto}>
        {item.foto_path ? (
          <Image
            source={{ uri: urlFoto(item.foto_path) }}
            style={stili.immagine}
            resizeMode="cover"
          />
        ) : (
          <View style={[stili.senzaFoto, { backgroundColor: coloriModuloTenue[item.modulo] }]}>
            <Icona
              nome={ICONA_MODULO[item.modulo]}
              dimensione={20}
              colore={coloriModulo[item.modulo]}
            />
          </View>
        )}
        {item.quante_foto > 1 && (
          <View style={stili.contaFoto}>
            <Text style={stili.contaFotoTesto}>{item.quante_foto}</Text>
          </View>
        )}
      </View>

      <View style={stili.testi}>
        <Text style={stili.titolo} numberOfLines={1}>
          {item.titolo}
        </Text>
        <Text style={[stili.modulo, { color: coloriModulo[item.modulo] }]} numberOfLines={1}>
          {ETICHETTA_MODULO[item.modulo]}
        </Text>
        {numero && (
          <Text style={stili.prezzo}>
            {numero.prima && <Text style={stili.prezzoContorno}>{numero.prima} </Text>}
            {numero.valore}
            {numero.dopo && <Text style={stili.prezzoContorno}> {numero.dopo}</Text>}
          </Text>
        )}
      </View>

      <View style={stili.coda}>
        {/* Solo le bozze portano un'etichetta: sono l'unico stato che chiede di
            tornarci sopra. Le altre si distinguono gia' dal resto della riga. */}
        {bozza ? (
          <Pillola testo={ETICHETTA_STATO[item.stato]} />
        ) : item.stato !== 'attiva' ? (
          <Pillola
            testo={ETICHETTA_STATO[item.stato]}
            tono={item.stato === 'venduta' ? 'successo' : 'attenzione'}
          />
        ) : null}
        <Icona nome="avanti" dimensione={18} colore={colori.testoDebole} />
      </View>
    </Scheda>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: colori.sfondo },
  lista: { padding: spazi.l, gap: spazi.s, paddingBottom: spazi.xxxl * 2 },

  scheda: { flexDirection: 'row', alignItems: 'center', gap: spazi.m, padding: spazi.s },
  foto: {
    width: 76,
    height: 76,
    borderRadius: raggio.m,
    overflow: 'hidden',
    backgroundColor: colori.bordoTenue,
  },
  immagine: { width: '100%', height: '100%' },
  senzaFoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contaFoto: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    paddingHorizontal: 6,
    borderRadius: raggio.tondo,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  contaFotoTesto: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  testi: { flex: 1, gap: 2 },
  titolo: { ...testi.corpo, fontWeight: '700', color: colori.testo },
  modulo: { fontSize: 12, color: colori.testoTenue },
  prezzo: { fontSize: 17, fontWeight: '700', color: colori.testo, marginTop: 2 },
  prezzoContorno: { fontSize: 12, fontWeight: '400', color: colori.testoTenue },

  coda: { alignItems: 'flex-end', gap: spazi.xs, paddingRight: spazi.xs },
  errore: { color: colori.errore, fontSize: 13, paddingBottom: spazi.s },
  barra: { position: 'absolute', left: spazi.l, right: spazi.l, bottom: spazi.xl },
});
