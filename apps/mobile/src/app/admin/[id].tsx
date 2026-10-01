import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ETICHETTA_MODULO } from '@lab/shared';

import { BloccoIcona, Iniziali, Pillola, Scheda } from '@/components/base';
import { Icona } from '@/components/icone';
import { Bottone, Input, Sezione } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import {
  caricaStorico,
  caricaUtenti,
  dataBreve,
  dataLunga,
  giorniA,
  impostaModulo,
  leggiData,
  moduloAttivo,
  type Attivazione,
  type ModuloUtente,
  type UtenteAdmin,
} from '@/lib/admin';
import {
  colori,
  coloriModulo,
  gradienti,
  raggio,
  spazi,
  stiliTema,
  suGradiente,
  testi,
} from '@/lib/tema';

const DURATE = [
  { etichetta: '1 mese', mesi: 1 },
  { etichetta: '6 mesi', mesi: 6 },
  { etichetta: '1 anno', mesi: 12 },
] as const;

/**
 * Si allunga da dove finisce l'attivazione in corso, non da oggi: chi rinnova
 * prima della scadenza non deve perdere i giorni che gli restano.
 */
function scadenzaDopo(m: ModuloUtente, mesi: number): Date {
  const base = moduloAttivo(m) ? new Date(m.acquistato_fino_a!) : new Date();
  const fine = new Date(base);
  fine.setMonth(fine.getMonth() + mesi);
  return fine;
}

/** Cosa si sta per fare, in attesa della conferma. */
type Proposta = { tipo: 'attiva'; fine: Date } | { tipo: 'disattiva' };

/**
 * Il dettaglio di un utente nel back office.
 *
 * Ogni modulo dice in parole cosa puo' fare l'utente adesso, e ogni azione
 * mostra la data esatta che produrra' prima di essere confermata: l'admin non
 * deve fare conti per capire cosa succede premendo un tasto.
 */
export default function AdminUtente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [utente, setUtente] = useState<UtenteAdmin | null>(null);
  const [storico, setStorico] = useState<Attivazione[]>([]);
  const [caricato, setCaricato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    try {
      const [tutti, righe] = await Promise.all([caricaUtenti(), caricaStorico(id)]);
      setUtente(tutti.find((u) => u.id === id) ?? null);
      setStorico(righe);
    } catch (e) {
      setErrore((e as Error).message);
    }
    setCaricato(true);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void carica();
    }, [carica])
  );

  if (!caricato) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  if (!utente) {
    return (
      <View style={stili.centrato}>
        <Text style={stili.vuoto}>{errore ?? 'Utente non trovato.'}</Text>
      </View>
    );
  }

  const attivi = utente.moduli.filter(moduloAttivo).length;
  const nome = utente.nome ?? 'Profilo non compilato';

  return (
    <ScrollView style={stili.contenitore} contentContainerStyle={stili.contenuto}>
      <Stack.Screen options={{ title: nome }} />

      <Scheda rilievo="media" style={stili.testa}>
        <View style={stili.riga}>
          <Iniziali nome={utente.nome ?? utente.email} />
          <View style={stili.testi}>
            <Text style={stili.nomeUtente}>{nome}</Text>
            <Text style={stili.piccolo}>{utente.email}</Text>
          </View>
        </View>
        <View style={stili.fatti}>
          <Fatto etichetta="Card attive" valore={`${attivi} di ${utente.moduli.length}`} />
          <Fatto etichetta="Creato il" valore={dataBreve(utente.creato_il)} />
          <Fatto
            etichetta="Ultimo accesso"
            valore={utente.ultimo_accesso ? dataBreve(utente.ultimo_accesso) : 'mai'}
          />
        </View>
        {!utente.nome && (
          <Text style={stili.nota}>
            Non ha ancora compilato il profilo: finché non lo fa non può pubblicare offerte.
          </Text>
        )}
      </Scheda>

      <Scheda style={stili.comeFunziona}>
        <Text style={stili.comeTitolo}>Come funzionano le card</Text>
        <Punto testo="Ogni utente ha 5 operazioni gratuite per card. Finite quelle, la card si blocca." />
        <Punto testo="Attivando una card, l’utente la usa senza limiti fino alla data che scegli." />
        <Punto testo="Alla scadenza torna bloccata, a meno che tu non la prolunghi." />
        <Punto testo="Quando ci saranno i pagamenti, le card pagate dall’utente si attivano da sole e le vedi qui." />
      </Scheda>

      {errore && <Text style={stili.errore}>{errore}</Text>}

      <Sezione titolo="Le card" icona="scatola">
        <View style={stili.elenco}>
          {utente.moduli.map((m) => (
            <SchedaModulo
              key={m.modulo}
              stato={m}
              onFatto={carica}
              onErrore={setErrore}
              idUtente={utente.id}
            />
          ))}
        </View>
      </Sezione>

      <Sezione titolo="Storico" icona="orologio">
        {storico.length === 0 ? (
          <Text style={stili.piccolo}>Nessuna attivazione finora.</Text>
        ) : (
          <View style={stili.storico}>
            {storico.map((r, i) => (
              <RigaStorico key={`${r.creato_il}-${i}`} riga={r} />
            ))}
          </View>
        )}
      </Sezione>
    </ScrollView>
  );
}

function SchedaModulo({
  stato,
  idUtente,
  onFatto,
  onErrore,
}: {
  stato: ModuloUtente;
  idUtente: string;
  onFatto: () => Promise<void>;
  onErrore: (messaggio: string | null) => void;
}) {
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);
  // La data scritta a mano: aperta solo quando serve, per non affollare la scheda.
  const [conData, setConData] = useState(false);
  const [testoData, setTestoData] = useState('');
  const [erroreData, setErroreData] = useState<string | null>(null);

  function usaData() {
    const fine = leggiData(testoData);
    if (!fine) {
      setErroreData('Scrivi una data futura come 31/12/2026.');
      return;
    }
    setErroreData(null);
    setEsito(null);
    setConData(false);
    setProposta({ tipo: 'attiva', fine });
  }

  const attivo = moduloAttivo(stato);
  const scaduto = stato.acquistato_fino_a != null && !attivo;
  const residui = Math.max(0, stato.utilizzi_inclusi - stato.utilizzi_consumati);
  const bloccato = !attivo && residui === 0;
  const etichetta = ETICHETTA_MODULO[stato.modulo];

  async function conferma() {
    if (!proposta) return;
    onErrore(null);
    setInCorso(true);
    try {
      const fine = proposta.tipo === 'attiva' ? proposta.fine : null;
      await impostaModulo(idUtente, stato.modulo, fine);
      setEsito(
        fine
          ? `Fatto: ${etichetta} è attiva fino al ${dataLunga(fine)}.`
          : `Fatto: ${etichetta} è disattivata.`
      );
      setProposta(null);
      await onFatto();
    } catch (e) {
      onErrore((e as Error).message);
    }
    setInCorso(false);
  }

  // Lo stato detto in parole: titolo, dettaglio e cosa vuol dire per l'utente.
  const tono = attivo ? 'successo' : bloccato ? 'azione' : 'neutro';
  const titolo = attivo
    ? `Attiva fino al ${dataLunga(new Date(stato.acquistato_fino_a!))}`
    : bloccato
      ? scaduto
        ? `Scaduta il ${dataLunga(new Date(stato.acquistato_fino_a!))}`
        : 'Bloccata'
      : `In prova: ${residui} ${residui === 1 ? 'operazione gratuita rimasta' : 'operazioni gratuite rimaste'}`;
  const spiegazione = attivo
    ? `Mancano ${giorniA(stato.acquistato_fino_a!)} giorni. Può caricare offerte senza limiti.`
    : bloccato
      ? `Ha usato tutte le ${stato.utilizzi_inclusi} operazioni gratuite: non può caricare nuove offerte finché non attivi la card. Quelle già online restano visibili.`
      : `Ne ha usate ${stato.utilizzi_consumati} su ${stato.utilizzi_inclusi}. Dopo l’ultima la card si blocca finché non la attivi.`;

  return (
    <Scheda rilievo="media" style={stili.scheda}>
      <View style={stili.riga}>
        <BloccoIcona
          modulo={stato.modulo}
          gradiente={gradienti[stato.modulo]}
          suGradiente={suGradiente[stato.modulo]}
          dimensione={44}
          spento={!attivo}
        />
        <View style={stili.testi}>
          <Text style={stili.nomeModulo}>{etichetta}</Text>
          {attivo && (
            <Text style={stili.piccolo}>
              {stato.origine_acquisto === 'pagamento' ? 'Pagata dall’utente' : 'Attivata da un admin'}
            </Text>
          )}
        </View>
        <Pillola testo={attivo ? 'attiva' : bloccato ? 'bloccata' : 'in prova'} tono={tono} />
      </View>

      <View style={[stili.stato, attivo && stili.statoAttivo, bloccato && stili.statoBloccato]}>
        <Text style={stili.statoTitolo}>{titolo}</Text>
        {!attivo && !bloccato && (
          <View style={stili.barra}>
            <View
              style={[
                stili.barraPiena,
                { backgroundColor: coloriModulo[stato.modulo] },
                { width: `${Math.min(100, (stato.utilizzi_consumati / Math.max(1, stato.utilizzi_inclusi)) * 100)}%` },
              ]}
            />
          </View>
        )}
        <Text style={stili.statoTesto}>{spiegazione}</Text>
      </View>

      {esito && !proposta && (
        <View style={stili.esito}>
          <Icona nome="spunta" dimensione={16} colore={colori.successo} />
          <Text style={stili.esitoTesto}>{esito}</Text>
        </View>
      )}

      {proposta ? (
        <View style={stili.conferma}>
          <Text style={stili.confermaTesto}>
            {proposta.tipo === 'attiva'
              ? `${attivo ? 'Prolungare' : 'Attivare'} ${etichetta} fino al ${dataLunga(proposta.fine)}?`
              : `Disattivare ${etichetta}? Torna alle operazioni gratuite: ${
                  residui === 0
                    ? 'le ha già usate tutte, quindi si blocca subito.'
                    : `ne restano ${residui}.`
                }`}
          </Text>
          <Bottone
            testo={proposta.tipo === 'attiva' ? 'Conferma' : 'Sì, disattiva'}
            tipo={proposta.tipo === 'attiva' ? 'pieno' : 'azione'}
            inCorso={inCorso}
            onPress={() => void conferma()}
          />
          <Bottone testo="Annulla" tipo="nudo" disabilitato={inCorso} onPress={() => setProposta(null)} />
        </View>
      ) : (
        <View style={stili.azioni}>
          <Text style={stili.azioniTitolo}>{attivo ? 'Prolunga di' : 'Attiva per'}</Text>
          <View style={stili.durate}>
            {DURATE.map((d) => (
              <Tasto
                key={d.mesi}
                testo={d.etichetta}
                onPress={() => {
                  setEsito(null);
                  setProposta({ tipo: 'attiva', fine: scadenzaDopo(stato, d.mesi) });
                }}
              />
            ))}
          </View>
          {conData ? (
            <View style={stili.dataScelta}>
              <Input
                value={testoData}
                onChangeText={(t) => {
                  setTestoData(t);
                  setErroreData(null);
                }}
                placeholder="gg/mm/aaaa"
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
                style={stili.dataInput}
                onSubmitEditing={usaData}
              />
              <Tasto testo="Usa questa data" onPress={usaData} />
            </View>
          ) : (
            <Tasto testo="Scegli una data" onPress={() => setConData(true)} />
          )}
          {erroreData && <Text style={stili.errore}>{erroreData}</Text>}
          {attivo && (
            <Tasto
              testo="Disattiva la card"
              pericolo
              onPress={() => {
                setEsito(null);
                setProposta({ tipo: 'disattiva' });
              }}
            />
          )}
        </View>
      )}
    </Scheda>
  );
}

function RigaStorico({ riga }: { riga: Attivazione }) {
  const azione = riga.fino_a
    ? `attivata fino al ${dataBreve(riga.fino_a)}`
    : 'disattivata';
  const chi = riga.fonte === 'pagamento' ? 'pagamento dell’utente' : (riga.creato_da ?? 'admin');

  return (
    <View style={stili.rigaStorico}>
      <View style={[stili.puntoStorico, { backgroundColor: coloriModulo[riga.modulo] }]} />
      <View style={stili.testi}>
        <Text style={stili.storicoTesto}>
          <Text style={stili.storicoModulo}>{ETICHETTA_MODULO[riga.modulo]}</Text> {azione}
        </Text>
        <Text style={stili.storicoData}>
          {dataBreve(riga.creato_il)} · {chi}
        </Text>
      </View>
    </View>
  );
}

function Fatto({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <View style={stili.fatto}>
      <Text style={stili.fattoValore}>{valore}</Text>
      <Text style={stili.fattoEtichetta}>{etichetta}</Text>
    </View>
  );
}

function Punto({ testo }: { testo: string }) {
  return (
    <View style={stili.punto}>
      <Text style={stili.puntoSegno}>•</Text>
      <Text style={stili.puntoTesto}>{testo}</Text>
    </View>
  );
}

function Tasto({ testo, onPress, pericolo }: { testo: string; onPress: () => void; pericolo?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [stili.tasto, pericolo && stili.tastoPericolo, pressed && stili.premuto]}
    >
      <Text style={[stili.tastoTesto, pericolo && stili.tastoTestoPericolo]}>{testo}</Text>
    </Pressable>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    contenitore: { flex: 1, backgroundColor: c.sfondo },
    centrato: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.sfondo },
    contenuto: { padding: spazi.l, gap: spazi.xl, paddingBottom: spazi.xxxl },
    vuoto: { ...testi.corpo, color: c.testoTenue },
    piccolo: { ...testi.piccolo, color: c.testoTenue },
    errore: { ...testi.piccolo, color: c.errore },
    riga: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },
    testi: { flex: 1, gap: 2 },

    testa: { gap: spazi.l },
    nomeUtente: { ...testi.titolo, fontSize: 20, color: c.testo },
    fatti: { flexDirection: 'row', gap: spazi.s },
    fatto: {
      flex: 1,
      gap: 2,
      padding: spazi.s,
      borderRadius: raggio.m,
      backgroundColor: c.superficieAlta,
    },
    fattoValore: { ...testi.sottotitolo, fontSize: 15, color: c.testo },
    fattoEtichetta: { fontSize: 11, color: c.testoTenue },
    nota: { ...testi.piccolo, color: c.accento },

    comeFunziona: { gap: spazi.s },
    comeTitolo: { ...testi.sottotitolo, fontSize: 15, color: c.testo },
    punto: { flexDirection: 'row', gap: spazi.s },
    puntoSegno: { ...testi.piccolo, color: c.primarioChiaro },
    puntoTesto: { ...testi.piccolo, flex: 1, color: c.testoTenue },

    elenco: { gap: spazi.m },
    scheda: { gap: spazi.m },
    nomeModulo: { ...testi.sottotitolo, color: c.testo },

    stato: {
      gap: spazi.xs,
      padding: spazi.m,
      borderRadius: raggio.m,
      backgroundColor: c.superficieAlta,
    },
    statoAttivo: { backgroundColor: c.successoTenue },
    statoBloccato: { backgroundColor: c.azioneTenue },
    statoTitolo: { fontSize: 15, fontWeight: '700', color: c.testo },
    statoTesto: { ...testi.piccolo, color: c.testoTenue },
    barra: {
      height: 6,
      borderRadius: raggio.tondo,
      backgroundColor: c.bordoTenue,
      overflow: 'hidden',
      marginVertical: 2,
    },
    barraPiena: { height: 6, borderRadius: raggio.tondo },

    esito: { flexDirection: 'row', alignItems: 'center', gap: spazi.s },
    esitoTesto: { ...testi.piccolo, flex: 1, color: c.successo, fontWeight: '600' },

    conferma: {
      gap: spazi.s,
      padding: spazi.m,
      borderRadius: raggio.m,
      borderWidth: 1,
      borderColor: c.bordo,
    },
    confermaTesto: { ...testi.corpo, color: c.testo, fontWeight: '600' },

    azioni: { gap: spazi.s },
    azioniTitolo: { ...testi.etichetta, color: c.testoTenue },
    durate: { flexDirection: 'row', gap: spazi.s },
    dataScelta: { flexDirection: 'row', gap: spazi.s, alignItems: 'center' },
    dataInput: { flex: 1 },
    tasto: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: spazi.m,
      borderRadius: raggio.m,
      borderWidth: 1,
      borderColor: c.bordo,
      backgroundColor: c.superficieAlta,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tastoPericolo: { flex: 0, borderColor: c.azione, backgroundColor: c.azioneTenue },
    tastoTesto: { fontSize: 14, fontWeight: '600', color: c.primarioChiaro },
    tastoTestoPericolo: { color: c.azione },
    premuto: { opacity: 0.6 },

    storico: { gap: spazi.m },
    rigaStorico: { flexDirection: 'row', gap: spazi.m, alignItems: 'flex-start' },
    puntoStorico: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    storicoTesto: { ...testi.piccolo, color: c.testo },
    storicoModulo: { fontWeight: '700' },
    storicoData: { fontSize: 11, color: c.testoDebole },
  })
);
