import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { eModuloEsaurito, aGiorno, aggiungiGiorni, analizzaEuro, fn, formattaEuro } from '@lab/shared';

import { Scheda } from '@/components/base';
import { Bottone, Campo, Input, Scelta, Sezione } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, spazi, testi } from '@/lib/tema';

/**
 * Per quanto tempo il mezzo resta a noleggio.
 *
 * Due date da compilare a mano su un telefono sono due occasioni di sbagliare:
 * qui si sceglie da quando parte e per quanto, che e' come si ragiona davvero
 * su una flotta.
 */
const FINESTRE = [
  { etichetta: '3 mesi', giorni: 90 },
  { etichetta: '6 mesi', giorni: 180 },
  { etichetta: '1 anno', giorni: 365 },
];

export default function NuovaBreve() {
  const router = useRouter();
  const oggi = aGiorno(new Date());

  const [modello, setModello] = useState('');
  const [targa, setTarga] = useState('');
  const [finestra, setFinestra] = useState(180);

  const [tariffa, setTariffa] = useState('');
  const [tariffaRiv, setTariffaRiv] = useState('');
  const [oltre3, setOltre3] = useState('');
  const [oltre7, setOltre7] = useState('');
  const [oltre15, setOltre15] = useState('');

  const [kmInclusi, setKmInclusi] = useState('150');
  const [kmExtra, setKmExtra] = useState('0,30');
  const [deposito, setDeposito] = useState('');
  const [eta, setEta] = useState('21');
  const [patente, setPatente] = useState('2');

  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const tariffaCent = analizzaEuro(tariffa);
  const puoSalvare = modello.trim() !== '' && tariffaCent != null && tariffaCent > 0;

  async function salva(stato: 'bozza' | 'attiva') {
    setErrore(null);
    setInCorso(true);

    const { data, error } = await supabase.rpc(fn('salva_offerta_noleggio_breve'), {
      p_dati: {
        modello: modello.trim(),
        targa: targa.trim() || null,
        disponibile_dal: oggi,
        disponibile_al: aggiungiGiorni(oggi, finestra),
        tariffa_giorno_cent: tariffaCent,
        tariffa_giorno_rivenditore_cent: analizzaEuro(tariffaRiv),
        tariffa_oltre_3_cent: analizzaEuro(oltre3),
        tariffa_oltre_7_cent: analizzaEuro(oltre7),
        tariffa_oltre_15_cent: analizzaEuro(oltre15),
        km_inclusi_giorno: kmInclusi.trim() === '' ? null : Number(kmInclusi.replace(/\D/g, '')),
        costo_km_extra_cent: analizzaEuro(kmExtra),
        deposito_cent: analizzaEuro(deposito),
        eta_minima: eta.trim() === '' ? null : Number(eta.replace(/\D/g, '')),
        patente_anni: patente.trim() === '' ? null : Number(patente.replace(/\D/g, '')),
        stato,
      },
    });

    setInCorso(false);
    if (error) {
      // Operazioni gratuite finite: il blocco e' una schermata a se', non un
      // messaggio rosso sotto un campo (§8.5).
      if (eModuloEsaurito(error.message)) {
        router.push({ pathname: '/blocco', params: { modulo: 'noleggio_breve' } });
        return;
      }
      setErrore(
        error.message.includes('modello_obbligatorio')
          ? 'Il modello è obbligatorio.'
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
        <Sezione titolo="Il mezzo">
          <Campo etichetta="Modello" obbligatorio>
            <Input value={modello} onChangeText={setModello} placeholder="Fiat 500 Hybrid" />
          </Campo>
          <Campo etichetta="Targa">
            <Input
              value={targa}
              onChangeText={(v) => setTarga(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="GE456FH"
            />
          </Campo>
        </Sezione>

        <Sezione titolo="Per quanto resta a noleggio">
          <Scelta
            valore={String(finestra)}
            consentiVuoto={false}
            onCambia={(v) => setFinestra(Number(v ?? 180))}
            opzioni={FINESTRE.map((f) => ({ valore: String(f.giorni), etichetta: f.etichetta }))}
          />
          <Text style={stili.nota}>
            Il cliente potrà prenotare da oggi fino al{' '}
            {new Date(aggiungiGiorni(oggi, finestra)).toLocaleDateString('it-IT')}.
          </Text>
        </Sezione>

        <Sezione titolo="Tariffe">
          <Campo etichetta="Al giorno" obbligatorio>
            <Input
              value={tariffa}
              onChangeText={setTariffa}
              keyboardType="decimal-pad"
              placeholder="49"
            />
          </Campo>
          <Campo
            etichetta="Al giorno per i rivenditori"
            aiuto="Se la compili nasce la pagina riservata, con link separato."
          >
            <Input
              value={tariffaRiv}
              onChangeText={setTariffaRiv}
              keyboardType="decimal-pad"
              placeholder="42"
            />
          </Campo>

          <Text style={stili.nota}>
            Tariffe ridotte per i noleggi lunghi. Facoltative: se le lasci vuote resta quella
            piena.
          </Text>
          <View style={stili.soglie}>
            <View style={stili.meta}>
              <Campo etichetta="Oltre 3 giorni">
                <Input
                  value={oltre3}
                  onChangeText={setOltre3}
                  keyboardType="decimal-pad"
                  placeholder="44"
                  style={stili.centrato}
                />
              </Campo>
            </View>
            <View style={stili.meta}>
              <Campo etichetta="Oltre 7">
                <Input
                  value={oltre7}
                  onChangeText={setOltre7}
                  keyboardType="decimal-pad"
                  placeholder="39"
                  style={stili.centrato}
                />
              </Campo>
            </View>
            <View style={stili.meta}>
              <Campo etichetta="Oltre 15">
                <Input
                  value={oltre15}
                  onChangeText={setOltre15}
                  keyboardType="decimal-pad"
                  placeholder="34"
                  style={stili.centrato}
                />
              </Campo>
            </View>
          </View>

          {tariffaCent != null && (
            <Scheda style={stili.esempio}>
              <Text style={stili.esempioTitolo}>Cosa vedrà il cliente</Text>
              <Riga giorni={2} tariffa={tariffaCent} oltre3={analizzaEuro(oltre3)} oltre7={analizzaEuro(oltre7)} oltre15={analizzaEuro(oltre15)} />
              <Riga giorni={5} tariffa={tariffaCent} oltre3={analizzaEuro(oltre3)} oltre7={analizzaEuro(oltre7)} oltre15={analizzaEuro(oltre15)} />
              <Riga giorni={10} tariffa={tariffaCent} oltre3={analizzaEuro(oltre3)} oltre7={analizzaEuro(oltre7)} oltre15={analizzaEuro(oltre15)} />
            </Scheda>
          )}
        </Sezione>

        <Sezione titolo="Condizioni">
          <View style={stili.soglie}>
            <View style={stili.meta}>
              <Campo etichetta="Km al giorno">
                <Input
                  value={kmInclusi}
                  onChangeText={setKmInclusi}
                  keyboardType="number-pad"
                  placeholder="150"
                />
              </Campo>
            </View>
            <View style={stili.meta}>
              <Campo etichetta="Km in più">
                <Input
                  value={kmExtra}
                  onChangeText={setKmExtra}
                  keyboardType="decimal-pad"
                  placeholder="0,30"
                />
              </Campo>
            </View>
          </View>

          <Campo
            etichetta="Deposito"
            aiuto="Quanto il cliente versa per tenere le date. Le regole di rimborso restano da decidere."
          >
            <Input
              value={deposito}
              onChangeText={setDeposito}
              keyboardType="decimal-pad"
              placeholder="250"
            />
          </Campo>

          <View style={stili.soglie}>
            <View style={stili.meta}>
              <Campo etichetta="Età minima">
                <Input value={eta} onChangeText={setEta} keyboardType="number-pad" />
              </Campo>
            </View>
            <View style={stili.meta}>
              <Campo etichetta="Anni di patente">
                <Input value={patente} onChangeText={setPatente} keyboardType="number-pad" />
              </Campo>
            </View>
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

/** Le stesse soglie che applicherà il database, mostrate mentre si compila. */
function Riga({
  giorni,
  tariffa,
  oltre3,
  oltre7,
  oltre15,
}: {
  giorni: number;
  tariffa: number;
  oltre3: number | null;
  oltre7: number | null;
  oltre15: number | null;
}) {
  const applicata =
    giorni > 15
      ? (oltre15 ?? oltre7 ?? oltre3 ?? tariffa)
      : giorni > 7
        ? (oltre7 ?? oltre3 ?? tariffa)
        : giorni > 3
          ? (oltre3 ?? tariffa)
          : tariffa;

  return (
    <View style={stili.rigaEsempio}>
      <Text style={stili.rigaEtichetta}>{giorni} giorni</Text>
      <Text style={stili.rigaValore}>
        {formattaEuro(applicata * giorni)}
        <Text style={stili.rigaTariffa}> · {formattaEuro(applicata)} al giorno</Text>
      </Text>
    </View>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  scorrimento: { padding: spazi.l, paddingBottom: spazi.xxxl * 2, gap: spazi.m },
  soglie: { flexDirection: 'row', gap: spazi.s },
  meta: { flex: 1 },
  centrato: { textAlign: 'center', paddingHorizontal: spazi.xs },
  nota: { ...testi.piccolo, fontSize: 12, color: colori.testoTenue },
  esempio: { gap: spazi.xs, backgroundColor: colori.bordoTenue },
  esempioTitolo: { ...testi.etichetta, color: colori.testoTenue, marginBottom: spazi.xs },
  rigaEsempio: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rigaEtichetta: { ...testi.piccolo, color: colori.testoTenue },
  rigaValore: { fontSize: 14, fontWeight: '700', color: colori.testo },
  rigaTariffa: { fontSize: 12, fontWeight: '400', color: colori.testoTenue },
  errore: { fontSize: 14, color: colori.errore },
  azioni: { gap: spazi.s, paddingTop: spazi.l },
});
