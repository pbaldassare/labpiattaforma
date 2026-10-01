import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { ETICHETTA_MODULO } from '@lab/shared';

import { Filtri, Pillola, Scheda, Vuoto } from '@/components/base';
import { Testo as Text } from '@/components/testo';
import { caricaAttivazioni, dataBreve, type AttivazioneUtente } from '@/lib/admin';
import { colori, coloriModulo, spazi, stiliTema, testi } from '@/lib/tema';

type Fonte = 'pagamento' | 'admin';

/**
 * Chi ha pagato cosa: tutte le attivazioni di tutti gli utenti, le piu'
 * recenti in cima. Il filtro separa quelle pagate dall'utente da quelle date
 * a mano da un admin, che a fine mese sono due conti diversi.
 */
export default function Attivazioni() {
  const router = useRouter();
  const [fonte, setFonte] = useState<Fonte | null>(null);
  const [righe, setRighe] = useState<AttivazioneUtente[]>([]);
  const [caricato, setCaricato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        try {
          setRighe(await caricaAttivazioni(fonte));
          setErrore(null);
        } catch (e) {
          setErrore((e as Error).message);
        }
        setCaricato(true);
      })();
    }, [fonte])
  );

  const pagate = righe.filter((r) => r.fonte === 'pagamento' && r.fino_a).length;

  return (
    <View style={stili.contenitore}>
      <Filtri<Fonte>
        valore={fonte}
        onCambia={setFonte}
        opzioni={[
          { valore: null, etichetta: 'Tutte' },
          { valore: 'pagamento', etichetta: 'Pagate dall’utente' },
          { valore: 'admin', etichetta: 'Date dall’admin' },
        ]}
      />

      {!caricato ? (
        <View style={stili.centrato}>
          <ActivityIndicator color={colori.primario} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={stili.contenuto}>
          {errore && <Text style={stili.errore}>{errore}</Text>}

          {fonte !== 'admin' && (
            <Text style={stili.nota}>
              {pagate === 0
                ? 'Nessun pagamento finora: i pagamenti dall’app non sono ancora attivi. Quando lo saranno, ogni acquisto comparirà qui da solo.'
                : `${pagate} ${pagate === 1 ? 'card pagata' : 'card pagate'} in elenco.`}
            </Text>
          )}

          {righe.length === 0 ? (
            <Vuoto
              icona="documento"
              titolo="Niente da mostrare"
              testo={fonte === 'pagamento' ? 'Nessuna card pagata.' : 'Nessuna attivazione finora.'}
            />
          ) : (
            righe.map((r, i) => (
              <Scheda
                key={`${r.creato_il}-${i}`}
                onPress={() => router.push(`/admin/${r.id_utente}`)}
                accessibilityLabel={r.email}
                style={stili.scheda}
              >
                <View style={stili.riga}>
                  <View style={[stili.segno, { backgroundColor: coloriModulo[r.modulo] }]} />
                  <View style={stili.testi}>
                    <Text style={stili.chi} numberOfLines={1}>
                      {r.nome ?? r.email}
                    </Text>
                    {r.nome && (
                      <Text style={stili.piccolo} numberOfLines={1}>
                        {r.email}
                      </Text>
                    )}
                  </View>
                  <Pillola
                    testo={r.fonte === 'pagamento' ? 'pagata' : 'admin'}
                    tono={r.fonte === 'pagamento' ? 'successo' : 'neutro'}
                  />
                </View>
                <Text style={stili.cosa}>
                  <Text style={stili.modulo}>{ETICHETTA_MODULO[r.modulo]}</Text>
                  {r.fino_a ? ` attiva fino al ${dataBreve(r.fino_a)}` : ' disattivata'}
                </Text>
                <Text style={stili.data}>
                  {dataBreve(r.creato_il)}
                  {r.fonte === 'admin' && r.creato_da ? ` · da ${r.creato_da}` : ''}
                  {r.riferimento ? ` · rif. ${r.riferimento}` : ''}
                </Text>
              </Scheda>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    contenitore: { flex: 1, backgroundColor: c.sfondo },
    centrato: { flex: 1, justifyContent: 'center' },
    contenuto: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxxl },
    errore: { ...testi.piccolo, color: c.errore },
    nota: { ...testi.piccolo, color: c.testoTenue },
    scheda: { gap: spazi.s },
    riga: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },
    segno: { width: 10, height: 10, borderRadius: 5 },
    testi: { flex: 1, gap: 2 },
    chi: { ...testi.sottotitolo, fontSize: 15, color: c.testo },
    piccolo: { ...testi.piccolo, color: c.testoTenue },
    cosa: { ...testi.corpo, color: c.testo },
    modulo: { fontWeight: '700' },
    data: { fontSize: 11, color: c.testoDebole },
  })
);
