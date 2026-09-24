import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ETICHETTA_MODULO,
  PREZZI_DA_DECIDERE,
  UTILIZZI_GRATUITI_PER_MODULO,
  acquistiPer,
  formattaEuro,
  type Acquisto,
  type Modulo,
} from '@lab/shared';

import { Pillola, Scheda } from '@/components/base';
import { Icona, type NomeIcona } from '@/components/icone';
import { Bottone } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { colori, coloriModulo, coloriModuloTenue, raggio, spazi, testi } from '@/lib/tema';

const ICONA_MODULO: Record<Modulo, NomeIcona> = {
  vendita: 'auto',
  noleggio_breve: 'calendario',
  noleggio_lungo: 'cartellino',
  assicurazioni: 'documento',
};

const MODULI: Modulo[] = ['vendita', 'noleggio_breve', 'noleggio_lungo', 'assicurazioni'];

/**
 * Il blocco del modulo esaurito (§8.5).
 *
 * Non e' una porta chiusa: dice quante operazioni sono state usate, cosa
 * continua a funzionare e quali sono le due strade. Il documento chiede
 * esattamente due scelte, il modulo singolo per un anno e il pacchetto a
 * prezzo ridotto, e chiede che gli altri moduli restino utilizzabili.
 *
 * Il pagamento passa dallo store e non c'e' ancora: i pulsanti lo dicono,
 * invece di far credere che l'acquisto sia andato a buon fine.
 */
export default function Blocco() {
  const router = useRouter();
  const { modulo } = useLocalSearchParams<{ modulo?: string }>();
  const esaurito = (MODULI.find((m) => m === modulo) ?? 'vendita') as Modulo;
  const altri = MODULI.filter((m) => m !== esaurito);

  return (
    <ScrollView style={stili.contenitore} contentContainerStyle={stili.contenuto}>
      <View style={stili.testa}>
        <View style={[stili.cerchio, { backgroundColor: coloriModuloTenue[esaurito] }]}>
          <Icona nome={ICONA_MODULO[esaurito]} dimensione={26} colore={coloriModulo[esaurito]} />
        </View>
        <Text style={stili.titolo}>{ETICHETTA_MODULO[esaurito]}</Text>
        <Text style={stili.sottotitolo}>
          Hai usato le {UTILIZZI_GRATUITI_PER_MODULO} operazioni comprese in questo modulo. Per
          caricarne altre serve attivarlo.
        </Text>
      </View>

      {/* Il blocco riguarda un modulo solo: dirlo qui evita la paura di essersi
          fermati del tutto. */}
      <Scheda style={stili.rassicurazione}>
        <Icona nome="spunta" dimensione={16} colore={colori.successo} />
        <Text style={stili.rassicurazioneTesto}>
          Quello che hai già caricato resta online e i clienti continuano a scriverti.{' '}
          {altri.map((m) => ETICHETTA_MODULO[m]).join(', ')} funzionano come prima.
        </Text>
      </Scheda>

      {acquistiPer(esaurito).map((a, i) => (
        <Proposta key={a.codice} acquisto={a} consigliata={i === 1} />
      ))}

      {PREZZI_DA_DECIDERE && (
        <Text style={stili.avviso}>
          Gli importi qui sopra sono di esempio: i prezzi veri non sono ancora stati decisi.
        </Text>
      )}

      <View style={stili.fondo}>
        <Bottone
          tenue
          testo="Torna indietro"
          icona="indietro"
          onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))}
        />
      </View>
    </ScrollView>
  );
}

function Proposta({ acquisto, consigliata }: { acquisto: Acquisto; consigliata: boolean }) {
  return (
    <Scheda
      rilievo={consigliata ? 'media' : 'bassa'}
      style={[stili.proposta, consigliata && stili.propostaConsigliata]}
    >
      <View style={stili.rigaProposta}>
        <Text style={stili.titoloProposta}>{acquisto.titolo}</Text>
        {consigliata && <Pillola testo="conviene" tono="successo" />}
      </View>

      <Text style={stili.descrizione}>{acquisto.descrizione}</Text>

      <View style={stili.rigaPrezzo}>
        <Text style={stili.prezzo}>{formattaEuro(acquisto.prezzo_cent)}</Text>
        <Text style={stili.periodo}>{acquisto.periodo}</Text>
      </View>

      {acquisto.risparmio_cent != null && acquisto.risparmio_cent > 0 && (
        <Text style={stili.risparmio}>
          {formattaEuro(acquisto.risparmio_cent)} in meno che comprarli uno per uno
        </Text>
      )}

      {/* Il pagamento passa dallo store e non e' ancora collegato: il pulsante
          lo dice invece di fingere un acquisto riuscito. */}
      <Bottone
        testo="Attiva"
        tipo={consigliata ? 'pieno' : 'tenue'}
        disabilitato
        onPress={() => {}}
      />
      <Text style={stili.nota}>Il pagamento passerà dallo store. Non è ancora collegato.</Text>
    </Scheda>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  contenuto: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxxl },

  testa: { alignItems: 'center', gap: spazi.s, paddingVertical: spazi.l },
  cerchio: {
    width: 64,
    height: 64,
    borderRadius: raggio.tondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titolo: { ...testi.titolo, color: colori.testo, textAlign: 'center' },
  sottotitolo: {
    ...testi.corpo,
    color: colori.testoTenue,
    textAlign: 'center',
    maxWidth: 320,
  },

  rassicurazione: { flexDirection: 'row', alignItems: 'flex-start', gap: spazi.s },
  rassicurazioneTesto: { flex: 1, fontSize: 13, lineHeight: 18, color: colori.testoTenue },

  proposta: { gap: spazi.s },
  propostaConsigliata: { borderWidth: 1, borderColor: colori.primario },
  rigaProposta: { flexDirection: 'row', alignItems: 'center', gap: spazi.s },
  titoloProposta: { ...testi.sottotitolo, color: colori.testo, flex: 1 },
  descrizione: { fontSize: 13, lineHeight: 18, color: colori.testoTenue },
  rigaPrezzo: { flexDirection: 'row', alignItems: 'baseline', gap: spazi.xs },
  prezzo: { fontSize: 30, fontWeight: '800', color: colori.testo },
  periodo: { fontSize: 13, color: colori.testoTenue },
  risparmio: { fontSize: 12, fontWeight: '600', color: colori.successo },
  nota: { fontSize: 11, color: colori.testoDebole, textAlign: 'center' },

  avviso: {
    fontSize: 12,
    lineHeight: 17,
    color: colori.accento,
    textAlign: 'center',
    paddingHorizontal: spazi.l,
  },
  fondo: { paddingTop: spazi.l },
});
