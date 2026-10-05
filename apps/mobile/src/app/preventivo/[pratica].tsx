import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  DESCRIZIONE_FORMULA,
  ETICHETTA_FORMULA,
  ETICHETTA_MODULO,
  fn,
  formattaEuro,
  tab,
  type FormulaAcquisto,
  type Modulo,
  type TipoCliente,
} from '@lab/shared';

import { Firma, type EsitoFirma } from '@/components/firma';
import { Bottone, Campo, Input, Scelta, Sezione } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, stiliTema, TOCCO_MINIMO } from '@/lib/tema';

interface DatiPreventivo {
  offerta_id: string | null;
  offerta_titolo: string | null;
  cliente_nome: string;
  cliente_tipo: TipoCliente;
  modulo: Modulo;
}

/** Quello che il database propone come importo, e da dove lo prende. */
interface Proposta {
  prezzo_cent: number | null;
  fonte: 'prezzo_offerta' | 'prenotazione' | 'tariffa_giorno' | 'canone_minimo' | 'premio_partenza';
  prezzo_fisso: boolean;
}

/** Sotto il campo importo: da dove viene il numero proposto. */
const DA_DOVE: Record<Proposta['fonte'], string> = {
  prezzo_offerta: '',
  prenotazione: 'È il totale delle date che il cliente ha tenuto. Puoi cambiarlo.',
  tariffa_giorno: 'È la tariffa di un giorno: moltiplicala per i giorni che servono.',
  canone_minimo: 'È il canone mensile più basso dell’offerta: mettilo della combinazione scelta.',
  premio_partenza: 'È il premio di partenza: scrivi quello calcolato per questo cliente.',
};

const DOCUMENTI = [
  { chiave: 'doc_identita', etichetta: 'Carta d’identità e codice fiscale' },
  { chiave: 'doc_reddito', etichetta: 'Documento di reddito' },
  { chiave: 'doc_passaggio', etichetta: 'Passaggio di proprietà' },
] as const;

/** "1.250,50" o "1250" in centesimi; null se non e' un importo. */
function leggiEuro(testo: string): number | null {
  const pulito = testo.replace(/[€\s.]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(pulito)) return null;
  const cent = Math.round(Number(pulito) * 100);
  return cent > 0 ? cent : null;
}

function scriviEuro(cent: number): string {
  return (cent / 100).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Il preventivo, per qualunque modulo.
 *
 * Nella vendita il prezzo e' quello dell'offerta (pubblico o rivenditore) e
 * non si tocca; per noleggi e polizze dipende da date, durata o dati del
 * cliente, quindi lo scrive il venditore partendo da un numero proposto.
 * La firma e' facoltativa: un preventivo e' una proposta, non un contratto.
 */
export default function Preventivo() {
  const { pratica: praticaId } = useLocalSearchParams<{ pratica: string }>();
  const router = useRouter();

  const [dati, setDati] = useState<DatiPreventivo | null>(null);
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [importo, setImporto] = useState('');
  const [formule, setFormule] = useState<FormulaAcquisto[]>([]);
  const [formula, setFormula] = useState<FormulaAcquisto | null>(null);
  const [firma, setFirma] = useState<EsitoFirma>({ tracciato: '', valida: false });
  const [documenti, setDocumenti] = useState<Record<string, boolean>>({});
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [p, i] = await Promise.all([
        supabase
          .from(tab('pratica_elenco'))
          .select('offerta_id, offerta_titolo, cliente_nome, cliente_tipo, modulo')
          .eq('id', praticaId)
          .maybeSingle(),
        supabase.rpc(fn('importo_preventivo'), { p_pratica_id: praticaId }),
      ]);

      const riga = (p.data as DatiPreventivo | null) ?? null;
      setDati(riga);
      const prop = (i.data as Proposta | null) ?? null;
      setProposta(prop);
      if (prop?.prezzo_cent != null && !prop.prezzo_fisso) setImporto(scriviEuro(prop.prezzo_cent));

      if (riga?.offerta_id && riga.modulo === 'vendita') {
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

  const vendita = dati?.modulo === 'vendita';
  const rivenditore = dati?.cliente_tipo === 'rivenditore';
  const prezzoVendita = vendita ? (proposta?.prezzo_cent ?? null) : null;
  const importoCent = vendita ? prezzoVendita : leggiEuro(importo);
  // Una firma iniziata ma troppo piccola non si salva di nascosto: o si
  // rifa', o si cancella.
  const firmaAMeta = firma.tracciato !== '' && !firma.valida;
  const manca =
    importoCent == null
      ? vendita
        ? 'prezzo'
        : 'importo'
      : vendita && formule.length > 0 && !formula
        ? 'formula'
        : firmaAMeta
          ? 'firma'
          : null;

  async function salva() {
    setErrore(null);
    setSalvataggio(true);

    const { data, error } = await supabase.rpc(fn('crea_preventivo_v2'), {
      p_pratica_id: praticaId,
      p_formula: vendita ? formula : null,
      p_firma: firma.valida ? firma.tracciato : null,
      p_prezzo_cent: vendita ? null : importoCent,
    });

    if (error) {
      setSalvataggio(false);
      setErrore(traduci(error.message));
      return;
    }

    if (vendita) {
      const spunte = DOCUMENTI.reduce<Record<string, boolean>>((acc, d) => {
        acc[d.chiave] = documenti[d.chiave] ?? false;
        return acc;
      }, {});
      // Le spunte sui documenti non bloccano il preventivo (§4.4): si salvano
      // dopo, e se questa seconda scrittura fallisce il preventivo resta valido.
      await supabase.from(tab('preventivo')).update(spunte).eq('id', data as string);
    }

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
        <Text style={stili.tipo}>
          {rivenditore ? 'Rivenditore · prezzi riservati agli operatori' : 'Cliente privato'}
        </Text>
        {dati.offerta_titolo && (
          <Text style={stili.veicolo}>
            {ETICHETTA_MODULO[dati.modulo]} · {dati.offerta_titolo}
          </Text>
        )}
        {vendita && prezzoVendita != null && (
          <Text style={stili.prezzo}>{formattaEuro(prezzoVendita)}</Text>
        )}
      </View>

      {vendita && prezzoVendita == null && (
        <Text style={stili.bloccante}>
          {rivenditore
            ? 'Il cliente è un rivenditore ma su questa offerta non hai messo il prezzo rivenditore. Aggiungilo nell’offerta prima di fare il preventivo.'
            : 'Su questa offerta non hai messo il prezzo al pubblico. Aggiungilo nell’offerta prima di fare il preventivo.'}
        </Text>
      )}

      {!vendita && (
        <Sezione titolo="Importo">
          <Campo
            etichetta={dati.modulo === 'noleggio_lungo' ? 'Canone al mese (€)' : 'Importo (€)'}
            obbligatorio
            aiuto={proposta ? DA_DOVE[proposta.fonte] : undefined}
            errore={importo.trim() && importoCent == null ? 'Scrivi un importo come 320 o 1.250,50.' : null}
          >
            <Input
              value={importo}
              onChangeText={setImporto}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0"
            />
          </Campo>
        </Sezione>
      )}

      {vendita && formule.length > 0 && (
        <Sezione titolo="Come acquista">
          <Scelta
            valore={formula}
            consentiVuoto={false}
            onCambia={setFormula}
            opzioni={formule.map((f) => ({ valore: f, etichetta: ETICHETTA_FORMULA[f] }))}
          />
          {formula && <Text style={stili.descrizione}>{DESCRIZIONE_FORMULA[formula]}</Text>}
        </Sezione>
      )}

      <Sezione titolo="Firma del cliente (facoltativa)">
        <Text style={stili.nota}>
          Se il cliente è con te può firmare qui. Altrimenti lascia vuoto: il preventivo si fa lo
          stesso.
        </Text>
        <Firma onCambia={setFirma} />
        {firmaAMeta && (
          <Text style={stili.avviso}>
            La firma è troppo piccola: rifalla più ampia, oppure cancellala per salvare senza.
          </Text>
        )}
      </Sezione>

      {vendita && (
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
      )}

      {errore ? <Text style={stili.errore}>{errore}</Text> : null}
      {manca === 'formula' && <Text style={stili.nota}>Scegli come acquista per continuare.</Text>}

      <Bottone
        testo="Genera il preventivo"
        inCorso={salvataggio}
        disabilitato={manca != null}
        onPress={() => void salva()}
      />
    </ScrollView>
  );
}

function traduci(messaggio: string): string {
  if (messaggio.includes('prezzo_rivenditore_non_impostato')) {
    return 'Prezzo rivenditore non impostato su questa offerta.';
  }
  if (messaggio.includes('prezzo_non_impostato')) {
    return 'Prezzo al pubblico non impostato su questa offerta.';
  }
  if (messaggio.includes('importo_mancante')) {
    return 'Scrivi l’importo del preventivo.';
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
  tipo: { fontSize: 12, fontWeight: '600', color: c.accento },
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