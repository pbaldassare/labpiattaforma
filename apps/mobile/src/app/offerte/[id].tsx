import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

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
  ETICHETTA_MODULO,
  formattaEuro,
  urlPagina,
  type Modulo,
  type Offerta,
  type OffertaVendita,
  type StatoOfferta,
  type TipoPagina,
} from '@lab/shared';

import { tab } from '@lab/shared';
import { Pillola } from '@/components/base';
import { Fotografie, type Foto } from '@/components/foto';
import { Icona } from '@/components/icone';
import { Bottone, Scelta, Sezione } from '@/components/modulo';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, stiliTema, TOCCO_MINIMO } from '@/lib/tema';

const DOMINIO = process.env.EXPO_PUBLIC_DOMINIO_LANDING ?? 'https://dominio-da-decidere.it';

/** Dove si riapre l'offerta per correggerla, modulo per modulo. */
const DOVE_MODIFICA = {
  vendita: '/offerte/nuova',
  noleggio_breve: '/offerte/nuova-breve',
  noleggio_lungo: '/offerte/nuova-lungo',
  assicurazioni: '/offerte/nuova-assicurazione',
} as const satisfies Record<Modulo, string>;

/**
 * Gli stati che il venditore cambia a mano.
 *
 * "Venduta" non toglie la pagina dal mondo: chi ha il link vede che il mezzo
 * non c'e' piu', invece di trovare un indirizzo morto. Sparisce solo dalla
 * vetrina, che e' la cosa giusta.
 */
const STATI: { valore: StatoOfferta; etichetta: string }[] = [
  { valore: 'bozza', etichetta: 'Bozza' },
  { valore: 'attiva', etichetta: 'Pubblicata' },
  { valore: 'sospesa', etichetta: 'Sospesa' },
  { valore: 'venduta', etichetta: 'Venduta' },
];

const SPIEGAZIONE: Record<StatoOfferta, string> = {
  bozza: 'Non compare da nessuna parte: la stai ancora preparando.',
  attiva: 'In vetrina, e il link funziona.',
  sospesa: 'Fuori dalla vetrina. Chi ha il link legge che non è più disponibile.',
  venduta: 'Fuori dalla vetrina. Chi ha il link legge che non è più disponibile.',
};

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
  const router = useRouter();

  const [offerta, setOfferta] = useState<Offerta | null>(null);
  const [vendita, setVendita] = useState<OffertaVendita | null>(null);
  const [breve, setBreve] = useState<TariffeBrevi | null>(null);
  const [pagine, setPagine] = useState<Contatori[]>([]);
  const [foto, setFoto] = useState<Foto[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [chiedeConferma, setChiedeConferma] = useState(false);

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

  async function cambiaStato(nuovo: StatoOfferta) {
    if (!offerta || nuovo === offerta.stato) return;
    // Ottimistico: l'etichetta deve cambiare sotto il dito.
    setOfferta({ ...offerta, stato: nuovo });
    const { error } = await supabase.from(tab('offerta')).update({ stato: nuovo }).eq('id', id);
    if (error) {
      setErrore(error.message);
      void carica();
    }
  }

  /**
   * Cancellare porta via anche le pagine e le pratiche collegate, per via dei
   * vincoli sul database. Percio' si chiede conferma una volta sola ma con
   * scritto cosa sparisce, invece di un "sei sicuro?" che non dice niente.
   */
  async function elimina() {
    const { error } = await supabase.from(tab('offerta')).delete().eq('id', id);
    if (error) {
      setErrore(error.message);
      setChiedeConferma(false);
      return;
    }
    router.replace('/offerte');
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
        <View style={stili.rigaTitolo}>
          <Text style={stili.titolo}>{offerta.titolo}</Text>
          <Pillola testo={ETICHETTA_MODULO[offerta.modulo]} />
        </View>
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

      <Bottone
        testo="Modifica l’offerta"
        icona="matita"
        onPress={() =>
          router.push({
            pathname: DOVE_MODIFICA[offerta.modulo],
            params: { id },
          })
        }
      />

      <Sezione titolo="Stato">
        <Scelta
          valore={offerta.stato}
          consentiVuoto={false}
          opzioni={STATI}
          onCambia={(v) => void cambiaStato((v ?? 'bozza') as StatoOfferta)}
        />
        <Text style={stili.nota}>{SPIEGAZIONE[offerta.stato]}</Text>
      </Sezione>

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

      <View style={stili.fondo}>
        {chiedeConferma ? (
          <View style={stili.conferma}>
            <View style={stili.rigaConferma}>
              <Icona nome="attenzione" dimensione={18} colore={colori.azione} />
              <Text style={stili.testoConferma}>
                Sparisce l’offerta con le sue foto, le sue pagine e le pratiche collegate. I link
                già mandati smettono di funzionare. Non si torna indietro.
              </Text>
            </View>
            <Bottone tipo="azione" testo="Sì, elimina" onPress={() => void elimina()} />
            <Bottone tenue testo="Lascia stare" onPress={() => setChiedeConferma(false)} />
          </View>
        ) : (
          <Bottone
            tipo="nudo"
            testo="Elimina l’offerta"
            onPress={() => setChiedeConferma(true)}
          />
        )}
      </View>
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

const stili = stiliTema((c) => StyleSheet.create({
  rigaTitolo: { flexDirection: 'row', alignItems: 'center', gap: spazi.s, flexWrap: 'wrap' },
  fondo: { paddingTop: spazi.xxl, gap: spazi.s },
  conferma: {
    gap: spazi.s,
    padding: spazi.l,
    borderRadius: raggio.m,
    borderWidth: 1,
    borderColor: c.azione,
    backgroundColor: c.superficie,
  },
  rigaConferma: { flexDirection: 'row', gap: spazi.s, alignItems: 'flex-start' },
  testoConferma: { flex: 1, fontSize: 13, lineHeight: 18, color: c.testo },
  contenitore: { flex: 1, backgroundColor: c.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
  scorrimento: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxl },
  vuoto: { textAlign: 'center', color: c.testoTenue },
  intestazione: { gap: spazi.s },
  titolo: { fontSize: 20, fontWeight: '700', color: c.testo },
  prezzi: { flexDirection: 'row', gap: spazi.xl },
  prezzoEtichetta: { fontSize: 12, color: c.testoTenue },
  prezzoValore: { fontSize: 18, fontWeight: '700', color: c.testo },
  errore: { color: c.errore, fontSize: 13 },
  scheda: {
    backgroundColor: c.superficie,
    borderWidth: 1,
    borderColor: c.bordoTenue,
    borderRadius: raggio.l,
    padding: spazi.l,
    gap: spazi.m,
  },
  schedaRiservata: { borderColor: c.primarioChiaro },
  schedaTesta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  schedaTitolo: { fontSize: 15, fontWeight: '700', color: c.testo },
  indirizzo: { fontSize: 13, color: c.primarioChiaro },
  qrRiga: { flexDirection: 'row', alignItems: 'center', gap: spazi.xl },
  qr: { padding: spazi.s, backgroundColor: c.superficie },
  contatori: { gap: spazi.m },
  contatoreNumero: { fontSize: 22, fontWeight: '700', color: c.testo },
  contatoreEtichetta: { fontSize: 12, color: c.testoTenue },
  azioni: { flexDirection: 'row', gap: spazi.s },
  azione: {
    flex: 1,
    minHeight: TOCCO_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raggio.m,
    borderWidth: 1,
    borderColor: c.bordo,
  },
  azioneTesto: { fontSize: 15, fontWeight: '600', color: c.primarioChiaro },
  sospesa: { fontSize: 12, color: c.accento, lineHeight: 17 },
  nota: { fontSize: 12, color: c.testoTenue, lineHeight: 17 },
}));