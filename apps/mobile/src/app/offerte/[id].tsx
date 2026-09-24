import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Testo as Text } from '@/components/testo';
import QRCode from 'react-native-qrcode-svg';
import {
  formattaEuro,
  urlPagina,
  type Modulo,
  type Offerta,
  type OffertaVendita,
  type TipoPagina,
} from '@lab/shared';

import { fn, tab } from '@lab/shared';
import { Fotografie, type Foto } from '@/components/foto';
import { Sezione } from '@/components/modulo';
import { supabase } from '@/lib/supabase';
import { TOCCO_MINIMO, colori, raggio, spazi } from '@/lib/tema';

const DOMINIO = process.env.EXPO_PUBLIC_DOMINIO_LANDING ?? 'https://dominio-da-decidere.it';

/** Le tariffe del noleggio breve, per mostrarle al venditore come i prezzi di vendita. */
interface TariffeBrevi {
  tariffa_giorno_cent: number;
  tariffa_giorno_rivenditore_cent: number | null;
}

interface Contatori {
  pagina_id: string;
  tipo: TipoPagina;
  codice: string;
  pubblicata: boolean;
  aperture: number;
  contatti: number;
}

export default function DettaglioOfferta() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [offerta, setOfferta] = useState<Offerta | null>(null);
  const [vendita, setVendita] = useState<OffertaVendita | null>(null);
  const [breve, setBreve] = useState<TariffeBrevi | null>(null);
  const [pagine, setPagine] = useState<Contatori[]>([]);
  const [foto, setFoto] = useState<Foto[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    const [o, v, b, p, f] = await Promise.all([
      supabase.from(tab('offerta')).select('*').eq('id', id).maybeSingle<Offerta>(),
      supabase.from(tab('offerta_vendita')).select('*').eq('offerta_id', id).maybeSingle<OffertaVendita>(),
      supabase
        .from(tab('offerta_noleggio_breve'))
        .select('tariffa_giorno_cent, tariffa_giorno_rivenditore_cent')
        .eq('offerta_id', id)
        .maybeSingle<TariffeBrevi>(),
      supabase.from(tab('pagina_contatori')).select('*').eq('offerta_id', id).order('tipo'),
      supabase
        .from(tab('offerta_foto'))
        .select('id, path, ordine')
        .eq('offerta_id', id)
        .order('ordine'),
    ]);

    if (o.error) setErrore(o.error.message);
    setOfferta(o.data ?? null);
    setVendita(v.data ?? null);
    setBreve(b.data ?? null);
    setPagine((p.data ?? []) as Contatori[]);
    setFoto((f.data ?? []) as Foto[]);
    setCaricamento(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void carica();
    }, [carica])
  );

  async function commutaPubblicazione(pagina: Contatori, attiva: boolean) {
    // Ottimistico: l'interruttore deve rispondere subito al dito.
    setPagine((attuali) =>
      attuali.map((x) => (x.pagina_id === pagina.pagina_id ? { ...x, pubblicata: attiva } : x))
    );
    const { error } = await supabase
      .from(tab('pagina'))
      .update({ pubblicata: attiva })
      .eq('id', pagina.pagina_id);

    if (error) {
      setErrore(error.message);
      void carica();
    }
  }

  if (caricamento) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  if (!offerta) {
    return (
      <View style={stili.centrato}>
        <Text style={stili.vuoto}>Offerta non trovata.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={stili.contenitore} contentContainerStyle={stili.scorrimento}>
      <View style={stili.intestazione}>
        <Text style={stili.titolo}>{offerta.titolo}</Text>
        {vendita && (
          <View style={stili.prezzi}>
            <Prezzo etichetta="Al pubblico" centesimi={vendita.prezzo_pubblico_cent} />
            {vendita.prezzo_rivenditore_cent != null && (
              <Prezzo etichetta="Rivenditori" centesimi={vendita.prezzo_rivenditore_cent} />
            )}
          </View>
        )}
        {breve && (
          <View style={stili.prezzi}>
            <Prezzo etichetta="Al giorno" centesimi={breve.tariffa_giorno_cent} />
            {breve.tariffa_giorno_rivenditore_cent != null && (
              <Prezzo etichetta="Rivenditori" centesimi={breve.tariffa_giorno_rivenditore_cent} />
            )}
          </View>
        )}
      </View>

      {errore ? <Text style={stili.errore}>{errore}</Text> : null}

      <Sezione titolo="Foto">
        <Fotografie offertaId={id} foto={foto} onCambiate={() => void carica()} />
      </Sezione>

      {pagine.map((p) => (
        <SchedaPagina
          key={p.pagina_id}
          pagina={p}
          modulo={offerta.modulo}
          onCommuta={(v) => void commutaPubblicazione(p, v)}
        />
      ))}

      {pagine.length === 1 && (
        <Text style={stili.nota}>
          Senza prezzo rivenditore esiste solo la pagina pubblica. Aggiungilo per far nascere
          anche quella riservata.
        </Text>
      )}
    </ScrollView>
  );
}

function Prezzo({ etichetta, centesimi }: { etichetta: string; centesimi: number }) {
  return (
    <View>
      <Text style={stili.prezzoEtichetta}>{etichetta}</Text>
      <Text style={stili.prezzoValore}>{formattaEuro(centesimi)}</Text>
    </View>
  );
}

function SchedaPagina({
  pagina,
  modulo,
  onCommuta,
}: {
  pagina: Contatori;
  modulo: Modulo;
  onCommuta: (attiva: boolean) => void;
}) {
  const [copiato, setCopiato] = useState(false);
  // Ogni modulo ha il suo indirizzo: /v, /b, /l, /a. Prima era fisso su
  // "vendita", e le offerte degli altri moduli davano un link che non apriva
  // niente.
  const indirizzo = urlPagina(DOMINIO, modulo, pagina.codice);
  const riservata = pagina.tipo === 'riservata';

  async function copia() {
    await Clipboard.setStringAsync(indirizzo);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000);
  }

  return (
    <View style={[stili.scheda, riservata && stili.schedaRiservata]}>
      <View style={stili.schedaTesta}>
        <Text style={stili.schedaTitolo}>
          {riservata ? 'Link riservato' : 'Link pubblico'}
        </Text>
        <Switch
          value={pagina.pubblicata}
          onValueChange={onCommuta}
          trackColor={{ true: colori.primarioChiaro, false: colori.bordoTenue }}
          accessibilityLabel={
            riservata ? 'Pubblica la pagina riservata' : 'Pubblica la pagina pubblica'
          }
        />
      </View>

      <Text style={stili.indirizzo} selectable numberOfLines={2}>
        {indirizzo}
      </Text>

      <View style={stili.qrRiga}>
        <View style={stili.qr}>
          <QRCode value={indirizzo} size={96} color={colori.testo} backgroundColor="transparent" />
        </View>
        <View style={stili.contatori}>
          <Contatore numero={pagina.aperture} etichetta="aperture" />
          <Contatore numero={pagina.contatti} etichetta="contatti" />
        </View>
      </View>

      <View style={stili.azioni}>
        <Pressable style={stili.azione} onPress={() => void copia()} accessibilityRole="button">
          <Text style={stili.azioneTesto}>{copiato ? 'Copiato' : 'Copia'}</Text>
        </Pressable>
        <Pressable
          style={stili.azione}
          onPress={() => void Share.share({ message: indirizzo })}
          accessibilityRole="button"
        >
          <Text style={stili.azioneTesto}>Condividi</Text>
        </Pressable>
      </View>

      {!pagina.pubblicata && (
        <Text style={stili.sospesa}>
          Sospesa: il link resta valido ma mostra “offerta non più disponibile”.
        </Text>
      )}
    </View>
  );
}

function Contatore({ numero, etichetta }: { numero: number; etichetta: string }) {
  return (
    <View>
      <Text style={stili.contatoreNumero}>{numero}</Text>
      <Text style={stili.contatoreEtichetta}>{etichetta}</Text>
    </View>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: colori.sfondo },
  scorrimento: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxl },
  vuoto: { textAlign: 'center', color: colori.testoTenue },
  intestazione: { gap: spazi.s },
  titolo: { fontSize: 20, fontWeight: '700', color: colori.testo },
  prezzi: { flexDirection: 'row', gap: spazi.xl },
  prezzoEtichetta: { fontSize: 12, color: colori.testoTenue },
  prezzoValore: { fontSize: 18, fontWeight: '700', color: colori.testo },
  errore: { color: colori.errore, fontSize: 13 },
  scheda: {
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.bordoTenue,
    borderRadius: raggio.l,
    padding: spazi.l,
    gap: spazi.m,
  },
  schedaRiservata: { borderColor: colori.primarioChiaro },
  schedaTesta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  schedaTitolo: { fontSize: 15, fontWeight: '700', color: colori.testo },
  indirizzo: { fontSize: 13, color: colori.primario },
  qrRiga: { flexDirection: 'row', alignItems: 'center', gap: spazi.xl },
  qr: { padding: spazi.s, backgroundColor: colori.superficie },
  contatori: { gap: spazi.m },
  contatoreNumero: { fontSize: 22, fontWeight: '700', color: colori.testo },
  contatoreEtichetta: { fontSize: 12, color: colori.testoTenue },
  azioni: { flexDirection: 'row', gap: spazi.s },
  azione: {
    flex: 1,
    minHeight: TOCCO_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raggio.m,
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  azioneTesto: { fontSize: 15, fontWeight: '600', color: colori.primario },
  sospesa: { fontSize: 12, color: colori.accento, lineHeight: 17 },
  nota: { fontSize: 12, color: colori.testoTenue, lineHeight: 17 },
});
