import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, View } from 'react-native';
import {
  ETICHETTA_MODULO,
  ETICHETTA_STATO_PRATICA,
  quandoBreve,
  tab,
  type Modulo,
  type StatoPratica,
  type TipoCliente,
} from '@lab/shared';

import { Filtri, Iniziali, Pillola, Scheda, Vuoto } from '@/components/base';
import { Icona, type NomeIcona } from '@/components/icone';
import { Testo as Text } from '@/components/testo';
import { urlFoto } from '@/lib/foto';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, testi } from '@/lib/tema';

interface RigaPratica {
  id: string;
  stato: StatoPratica;
  modulo: Modulo;
  cliente_nome: string;
  cliente_tipo: TipoCliente;
  offerta_titolo: string | null;
  ultimo_messaggio: string | null;
  ultimo_contatto: string | null;
  foto_path: string | null;
}

const ICONA_MODULO: Record<Modulo, NomeIcona> = {
  vendita: 'auto',
  noleggio_breve: 'calendario',
  noleggio_lungo: 'cartellino',
  assicurazioni: 'documento',
};

/** Gli stati che chiedono di fare qualcosa si vedono da lontano. */
const TONO_STATO: Partial<Record<StatoPratica, 'attenzione' | 'successo'>> = {
  da_richiamare: 'attenzione',
  venduto: 'successo',
  prenotato: 'successo',
};

/** L'ordine in cui il venditore li guarda: prima chi aspetta una risposta. */
const ORDINE: StatoPratica[] = [
  'da_richiamare',
  'in_trattativa',
  'preventivo_inviato',
  'prenotato',
  'venduto',
  'chiuso',
];

export default function Pratiche() {
  const router = useRouter();
  const [righe, setRighe] = useState<RigaPratica[]>([]);
  const [filtro, setFiltro] = useState<StatoPratica | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const { data, error } = await supabase
          .from(tab('pratica_elenco'))
          .select(
            'id, stato, modulo, cliente_nome, cliente_tipo, offerta_titolo, ultimo_messaggio, ultimo_contatto, foto_path'
          )
          .order('ultimo_contatto', { ascending: false, nullsFirst: false });

        if (!vivo) return;
        if (error) setErrore(error.message);
        else setRighe((data ?? []) as unknown as RigaPratica[]);
        setCaricamento(false);
      })();
      return () => {
        vivo = false;
      };
    }, [])
  );

  const visibili = filtro ? righe.filter((r) => r.stato === filtro) : righe;
  const conteggi = ORDINE.map((s) => ({ stato: s, quanti: righe.filter((r) => r.stato === s).length }));

  if (caricamento) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  return (
    <View style={stili.contenitore}>
      <Filtri
        valore={filtro}
        onCambia={setFiltro}
        opzioni={[
          { valore: null, etichetta: `Tutte (${righe.length})` },
          ...conteggi
            .filter((c) => c.quanti > 0)
            .map((c) => ({
              valore: c.stato,
              etichetta: `${ETICHETTA_STATO_PRATICA[c.stato]} (${c.quanti})`,
            })),
        ]}
      />

      <FlatList
        data={visibili}
        keyExtractor={(r) => r.id}
        contentContainerStyle={stili.lista}
        ListHeaderComponent={errore ? <Text style={stili.errore}>{errore}</Text> : null}
        ListEmptyComponent={
          <Vuoto
            icona="telefona"
            titolo="Nessuna pratica"
            testo="Quando un cliente compila il form su una tua pagina, lo trovi qui già pronto da richiamare."
          />
        }
        renderItem={({ item }) => (
          <SchedaPratica item={item} onPress={() => router.push(`/pratiche/${item.id}`)} />
        )}
      />
    </View>
  );
}

/**
 * Una pratica a scheda.
 *
 * Il mezzo si riconosce prima dalla foto che dal titolo: chi scorre l'elenco
 * per capire chi richiamare guarda l'auto, non la riga di testo. E' la stessa
 * copertina che il cliente ha visto in pagina, quindi stanno guardando la
 * stessa cosa.
 */
function SchedaPratica({ item, onPress }: { item: RigaPratica; onPress: () => void }) {
  return (
    <Scheda
      onPress={onPress}
      style={stili.scheda}
      accessibilityLabel={`${item.cliente_nome}, ${ETICHETTA_STATO_PRATICA[item.stato]}`}
    >
      <View style={stili.testa}>
        {item.foto_path ? (
          <Image source={{ uri: urlFoto(item.foto_path) }} style={stili.foto} resizeMode="cover" />
        ) : item.offerta_titolo ? (
          <View style={[stili.foto, stili.senzaFoto]}>
            <Icona nome={ICONA_MODULO[item.modulo]} dimensione={18} colore={colori.testoDebole} />
          </View>
        ) : (
          <Iniziali
            nome={item.cliente_nome}
            tono={item.cliente_tipo === 'rivenditore' ? 'attenzione' : 'neutro'}
          />
        )}

        <View style={stili.testi}>
          <View style={stili.rigaNome}>
            <Text style={stili.nome} numberOfLines={1}>
              {item.cliente_nome}
            </Text>
            {item.cliente_tipo === 'rivenditore' && (
              <Pillola testo="rivenditore" tono="attenzione" />
            )}
          </View>
          <Text style={stili.offerta} numberOfLines={1}>
            {item.offerta_titolo ?? ETICHETTA_MODULO[item.modulo]}
          </Text>
        </View>

        <Text style={stili.quando}>{quandoBreve(item.ultimo_contatto)}</Text>
      </View>

      {item.ultimo_messaggio && (
        <Text style={stili.messaggio} numberOfLines={2}>
          {item.ultimo_messaggio}
        </Text>
      )}

      <Pillola testo={ETICHETTA_STATO_PRATICA[item.stato]} tono={TONO_STATO[item.stato]} />
    </Scheda>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: colori.sfondo },
  lista: { paddingHorizontal: spazi.l, paddingBottom: spazi.xxl, gap: spazi.s },
  scheda: { gap: spazi.s, padding: spazi.m, alignItems: 'flex-start' },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazi.m, alignSelf: 'stretch' },
  foto: {
    width: 48,
    height: 48,
    borderRadius: raggio.s,
    backgroundColor: colori.bordoTenue,
  },
  senzaFoto: { alignItems: 'center', justifyContent: 'center' },
  testi: { flex: 1, gap: 2 },
  rigaNome: { flexDirection: 'row', alignItems: 'center', gap: spazi.s },
  nome: { ...testi.corpo, fontWeight: '700', color: colori.testo, flexShrink: 1 },
  offerta: { fontSize: 12, color: colori.testoTenue },
  quando: { fontSize: 11, color: colori.testoDebole },
  messaggio: { fontSize: 13, color: colori.testoTenue, lineHeight: 18 },
  errore: { color: colori.errore, fontSize: 13, paddingBottom: spazi.s },
});
