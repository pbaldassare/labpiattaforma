import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ETICHETTA_FORMULA,
  ETICHETTA_ORIGINE,
  ETICHETTA_STATO_PRATICA,
  formattaEuro,
  messaggioWhatsApp,
  quandoBreve,
  tab,
  urlPagina,
  type FormulaAcquisto,
  type Promemoria,
  type StatoPratica,
  type TipoCliente,
  type VoceStorico,
} from '@lab/shared';

import { Icona } from '@/components/icone';
import { Bottone, Campo, Input, Scelta, Sezione } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, stiliTema } from '@/lib/tema';

const DOMINIO = process.env.EXPO_PUBLIC_DOMINIO_LANDING ?? 'https://dominio-da-decidere.it';

const STATI: StatoPratica[] = [
  'da_richiamare',
  'in_trattativa',
  'preventivo_inviato',
  'venduto',
  'chiuso',
];

interface DettaglioPratica {
  id: string;
  stato: StatoPratica;
  offerta_id: string | null;
  cliente_id: string;
  cliente_nome: string;
  cliente_telefono: string | null;
  cliente_email: string | null;
  cliente_tipo: TipoCliente;
  offerta_titolo: string | null;
  prezzo_pubblico_cent: number | null;
  prezzo_rivenditore_cent: number | null;
  prossimo_promemoria: string | null;
  codice_pagina: string | null;
}

interface RigaPreventivo {
  id: string;
  numero: number;
  formula: FormulaAcquisto;
  prezzo_cent: number;
  firmato_il: string | null;
}

/** Scorciatoie invece di un calendario: il richiamo si fissa in due tocchi. */
const QUANDO = [
  { etichetta: 'Domani', giorni: 1 },
  { etichetta: 'Fra 3 giorni', giorni: 3 },
  { etichetta: 'Fra una settimana', giorni: 7 },
];

type RigaPromemoria = Pick<Promemoria, 'id' | 'quando' | 'motivo'>;

/** "giovedì 9 ottobre": il giorno della settimana conta piu' del numero. */
function giornoLungo(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function DettaglioPraticaSchermata() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [pratica, setPratica] = useState<DettaglioPratica | null>(null);
  const [storico, setStorico] = useState<VoceStorico[]>([]);
  const [preventivi, setPreventivi] = useState<RigaPreventivo[]>([]);
  const [promemoria, setPromemoria] = useState<RigaPromemoria[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [nota, setNota] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    const [p, s, pv, pr] = await Promise.all([
      supabase.from(tab('pratica_elenco')).select('*').eq('id', id).maybeSingle(),
      supabase
        .from(tab('storico_pratica'))
        .select('id, pratica_id, origine, testo, creato_il')
        .eq('pratica_id', id)
        .order('creato_il', { ascending: false }),
      supabase
        .from(tab('preventivo'))
        .select('id, numero, formula, prezzo_cent, firmato_il')
        .eq('pratica_id', id)
        .order('numero', { ascending: false }),
      // Solo quelli ancora da fare: i fatti e i cancellati non servono qui.
      supabase
        .from(tab('promemoria'))
        .select('id, quando, motivo')
        .eq('pratica_id', id)
        .eq('fatto', false)
        .order('quando', { ascending: true }),
    ]);

    if (p.error) setErrore(p.error.message);
    setPratica((p.data as DettaglioPratica | null) ?? null);
    setStorico((s.data ?? []) as VoceStorico[]);
    setPreventivi((pv.data ?? []) as RigaPreventivo[]);
    setPromemoria((pr.data ?? []) as RigaPromemoria[]);
    setCaricamento(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void carica();
    }, [carica])
  );

  async function cambiaStato(nuovo: StatoPratica | null) {
    if (!nuovo || !pratica) return;
    setPratica({ ...pratica, stato: nuovo });
    const { error } = await supabase.from(tab('pratica')).update({ stato: nuovo }).eq('id', id);
    if (error) {
      setErrore(error.message);
      void carica();
    }
  }

  async function aggiungiNota(origine: 'chiamata' | 'nota') {
    const testo = nota.trim();
    if (!testo) return;
    setNota('');
    const { error } = await supabase
      .from(tab('contatto_storico'))
      .insert({ pratica_id: id, origine, testo });
    if (error) setErrore(error.message);
    void carica();
  }

  /**
   * Il testo lo scrive il venditore, se vuole: "Portargli il preventivo",
   * "Sentire se ha venduto la sua". Vuoto, resta il richiamo con il nome.
   */
  async function fissaRichiamo(giorni: number) {
    if (!pratica) return;
    const quando = new Date();
    quando.setDate(quando.getDate() + giorni);
    quando.setHours(9, 0, 0, 0);

    const { error } = await supabase.from(tab('promemoria')).insert({
      pratica_id: id,
      quando: quando.toISOString(),
      motivo: motivo.trim() || `Richiamare ${pratica.cliente_nome}`,
    });
    if (error) setErrore(error.message);
    setMotivo('');
    void carica();
  }

  /**
   * Un promemoria si toglie in due modi, e sono due cose diverse: "fatto"
   * dice che la chiamata c'e' stata, "elimina" che non andava fissato. Il
   * primo resta nel database come traccia, il secondo sparisce.
   */
  async function segnaFatto(promemoriaId: string) {
    setPromemoria((prima) => prima.filter((p) => p.id !== promemoriaId));
    const { error } = await supabase
      .from(tab('promemoria'))
      .update({ fatto: true })
      .eq('id', promemoriaId);
    if (error) {
      setErrore(error.message);
      void carica();
    }
  }

  async function elimina(promemoriaId: string) {
    setPromemoria((prima) => prima.filter((p) => p.id !== promemoriaId));
    const { error } = await supabase.from(tab('promemoria')).delete().eq('id', promemoriaId);
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

  if (!pratica) {
    return (
      <View style={stili.centrato}>
        <Text style={stili.vuoto}>Pratica non trovata.</Text>
      </View>
    );
  }

  // Il prezzo da citare dipende da chi si ha davanti (§3.7).
  const prezzo =
    pratica.cliente_tipo === 'rivenditore'
      ? pratica.prezzo_rivenditore_cent
      : pratica.prezzo_pubblico_cent;

  return (
    <ScrollView style={stili.contenitore} contentContainerStyle={stili.scorrimento}>
      <View style={stili.scheda}>
        <View style={stili.testa}>
          <Text style={stili.nome}>{pratica.cliente_nome}</Text>
          {pratica.cliente_tipo === 'rivenditore' && (
            <Text style={stili.rivenditore}>rivenditore</Text>
          )}
        </View>

        {pratica.offerta_titolo && (
          <Text style={stili.offerta}>
            {pratica.offerta_titolo}
            {prezzo != null ? ` · ${formattaEuro(prezzo)}` : ''}
          </Text>
        )}

        <View style={stili.recapiti}>
          {pratica.cliente_telefono && (
            <Bottone
              tenue
              testo={pratica.cliente_telefono}
              onPress={() => void Linking.openURL(`tel:${pratica.cliente_telefono}`)}
            />
          )}
          {pratica.cliente_email && (
            <Bottone
              tenue
              testo={pratica.cliente_email}
              onPress={() => void Linking.openURL(`mailto:${pratica.cliente_email}`)}
            />
          )}
          {pratica.cliente_telefono && pratica.offerta_titolo && (
            <Bottone
              testo="WhatsApp"
              onPress={() => {
                // Al rivenditore si manda il link riservato, al privato quello
                // pubblico: la vista sceglie gia' il codice giusto.
                const url = pratica.codice_pagina
                  ? urlPagina(DOMINIO, 'vendita', pratica.codice_pagina)
                  : DOMINIO;
                const testo = messaggioWhatsApp(
                  pratica.offerta_titolo ?? '',
                  prezzo ?? 0,
                  url,
                  pratica.cliente_nome.split(' ')[0]
                );
                const numero = (pratica.cliente_telefono ?? '').replace(/[^\d]/g, '');
                void Linking.openURL(
                  `https://wa.me/${numero}?text=${encodeURIComponent(testo)}`
                );
              }}
            />
          )}
        </View>

        {/* I dati del cliente si correggono nell'elenco clienti, che si apre
            gia' su di lui: un'email presa a voce si aggiunge da qui. */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/clienti',
              params: { apri: pratica.cliente_id, modifica: '1' },
            })
          }
          accessibilityRole="button"
          style={({ pressed }) => [stili.modificaCliente, pressed && stili.premuto]}
        >
          <Icona nome="matita" dimensione={14} colore={colori.primarioChiaro} />
          <Text style={stili.modificaClienteTesto}>Modifica i dati del cliente</Text>
        </Pressable>
      </View>

      {errore ? <Text style={stili.errore}>{errore}</Text> : null}

      <Sezione titolo="A che punto è">
        <Scelta
          valore={pratica.stato}
          consentiVuoto={false}
          onCambia={(v) => void cambiaStato(v)}
          opzioni={STATI.map((s) => ({ valore: s, etichetta: ETICHETTA_STATO_PRATICA[s] }))}
        />
      </Sezione>

      <Sezione titolo="Preventivo">
        {preventivi.length > 0 ? (
          preventivi.map((pv) => (
            <View key={pv.id} style={stili.preventivo}>
              <Text style={stili.preventivoNumero}>Preventivo n. {pv.numero}</Text>
              <Text style={stili.preventivoDati}>
                {ETICHETTA_FORMULA[pv.formula]} · {formattaEuro(pv.prezzo_cent)} ·{' '}
                {quandoBreve(pv.firmato_il)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={stili.vuoto}>Nessun preventivo ancora.</Text>
        )}
        {pratica.offerta_id && (
          <Bottone
            testo={preventivi.length > 0 ? 'Fai un altro preventivo' : 'Fai il preventivo'}
            onPress={() => router.push({ pathname: '/preventivo/[pratica]', params: { pratica: id } })}
          />
        )}
      </Sezione>

      <Sezione titolo="Promemoria" icona="campanello" tinta={colori.accento}>
        {promemoria.map((p) => (
          <View key={p.id} style={stili.promemoria}>
            <View style={stili.promemoriaTesti}>
              <Text style={stili.promemoriaMotivo}>{p.motivo}</Text>
              <Text style={stili.promemoriaQuando}>{giornoLungo(p.quando)}</Text>
            </View>
            <Pressable
              onPress={() => void segnaFatto(p.id)}
              accessibilityRole="button"
              accessibilityLabel={`Segna fatto: ${p.motivo}`}
              hitSlop={6}
              style={({ pressed }) => [stili.tastoPromemoria, pressed && stili.premuto]}
            >
              <Icona nome="spunta" dimensione={16} colore={colori.successo} />
              <Text style={[stili.tastoPromemoriaTesto, { color: colori.successo }]}>Fatto</Text>
            </Pressable>
            <Pressable
              onPress={() => void elimina(p.id)}
              accessibilityRole="button"
              accessibilityLabel={`Elimina promemoria: ${p.motivo}`}
              hitSlop={6}
              style={({ pressed }) => [stili.tastoPromemoria, pressed && stili.premuto]}
            >
              <Icona nome="cestino" dimensione={16} colore={colori.azione} />
              <Text style={[stili.tastoPromemoriaTesto, { color: colori.azione }]}>Elimina</Text>
            </Pressable>
          </View>
        ))}
        {promemoria.length === 0 && (
          <Text style={stili.vuoto}>Nessun promemoria fissato.</Text>
        )}

        <Campo etichetta="Nuovo promemoria" aiuto="Vuoto, resta il richiamo con il nome.">
          <Input
            value={motivo}
            onChangeText={setMotivo}
            placeholder={`Richiamare ${pratica.cliente_nome}`}
          />
        </Campo>
        <View style={stili.quando}>
          {QUANDO.map((q) => (
            <Bottone
              key={q.giorni}
              tenue
              testo={q.etichetta}
              onPress={() => void fissaRichiamo(q.giorni)}
            />
          ))}
        </View>
      </Sezione>

      <Sezione titolo="Storico">
        <Campo etichetta="Aggiungi una nota">
          <Input
            value={nota}
            onChangeText={setNota}
            placeholder="Richiamato, vuole vederla sabato"
            multiline
          />
        </Campo>
        <View style={stili.azioniNota}>
          <Bottone
            tenue
            testo="Segna una chiamata"
            disabilitato={!nota.trim()}
            onPress={() => void aggiungiNota('chiamata')}
          />
          <Bottone
            tenue
            testo="Salva appunto"
            disabilitato={!nota.trim()}
            onPress={() => void aggiungiNota('nota')}
          />
        </View>

        {storico.map((v) => (
          <View key={v.id} style={stili.voce}>
            <View style={stili.voceTesta}>
              <Text style={stili.voceOrigine}>{ETICHETTA_ORIGINE[v.origine]}</Text>
              <Text style={stili.voceQuando}>{quandoBreve(v.creato_il)}</Text>
            </View>
            {v.testo && <Text style={stili.voceTesto}>{v.testo}</Text>}
          </View>
        ))}

        {storico.length === 0 && <Text style={stili.vuoto}>Ancora nessun contatto.</Text>}
      </Sezione>
    </ScrollView>
  );
}

const stili = stiliTema((c) => StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: c.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
  scorrimento: { padding: spazi.l, paddingBottom: spazi.xxl * 2, gap: spazi.s },
  scheda: {
    backgroundColor: c.superficie,
    borderWidth: 1,
    borderColor: c.bordoTenue,
    borderRadius: raggio.l,
    padding: spazi.l,
    gap: spazi.s,
  },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazi.s },
  nome: { fontSize: 20, fontWeight: '700', color: c.testo, flexShrink: 1 },
  rivenditore: {
    fontSize: 11,
    fontWeight: '600',
    color: c.accento,
    textTransform: 'uppercase',
  },
  offerta: { fontSize: 14, color: c.primarioChiaro, fontWeight: '600' },
  recapiti: { gap: spazi.s, marginTop: spazi.xs },
  errore: { color: c.errore, fontSize: 13 },
  modificaCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazi.xs,
    alignSelf: 'flex-start',
    minHeight: 32,
    marginTop: spazi.xs,
  },
  modificaClienteTesto: { fontSize: 13, fontWeight: '600', color: c.primarioChiaro },
  premuto: { opacity: 0.7 },
  promemoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazi.m,
    borderWidth: 1,
    borderColor: c.bordo,
    borderRadius: raggio.m,
    paddingVertical: spazi.s,
    paddingHorizontal: spazi.m,
  },
  promemoriaTesti: { flex: 1, gap: 2 },
  promemoriaMotivo: { fontSize: 14, fontWeight: '600', color: c.testo },
  promemoriaQuando: { fontSize: 12, color: c.accento, fontWeight: '600' },
  tastoPromemoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazi.xs,
    minHeight: 36,
    paddingHorizontal: spazi.xs,
  },
  tastoPromemoriaTesto: { fontSize: 12, fontWeight: '600' },
  quando: { gap: spazi.s },
  azioniNota: { gap: spazi.s },
  voce: {
    borderLeftWidth: 2,
    borderLeftColor: c.bordo,
    paddingLeft: spazi.m,
    paddingVertical: spazi.xs,
    gap: 2,
  },
  voceTesta: { flexDirection: 'row', justifyContent: 'space-between' },
  voceOrigine: { fontSize: 12, fontWeight: '600', color: c.testo },
  voceQuando: { fontSize: 12, color: c.testoTenue },
  voceTesto: { fontSize: 14, color: c.testoTenue, lineHeight: 19 },
  vuoto: { fontSize: 13, color: c.testoTenue },
  preventivo: {
    borderWidth: 1,
    borderColor: c.bordo,
    borderRadius: raggio.m,
    padding: spazi.m,
    gap: 2,
  },
  preventivoNumero: { fontSize: 14, fontWeight: '700', color: c.testo },
  preventivoDati: { fontSize: 13, color: c.testoTenue },
}));