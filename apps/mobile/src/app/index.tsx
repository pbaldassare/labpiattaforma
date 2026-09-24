import { useRouter , useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  ETICHETTA_MODULO,
  fn,
  quandoBreve,
  tab,
  urlVetrina,
  type Modulo,
  type Venditore,
} from '@lab/shared';

import { Pillola, Scheda } from '@/components/base';
import { Icona, type NomeIcona } from '@/components/icone';
import { Bottone, Sezione } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import {
  colori,
  coloriModulo,
  coloriModuloTenue,
  elevazione,
  raggio,
  spazi,
  testi,
} from '@/lib/tema';

const DOMINIO = process.env.EXPO_PUBLIC_DOMINIO_LANDING ?? 'https://dominio-da-decidere.it';

interface Cruscotto {
  offerte_attive: number;
  da_richiamare: number;
  in_corso: number;
  aperture: number;
  aperture_30: number;
  contatti_30: number;
  migliore: { titolo: string; aperture: number; contatti: number } | null;
  prossimo_promemoria: { quando: string; motivo: string; pratica_id: string | null } | null;
}

interface StatoModulo {
  modulo: Modulo;
  offerte_attive: number;
  pratiche_aperte: number;
  utilizzi_consumati: number;
  utilizzi_inclusi: number;
  acquistato_fino_a: string | null;
}

interface DaRichiamare {
  id: string;
  cliente_nome: string;
  offerta_titolo: string | null;
  ultimo_contatto: string | null;
}

const ICONA_MODULO: Record<Modulo, NomeIcona> = {
  vendita: 'auto',
  noleggio_breve: 'calendario',
  noleggio_lungo: 'cartellino',
  assicurazioni: 'documento',
};

const DOVE_NUOVA = {
  vendita: '/offerte/nuova',
  noleggio_breve: '/offerte/nuova-breve',
  noleggio_lungo: '/offerte/nuova-lungo',
  assicurazioni: '/offerte/nuova-assicurazione',
} as const satisfies Record<Modulo, string>;

/**
 * La home.
 *
 * Prima erano quattro cifre nude — "2 da richiamare", "49 aperture" — che non
 * dicevano di cosa parlassero: da richiamare chi, per quale mezzo, aperture in
 * quanto tempo. Un numero senza il suo soggetto non si guarda due volte.
 *
 * Adesso ogni cosa porta con se' di cosa parla: chi va richiamato compare col
 * nome e con l'offerta, i moduli si vedono uno per uno con quanto c'e' dentro,
 * e le aperture hanno il loro periodo accanto.
 */
export default function Home() {
  const router = useRouter();
  const [venditore, setVenditore] = useState<Venditore | null>(null);
  const [numeri, setNumeri] = useState<Cruscotto | null>(null);
  const [moduli, setModuli] = useState<StatoModulo[]>([]);
  const [chiamate, setChiamate] = useState<DaRichiamare[]>([]);
  const [caricato, setCaricato] = useState(false);
  const [aggiornando, setAggiornando] = useState(false);

  const carica = useCallback(async () => {
    const [v, c, m, p] = await Promise.all([
      supabase.from(tab('venditore')).select('*').maybeSingle<Venditore>(),
      supabase.rpc(fn('cruscotto')),
      supabase.rpc(fn('stato_moduli')),
      supabase
        .from(tab('pratica_elenco'))
        .select('id, cliente_nome, offerta_titolo, ultimo_contatto')
        .eq('stato', 'da_richiamare')
        .order('ultimo_contatto', { ascending: true, nullsFirst: true })
        .limit(3),
    ]);
    setVenditore(v.data ?? null);
    setNumeri((c.data as Cruscotto | null) ?? null);
    setModuli((m.data as StatoModulo[] | null) ?? []);
    setChiamate((p.data ?? []) as unknown as DaRichiamare[]);
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
  const attivi = moduli.filter((m) => m.offerte_attive > 0 || m.pratiche_aperte > 0);

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
              <Icona nome="apri" dimensione={18} colore={colori.primarioChiaro} />
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

      {/* Il prossimo richiamo, se c'e', sta sopra tutto: e' l'unica cosa che
          chiede di fare qualcosa adesso. */}
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
            <Text style={stili.promemoriaQuando}>{quandoScadenza(promemoria.quando)}</Text>
          </View>
        </Scheda>
      )}

      {/* Chi va richiamato, col nome e per quale mezzo. Il numero da solo non
          diceva a chi telefonare, che e' l'unica cosa che serve sapere. */}
      {chiamate.length > 0 && (
        <Sezione
          titolo={
            numeri && numeri.da_richiamare > chiamate.length
              ? `Da richiamare (${numeri.da_richiamare})`
              : 'Da richiamare'
          }
          azione={
            numeri && numeri.da_richiamare > chiamate.length ? (
              <Pressable onPress={() => router.push('/pratiche')}>
                <Text style={stili.tutte}>vedi tutte</Text>
              </Pressable>
            ) : undefined
          }
        >
          {chiamate.map((c) => (
            <Scheda
              key={c.id}
              style={stili.chiamata}
              onPress={() => router.push({ pathname: '/pratiche/[id]', params: { id: c.id } })}
              accessibilityLabel={`Richiama ${c.cliente_nome}`}
            >
              <View style={stili.pastigliaChiamata}>
                <Icona nome="telefona" dimensione={16} colore={colori.accento} />
              </View>
              <View style={stili.testiChiamata}>
                <Text style={stili.nomeChiamata} numberOfLines={1}>
                  {c.cliente_nome}
                </Text>
                <Text style={stili.perChiamata} numberOfLines={1}>
                  {c.offerta_titolo ?? 'Richiesta generica'}
                </Text>
              </View>
              <Text style={stili.quandoChiamata}>{quandoBreve(c.ultimo_contatto)}</Text>
            </Scheda>
          ))}
        </Sezione>
      )}

      {/* I moduli: quali sono attivi e cosa c'e' dentro a ciascuno. */}
      <Sezione
        titolo={attivi.length > 0 ? 'I tuoi moduli' : 'Comincia da qui'}
        azione={
          <Pressable onPress={() => router.push('/moduli')}>
            <Text style={stili.tutte}>gestisci</Text>
          </Pressable>
        }
      >
        {moduli.map((m) => (
          <SchedaModulo
            key={m.modulo}
            stato={m}
            onApri={() => router.push('/offerte')}
            onNuova={() => router.push(DOVE_NUOVA[m.modulo])}
          />
        ))}
      </Sezione>

      {/* Come vanno le pagine, con il periodo accanto: "49" senza un tempo
          poteva voler dire questo mese o tre anni fa. */}
      {numeri && numeri.aperture > 0 && (
        <Sezione titolo="Come vanno le tue pagine">
          <Scheda onPress={() => router.push('/numeri')} style={stili.pagine}>
            <View style={stili.rigaPagine}>
              <View style={stili.mezzo}>
                <Text style={stili.cifraPagine}>{numeri.aperture_30}</Text>
                <Text style={stili.etichettaPagine}>
                  {numeri.aperture_30 === 1 ? 'apertura' : 'aperture'} negli ultimi 30 giorni
                </Text>
              </View>
              <View style={stili.divisore} />
              <View style={stili.mezzo}>
                <Text style={[stili.cifraPagine, { color: colori.accento }]}>
                  {numeri.contatti_30}
                </Text>
                <Text style={stili.etichettaPagine}>
                  {numeri.contatti_30 === 1 ? 'cliente ti ha scritto' : 'clienti ti hanno scritto'}
                </Text>
              </View>
            </View>

            {numeri.migliore && (
              <Text style={stili.migliore}>
                La più vista è <Text style={stili.migliorePezzo}>{numeri.migliore.titolo}</Text>:{' '}
                {numeri.migliore.aperture}{' '}
                {numeri.migliore.aperture === 1 ? 'apertura' : 'aperture'},{' '}
                {numeri.migliore.contatti}{' '}
                {numeri.migliore.contatti === 1 ? 'contatto' : 'contatti'}.
              </Text>
            )}
          </Scheda>
        </Sezione>
      )}

      <Sezione titolo="Cosa fai adesso">
        <Bottone testo="Carica un’offerta" icona="piu" onPress={() => router.push('/moduli')} />
        <Bottone tenue testo="Le tue offerte" icona="auto" onPress={() => router.push('/offerte')} />
        <Bottone
          tenue
          testo="Le tue pratiche"
          icona="telefona"
          onPress={() => router.push('/pratiche')}
        />
        <Bottone tenue testo="I tuoi clienti" icona="utenti" onPress={() => router.push('/clienti')} />
        <Bottone tenue testo="I tuoi numeri" icona="occhio" onPress={() => router.push('/numeri')} />
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

/**
 * Un modulo in home.
 *
 * Il modulo che non ha ancora niente dentro non mostra due zeri — che sono
 * solo rumore — ma l'invito a caricare la prima offerta.
 */
function SchedaModulo({
  stato,
  onApri,
  onNuova,
}: {
  stato: StatoModulo;
  onApri: () => void;
  onNuova: () => void;
}) {
  const vuoto = stato.offerte_attive === 0 && stato.pratiche_aperte === 0;
  const residui = Math.max(0, stato.utilizzi_inclusi - stato.utilizzi_consumati);

  return (
    <Scheda
      style={[
        stili.modulo,
        { borderLeftColor: vuoto ? colori.bordo : coloriModulo[stato.modulo] },
        vuoto && stili.moduloVuoto,
      ]}
      onPress={vuoto ? onNuova : onApri}
      accessibilityLabel={ETICHETTA_MODULO[stato.modulo]}
    >
      {/* Il colore del modulo: si riconosce prima di leggere il nome. */}
      <View
        style={[
          stili.quadrato,
          { backgroundColor: coloriModuloTenue[stato.modulo] },
          vuoto && stili.quadratoSpento,
        ]}
      >
        <Icona
          nome={ICONA_MODULO[stato.modulo]}
          dimensione={18}
          colore={vuoto ? colori.testoDebole : coloriModulo[stato.modulo]}
        />
      </View>

      <View style={stili.testiModulo}>
        <Text style={stili.nomeModulo} numberOfLines={1}>
          {ETICHETTA_MODULO[stato.modulo]}
        </Text>
        <Text style={stili.dettaglioModulo} numberOfLines={1}>
          {vuoto
            ? 'Nessuna offerta: tocca per caricarne una'
            : [
                `${stato.offerte_attive} ${stato.offerte_attive === 1 ? 'offerta attiva' : 'offerte attive'}`,
                stato.pratiche_aperte > 0
                  ? `${stato.pratiche_aperte} ${stato.pratiche_aperte === 1 ? 'pratica aperta' : 'pratiche aperte'}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
        </Text>
      </View>

      {/* L'avviso quando resta l'ultima operazione gratuita (§8.5). */}
      {!vuoto && stato.acquistato_fino_a == null && residui <= 1 && (
        <Pillola
          testo={residui === 0 ? 'esaurito' : 'ultima gratis'}
          tono={residui === 0 ? 'azione' : 'attenzione'}
        />
      )}
      {!vuoto && stato.acquistato_fino_a != null && <Pillola testo="attivo" tono="successo" />}

      <Icona nome={vuoto ? 'piu' : 'avanti'} dimensione={16} colore={colori.testoDebole} />
    </Scheda>
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
  tutte: { fontSize: 13, fontWeight: '600', color: colori.primarioChiaro },

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

  chiamata: { flexDirection: 'row', alignItems: 'center', gap: spazi.m, padding: spazi.m },
  pastigliaChiamata: {
    width: 34,
    height: 34,
    borderRadius: raggio.tondo,
    backgroundColor: colori.accentoTenue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testiChiamata: { flex: 1, gap: 1 },
  nomeChiamata: { fontSize: 15, fontWeight: '700', color: colori.testo },
  perChiamata: { fontSize: 12, color: colori.testoTenue },
  quandoChiamata: { fontSize: 11, color: colori.testoDebole },

  modulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazi.m,
    padding: spazi.m,
    // Una riga di colore a sinistra: si vede anche con la coda dell'occhio.
    borderLeftWidth: 3,
  },
  moduloVuoto: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colori.bordo },
  quadrato: {
    width: 34,
    height: 34,
    borderRadius: raggio.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quadratoSpento: { backgroundColor: colori.bordoTenue },
  testiModulo: { flex: 1, gap: 1 },
  nomeModulo: { fontSize: 15, fontWeight: '700', color: colori.testo },
  dettaglioModulo: { fontSize: 12, color: colori.testoTenue },

  pagine: { gap: spazi.m },
  rigaPagine: { flexDirection: 'row', alignItems: 'center' },
  mezzo: { flex: 1, gap: 2 },
  divisore: { width: 1, height: 36, backgroundColor: colori.bordo, marginHorizontal: spazi.m },
  cifraPagine: { fontSize: 30, fontWeight: '800', color: colori.testo },
  etichettaPagine: { fontSize: 12, color: colori.testoTenue, lineHeight: 16 },
  migliore: {
    fontSize: 12,
    lineHeight: 17,
    color: colori.testoTenue,
    borderTopWidth: 1,
    borderTopColor: colori.bordoTenue,
    paddingTop: spazi.s,
  },
  migliorePezzo: { fontWeight: '700', color: colori.testo },

  esci: { paddingTop: spazi.xl },
});
