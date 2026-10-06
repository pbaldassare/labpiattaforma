import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, SectionList, StyleSheet, View } from 'react-native';
import {
  ETICHETTA_MODULO,
  ETICHETTA_STATO_PRATICA,
  quandoBreve,
  tab,
  type Modulo,
  type StatoPratica,
  type TipoCliente,
} from '@lab/shared';

import { Iniziali, Pillola, Scheda, Vuoto } from '@/components/base';
import { Entra } from '@/components/movimento';
import { Simbolo } from '@/components/simboli';
import { Testo as Text } from '@/components/testo';
import { urlFoto } from '@/lib/foto';
import { supabase } from '@/lib/supabase';
import {
  colori,
  coloriModulo,
  coloriModuloTenue,
  raggio,
  spazi,
  stiliTema,
  testi,
} from '@/lib/tema';

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
  cliente_telefono: string | null;
  prossimo_promemoria: string | null;
}

type Gruppo = 'oggi' | 'in_corso' | 'chiuse';

const CHIUSE: StatoPratica[] = ['venduto', 'chiuso'];

/** Fine di oggi: un promemoria fissato per stasera e' gia' "da fare oggi". */
function fineDiOggi(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function gruppo(r: RigaPratica): Gruppo {
  if (CHIUSE.includes(r.stato)) return 'chiuse';
  if (r.stato === 'da_richiamare') return 'oggi';
  if (r.prossimo_promemoria && new Date(r.prossimo_promemoria).getTime() <= fineDiOggi()) return 'oggi';
  return 'in_corso';
}

const TITOLO_GRUPPO: Record<Gruppo, string> = {
  oggi: 'Da fare oggi',
  in_corso: 'In corso',
  chiuse: 'Chiuse',
};

/** "oggi alle 9:00", "scaduto da 2 giorni": il promemoria detto come lo si pensa. */
function descriviPromemoria(iso: string): { testo: string; scaduto: boolean } {
  const quando = new Date(iso);
  const ora = quando.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const oggi = new Date();
  const giorni = Math.round(
    (new Date(quando.getFullYear(), quando.getMonth(), quando.getDate()).getTime() -
      new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime()) /
      86_400_000
  );
  if (giorni < 0) return { testo: `scaduto da ${-giorni} ${giorni === -1 ? 'giorno' : 'giorni'}`, scaduto: true };
  if (giorni === 0) return { testo: `oggi alle ${ora}`, scaduto: quando < oggi };
  if (giorni === 1) return { testo: `domani alle ${ora}`, scaduto: false };
  return {
    testo: quando.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
    scaduto: false,
  };
}

/** Gli stati che chiedono di fare qualcosa si vedono da lontano. */
const TONO_STATO: Partial<Record<StatoPratica, 'attenzione' | 'successo'>> = {
  da_richiamare: 'attenzione',
  venduto: 'successo',
  prenotato: 'successo',
};

/**
 * Le pratiche ordinate per quello che c'e' da fare.
 *
 * In cima chi aspetta una risposta oggi (da richiamare, o con un promemoria
 * che scade oggi o e' gia' scaduto), con chiamata e WhatsApp a portata di
 * dito; poi le trattative in corso; in fondo, chiuse e nascoste finche' non si
 * aprono, quelle finite. Un elenco per data di contatto costringeva a leggerle
 * tutte per capire da chi cominciare.
 */
export default function Pratiche() {
  const router = useRouter();
  const [righe, setRighe] = useState<RigaPratica[]>([]);
  const [chiuseAperte, setChiuseAperte] = useState(false);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const { data, error } = await supabase
          .from(tab('pratica_elenco'))
          .select(
            'id, stato, modulo, cliente_nome, cliente_tipo, cliente_telefono, offerta_titolo, ultimo_messaggio, ultimo_contatto, foto_path, prossimo_promemoria'
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

  const sezioni = useMemo(() => {
    const per: Record<Gruppo, RigaPratica[]> = { oggi: [], in_corso: [], chiuse: [] };
    for (const r of righe) per[gruppo(r)].push(r);
    // Fra quelle di oggi, prima i promemoria piu' vecchi: sono i piu' in ritardo.
    per.oggi.sort(
      (x, y) =>
        new Date(x.prossimo_promemoria ?? 0).getTime() - new Date(y.prossimo_promemoria ?? 0).getTime()
    );
    return (['oggi', 'in_corso', 'chiuse'] as Gruppo[])
      .filter((g) => per[g].length > 0)
      .map((g) => ({
        gruppo: g,
        quante: per[g].length,
        data: g === 'chiuse' && !chiuseAperte ? [] : per[g],
      }));
  }, [righe, chiuseAperte]);

  if (caricamento) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  const daFare = righe.filter((r) => gruppo(r) === 'oggi').length;

  return (
    <View style={stili.contenitore}>
      <SectionList
        sections={sezioni}
        keyExtractor={(r) => r.id}
        contentContainerStyle={stili.lista}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={stili.riassunto}>
            {errore ? <Text style={stili.errore}>{errore}</Text> : null}
            {righe.length > 0 && (
              <Text style={stili.riassuntoTesto}>
                {daFare === 0
                  ? 'Oggi non c’è nessuno da richiamare. 👍'
                  : daFare === 1
                    ? 'Oggi hai 1 cliente da sentire.'
                    : `Oggi hai ${daFare} clienti da sentire.`}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <Vuoto
            icona="telefona"
            titolo="Nessuna pratica"
            testo="Quando un cliente compila il form su una tua pagina, lo trovi qui già pronto da richiamare."
          />
        }
        renderSectionHeader={({ section }) =>
          section.gruppo === 'chiuse' ? (
            <Pressable
              onPress={() => setChiuseAperte((x) => !x)}
              style={({ pressed }) => [stili.testaSezione, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
            >
              <Text style={stili.titoloSezione}>
                {TITOLO_GRUPPO.chiuse} ({section.quante})
              </Text>
              <Text style={stili.apriChiuse}>{chiuseAperte ? 'Nascondi' : 'Mostra'}</Text>
            </Pressable>
          ) : (
            <View style={stili.testaSezione}>
              <Text style={[stili.titoloSezione, section.gruppo === 'oggi' && stili.titoloOggi]}>
                {TITOLO_GRUPPO[section.gruppo]} ({section.quante})
              </Text>
            </View>
          )
        }
        renderItem={({ item, index, section }) => (
          <Entra indice={index}>
            <SchedaPratica
              item={item}
              daFare={section.gruppo === 'oggi'}
              onPress={() => router.push(`/pratiche/${item.id}`)}
            />
          </Entra>
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
function SchedaPratica({
  item,
  daFare,
  onPress,
}: {
  item: RigaPratica;
  /** Nella sezione "da fare oggi": chiamata e WhatsApp sulla scheda. */
  daFare: boolean;
  onPress: () => void;
}) {
  const promemoria = item.prossimo_promemoria ? descriviPromemoria(item.prossimo_promemoria) : null;
  const numero = (item.cliente_telefono ?? '').replace(/[^\d+]/g, '');
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
          <View
            style={[
              stili.foto,
              stili.senzaFoto,
              { backgroundColor: coloriModuloTenue[item.modulo] },
            ]}
          >
            <Simbolo modulo={item.modulo} dimensione={24} colore={coloriModulo[item.modulo]} />
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

      <View style={stili.rigaFondo}>
        <Pillola testo={ETICHETTA_STATO_PRATICA[item.stato]} tono={TONO_STATO[item.stato]} />
        {promemoria && (
          <Text style={[stili.promemoria, promemoria.scaduto && stili.promemoriaScaduto]}>
            🔔 {promemoria.testo}
          </Text>
        )}
      </View>

      {daFare && numero !== '' && (
        <View style={stili.azioni}>
          <Pressable
            onPress={() => void Linking.openURL(`tel:${numero}`)}
            style={({ pressed }) => [stili.azione, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
          >
            <Text style={stili.azioneTesto}>Chiama</Text>
          </Pressable>
          <Pressable
            onPress={() => void Linking.openURL(`https://wa.me/${numero.replace('+', '')}`)}
            style={({ pressed }) => [stili.azione, stili.azioneWhatsapp, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
          >
            <Text style={[stili.azioneTesto, stili.azioneWhatsappTesto]}>WhatsApp</Text>
          </Pressable>
        </View>
      )}
    </Scheda>
  );
}

const stili = stiliTema((c) => StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: c.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
  lista: { paddingHorizontal: spazi.l, paddingBottom: spazi.xxl, gap: spazi.s },
  scheda: { gap: spazi.s, padding: spazi.m, alignItems: 'flex-start' },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazi.m, alignSelf: 'stretch' },
  foto: {
    width: 48,
    height: 48,
    borderRadius: raggio.s,
    backgroundColor: c.bordoTenue,
  },
  senzaFoto: { alignItems: 'center', justifyContent: 'center' },
  testi: { flex: 1, gap: 2 },
  rigaNome: { flexDirection: 'row', alignItems: 'center', gap: spazi.s },
  nome: { ...testi.corpo, fontWeight: '700', color: c.testo, flexShrink: 1 },
  offerta: { fontSize: 12, color: c.testoTenue },
  quando: { fontSize: 11, color: c.testoDebole },
  messaggio: { fontSize: 13, color: c.testoTenue, lineHeight: 18 },
  errore: { color: c.errore, fontSize: 13, paddingBottom: spazi.s },
  riassunto: { paddingTop: spazi.l, gap: spazi.xs },
  riassuntoTesto: { ...testi.sottotitolo, color: c.testo },
  testaSezione: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spazi.l,
    paddingBottom: spazi.xs,
  },
  titoloSezione: { ...testi.etichetta, color: c.testoTenue },
  titoloOggi: { color: c.accento },
  apriChiuse: { fontSize: 13, fontWeight: '700', color: c.primarioChiaro },
  rigaFondo: { flexDirection: 'row', alignItems: 'center', gap: spazi.s, flexWrap: 'wrap' },
  promemoria: { fontSize: 12, fontWeight: '600', color: c.testoTenue },
  promemoriaScaduto: { color: c.azione },
  azioni: { flexDirection: 'row', gap: spazi.s, alignSelf: 'stretch' },
  azione: {
    flex: 1,
    minHeight: 40,
    borderRadius: raggio.m,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.superficieAlta,
  },
  azioneTesto: { fontSize: 14, fontWeight: '700', color: c.primarioChiaro },
  azioneWhatsapp: { backgroundColor: '#25D366' },
  azioneWhatsappTesto: { color: '#FFFFFF' },
}));