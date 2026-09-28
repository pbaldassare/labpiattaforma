import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  DESCRIZIONE_FORMULA,
  ETICHETTA_FORMULA,
  fn,
  formattaEuro,
  tab,
  type FormulaAcquisto,
  type TipoCliente,
} from '@lab/shared';

import { Firma, type EsitoFirma } from '@/components/firma';
import { Bottone, Scelta, Sezione } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, stiliTema, TOCCO_MINIMO } from '@/lib/tema';

interface DatiPreventivo {
  offerta_id: string | null;
  offerta_titolo: string | null;
  cliente_nome: string;
  cliente_tipo: TipoCliente;
  prezzo_pubblico_cent: number | null;
  prezzo_rivenditore_cent: number | null;
}

const DOCUMENTI = [
  { chiave: 'doc_identita', etichetta: 'Carta d’identità e codice fiscale' },
  { chiave: 'doc_reddito', etichetta: 'Documento di reddito' },
  { chiave: 'doc_passaggio', etichetta: 'Passaggio di proprietà' },
] as const;

export default function Preventivo() {
  const { pratica: praticaId } = useLocalSearchParams<{ pratica: string }>();
  const router = useRouter();

  const [dati, setDati] = useState<DatiPreventivo | null>(null);
  const [formule, setFormule] = useState<FormulaAcquisto[]>([]);
  const [formula, setFormula] = useState<FormulaAcquisto | null>(null);
  const [firma, setFirma] = useState<EsitoFirma>({ tracciato: '', valida: false });
  const [documenti, setDocumenti] = useState<Record<string, boolean>>({});
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const p = await supabase
        .from(tab('pratica_elenco'))
        .select(
          'offerta_id, offerta_titolo, cliente_nome, cliente_tipo, prezzo_pubblico_cent, prezzo_rivenditore_cent'
        )
        .eq('id', praticaId)
        .maybeSingle();

      const riga = (p.data as DatiPreventivo | null) ?? null;
      setDati(riga);

      if (riga?.offerta_id) {
        const f = await supabase
          .from(tab('offerta_formula'))
          .select('formula')
          .eq('offerta_id', riga.offerta_id);
        const elenco = ((f.data ?? []) as { formula: FormulaAcquisto }[]).map((x) => x.formula);
        setFormule(elenco);
        if (elenco.length === 1) setFormula(elenco[0]!);
      }
      setCaricamento(false);
    })();
  }, [praticaId]);

  // Il prezzo dipende da chi si ha davanti. Se manca, il preventivo non si fa:
  // e' la regola del documento §4.4, ed e' anche il database a imporla.
  const prezzo =
    dati?.cliente_tipo === 'rivenditore'
      ? dati?.prezzo_rivenditore_cent
      : dati?.prezzo_pubblico_cent;

  const prezzoMancante = dati != null && prezzo == null;

  async function salva() {
    if (!formula) return;
    setErrore(null);
    setSalvataggio(true);

    const { data, error } = await supabase.rpc(fn('crea_preventivo'), {
      p_pratica_id: praticaId,
      p_formula: formula,
      p_firma: firma.tracciato,
    });

    if (error) {
      setSalvataggio(false);
      setErrore(traduci(error.message));
      return;
    }

    const spunte = DOCUMENTI.reduce<Record<string, boolean>>((acc, d) => {
      acc[d.chiave] = documenti[d.chiave] ?? false;
      return acc;
    }, {});

    // Le spunte sui documenti non bloccano il preventivo (§4.4): si salvano
    // dopo, e se questa seconda scrittura fallisce il preventivo resta valido.
    await supabase.from(tab('preventivo')).update(spunte).eq('id', data as string);

    setSalvataggio(false);
    router.replace(`/pratiche/${praticaId}`);
  }

  if (caricamento) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  if (!dati) {
    return (
      <View style={stili.centrato}>
        <Text style={stili.vuoto}>Pratica non trovata.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={stili.contenitore} contentContainerStyle={stili.scorrimento}>
      <View style={stili.riepilogo}>
        <Text style={stili.cliente}>{dati.cliente_nome}</Text>
        {dati.cliente_tipo === 'rivenditore' && (
          <Text style={stili.rivenditore}>prezzo riservato agli operatori</Text>
        )}
        {dati.offerta_titolo && <Text style={stili.veicolo}>{dati.offerta_titolo}</Text>}
        {prezzo != null && <Text style={stili.prezzo}>{formattaEuro(prezzo)}</Text>}
      </View>

      {prezzoMancante && (
        <Text style={stili.bloccante}>
          Il cliente è un rivenditore ma su questa offerta non hai messo il prezzo rivenditore.
          Aggiungilo prima di fare il preventivo: mandargli il prezzo al pubblico sarebbe un
          errore.
        </Text>
      )}

      <Sezione titolo="Come acquista">
        {formule.length === 0 ? (
          <Text style={stili.vuoto}>
            Su questa offerta non hai attivato nessuna formula d’acquisto.
          </Text>
        ) : (
          <>
            <Scelta
              valore={formula}
              consentiVuoto={false}
              onCambia={setFormula}
              opzioni={formule.map((f) => ({ valore: f, etichetta: ETICHETTA_FORMULA[f] }))}
            />
            {formula && <Text style={stili.descrizione}>{DESCRIZIONE_FORMULA[formula]}</Text>}
          </>
        )}
      </Sezione>

      <Sezione titolo="Firma del cliente">
        <Firma onCambia={setFirma} />
        {firma.tracciato !== '' && !firma.valida && (
          <Text style={stili.avviso}>
            Serve una firma intera, non un segno: riprova facendola più ampia.
          </Text>
        )}
      </Sezione>

      <Sezione titolo="Documenti da raccogliere">
        {DOCUMENTI.map((d) => (
          <Pressable
            key={d.chiave}
            onPress={() => setDocumenti((x) => ({ ...x, [d.chiave]: !x[d.chiave] }))}
            style={stili.spunta}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: documenti[d.chiave] ?? false }}
          >
            <View style={[stili.casella, documenti[d.chiave] && stili.casellaPiena]}>
              {documenti[d.chiave] && <Text style={stili.segno}>✓</Text>}
            </View>
            <Text style={stili.spuntaTesto}>{d.etichetta}</Text>
          </Pressable>
        ))}
        <Text style={stili.nota}>Non bloccano il preventivo: servono a ricordarti cosa manca.</Text>
      </Sezione>

      {errore ? <Text style={stili.errore}>{errore}</Text> : null}

      <Bottone
        testo="Genera il preventivo"
        inCorso={salvataggio}
        disabilitato={!formula || !firma.valida || prezzoMancante}
        onPress={() => void salva()}
      />
    </ScrollView>
  );
}

function traduci(messaggio: string): string {
  if (messaggio.includes('prezzo_rivenditore_non_impostato')) {
    return 'Prezzo rivenditore non impostato su questa offerta.';
  }
  if (messaggio.includes('formula_non_prevista')) {
    return 'Questa formula non è attiva sull’offerta.';
  }
  if (messaggio.includes('firma_mancante')) {
    return 'La firma non è valida.';
  }
  if (messaggio.includes('pratica_senza_offerta')) {
    return 'Questa pratica non è collegata a nessuna offerta.';
  }
  return messaggio;
}

const stili = stiliTema((c) => StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: c.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
  scorrimento: { padding: spazi.l, paddingBottom: spazi.xxl * 2, gap: spazi.s },
  riepilogo: {
    backgroundColor: c.superficie,
    borderWidth: 1,
    borderColor: c.bordoTenue,
    borderRadius: raggio.l,
    padding: spazi.l,
    gap: spazi.xs,
  },
  cliente: { fontSize: 18, fontWeight: '700', color: c.testo },
  rivenditore: { fontSize: 12, fontWeight: '600', color: c.accento },
  veicolo: { fontSize: 15, color: c.testoTenue },
  prezzo: { fontSize: 28, fontWeight: '700', color: c.testo, marginTop: spazi.xs },
  bloccante: {
    fontSize: 13,
    color: c.errore,
    lineHeight: 19,
    backgroundColor: c.superficie,
    borderWidth: 1,
    borderColor: c.errore,
    borderRadius: raggio.m,
    padding: spazi.m,
  },
  descrizione: { fontSize: 13, color: c.testoTenue },
  avviso: { fontSize: 13, color: c.accento },
  spunta: { flexDirection: 'row', alignItems: 'center', gap: spazi.m, minHeight: TOCCO_MINIMO },
  casella: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: c.bordo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casellaPiena: { backgroundColor: c.primario, borderColor: c.primario },
  segno: { color: c.suPrimario, fontSize: 14, fontWeight: '700' },
  spuntaTesto: { fontSize: 15, color: c.testo, flexShrink: 1 },
  nota: { fontSize: 12, color: c.testoTenue, lineHeight: 17 },
  errore: { fontSize: 14, color: c.errore },
  vuoto: { fontSize: 14, color: c.testoTenue, textAlign: 'center' },
}));