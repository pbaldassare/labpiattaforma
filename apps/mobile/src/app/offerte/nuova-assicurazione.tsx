import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ETICHETTA_RISCHIO,
  GARANZIE_AUTO_PROPOSTE,
  TIPI_RISCHIO,
  analizzaEuro,
  fn,
  tab,
  type Garanzia,
  type TipoRischio,
  type Venditore,
} from '@lab/shared';

import { Scheda } from '@/components/base';
import { Icona } from '@/components/icone';
import { Bottone, Campo, Input, Scelta, Sezione } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { TOCCO_MINIMO, colori, raggio, spazi, testi } from '@/lib/tema';

export default function NuovaAssicurazione() {
  const router = useRouter();

  const [compagnia, setCompagnia] = useState('');
  const [prodotto, setProdotto] = useState('');
  const [rischio, setRischio] = useState<TipoRischio>('auto');
  const [premio, setPremio] = useState('');
  const [provvigione, setProvvigione] = useState('');
  const [massimale, setMassimale] = useState('');
  const [franchigia, setFranchigia] = useState('');
  const [durata, setDurata] = useState('12');

  const [garanzie, setGaranzie] = useState<Garanzia[]>(GARANZIE_AUTO_PROPOSTE);
  const [nuova, setNuova] = useState('');

  const [rui, setRui] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from(tab('venditore'))
        .select('rui_numero')
        .maybeSingle<Pick<Venditore, 'rui_numero'>>();
      setRui(data?.rui_numero ?? null);
    })();
  }, []);

  const haRui = !!rui?.trim();
  const premioCent = analizzaEuro(premio);
  const puoSalvare =
    compagnia.trim() !== '' && prodotto.trim() !== '' && premioCent != null && premioCent > 0;

  function commuta(indice: number) {
    setGaranzie((g) =>
      g.map((x, i) => (i === indice ? { ...x, inclusa: !x.inclusa } : x))
    );
  }

  function togli(indice: number) {
    setGaranzie((g) => g.filter((_, i) => i !== indice));
  }

  function aggiungi() {
    const nome = nuova.trim();
    if (!nome) return;
    setGaranzie((g) => [...g, { nome, inclusa: true, dettaglio: null }]);
    setNuova('');
  }

  async function salva(stato: 'bozza' | 'attiva') {
    setErrore(null);
    setInCorso(true);

    const { data, error } = await supabase.rpc(fn('salva_offerta_assicurazione'), {
      p_dati: {
        compagnia: compagnia.trim(),
        nome_prodotto: prodotto.trim(),
        tipo_rischio: rischio,
        premio_partenza_cent: premioCent,
        provvigione_cent: analizzaEuro(provvigione),
        massimale_cent: analizzaEuro(massimale),
        franchigia_cent: analizzaEuro(franchigia),
        durata_mesi: durata.trim() === '' ? null : Number(durata.replace(/\D/g, '')),
        stato,
        garanzie,
      },
    });

    setInCorso(false);
    if (error) {
      setErrore(
        error.message.includes('rui_mancante')
          ? 'Per pubblicare una polizza serve il tuo numero RUI. Aggiungilo nel profilo, oppure salva come bozza.'
          : error.message.includes('compagnia_e_prodotto_obbligatori')
            ? 'Compagnia e nome del prodotto sono obbligatori.'
            : error.message
      );
      return;
    }
    router.replace(`/offerte/${data as string}`);
  }

  return (
    <KeyboardAvoidingView
      style={stili.contenitore}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={stili.scorrimento} keyboardShouldPersistTaps="handled">
        {/* Avvisare prima, non dopo aver compilato tutto e premuto salva. */}
        {rui !== null && !haRui && (
          <Scheda style={stili.avviso}>
            <Icona nome="attenzione" dimensione={18} colore={colori.accento} />
            <Text style={stili.avvisoTesto}>
              Non hai ancora il numero RUI nel profilo. Puoi preparare il prodotto, ma per
              pubblicarlo serve: senza iscrizione, proporre polizze non è consentito.
            </Text>
          </Scheda>
        )}

        <Sezione titolo="Il prodotto">
          <Campo etichetta="Compagnia" obbligatorio>
            <Input value={compagnia} onChangeText={setCompagnia} placeholder="Allianz" />
          </Campo>
          <Campo etichetta="Nome del prodotto" obbligatorio>
            <Input value={prodotto} onChangeText={setProdotto} placeholder="Auto Sicura" />
          </Campo>
          <Campo etichetta="Tipo di rischio">
            <Scelta
              valore={rischio}
              consentiVuoto={false}
              onCambia={(v) => setRischio((v ?? 'auto') as TipoRischio)}
              opzioni={TIPI_RISCHIO.map((t) => ({ valore: t, etichetta: ETICHETTA_RISCHIO[t] }))}
            />
          </Campo>
        </Sezione>

        <Sezione titolo="Numeri">
          <Campo
            etichetta="Premio di partenza"
            obbligatorio
            aiuto="In pagina compare come “a partire da”: il preventivo esatto lo fai tu."
          >
            <Input
              value={premio}
              onChangeText={setPremio}
              keyboardType="decimal-pad"
              placeholder="450"
            />
          </Campo>
          <Campo etichetta="Provvigione" aiuto="Solo per te: non compare su nessuna pagina.">
            <Input
              value={provvigione}
              onChangeText={setProvvigione}
              keyboardType="decimal-pad"
              placeholder="90"
            />
          </Campo>
          <View style={stili.affiancati}>
            <View style={stili.meta}>
              <Campo etichetta="Massimale">
                <Input
                  value={massimale}
                  onChangeText={setMassimale}
                  keyboardType="decimal-pad"
                  placeholder="6.000.000"
                />
              </Campo>
            </View>
            <View style={stili.meta}>
              <Campo etichetta="Franchigia">
                <Input
                  value={franchigia}
                  onChangeText={setFranchigia}
                  keyboardType="decimal-pad"
                  placeholder="300"
                />
              </Campo>
            </View>
          </View>
          <Campo etichetta="Durata in mesi">
            <Input
              value={durata}
              onChangeText={setDurata}
              keyboardType="number-pad"
              placeholder="12"
            />
          </Campo>
        </Sezione>

        <Sezione titolo="Cosa copre e cosa no">
          <Text style={stili.nota}>
            Tocca una voce per spostarla fra “copre” e “non copre”. In pagina diventano due
            elenchi distinti.
          </Text>

          {garanzie.map((g, i) => (
            <View key={`${g.nome}-${i}`} style={stili.garanzia}>
              <Pressable
                onPress={() => commuta(i)}
                style={stili.commuta}
                accessibilityRole="switch"
                accessibilityState={{ checked: g.inclusa }}
                accessibilityLabel={`${g.nome}, ${g.inclusa ? 'compresa' : 'non compresa'}`}
              >
                <View style={[stili.segno, g.inclusa ? stili.segnoSi : stili.segnoNo]}>
                  <Icona
                    nome={g.inclusa ? 'spunta' : 'attenzione'}
                    dimensione={14}
                    colore={g.inclusa ? colori.successo : colori.testoDebole}
                  />
                </View>
                <Text style={[stili.garanziaNome, !g.inclusa && stili.garanziaEsclusa]}>
                  {g.nome}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => togli(i)}
                style={stili.togli}
                accessibilityRole="button"
                accessibilityLabel={`Togli ${g.nome}`}
              >
                <Text style={stili.togliTesto}>×</Text>
              </Pressable>
            </View>
          ))}

          <View style={stili.aggiungi}>
            <View style={stili.meta}>
              <Input
                value={nuova}
                onChangeText={setNuova}
                placeholder="Aggiungi una garanzia"
                onSubmitEditing={aggiungi}
                returnKeyType="done"
              />
            </View>
            <Bottone tenue testo="Aggiungi" icona="piu" onPress={aggiungi} />
          </View>
        </Sezione>

        {errore ? <Text style={stili.errore}>{errore}</Text> : null}

        <View style={stili.azioni}>
          <Bottone
            testo="Salva e pubblica"
            inCorso={inCorso}
            disabilitato={!puoSalvare}
            onPress={() => void salva('attiva')}
          />
          <Bottone
            tenue
            testo="Salva come bozza"
            disabilitato={!puoSalvare || inCorso}
            onPress={() => void salva('bozza')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  scorrimento: { padding: spazi.l, paddingBottom: spazi.xxxl * 2, gap: spazi.m },

  avviso: {
    flexDirection: 'row',
    gap: spazi.m,
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: colori.accento,
  },
  avvisoTesto: { ...testi.piccolo, color: colori.testo, flex: 1 },

  affiancati: { flexDirection: 'row', gap: spazi.m },
  meta: { flex: 1 },
  nota: { ...testi.piccolo, fontSize: 12, color: colori.testoTenue },

  garanzia: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: raggio.m,
    paddingRight: spazi.s,
  },
  commuta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazi.m,
    minHeight: TOCCO_MINIMO,
    paddingHorizontal: spazi.m,
  },
  segno: {
    width: 24,
    height: 24,
    borderRadius: raggio.tondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segnoSi: { backgroundColor: '#DCFCE7' },
  segnoNo: { backgroundColor: colori.bordoTenue },
  garanziaNome: { ...testi.corpo, color: colori.testo, flex: 1 },
  garanziaEsclusa: { color: colori.testoTenue, textDecorationLine: 'line-through' },
  togli: {
    width: TOCCO_MINIMO,
    height: TOCCO_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togliTesto: { fontSize: 22, color: colori.testoDebole },

  aggiungi: { flexDirection: 'row', gap: spazi.s, alignItems: 'center' },
  errore: { fontSize: 14, color: colori.errore },
  azioni: { gap: spazi.s, paddingTop: spazi.l },
});
