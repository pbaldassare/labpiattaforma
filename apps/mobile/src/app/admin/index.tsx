import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ETICHETTA_MODULO, MODULI } from '@lab/shared';

import { BloccoIcona, Scheda, Vuoto } from '@/components/base';
import { Icona, type NomeIcona } from '@/components/icone';
import { Input } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { caricaUtenti, dataBreve, moduloAttivo, type UtenteAdmin } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { colori, gradienteTesta, gradienti, raggio, spazi, stiliTema, suGradiente, testi } from '@/lib/tema';

/**
 * La home dell'admin.
 *
 * In alto i tre numeri che contano (utenti, card attive, card pagate), poi le
 * due cose che si fanno (creare un utente, guardare le attivazioni), poi gli
 * utenti: ognuno con i quattro moduli come icone, accese se la card e'
 * attiva. Si capisce chi ha cosa senza aprire nessuno.
 */
export default function AdminHome() {
  const router = useRouter();
  const [utenti, setUtenti] = useState<UtenteAdmin[]>([]);
  const [caricato, setCaricato] = useState(false);
  const [aggiornando, setAggiornando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [cerca, setCerca] = useState('');

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

  const numeri = useMemo(() => {
    const moduli = utenti.flatMap((u) => u.moduli);
    return {
      utenti: utenti.length,
      attive: moduli.filter(moduloAttivo).length,
      pagate: moduli.filter((m) => moduloAttivo(m) && m.origine_acquisto === 'pagamento').length,
    };
  }, [utenti]);

  const visibili = useMemo(() => {
    const parola = cerca.trim().toLowerCase();
    if (!parola) return utenti;
    return utenti.filter(
      (u) => u.email.toLowerCase().includes(parola) || (u.nome ?? '').toLowerCase().includes(parola)
    );
  }, [utenti, cerca]);

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
      refreshControl={
        <RefreshControl
          refreshing={aggiornando}
          onRefresh={async () => {
            setAggiornando(true);
            await carica();
            setAggiornando(false);
          }}
        />
      }
    >
      <LinearGradient
        colors={gradienteTesta() as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={stili.testa}
      >
        <View style={stili.testaRiga}>
          <BloccoIcona icona="impostazioni" gradiente={gradienti.azione} dimensione={46} />
          <View style={stili.flex}>
            <Text style={stili.titolo}>Back office</Text>
            <Text style={stili.sottotitolo}>Utenti e card della piattaforma</Text>
          </View>
          <Pressable
            onPress={() => void supabase.auth.signOut()}
            accessibilityRole="button"
            accessibilityLabel="Esci"
            style={({ pressed }) => [stili.esci, pressed && { opacity: 0.6 }]}
          >
            <Icona nome="esci" dimensione={18} colore={colori.primarioChiaro} />
          </Pressable>
        </View>
        <View style={stili.numeri}>
          <Numero valore={numeri.utenti} etichetta={numeri.utenti === 1 ? 'utente' : 'utenti'} />
          <View style={stili.divisore} />
          <Numero valore={numeri.attive} etichetta={numeri.attive === 1 ? 'card attiva' : 'card attive'} />
          <View style={stili.divisore} />
          <Numero valore={numeri.pagate} etichetta={numeri.pagate === 1 ? 'pagata' : 'pagate'} />
        </View>
      </LinearGradient>

      <View style={stili.azioni}>
        <Azione
          icona="piu"
          titolo="Nuovo utente"
          testo="Crea un accesso"
          onPress={() => router.push('/admin/nuovo')}
        />
        <Azione
          icona="euro"
          titolo="Attivazioni"
          testo="e pagamenti"
          onPress={() => router.push('/admin/attivazioni')}
        />
      </View>

      <View style={stili.sezione}>
        <Text style={stili.titoloSezione}>Utenti</Text>
        <View style={stili.ricerca}>
          <Icona nome="cerca" dimensione={18} colore={colori.testoDebole} />
          <Input
            value={cerca}
            onChangeText={setCerca}
            placeholder="Cerca per nome o email"
            autoCapitalize="none"
            autoCorrect={false}
            style={stili.campoRicerca}
          />
        </View>
      </View>

      {errore && <Text style={stili.errore}>{errore}</Text>}

      {visibili.length === 0 ? (
        <Vuoto
          icona="utenti"
          titolo={cerca ? 'Nessun utente trovato' : 'Nessun utente'}
          testo={cerca ? 'Prova con un’altra parola.' : 'Crea il primo con “Nuovo utente”.'}
        />
      ) : (
        visibili.map((u) => <SchedaUtente key={u.id} utente={u} onPress={() => router.push(`/admin/${u.id}`)} />)
      )}
    </ScrollView>
  );
}

function Numero({ valore, etichetta }: { valore: number; etichetta: string }) {
  return (
    <View style={stili.numero}>
      <Text style={stili.numeroValore}>{valore}</Text>
      <Text style={stili.numeroEtichetta}>{etichetta}</Text>
    </View>
  );
}

function Azione({
  icona,
  titolo,
  testo,
  onPress,
}: {
  icona: NomeIcona;
  titolo: string;
  testo: string;
  onPress: () => void;
}) {
  return (
    <Scheda rilievo="media" onPress={onPress} style={stili.azione} accessibilityLabel={titolo}>
      <BloccoIcona icona={icona} gradiente={gradienti.azione} dimensione={40} />
      <View>
        <Text style={stili.azioneTitolo}>{titolo}</Text>
        <Text style={stili.azioneTesto}>{testo}</Text>
      </View>
    </Scheda>
  );
}

function SchedaUtente({ utente, onPress }: { utente: UtenteAdmin; onPress: () => void }) {
  const nome = utente.nome ?? utente.email;
  const iniziali = nome
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  const attivi = utente.moduli.filter(moduloAttivo).length;

  return (
    <Scheda rilievo="media" onPress={onPress} style={stili.utente} accessibilityLabel={nome}>
      <View style={stili.utenteRiga}>
        <LinearGradient
          colors={gradienti.azione as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={stili.avatar}
        >
          <Text style={stili.avatarTesto}>{iniziali}</Text>
        </LinearGradient>
        <View style={stili.flex}>
          <Text style={stili.utenteNome} numberOfLines={1}>
            {utente.nome ?? 'Profilo da compilare'}
          </Text>
          <Text style={stili.utenteEmail} numberOfLines={1}>
            {utente.email}
          </Text>
        </View>
        <Icona nome="avanti" dimensione={16} colore={colori.testoDebole} />
      </View>

      {/* Le quattro card come icone: accese se attive, spente se no. */}
      <View style={stili.moduli}>
        {MODULI.map((m) => {
          const stato = utente.moduli.find((x) => x.modulo === m);
          const acceso = stato ? moduloAttivo(stato) : false;
          return (
            <View key={m} style={stili.modulo}>
              <BloccoIcona
                modulo={m}
                gradiente={gradienti[m]}
                suGradiente={suGradiente[m]}
                dimensione={34}
                spento={!acceso}
              />
              <Text style={[stili.moduloNome, acceso && stili.moduloNomeAcceso]} numberOfLines={1}>
                {ETICHETTA_MODULO[m].replace(' termine', '')}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={stili.utenteFondo}>
        {attivi === 0 ? 'Solo operazioni gratuite' : `${attivi} ${attivi === 1 ? 'card attiva' : 'card attive'}`}
        {' · '}
        {utente.ultimo_accesso ? `ultimo accesso ${dataBreve(utente.ultimo_accesso)}` : 'mai entrato'}
      </Text>
    </Scheda>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    contenitore: { flex: 1, backgroundColor: c.sfondo },
    centrato: { flex: 1, justifyContent: 'center', backgroundColor: c.sfondo },
    contenuto: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxxl },
    flex: { flex: 1, gap: 2 },
    errore: { ...testi.piccolo, color: c.errore },

    testa: { borderRadius: raggio.xl, padding: spazi.l, gap: spazi.l },
    testaRiga: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },
    titolo: { ...testi.titolo, fontSize: 22, color: c.testo },
    sottotitolo: { ...testi.piccolo, color: c.testoTenue },
    esci: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bordoTenue,
    },
    numeri: { flexDirection: 'row', alignItems: 'center' },
    numero: { flex: 1, alignItems: 'center', gap: 2 },
    numeroValore: { ...testi.cifra, fontSize: 30, color: c.testo },
    numeroEtichetta: { fontSize: 12, color: c.testoTenue },
    divisore: { width: 1, height: 32, backgroundColor: c.bordo },

    azioni: { flexDirection: 'row', gap: spazi.m },
    azione: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spazi.m, padding: spazi.m },
    azioneTitolo: { fontSize: 15, fontWeight: '700', color: c.testo },
    azioneTesto: { fontSize: 12, color: c.testoTenue },

    sezione: { gap: spazi.s, paddingTop: spazi.s },
    titoloSezione: { ...testi.etichetta, color: c.testoTenue },
    ricerca: { flexDirection: 'row', alignItems: 'center', gap: spazi.s },
    campoRicerca: { flex: 1 },

    utente: { gap: spazi.m },
    utenteRiga: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    avatarTesto: { fontSize: 15, fontWeight: '800', color: '#14161A' },
    utenteNome: { ...testi.sottotitolo, fontSize: 16, color: c.testo },
    utenteEmail: { ...testi.piccolo, color: c.testoTenue },
    moduli: { flexDirection: 'row', gap: spazi.s },
    modulo: { flex: 1, alignItems: 'center', gap: 4 },
    moduloNome: { fontSize: 10, color: c.testoDebole, textAlign: 'center' },
    moduloNomeAcceso: { color: c.testo, fontWeight: '700' },
    utenteFondo: { fontSize: 12, color: c.testoTenue },
  })
);
