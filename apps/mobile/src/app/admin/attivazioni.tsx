import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { ETICHETTA_MODULO } from '@lab/shared';

import { BloccoIcona, Filtri, Pillola, Scheda, Vuoto } from '@/components/base';
import { Icona } from '@/components/icone';
import { Testo as Text } from '@/components/testo';
import { caricaAttivazioni, dataBreve, type AttivazioneUtente } from '@/lib/admin';
import { colori, gradienti, raggio, spazi, stiliTema, suGradiente, testi } from '@/lib/tema';

type Fonte = 'pagamento' | 'admin';
type Periodo = 'oggi' | 'settimana' | 'prima';

const TITOLO_PERIODO: Record<Periodo, string> = {
  oggi: 'Oggi',
  settimana: 'Ultimi 7 giorni',
  prima: 'Prima',
};

function periodo(iso: string): Periodo {
  const d = new Date(iso);
  const oggi = new Date();
  const inizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime();
  if (d.getTime() >= inizioOggi) return 'oggi';
  if (d.getTime() >= inizioOggi - 6 * 86_400_000) return 'settimana';
  return 'prima';
}

function ora(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Tutte le attivazioni delle card, di tutti gli utenti, divise per periodo.
 *
 * Ogni riga dice chi, quale card, fino a quando e da dove arriva: "pagata"
 * se l'ha comprata l'utente, "da admin" se l'ha data qualcuno del back
 * office. Il filtro separa le due cose, che a fine mese sono conti diversi.
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
          setRighe(await caricaAttivazioni(null));
          setErrore(null);
        } catch (e) {
          setErrore((e as Error).message);
        }
        setCaricato(true);
      })();
    }, [])
  );

  const conteggi = useMemo(
    () => ({
      tutte: righe.length,
      pagamento: righe.filter((r) => r.fonte === 'pagamento').length,
      admin: righe.filter((r) => r.fonte === 'admin').length,
    }),
    [righe]
  );

  const gruppi = useMemo(() => {
    const visibili = fonte ? righe.filter((r) => r.fonte === fonte) : righe;
    const per: Record<Periodo, AttivazioneUtente[]> = { oggi: [], settimana: [], prima: [] };
    for (const r of visibili) per[periodo(r.creato_il)].push(r);
    return (['oggi', 'settimana', 'prima'] as Periodo[]).filter((p) => per[p].length > 0).map((p) => ({ p, righe: per[p] }));
  }, [righe, fonte]);

  if (!caricato) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  return (
    <View style={stili.contenitore}>
      <Filtri<Fonte>
        valore={fonte}
        onCambia={setFonte}
        opzioni={[
          { valore: null, etichetta: `Tutte (${conteggi.tutte})` },
          { valore: 'pagamento', etichetta: `Pagate (${conteggi.pagamento})` },
          { valore: 'admin', etichetta: `Da admin (${conteggi.admin})` },
        ]}
      />

      <ScrollView contentContainerStyle={stili.contenuto}>
        {errore && <Text style={stili.errore}>{errore}</Text>}

        {fonte !== 'admin' && conteggi.pagamento === 0 && (
          <View style={stili.avviso}>
            <Icona nome="euro" dimensione={18} colore={colori.primarioChiaro} />
            <Text style={stili.avvisoTesto}>
              I pagamenti dall’app non sono ancora attivi. Quando lo saranno, ogni card comprata
              comparirà qui da sola, segnata come “pagata”.
            </Text>
          </View>
        )}

        {gruppi.length === 0 ? (
          <Vuoto
            icona="documento"
            titolo="Niente da mostrare"
            testo={fonte === 'pagamento' ? 'Nessuna card pagata finora.' : 'Nessuna attivazione finora.'}
          />
        ) : (
          gruppi.map((g) => (
            <View key={g.p} style={stili.gruppo}>
              <Text style={stili.titoloGruppo}>{TITOLO_PERIODO[g.p]}</Text>
              {g.righe.map((r, i) => (
                <Scheda
                  key={`${r.creato_il}-${i}`}
                  rilievo="media"
                  onPress={() => router.push(`/admin/${r.id_utente}`)}
                  accessibilityLabel={`${r.nome ?? r.email}, ${ETICHETTA_MODULO[r.modulo]}`}
                  style={stili.riga}
                >
                  <BloccoIcona
                    modulo={r.modulo}
                    gradiente={gradienti[r.modulo]}
                    suGradiente={suGradiente[r.modulo]}
                    dimensione={44}
                    spento={!r.fino_a}
                  />
                  <View style={stili.testi}>
                    <Text style={stili.chi} numberOfLines={1}>
                      {r.nome ?? r.email}
                    </Text>
                    <Text style={stili.cosa} numberOfLines={1}>
                      {ETICHETTA_MODULO[r.modulo]}
                      {r.fino_a ? ` · fino al ${dataBreve(r.fino_a)}` : ' · disattivata'}
                    </Text>
                    <Text style={stili.quando} numberOfLines={1}>
                      {g.p === 'oggi' ? `alle ${ora(r.creato_il)}` : dataBreve(r.creato_il)}
                      {r.fonte === 'admin' && r.creato_da ? ` · ${r.creato_da}` : ''}
                      {r.riferimento ? ` · rif. ${r.riferimento}` : ''}
                    </Text>
                  </View>
                  <Pillola
                    testo={r.fonte === 'pagamento' ? 'pagata' : 'da admin'}
                    tono={r.fonte === 'pagamento' ? 'successo' : 'neutro'}
                  />
                </Scheda>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    contenitore: { flex: 1, backgroundColor: c.sfondo },
    centrato: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
    contenuto: { padding: spazi.l, gap: spazi.l, paddingBottom: spazi.xxxl },
    errore: { ...testi.piccolo, color: c.errore },
    avviso: {
      flexDirection: 'row',
      gap: spazi.s,
      alignItems: 'flex-start',
      padding: spazi.m,
      borderRadius: raggio.l,
      backgroundColor: c.primarioTenue,
    },
    avvisoTesto: { flex: 1, ...testi.piccolo, color: c.testo },
    gruppo: { gap: spazi.s },
    titoloGruppo: { ...testi.etichetta, color: c.testoTenue },
    riga: { flexDirection: 'row', alignItems: 'center', gap: spazi.m, padding: spazi.m },
    testi: { flex: 1, gap: 2 },
    chi: { fontSize: 15, fontWeight: '700', color: c.testo },
    cosa: { fontSize: 13, color: c.testo },
    quando: { fontSize: 11, color: c.testoDebole },
  })
);
