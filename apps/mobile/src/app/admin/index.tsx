import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ETICHETTA_MODULO } from '@lab/shared';

import { Iniziali, Pillola, Scheda, Vuoto } from '@/components/base';
import { Bottone } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { caricaUtenti, dataBreve, moduloAttivo, type UtenteAdmin } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { colori, spazi, stiliTema, testi } from '@/lib/tema';

/**
 * La home dell'admin: gli utenti, uno per scheda, con i moduli attivi in
 * vista. Il back office non ha altro: niente offerte, pratiche o clienti, che
 * sono roba dei venditori.
 */
export default function AdminUtenti() {
  const router = useRouter();
  const [utenti, setUtenti] = useState<UtenteAdmin[]>([]);
  const [caricato, setCaricato] = useState(false);
  const [aggiornando, setAggiornando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    try {
      setUtenti(await caricaUtenti());
      setErrore(null);
    } catch (e) {
      setErrore((e as Error).message);
    }
    setCaricato(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carica();
    }, [carica])
  );

  async function aggiorna() {
    setAggiornando(true);
    await carica();
    setAggiornando(false);
  }

  if (!caricato) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  return (
    <ScrollView
      style={stili.contenitore}
      contentContainerStyle={stili.contenuto}
      refreshControl={<RefreshControl refreshing={aggiornando} onRefresh={aggiorna} />}
    >
      <View style={stili.testa}>
        <Text style={stili.titolo}>Utenti</Text>
        <Text style={stili.sottotitolo}>
          {utenti.length === 1 ? '1 utente' : `${utenti.length} utenti`}
        </Text>
      </View>

      <Bottone testo="Nuovo utente" icona="piu" onPress={() => router.push('/admin/nuovo')} />
      <Bottone
        testo="Chi ha pagato cosa"
        icona="euro"
        tipo="tenue"
        onPress={() => router.push('/admin/attivazioni')}
      />

      {errore && <Text style={stili.errore}>{errore}</Text>}

      {utenti.length === 0 && !errore ? (
        <Vuoto icona="utenti" titolo="Nessun utente" testo="Crea il primo con il pulsante qui sopra." />
      ) : (
        utenti.map((u) => <SchedaUtente key={u.id} utente={u} onPress={() => router.push(`/admin/${u.id}`)} />)
      )}

      <View style={stili.fondo}>
        <Bottone tipo="nudo" testo="Esci" icona="esci" onPress={() => void supabase.auth.signOut()} />
      </View>
    </ScrollView>
  );
}

function SchedaUtente({ utente, onPress }: { utente: UtenteAdmin; onPress: () => void }) {
  const attivi = utente.moduli.filter(moduloAttivo);

  return (
    <Scheda onPress={onPress} accessibilityLabel={utente.email} style={stili.scheda}>
      <View style={stili.riga}>
        <Iniziali nome={utente.nome ?? utente.email} />
        <View style={stili.testi}>
          <Text style={stili.nome} numberOfLines={1}>
            {utente.nome ?? 'Profilo non compilato'}
          </Text>
          <Text style={stili.email} numberOfLines={1}>
            {utente.email}
          </Text>
        </View>
      </View>

      <View style={stili.pillole}>
        {attivi.length === 0 ? (
          <Pillola testo="solo operazioni gratuite" />
        ) : (
          attivi.map((m) => (
            <Pillola
              key={m.modulo}
              testo={`${ETICHETTA_MODULO[m.modulo]} · ${m.origine_acquisto === 'pagamento' ? 'pagata' : 'admin'}`}
              tono="successo"
            />
          ))
        )}
      </View>

      <Text style={stili.date}>
        Creato il {dataBreve(utente.creato_il)}
        {utente.ultimo_accesso ? ` · ultimo accesso ${dataBreve(utente.ultimo_accesso)}` : ' · mai entrato'}
      </Text>
    </Scheda>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    contenitore: { flex: 1, backgroundColor: c.sfondo },
    centrato: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
    contenuto: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxxl },
    testa: { gap: 2, paddingBottom: spazi.xs },
    titolo: { ...testi.titolo, color: c.testo },
    sottotitolo: { ...testi.piccolo, color: c.testoTenue },
    errore: { ...testi.piccolo, color: c.errore },

    scheda: { gap: spazi.m },
    riga: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },
    testi: { flex: 1, gap: 2 },
    nome: { ...testi.sottotitolo, color: c.testo },
    email: { ...testi.piccolo, color: c.testoTenue },
    pillole: { flexDirection: 'row', flexWrap: 'wrap', gap: spazi.xs },
    date: { fontSize: 11, color: c.testoDebole },
    fondo: { paddingTop: spazi.l },
  })
);
