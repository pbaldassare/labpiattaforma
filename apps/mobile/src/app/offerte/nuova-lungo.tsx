import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  tab,
  perCampo,
  eModuloEsaurito,
  eProfiloMancante,
  MESSAGGIO_PROFILO_MANCANTE,
  ETICHETTA_SERVIZIO,
  SERVIZI,
  analizzaEuro,
  fn,
  formattaDurata,
  formattaEuro,
  formattaNumero,
  type ServizioIncluso,
} from '@lab/shared';

import { Bottone, Campo, Input, Sezione } from '@/components/modulo';
import { Procedura } from '@/components/procedura';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, stiliTema, TOCCO_MINIMO } from '@/lib/tema';

/** Le combinazioni che si usano davvero: l'esempio del documento è 24/36/48. */
const DURATE_POSSIBILI = [12, 24, 36, 48, 60];
const KM_POSSIBILI = [10000, 15000, 20000, 25000, 30000];

type Listino = 'pubblico' | 'rivenditore';

export default function NuovaOffertaLungo() {
  const router = useRouter();
  // Con un id si sta correggendo un'offerta che esiste gia': stessa schermata,
  // perche' i campi sono gli stessi e tenerne due vorrebbe dire tenerle
  // allineate per sempre.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const modifica = typeof id === 'string' && id.length > 0;
  const scorrimento = useRef<ScrollView>(null);

  const [marca, setMarca] = useState('');
  const [modello, setModello] = useState('');
  const [allestimento, setAllestimento] = useState('');

  const [durate, setDurate] = useState<number[]>([24, 36, 48]);
  const [km, setKm] = useState<number[]>([10000, 15000, 20000]);

  // Chiave: "durata-km-listino". Un oggetto piatto invece di una matrice:
  // aggiungere o togliere una durata non deve ricostruire niente.
  const [canoni, setCanoni] = useState<Record<string, string>>({});
  const [listino, setListino] = useState<Listino>('pubblico');

  const [anticipo, setAnticipo] = useState('');
  const [servizi, setServizi] = useState<ServizioIncluso[]>([
    'assicurazione',
    'manutenzione',
    'bollo',
  ]);
  const [consegna, setConsegna] = useState('');

  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(modifica);

  useEffect(() => {
    if (!modifica) return;
    let vivo = true;

    void (async () => {
      const [o, c] = await Promise.all([
        supabase.from(tab('offerta_noleggio_lungo')).select('*').eq('offerta_id', id).maybeSingle(),
        supabase.from(tab('canone_lungo')).select('*').eq('offerta_id', id),
      ]);

      if (!vivo) return;
      if (o.error || !o.data) {
        setErrore(o.error?.message ?? 'Offerta non trovata.');
        setCaricando(false);
        return;
      }

      const l = o.data as Record<string, unknown>;
      setMarca((l.marca as string) ?? '');
      setModello((l.modello as string) ?? '');
      setAllestimento((l.allestimento as string) ?? '');
      setAnticipo(perCampo(l.anticipo_cent as number | null));
      setConsegna((l.tempi_consegna as string) ?? '');
      if (Array.isArray(l.servizi)) setServizi(l.servizi as ServizioIncluso[]);

      // La griglia torna com'era: durate, chilometraggi e ogni casella piena.
      const righe = (c.data ?? []) as {
        durata_mesi: number;
        km_annui: number;
        canone_pubblico_cent: number | null;
        canone_rivenditore_cent: number | null;
      }[];

      if (righe.length > 0) {
        setDurate([...new Set(righe.map((r) => r.durata_mesi))].sort((a, b) => a - b));
        setKm([...new Set(righe.map((r) => r.km_annui))].sort((a, b) => a - b));

        const celle: Record<string, string> = {};
        for (const r of righe) {
          celle[`${r.durata_mesi}-${r.km_annui}-pubblico`] = perCampo(r.canone_pubblico_cent);
          celle[`${r.durata_mesi}-${r.km_annui}-rivenditore`] = perCampo(
            r.canone_rivenditore_cent
          );
        }
        setCanoni(celle);
      }

      setCaricando(false);
    })();

    return () => {
      vivo = false;
    };
  }, [id, modifica]);

  function chiave(d: number, k: number, l: Listino) {
    return `${d}-${k}-${l}`;
  }

  function commuta<T>(elenco: T[], valore: T): T[] {
    return elenco.includes(valore)
      ? elenco.filter((x) => x !== valore)
      : [...elenco, valore].sort((a, b) => Number(a) - Number(b));
  }

  const griglia = useMemo(() => {
    const righe: {
      durata_mesi: number;
      km_annui: number;
      canone_pubblico_cent: number;
      canone_rivenditore_cent: number | null;
    }[] = [];

    for (const d of durate) {
      for (const k of km) {
        const pubblico = analizzaEuro(canoni[chiave(d, k, 'pubblico')] ?? '');
        if (pubblico == null || pubblico <= 0) continue;
        const riv = analizzaEuro(canoni[chiave(d, k, 'rivenditore')] ?? '');
        righe.push({
          durata_mesi: d,
          km_annui: k,
          canone_pubblico_cent: pubblico,
          canone_rivenditore_cent: riv != null && riv > 0 ? riv : null,
        });
      }
    }
    return righe;
  }, [durate, km, canoni]);

  const minimo = griglia.length
    ? Math.min(...griglia.map((r) => r.canone_pubblico_cent))
    : null;
  const conRivenditore = griglia.filter((r) => r.canone_rivenditore_cent != null).length;

  const puoSalvare =
    marca.trim() !== '' && modello.trim() !== '' && griglia.length > 0 && !inCorso;

  async function salva(stato: 'bozza' | 'attiva') {
    setErrore(null);
    setInCorso(true);

    const { data, error } = await supabase.rpc(fn('salva_offerta_noleggio_lungo'), {
      p_offerta_id: modifica ? id : null,
      p_dati: {
        marca: marca.trim(),
        modello: modello.trim(),
        allestimento: allestimento.trim() || null,
        anticipo_cent: analizzaEuro(anticipo),
        servizi,
        tempi_consegna: consegna.trim() || null,
        riscatto_previsto: false,
        // In modifica lo stato si cambia dalla scheda dell'offerta.
        stato: modifica ? undefined : stato,
        griglia,
      },
    });

    setInCorso(false);
    if (error) {
      // Operazioni gratuite finite: il blocco e' una schermata a se', non un
      // messaggio rosso sotto un campo (§8.5).
      if (eModuloEsaurito(error.message)) {
        router.push({ pathname: '/blocco', params: { modulo: 'noleggio_lungo' } });
        return;
      }
      // Senza profilo l'offerta non ha un venditore a cui appartenere: si
      // compila quello e si torna qui, con il form ancora pieno.
      if (eProfiloMancante(error.message)) {
        setErrore(MESSAGGIO_PROFILO_MANCANTE);
        router.push('/profilo');
        return;
      }
      setErrore(
        error.message.includes('marca_e_modello_obbligatori')
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
      {/* Il titolo dice cosa si sta facendo. */}
      <Stack.Screen
        options={{
          title: modifica ? 'Modifica · Noleggio lungo' : 'Nuova offerta · Noleggio lungo',
        }}
      />
      <ScrollView ref={scorrimento} contentContainerStyle={stili.scorrimento} keyboardShouldPersistTaps="handled">
        <Procedura
          liberi={modifica}
          onCambiaPasso={() => scorrimento.current?.scrollTo({ y: 0, animated: true })}
          passi={[
            {
              titolo: 'Il mezzo',
              valido: marca.trim() !== '' && modello.trim() !== '',
              motivo: 'Scrivi marca e modello per andare avanti.',
              contenuto: (
                <>
                <Sezione titolo="Il mezzo">
                  <Campo etichetta="Marca" obbligatorio>
                    <Input value={marca} onChangeText={setMarca} placeholder="Volkswagen" />
                  </Campo>
                  <Campo etichetta="Modello" obbligatorio>
                    <Input value={modello} onChangeText={setModello} placeholder="T-Roc" />
                  </Campo>
                  <Campo etichetta="Allestimento">
                    <Input
                      value={allestimento}
                      onChangeText={setAllestimento}
                      placeholder="1.0 TSI Life"
                    />
                  </Campo>
                </Sezione>
                </>
              ),
            },
            {
              titolo: 'Durate e km',
              contenuto: (
                <>

                <Sezione titolo="Quali durate offri">
                  <View style={stili.pasticche}>
                    {DURATE_POSSIBILI.map((d) => (
                      <Pasticca
                        key={d}
                        etichetta={formattaDurata(d)}
                        attiva={durate.includes(d)}
                        onPress={() => setDurate(commuta(durate, d))}
                      />
                    ))}
                  </View>
                </Sezione>

                <Sezione titolo="Quali chilometraggi">
                  <View style={stili.pasticche}>
                    {KM_POSSIBILI.map((k) => (
                      <Pasticca
                        key={k}
                        etichetta={formattaNumero(k)}
                        attiva={km.includes(k)}
                        onPress={() => setKm(commuta(km, k))}
                      />
                    ))}
                  </View>
                </Sezione>
                </>
              ),
            },
            {
              titolo: 'Canoni',
              valido: griglia.length > 0,
              motivo: 'Inserisci almeno un canone.',
              contenuto: (
                <>

                <Sezione titolo="Canoni mensili">
                  {/* Due listini separati invece di diciotto caselle sullo stesso
                      schermo: il venditore compila prima quelli al pubblico, e passa
                      ai riservati solo se li usa. */}
                  <View style={stili.pasticche}>
                    <Pasticca
                      etichetta="Al pubblico"
                      attiva={listino === 'pubblico'}
                      onPress={() => setListino('pubblico')}
                    />
                    <Pasticca
                      etichetta={`Rivenditori${conRivenditore > 0 ? ` (${conRivenditore})` : ''}`}
                      attiva={listino === 'rivenditore'}
                      onPress={() => setListino('rivenditore')}
                    />
                  </View>

                  {durate.length === 0 || km.length === 0 ? (
                    <Text style={stili.nota}>Scegli almeno una durata e un chilometraggio.</Text>
                  ) : (
                    durate.map((d) => (
                      <View key={d} style={stili.rigaGriglia}>
                        <Text style={stili.durata}>{formattaDurata(d)}</Text>
                        <View style={stili.caselle}>
                          {km.map((k) => (
                            <View key={k} style={stili.casella}>
                              <Text style={stili.kmEtichetta}>{formattaNumero(k)}</Text>
                              <Input
                                value={canoni[chiave(d, k, listino)] ?? ''}
                                onChangeText={(v) =>
                                  setCanoni((x) => ({ ...x, [chiave(d, k, listino)]: v }))
                                }
                                keyboardType="decimal-pad"
                                placeholder="—"
                                style={stili.casellaInput}
                              />
                            </View>
                          ))}
                        </View>
                      </View>
                    ))
                  )}

                  {listino === 'rivenditore' && (
                    <Text style={stili.nota}>
                      Facoltativi. Se ne compili almeno uno nasce la pagina riservata, con link
                      separato e non pubblicata.
                    </Text>
                  )}

                  {minimo != null && (
                    <Text style={stili.riepilogo}>
                      {griglia.length} combinazioni · in pagina comparirà “a partire da{' '}
                      {formattaEuro(minimo)} al mese”
                    </Text>
                  )}
                </Sezione>
                </>
              ),
            },
            {
              titolo: 'Condizioni',
              contenuto: (
                <>

                <Sezione titolo="Condizioni">
                  <Campo etichetta="Anticipo">
                    <Input
                      value={anticipo}
                      onChangeText={setAnticipo}
                      keyboardType="decimal-pad"
                      placeholder="3.000"
                    />
                  </Campo>
                  <Campo etichetta="Tempi di consegna">
                    <Input
                      value={consegna}
                      onChangeText={setConsegna}
                      placeholder="Pronta consegna, oppure 8 settimane"
                    />
                  </Campo>
                  <Campo etichetta="Cosa è compreso nel canone">
                    <View style={stili.pasticche}>
                      {SERVIZI.map((s) => (
                        <Pasticca
                          key={s}
                          etichetta={ETICHETTA_SERVIZIO[s]}
                          attiva={servizi.includes(s)}
                          onPress={() => setServizi(commuta(servizi, s))}
                        />
                      ))}
                    </View>
                  </Campo>
                </Sezione>
                </>
              ),
            },
          ]}
          finale={
            <>
              {!puoSalvare && (
                <Text style={stili.errore}>Manca qualcosa: torna ai passi precedenti e completa i campi obbligatori.</Text>
              )}
              {errore ? <Text style={stili.errore}>{errore}</Text> : null}

              <View style={stili.azioni}>
                {modifica ? (
                  <Bottone
                    testo="Salva le modifiche"
                    inCorso={inCorso}
                    disabilitato={!puoSalvare}
                    onPress={() => void salva('attiva')}
                  />
                ) : (
                  <>
                <Bottone
                  testo="Salva e pubblica"
                  inCorso={inCorso}
                  disabilitato={!puoSalvare}
                  onPress={() => void salva('attiva')}
                />
                <Bottone
                  tenue
                  testo="Salva come bozza"
                  disabilitato={!puoSalvare}
                  onPress={() => void salva('bozza')}
                />
                  </>
                )}
              </View>
            </>
          }
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Pasticca({
  etichetta,
  attiva,
  onPress,
}: {
  etichetta: string;
  attiva: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[stili.pasticca, attiva && stili.pasticcaAttiva]}
      accessibilityRole="button"
      accessibilityState={{ selected: attiva }}
    >
      <Text style={[stili.pasticcaTesto, attiva && stili.pasticcaTestoAttivo]}>{etichetta}</Text>
    </Pressable>
  );
}

const stili = stiliTema((c) => StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: c.sfondo },
  attesa: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
  scorrimento: { padding: spazi.xl, paddingBottom: spazi.xxl * 2, gap: spazi.m },
  pasticche: { flexDirection: 'row', flexWrap: 'wrap', gap: spazi.s },
  pasticca: {
    minHeight: TOCCO_MINIMO,
    justifyContent: 'center',
    paddingHorizontal: spazi.m,
    borderRadius: raggio.m,
    borderWidth: 1,
    borderColor: c.bordo,
    backgroundColor: c.superficie,
  },
  pasticcaAttiva: { backgroundColor: c.primario, borderColor: c.primario },
  pasticcaTesto: { fontSize: 14, color: c.testo },
  pasticcaTestoAttivo: { color: c.suPrimario, fontWeight: '600' },
  rigaGriglia: { gap: spazi.xs },
  durata: { fontSize: 14, fontWeight: '700', color: c.testo },
  caselle: { flexDirection: 'row', gap: spazi.s },
  casella: { flex: 1, gap: 2 },
  kmEtichetta: { fontSize: 11, color: c.testoTenue, textAlign: 'center' },
  casellaInput: { textAlign: 'center', paddingHorizontal: spazi.xs },
  nota: { fontSize: 12, color: c.testoTenue, lineHeight: 17 },
  riepilogo: { fontSize: 13, color: c.primarioChiaro, fontWeight: '600', lineHeight: 18 },
  errore: { fontSize: 14, color: c.errore },
  azioni: { gap: spazi.s, paddingTop: spazi.l },
}));