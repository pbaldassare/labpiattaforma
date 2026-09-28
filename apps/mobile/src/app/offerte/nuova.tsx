import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Testo as Text } from '@/components/testo';
import {
  eModuloEsaurito,
  ETICHETTA_ALIMENTAZIONE,
  ETICHETTA_CAMBIO,
  ETICHETTA_FORMULA,
  PROVVIGIONE_PROPOSTA_CENT,
  analizzaEuro,
  formattaEuro,
  margineCent,
  type Alimentazione,
  type Cambio,
  type FormulaAcquisto,
  type Provenienza,
} from '@lab/shared';

import { Bottone, Campo, Input, Scelta, Sezione } from '@/components/modulo';
import { fn, perCampo, tab } from '@lab/shared';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, stiliTema } from '@/lib/tema';

const ALIMENTAZIONI: Alimentazione[] = [
  'benzina',
  'diesel',
  'gpl',
  'metano',
  'ibrida',
  'elettrica',
  'altro',
];

const FORMULE: FormulaAcquisto[] = ['contanti', 'finanziamento', 'permuta', 'noleggio_lungo'];

export default function NuovaOfferta() {
  const router = useRouter();
  // Con un id si sta correggendo un'offerta che esiste gia': stessa schermata,
  // perche' i campi sono gli stessi e tenerne due vorrebbe dire tenerle
  // allineate per sempre.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const modifica = typeof id === 'string' && id.length > 0;

  const [marca, setMarca] = useState('');
  const [modello, setModello] = useState('');
  const [targa, setTarga] = useState('');
  const [chilometri, setChilometri] = useState('');
  const [anno, setAnno] = useState('');
  const [alimentazione, setAlimentazione] = useState<Alimentazione | null>(null);
  const [cambio, setCambio] = useState<Cambio | null>(null);

  const [acquisto, setAcquisto] = useState('');
  const [pubblico, setPubblico] = useState('');
  const [rivenditore, setRivenditore] = useState('');

  const [provenienza, setProvenienza] = useState<Provenienza>('proprio');
  const [fornitore, setFornitore] = useState('');

  const [formule, setFormule] = useState<FormulaAcquisto[]>(['contanti']);

  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(modifica);

  useEffect(() => {
    if (!modifica) return;
    let vivo = true;

    void (async () => {
      const [v, f] = await Promise.all([
        supabase.from(tab('offerta_vendita')).select('*').eq('offerta_id', id).maybeSingle(),
        supabase.from(tab('offerta_formula')).select('formula').eq('offerta_id', id),
      ]);

      if (!vivo) return;
      if (v.error || !v.data) {
        setErrore(v.error?.message ?? 'Offerta non trovata.');
        setCaricando(false);
        return;
      }

      const o = v.data as Record<string, unknown>;
      setMarca((o.marca as string) ?? '');
      setModello((o.modello as string) ?? '');
      setTarga((o.targa as string) ?? '');
      setChilometri(o.chilometri == null ? '' : String(o.chilometri));
      setAnno(o.anno == null ? '' : String(o.anno));
      setAlimentazione((o.alimentazione as Alimentazione | null) ?? null);
      setCambio((o.cambio as Cambio | null) ?? null);
      setAcquisto(perCampo(o.prezzo_acquisto_cent as number | null));
      setPubblico(perCampo(o.prezzo_pubblico_cent as number | null));
      setRivenditore(perCampo(o.prezzo_rivenditore_cent as number | null));
      setProvenienza((o.provenienza as Provenienza) ?? 'proprio');
      setFornitore((o.fornitore_nome as string) ?? '');

      const scelte = ((f.data ?? []) as { formula: FormulaAcquisto }[]).map((x) => x.formula);
      if (scelte.length > 0) setFormule(scelte);

      setCaricando(false);
    })();

    return () => {
      vivo = false;
    };
  }, [id, modifica]);

  // I tre prezzi si rileggono a ogni battuta: e' cio' che permette di vedere
  // il margine cambiare mentre si scrive, invece che dopo aver salvato.
  const acquistoCent = analizzaEuro(acquisto);
  const pubblicoCent = analizzaEuro(pubblico);
  const rivenditoreCent = analizzaEuro(rivenditore);

  const marginePubblico = margineCent(acquistoCent, pubblicoCent);
  const margineRivenditore = margineCent(acquistoCent, rivenditoreCent);

  const prezzoPubblicoNonValido = pubblico.trim() !== '' && pubblicoCent === null;
  const prezzoAcquistoNonValido = acquisto.trim() !== '' && acquistoCent === null;
  const prezzoRivenditoreNonValido = rivenditore.trim() !== '' && rivenditoreCent === null;

  const puoSalvare = useMemo(
    () =>
      marca.trim() !== '' &&
      modello.trim() !== '' &&
      pubblicoCent !== null &&
      pubblicoCent > 0 &&
      !prezzoAcquistoNonValido &&
      !prezzoRivenditoreNonValido &&
      (provenienza === 'proprio' || fornitore.trim() !== ''),
    [
      marca,
      modello,
      pubblicoCent,
      prezzoAcquistoNonValido,
      prezzoRivenditoreNonValido,
      provenienza,
      fornitore,
    ]
  );

  function commuta(f: FormulaAcquisto) {
    setFormule((attuali) =>
      attuali.includes(f) ? attuali.filter((x) => x !== f) : [...attuali, f]
    );
  }

  async function salva(stato: 'bozza' | 'attiva') {
    setErrore(null);
    setInCorso(true);

    const dati = {
      marca: marca.trim(),
      modello: modello.trim(),
      targa: targa.trim() || null,
      chilometri: chilometri.trim() === '' ? null : Number(chilometri.replace(/\D/g, '')),
      anno: anno.trim() === '' ? null : Number(anno.replace(/\D/g, '')),
      alimentazione,
      cambio,
      prezzo_acquisto_cent: acquistoCent,
      prezzo_pubblico_cent: pubblicoCent,
      prezzo_rivenditore_cent: rivenditoreCent,
      provenienza,
      fornitore_nome: provenienza === 'fornitore' ? fornitore.trim() : null,
      // In modifica lo stato si cambia dalla scheda dell'offerta, dove c'e'
      // scritto cosa comporta ciascuno.
      stato: modifica ? undefined : stato,
      formule: formule.map((f) => ({
        formula: f,
        provvigione_cent: PROVVIGIONE_PROPOSTA_CENT[f],
      })),
    };

    const { data, error } = await supabase.rpc(fn('salva_offerta_vendita'), {
      p_dati: dati,
      p_offerta_id: modifica ? id : null,
    });
    setInCorso(false);

    if (error) {
      // Operazioni gratuite finite: il blocco e' una schermata a se', non un
      // messaggio rosso sotto un campo (§8.5).
      if (eModuloEsaurito(error.message)) {
        router.push({ pathname: '/blocco', params: { modulo: 'vendita' } });
        return;
      }
      setErrore(
        error.message === 'marca_e_modello_obbligatori'
          ? 'Marca e modello sono obbligatori.'
          : error.message
      );
      return;
    }
    router.replace(`/offerte/${data as string}`);
  }

  if (caricando) {
    return (
      <View style={stili.attesa}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={stili.contenitore}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Il titolo dice cosa si sta facendo: "Nuova offerta" mentre si corregge
          un'offerta che esiste gia' e' una bugia piccola ma fastidiosa. */}
      <Stack.Screen
        options={{ title: modifica ? 'Modifica · Vendita' : 'Nuova offerta · Vendita' }}
      />
      <ScrollView contentContainerStyle={stili.scorrimento} keyboardShouldPersistTaps="handled">
        <Sezione titolo="Il mezzo">
          <Campo etichetta="Marca" obbligatorio>
            <Input value={marca} onChangeText={setMarca} placeholder="Fiat" />
          </Campo>
          <Campo etichetta="Modello" obbligatorio aiuto="Marca e modello formano il titolo della pagina.">
            <Input value={modello} onChangeText={setModello} placeholder="Panda 1.2 Easy" />
          </Campo>
          <Campo etichetta="Targa">
            <Input
              value={targa}
              onChangeText={(v) => setTarga(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="AB123CD"
            />
          </Campo>
          <View style={stili.affiancati}>
            <View style={stili.meta}>
              <Campo etichetta="Chilometri">
                <Input
                  value={chilometri}
                  onChangeText={setChilometri}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  placeholder="84000"
                />
              </Campo>
            </View>
            <View style={stili.meta}>
              <Campo etichetta="Anno">
                <Input
                  value={anno}
                  onChangeText={setAnno}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  placeholder="2019"
                  maxLength={4}
                />
              </Campo>
            </View>
          </View>
          <Campo etichetta="Alimentazione">
            <Scelta
              valore={alimentazione}
              onCambia={setAlimentazione}
              opzioni={ALIMENTAZIONI.map((a) => ({
                valore: a,
                etichetta: ETICHETTA_ALIMENTAZIONE[a],
              }))}
            />
          </Campo>
          <Campo etichetta="Cambio">
            <Scelta
              valore={cambio}
              onCambia={setCambio}
              opzioni={(['manuale', 'automatico'] as Cambio[]).map((c) => ({
                valore: c,
                etichetta: ETICHETTA_CAMBIO[c],
              }))}
            />
          </Campo>
        </Sezione>

        <Sezione titolo="Prezzi">
          <Campo
            etichetta="Prezzo di acquisto"
            aiuto="Solo per te: non compare su nessuna pagina."
            errore={prezzoAcquistoNonValido ? 'Non sembra un prezzo.' : null}
          >
            <Input
              value={acquisto}
              onChangeText={setAcquisto}
              keyboardType="decimal-pad"
              placeholder="6.500"
            />
          </Campo>
          <Campo
            etichetta="Prezzo al cliente finale"
            obbligatorio
            aiuto="È il numero in evidenza sulla pagina pubblica."
            errore={prezzoPubblicoNonValido ? 'Non sembra un prezzo.' : null}
          >
            <Input
              value={pubblico}
              onChangeText={setPubblico}
              keyboardType="decimal-pad"
              placeholder="8.900"
            />
          </Campo>
          <Campo
            etichetta="Prezzo rivenditore"
            aiuto="Se lo compili nasce una seconda pagina, con link separato e non pubblicata."
            errore={prezzoRivenditoreNonValido ? 'Non sembra un prezzo.' : null}
          >
            <Input
              value={rivenditore}
              onChangeText={setRivenditore}
              keyboardType="decimal-pad"
              placeholder="7.800"
            />
          </Campo>

          {(marginePubblico !== null || margineRivenditore !== null) && (
            <View style={stili.margini}>
              {marginePubblico !== null && (
                <RigaMargine etichetta="Margine al pubblico" valore={marginePubblico} />
              )}
              {margineRivenditore !== null && (
                <RigaMargine etichetta="Margine rivenditore" valore={margineRivenditore} />
              )}
            </View>
          )}
        </Sezione>

        <Sezione titolo="Provenienza">
          <Scelta
            valore={provenienza}
            consentiVuoto={false}
            onCambia={(v) => setProvenienza((v ?? 'proprio') as Provenienza)}
            opzioni={[
              { valore: 'proprio' as Provenienza, etichetta: 'Mezzo mio' },
              { valore: 'fornitore' as Provenienza, etichetta: 'Di un fornitore' },
            ]}
          />
          {provenienza === 'fornitore' && (
            <Campo etichetta="Nome del fornitore" obbligatorio>
              <Input value={fornitore} onChangeText={setFornitore} />
            </Campo>
          )}
        </Sezione>

        <Sezione titolo="Come può acquistarla">
          <View style={stili.formule}>
            {FORMULE.map((f) => {
              const attiva = formule.includes(f);
              return (
                <Bottone
                  key={f}
                  testo={`${attiva ? '✓ ' : ''}${ETICHETTA_FORMULA[f]}`}
                  tenue={!attiva}
                  onPress={() => commuta(f)}
                />
              );
            })}
          </View>
          <Text style={stili.nota}>
            Le provvigioni proposte sono quelle del prototipo e restano da confermare.
          </Text>
        </Sezione>

        {errore ? <Text style={stili.errore}>{errore}</Text> : null}

        <View style={stili.azioni}>
          {modifica ? (
            <Bottone
              testo="Salva le modifiche"
              onPress={() => void salva('attiva')}
              inCorso={inCorso}
              disabilitato={!puoSalvare}
            />
          ) : (
            <>
              <Bottone
                testo="Salva e pubblica"
                onPress={() => void salva('attiva')}
                inCorso={inCorso}
                disabilitato={!puoSalvare}
              />
              <Bottone
                testo="Salva come bozza"
                tenue
                onPress={() => void salva('bozza')}
                disabilitato={!puoSalvare || inCorso}
              />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RigaMargine({ etichetta, valore }: { etichetta: string; valore: number }) {
  const inPerdita = valore < 0;
  return (
    <View style={stili.rigaMargine}>
      <Text style={stili.margineEtichetta}>{etichetta}</Text>
      <Text style={[stili.margineValore, inPerdita && stili.marginePerdita]}>
        {formattaEuro(valore)}
      </Text>
    </View>
  );
}

const stili = stiliTema((c) => StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: c.sfondo },
  attesa: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
  scorrimento: { padding: spazi.xl, paddingBottom: spazi.xxl * 2, gap: spazi.m },
  affiancati: { flexDirection: 'row', gap: spazi.m },
  meta: { flex: 1 },
  margini: {
    backgroundColor: c.superficie,
    borderWidth: 1,
    borderColor: c.bordo,
    borderRadius: raggio.m,
    padding: spazi.m,
    gap: spazi.xs,
  },
  rigaMargine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  margineEtichetta: { fontSize: 13, color: c.testoTenue },
  margineValore: { fontSize: 17, fontWeight: '700', color: c.primarioChiaro },
  marginePerdita: { color: c.errore },
  formule: { gap: spazi.s },
  nota: { fontSize: 12, color: c.testoTenue, lineHeight: 17 },
  errore: { fontSize: 14, color: c.errore },
  azioni: { gap: spazi.s, paddingTop: spazi.l },
}));