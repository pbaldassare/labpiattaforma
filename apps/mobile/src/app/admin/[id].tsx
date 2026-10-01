import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ETICHETTA_MODULO, type Modulo } from '@lab/shared';

import { BloccoIcona, Pillola, Scheda } from '@/components/base';
import { Testo as Text } from '@/components/testo';
import {
  caricaUtenti,
  dataBreve,
  impostaModulo,
  moduloAttivo,
  type ModuloUtente,
  type UtenteAdmin,
} from '@/lib/admin';
import { colori, gradienti, raggio, spazi, stiliTema, suGradiente, testi } from '@/lib/tema';

const DURATE = [
  { etichetta: '+1 mese', mesi: 1 },
  { etichetta: '+6 mesi', mesi: 6 },
  { etichetta: '+1 anno', mesi: 12 },
] as const;

/**
 * Si allunga da dove finisce l'attivazione in corso, non da oggi: chi rinnova
 * prima della scadenza non deve perdere i giorni che gli restano.
 */
function scadenzaDopo(m: ModuloUtente, mesi: number): Date {
  const oggi = new Date();
  const attuale = m.acquistato_fino_a ? new Date(m.acquistato_fino_a) : null;
  const base = attuale && attuale > oggi ? attuale : oggi;
  const fine = new Date(base);
  fine.setMonth(fine.getMonth() + mesi);
  return fine;
}

export default function AdminUtente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [utente, setUtente] = useState<UtenteAdmin | null>(null);
  const [caricato, setCaricato] = useState(false);
  const [inCorso, setInCorso] = useState<Modulo | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    try {
      const tutti = await caricaUtenti();
      setUtente(tutti.find((u) => u.id === id) ?? null);
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

  async function imposta(modulo: Modulo, finoA: Date | null) {
    setErrore(null);
    setInCorso(modulo);
    try {
      await impostaModulo(id, modulo, finoA);
      await carica();
    } catch (e) {
      setErrore((e as Error).message);
    }
    setInCorso(null);
  }

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

  return (
    <ScrollView style={stili.contenitore} contentContainerStyle={stili.contenuto}>
      <Stack.Screen options={{ title: utente.nome ?? utente.email }} />

      <View style={stili.testa}>
        <Text style={stili.titolo}>{utente.nome ?? 'Profilo non compilato'}</Text>
        <Text style={stili.email}>{utente.email}</Text>
      </View>

      <Text style={stili.introduzione}>
        Un modulo attivo non ha limiti di operazioni fino alla scadenza. Dopo torna alle
        operazioni gratuite che restano.
      </Text>

      {errore && <Text style={stili.errore}>{errore}</Text>}

      {utente.moduli.map((m) => (
        <SchedaModulo
          key={m.modulo}
          stato={m}
          occupato={inCorso === m.modulo}
          onImposta={(fine) => void imposta(m.modulo, fine)}
        />
      ))}
    </ScrollView>
  );
}

function SchedaModulo({
  stato,
  occupato,
  onImposta,
}: {
  stato: ModuloUtente;
  occupato: boolean;
  onImposta: (fine: Date | null) => void;
}) {
  const attivo = moduloAttivo(stato);
  const scaduto = stato.acquistato_fino_a != null && !attivo;
  const residui = Math.max(0, stato.utilizzi_inclusi - stato.utilizzi_consumati);

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
          <Text style={stili.nome}>{ETICHETTA_MODULO[stato.modulo]}</Text>
          <Text style={stili.dettaglio}>
            {attivo
              ? `Attivo fino al ${dataBreve(stato.acquistato_fino_a!)}`
              : scaduto
                ? `Scaduto il ${dataBreve(stato.acquistato_fino_a!)}`
                : `Gratuite usate: ${stato.utilizzi_consumati} di ${stato.utilizzi_inclusi}`}
          </Text>
        </View>
        {attivo ? (
          <Pillola testo={stato.origine_acquisto === 'pagamento' ? 'pagato' : 'attivo'} tono="successo" />
        ) : residui === 0 ? (
          <Pillola testo="bloccato" tono="azione" />
        ) : null}
      </View>

      {occupato ? (
        <ActivityIndicator color={colori.primario} />
      ) : (
        <View style={stili.azioni}>
          {DURATE.map((d) => (
            <Tasto key={d.mesi} testo={d.etichetta} onPress={() => onImposta(scadenzaDopo(stato, d.mesi))} />
          ))}
          {attivo && <Tasto testo="Disattiva" pericolo onPress={() => onImposta(null)} />}
        </View>
      )}
    </Scheda>
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
    contenuto: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxxl },
    vuoto: { ...testi.corpo, color: c.testoTenue },
    testa: { gap: 2 },
    titolo: { ...testi.titolo, color: c.testo },
    email: { ...testi.piccolo, color: c.testoTenue },
    introduzione: { ...testi.piccolo, color: c.testoTenue },
    errore: { ...testi.piccolo, color: c.errore },

    scheda: { gap: spazi.m },
    riga: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },
    testi: { flex: 1, gap: 2 },
    nome: { ...testi.sottotitolo, color: c.testo },
    dettaglio: { ...testi.piccolo, color: c.testoTenue },

    azioni: { flexDirection: 'row', flexWrap: 'wrap', gap: spazi.s },
    tasto: {
      minHeight: 40,
      paddingHorizontal: spazi.m,
      borderRadius: raggio.tondo,
      borderWidth: 1,
      borderColor: c.bordo,
      backgroundColor: c.superficieAlta,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tastoPericolo: { borderColor: c.azione, backgroundColor: c.azioneTenue },
    tastoTesto: { fontSize: 14, fontWeight: '600', color: c.primarioChiaro },
    tastoTestoPericolo: { color: c.azione },
    premuto: { opacity: 0.6 },
  })
);
