import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { fn, quandoBreve, tab, urlVetrina, type Venditore } from '@lab/shared';

import { Cifra, Scheda } from '@/components/base';
import { Icona } from '@/components/icone';
import { Bottone, Sezione } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, elevazione, raggio, spazi, testi } from '@/lib/tema';

const DOMINIO = process.env.EXPO_PUBLIC_DOMINIO_LANDING ?? 'https://dominio-da-decidere.it';

interface Cruscotto {
  offerte_attive: number;
  da_richiamare: number;
  in_corso: number;
  aperture: number;
  contatti: number;
  prossimo_promemoria: { quando: string; motivo: string; pratica_id: string | null } | null;
}

export default function Home() {
  const router = useRouter();
  const [venditore, setVenditore] = useState<Venditore | null>(null);
  const [numeri, setNumeri] = useState<Cruscotto | null>(null);
  const [caricato, setCaricato] = useState(false);
  const [aggiornando, setAggiornando] = useState(false);

  const carica = useCallback(async () => {
    const [v, c] = await Promise.all([
      supabase.from(tab('venditore')).select('*').maybeSingle<Venditore>(),
      supabase.rpc(fn('cruscotto')),
    ]);
    setVenditore(v.data ?? null);
    setNumeri((c.data as Cruscotto | null) ?? null);
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

  if (!caricato) return <View style={stili.contenitore} />;

  const vetrina = venditore ? urlVetrina(DOMINIO, venditore.slug) : null;
  const promemoria = numeri?.prossimo_promemoria;

  return (
    <ScrollView
      style={stili.contenitore}
      contentContainerStyle={stili.contenuto}
      refreshControl={
        <RefreshControl refreshing={aggiornando} onRefresh={() => void aggiorna()} />
      }
    >
      {/* La vetrina in cima: e' l'indirizzo che il venditore manda dieci volte
          al giorno, e cercarlo dentro il profilo ogni volta sarebbe assurdo. */}
      {venditore ? (
        <Scheda rilievo="media" style={stili.intestazione}>
          <View style={stili.rigaNome}>
            <View style={stili.logo}>
              <Icona nome="negozio" dimensione={20} colore={colori.suPrimario} />
            </View>
            <View style={stili.testiNome}>
              <Text style={stili.nome} numberOfLines={1}>
                {venditore.nome_visualizzato}
              </Text>
              <Text style={stili.slug} numberOfLines={1}>
                {vetrina?.replace(/^https?:\/\//, '')}
              </Text>
            </View>
            <Pressable
              onPress={() => vetrina && void Linking.openURL(vetrina)}
              accessibilityLabel="Apri la tua vetrina"
              accessibilityRole="button"
              style={({ pressed }) => [stili.tondo, pressed && stili.premuto]}
            >
              <Icona nome="apri" dimensione={18} colore={colori.primario} />
            </Pressable>
          </View>
        </Scheda>
      ) : (
        <Scheda rilievo="media" style={stili.intestazione}>
          <Text style={stili.nome}>Benvenuto</Text>
          <Text style={stili.corpo}>
            Compila il profilo e scegli l’indirizzo della tua vetrina: è da lì che i clienti ti
            troveranno.
          </Text>
          <Bottone
            testo="Compila il profilo"
            icona="impostazioni"
            onPress={() => router.push('/profilo')}
          />
        </Scheda>
      )}

      {/* Il prossimo richiamo, se c'e', sta sopra i numeri: e' l'unica cosa
          che chiede di fare qualcosa adesso. */}
      {promemoria && (
        <Scheda
          rilievo="media"
          style={stili.promemoria}
          onPress={() =>
            promemoria.pratica_id
              ? router.push({
                  pathname: '/pratiche/[id]',
                  params: { id: promemoria.pratica_id },
                })
              : router.push('/pratiche')
          }
        >
          <Icona nome="campanello" dimensione={18} colore={colori.accento} />
          <View style={stili.testiPromemoria}>
            <Text style={stili.promemoriaMotivo}>{promemoria.motivo}</Text>
            <Text style={stili.promemoriaQuando}>
              {quandoScadenza(promemoria.quando)}
            </Text>
          </View>
        </Scheda>
      )}

      {numeri && (
        <>
          <View style={stili.fila}>
            <Cifra
              numero={numeri.da_richiamare}
              etichetta="da richiamare"
              icona="telefona"
              tono={numeri.da_richiamare > 0 ? 'attenzione' : undefined}
              onPress={() => router.push('/pratiche')}
            />
            <Cifra
              numero={numeri.in_corso}
              etichetta="in corso"
              icona="messaggio"
              onPress={() => router.push('/pratiche')}
            />
          </View>

          <View style={stili.fila}>
            <Cifra
              numero={numeri.offerte_attive}
              etichetta="offerte attive"
              icona="auto"
              onPress={() => router.push('/offerte')}
            />
            <Cifra
              numero={numeri.aperture}
              etichetta="aperture"
              icona="occhio"
              onPress={() => router.push('/numeri')}
            />
          </View>
        </>
      )}

      <Sezione titolo="Cosa fai adesso">
        <Bottone
          testo="Carica un’offerta"
          icona="piu"
          onPress={() => router.push('/moduli')}
        />
        <Bottone
          tenue
          testo="Le tue offerte"
          icona="auto"
          onPress={() => router.push('/offerte')}
        />
        <Bottone
          tenue
          testo="Le tue pratiche"
          icona="telefona"
          onPress={() => router.push('/pratiche')}
        />
        <Bottone
          tenue
          testo="I tuoi clienti"
          icona="utenti"
          onPress={() => router.push('/clienti')}
        />
        <Bottone
          tenue
          testo="I tuoi numeri"
          icona="occhio"
          onPress={() => router.push('/numeri')}
        />
        <Bottone
          tenue
          testo="Modifica il profilo"
          icona="impostazioni"
          onPress={() => router.push('/profilo')}
        />
      </Sezione>

      <View style={stili.esci}>
        <Bottone
          tipo="nudo"
          testo="Esci"
          icona="esci"
          onPress={() => void supabase.auth.signOut()}
        />
      </View>
    </ScrollView>
  );
}

/** "Fra 2 giorni" invece di "2 giorni fa": qui si guarda avanti, non indietro. */
function quandoScadenza(iso: string): string {
  const quando = new Date(iso).getTime();
  const adesso = Date.now();
  if (quando <= adesso) return `In ritardo · ${quandoBreve(iso)}`;

  const ore = Math.round((quando - adesso) / 3_600_000);
  if (ore < 1) return 'Fra poco';
  if (ore < 24) return `Fra ${ore} ore`;

  const giorni = Math.round(ore / 24);
  if (giorni === 1) return 'Domani';
  return `Fra ${giorni} giorni`;
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  contenuto: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxxl },

  intestazione: { gap: spazi.m },
  rigaNome: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },
  logo: {
    width: 40,
    height: 40,
    borderRadius: raggio.m,
    backgroundColor: colori.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testiNome: { flex: 1, gap: 2 },
  nome: { ...testi.sottotitolo, color: colori.testo },
  slug: { ...testi.piccolo, color: colori.testoTenue },
  corpo: { ...testi.corpo, color: colori.testoTenue },
  tondo: {
    width: 40,
    height: 40,
    borderRadius: raggio.tondo,
    borderWidth: 1,
    borderColor: colori.bordo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premuto: { opacity: 0.7 },

  promemoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazi.m,
    borderLeftWidth: 3,
    borderLeftColor: colori.accento,
    ...elevazione.bassa,
  },
  testiPromemoria: { flex: 1, gap: 2 },
  promemoriaMotivo: { ...testi.corpo, fontWeight: '600', color: colori.testo },
  promemoriaQuando: { ...testi.piccolo, color: colori.accento, fontWeight: '600' },

  fila: { flexDirection: 'row', gap: spazi.m },
  esci: { paddingTop: spazi.xl },
});
