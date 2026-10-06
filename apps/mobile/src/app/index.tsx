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

import { LinearGradient } from 'expo-linear-gradient';

import { BloccoIcona, Pillola, Scheda } from '@/components/base';
import { Entra } from '@/components/movimento';
import { Icona, type NomeIcona } from '@/components/icone';
import { Bottone, Sezione } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import {
  bagliore,
  colori,
  coloriModulo,
  elevazione,
  gradienti,
  raggio,
  spazi,
  stiliTema,
  testi,
  vetro,
  suGradiente,
  gradienteTesta,
} from '@/lib/tema';

const DOMINIO = process.env.EXPO_PUBLIC_DOMINIO_LANDING ?? 'https://dominio-da-decidere.it';

interface Cruscotto {
  offerte_attive: number;
  da_richiamare: number;
  in_corso: number;
  clienti: number;
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
  const [praticheTotali, setPraticheTotali] = useState<number | null>(null);
  const [caricato, setCaricato] = useState(false);
  const [aggiornando, setAggiornando] = useState(false);

  const carica = useCallback(async () => {
    const [v, c, m, p, t] = await Promise.all([
      supabase.from(tab('venditore')).select('*').maybeSingle<Venditore>(),
      supabase.rpc(fn('cruscotto')),
      supabase.rpc(fn('stato_moduli')),
      supabase
        .from(tab('pratica_elenco'))
        .select('id, cliente_nome, offerta_titolo, ultimo_contatto')
        .eq('stato', 'da_richiamare')
        .order('ultimo_contatto', { ascending: true, nullsFirst: true })
        .limit(3),
      // Tutte, di qualunque stato: solo il conteggio, senza scaricare le righe.
      supabase.from(tab('pratica')).select('id', { count: 'exact', head: true }),
    ]);
    setVenditore(v.data ?? null);
    setNumeri((c.data as Cruscotto | null) ?? null);
    setModuli((m.data as StatoModulo[] | null) ?? []);
    setChiamate((p.data ?? []) as unknown as DaRichiamare[]);
    setPraticheTotali(t.count ?? null);
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
        /* L'intestazione e' un cruscotto, non una riga di testo: identita' a
           sinistra e le tre cifre che contano sotto, sempre le stesse tre. */
        <LinearGradient
          colors={gradienteTesta() as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[stili.cruscotto, elevazione.media]}
        >
          <View style={stili.rigaNome}>
            <BloccoIcona icona="negozio" gradiente={gradienti.azione} dimensione={46} />
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

          {numeri && (
            <View style={stili.strisciaNumeri}>
              <Cifretta
                valore={numeri.offerte_attive}
                etichetta={numeri.offerte_attive === 1 ? 'offerta attiva' : 'offerte attive'}
                onPress={() => router.push('/offerte')}
              />
              <View style={stili.divisoreSottile} />
              <Cifretta
                valore={numeri.aperture_30}
                etichetta="aperture, 30 giorni"
                onPress={() => router.push('/numeri')}
              />
              <View style={stili.divisoreSottile} />
              <Cifretta
                valore={numeri.contatti_30}
                etichetta={numeri.contatti_30 === 1 ? 'ti ha scritto' : 'ti hanno scritto'}
                tono={numeri.contatti_30 > 0 ? colori.accento : undefined}
                onPress={() => router.push('/pratiche')}
              />
            </View>
          )}
        </LinearGradient>
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
          icona="telefona"
          tinta={colori.accento}
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
          {chiamate.map((c, i) => (
            <Entra key={c.id} indice={i}>
            <Scheda
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
            </Entra>
          ))}
        </Sezione>
      )}

      {/* I moduli: quali sono attivi e cosa c'e' dentro a ciascuno. */}
      <Sezione
        icona="scatola"
        titolo={attivi.length > 0 ? 'I tuoi moduli' : 'Comincia da qui'}
        azione={
          <Pressable onPress={() => router.push('/moduli')}>
            <Text style={stili.tutte}>gestisci</Text>
          </Pressable>
        }
      >
        {moduli.map((m, i) => (
          <Entra key={m.modulo} indice={i}>
          <SchedaModulo
            key={m.modulo}
            stato={m}
            onApri={() => router.push({ pathname: '/offerte', params: { modulo: m.modulo } })}
            onNuova={() => router.push(DOVE_NUOVA[m.modulo])}
          />
          </Entra>
        ))}
      </Sezione>

      {/* Le cifre stanno gia' in cima: qui resta solo cio' che quelle non
          dicono, cioe' quale annuncio sta tirando. */}
      {numeri?.migliore && (
        <Scheda onPress={() => router.push('/numeri')} style={stili.migliore}>
          <BloccoIcona icona="occhio" gradiente={gradienti.azione} dimensione={38} />
          <View style={stili.testiMigliore}>
            <Text style={stili.etichettaMigliore}>La più vista del mese</Text>
            <Text style={stili.titoloMigliore} numberOfLines={1}>
              {numeri.migliore.titolo}
            </Text>
            <Text style={stili.dettaglioMigliore}>
              {numeri.migliore.aperture} aperture · {numeri.migliore.contatti}{' '}
              {numeri.migliore.contatti === 1 ? 'contatto' : 'contatti'}
            </Text>
          </View>
          <Icona nome="avanti" dimensione={16} colore={colori.testoDebole} />
        </Scheda>
      )}

      {/* Un'azione sola in evidenza, e il resto a riquadri.
          Sei bottoni larghi in colonna erano un muro: tutti uguali, tutti
          dello stesso peso, e quello che conta davvero — caricare un'offerta —
          ci si perdeva dentro. I riquadri stanno in meta' spazio, e portando
          il proprio numero smettono di essere un menu: dicono anche quanto
          c'e' dentro. */}
      <Sezione icona="fulmine" titolo="Cosa fai adesso">
        <Bottone testo="Carica un’offerta" icona="piu" onPress={() => router.push('/moduli')} />

        <View style={stili.scorciatoie}>
          <Scorciatoia
            icona="auto"
            etichetta="Offerte"
            valore={numeri?.offerte_attive}
            unita="attive"
            onPress={() => router.push('/offerte')}
          />
          {/* Quando c'e' qualcuno da richiamare la scheda mostra quello, non il
              totale: e' l'unico numero su cui si agisce, ed e' il motivo per
              cui la scheda diventa ambra. */}
          <Scorciatoia
            icona="telefona"
            etichetta="Pratiche"
            valore={
              numeri
                ? numeri.da_richiamare > 0
                  ? numeri.da_richiamare
                  : numeri.in_corso
                : undefined
            }
            unita={(numeri?.da_richiamare ?? 0) > 0 ? 'da richiamare' : 'in corso'}
            nota={praticheTotali != null ? `su ${praticheTotali} in tutto` : undefined}
            onPress={() => router.push('/pratiche')}
          />
          <Scorciatoia
            icona="utenti"
            etichetta="Clienti"
            valore={numeri?.clienti}
            unita="in rubrica"
            onPress={() => router.push('/clienti')}
          />
          <Scorciatoia
            icona="grafico"
            etichetta="Pagine viste"
            valore={numeri?.aperture_30}
            unita="in 30 giorni"
            onPress={() => router.push('/numeri')}
          />
        </View>
      </Sezione>

      {/* Profilo e uscita non sono cose che si fanno: stanno in fondo, piccole,
          dove non rubano attenzione a quello che si fa davvero. */}
      <View style={stili.coda}>
        <Pressable
          onPress={() => router.push('/profilo')}
          accessibilityRole="button"
          style={({ pressed }) => [stili.vocetta, pressed && stili.premuto]}
        >
          <Icona nome="impostazioni" dimensione={15} colore={colori.testoTenue} />
          <Text style={stili.vocettaTesto}>Il tuo profilo</Text>
        </Pressable>

        <View style={stili.divisoreCoda} />

        <Pressable
          onPress={() => void supabase.auth.signOut()}
          accessibilityRole="button"
          style={({ pressed }) => [stili.vocetta, pressed && stili.premuto]}
        >
          <Icona nome="esci" dimensione={15} colore={colori.testoTenue} />
          <Text style={stili.vocettaTesto}>Esci</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/**
 * Un riquadro di scorciatoia.
 *
 * Porta il suo numero perche' un menu che dice solo dove porta fa fare un
 * tocco per scoprire che non c'era niente. Con la cifra davanti, meta' delle
 * volte il tocco non serve piu'.
 */
function Scorciatoia({
  icona,
  etichetta,
  valore,
  unita,
  nota,
  onPress,
}: {
  icona: NomeIcona;
  etichetta: string;
  valore?: number;
  /** La parola che dice cosa conta la cifra: "attive", "da richiamare". */
  unita: string;
  /** Una riga piccola sotto la cifra, come il totale delle pratiche. */
  nota?: string;
  onPress: () => void;
}) {
  /*
   * Quattro riquadri identici, e le cifre tutte dello stesso colore.
   *
   * Prima quella delle pratiche era ambra, perche' nel resto dell'app l'ambra
   * vuol dire "questo chiede qualcosa a te". Ma qui non si capiva: in mezzo a
   * tre riquadri uguali sembrava un numero verniciato a caso, e infatti la
   * domanda e' arrivata subito. La parola accanto — "da richiamare" — lo dice
   * gia', e lo dice meglio di un colore che va spiegato.
   */
  return (
    <Scheda
      onPress={onPress}
      style={stili.scorciatoia}
      accessibilityLabel={`${etichetta}: ${valore ?? 0} ${unita}`}
    >
      <View style={stili.testaScorciatoia}>
        <View style={stili.pastigliaScorciatoia}>
          <Icona nome={icona} dimensione={15} colore={colori.primarioChiaro} />
        </View>
        {/* Prima il nome, poi la cifra: un numero da solo, prima di sapere
            cosa conta, si legge due volte. */}
        <Text style={stili.etichettaScorciatoia}>{etichetta}</Text>
      </View>

      {/* Cifra e unita' sulla stessa riga: sono una cosa sola, "5 attive".
          Due testi affiancati e non annidati, se no lo spazio fra i due si
          perde e si legge "5attive". */}
      <View style={stili.rigaValore}>
        <Text style={stili.valoreScorciatoia}>{valore ?? '—'}</Text>
        <Text style={stili.unitaScorciatoia} numberOfLines={1}>
          {unita}
        </Text>
      </View>
      {nota && (
        <Text style={stili.notaScorciatoia} numberOfLines={1}>
          {nota}
        </Text>
      )}
    </Scheda>
  );
}

/** Una delle tre cifre dell'intestazione: numero grosso, parola sotto. */
/** Un numero si tocca: porta dove quel numero si vede per esteso. */
function Cifretta({
  valore,
  etichetta,
  tono,
  onPress,
}: {
  valore: number;
  etichetta: string;
  tono?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [stili.cifretta, pressed && { opacity: 0.6 }]}
    >
      <Text style={[stili.cifrettaValore, tono ? { color: tono } : null]}>{valore}</Text>
      <Text style={stili.cifrettaEtichetta} numberOfLines={2}>
        {etichetta}
      </Text>
    </Pressable>
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
        !vuoto && bagliore(coloriModulo[stato.modulo], 0.14),
        vuoto && stili.moduloVuoto,
      ]}
      onPress={vuoto ? onNuova : onApri}
      accessibilityLabel={ETICHETTA_MODULO[stato.modulo]}
    >
      {/* Il colore del modulo: si riconosce prima di leggere il nome. */}
      <BloccoIcona
        modulo={stato.modulo}
        gradiente={gradienti[stato.modulo]}
        suGradiente={suGradiente[stato.modulo]}
        dimensione={44}
        spento={vuoto}
      />

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

const stili = stiliTema((c) => StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: c.sfondo },
  contenuto: { padding: spazi.l, gap: spazi.m, paddingBottom: spazi.xxxl },

  intestazione: { gap: spazi.m },
  cruscotto: {
    borderRadius: raggio.xl,
    padding: spazi.l,
    gap: spazi.l,
    borderWidth: 1,
    borderColor: c.bordo,
    ...vetro(c),
  },
  rigaNome: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },

  strisciaNumeri: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: spazi.m,
  },
  cifretta: { flex: 1, gap: 2 },
  cifrettaValore: {
    fontSize: 26,
    fontWeight: '800',
    color: c.testo,
    letterSpacing: -0.8,
  },
  cifrettaEtichetta: { fontSize: 11, lineHeight: 14, color: c.testoTenue },
  divisoreSottile: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spazi.m,
  },
  testiNome: { flex: 1, gap: 2 },
  nome: { ...testi.sottotitolo, color: c.testo },
  slug: { ...testi.piccolo, color: c.testoTenue },
  corpo: { ...testi.corpo, color: c.testoTenue },
  tondo: {
    width: 40,
    height: 40,
    borderRadius: raggio.tondo,
    borderWidth: 1,
    borderColor: c.bordo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premuto: { opacity: 0.7 },
  tutte: { fontSize: 13, fontWeight: '600', color: c.primarioChiaro },

  promemoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazi.m,
    borderLeftWidth: 3,
    borderLeftColor: c.accento,
    ...elevazione.bassa,
  },
  testiPromemoria: { flex: 1, gap: 2 },
  promemoriaMotivo: { ...testi.corpo, fontWeight: '600', color: c.testo },
  promemoriaQuando: { ...testi.piccolo, color: c.accento, fontWeight: '600' },

  chiamata: { flexDirection: 'row', alignItems: 'center', gap: spazi.m, padding: spazi.m },
  pastigliaChiamata: {
    width: 34,
    height: 34,
    borderRadius: raggio.tondo,
    backgroundColor: c.accentoTenue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testiChiamata: { flex: 1, gap: 1 },
  nomeChiamata: { fontSize: 15, fontWeight: '700', color: c.testo },
  perChiamata: { fontSize: 12, color: c.testoTenue },
  quandoChiamata: { fontSize: 11, color: c.testoDebole },

  modulo: { flexDirection: 'row', alignItems: 'center', gap: spazi.m, padding: spazi.m },
  moduloVuoto: {
    // Non trasparente: sul fondo scuro la scheda spariva e restava una riga di
    // testo sospesa nel vuoto. Un tono appena sotto la superficie normale dice
    // "qui non c'e' ancora niente" senza far sparire il riquadro.
    backgroundColor: c.bordoTenue,
    borderWidth: 1,
    borderColor: c.bordo,
  },
  testiModulo: { flex: 1, gap: 1 },
  nomeModulo: { fontSize: 15, fontWeight: '700', color: c.testo },
  dettaglioModulo: { fontSize: 12, color: c.testoTenue },

  migliore: { flexDirection: 'row', alignItems: 'center', gap: spazi.m, padding: spazi.m },
  testiMigliore: { flex: 1, gap: 1 },
  etichettaMigliore: { ...testi.etichetta, fontSize: 10, color: c.testoDebole },
  titoloMigliore: { fontSize: 15, fontWeight: '700', color: c.testo },
  dettaglioMigliore: { fontSize: 12, color: c.testoTenue },

  scorciatoie: { flexDirection: 'row', flexWrap: 'wrap', gap: spazi.s },
  scorciatoia: { width: '47.5%', flexGrow: 1, gap: spazi.s, padding: spazi.m },
  testaScorciatoia: { flexDirection: 'row', alignItems: 'center', gap: spazi.s },
  pastigliaScorciatoia: {
    width: 28,
    height: 28,
    borderRadius: raggio.s,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.superficieAlta,
  },
  etichettaScorciatoia: { fontSize: 14, fontWeight: '700', color: c.testo, flexShrink: 1 },
  rigaValore: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  valoreScorciatoia: { ...testi.cifra, fontSize: 24, color: c.testo },
  notaScorciatoia: { fontSize: 12, color: c.testoTenue, marginTop: 2 },
  unitaScorciatoia: { fontSize: 12, color: c.testoTenue, flexShrink: 1 },

  coda: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spazi.xxl,
  },
  vocetta: { flexDirection: 'row', alignItems: 'center', gap: spazi.xs, padding: spazi.s },
  vocettaTesto: { fontSize: 13, fontWeight: '600', color: c.testoTenue },
  divisoreCoda: { width: 1, height: 14, backgroundColor: c.bordo, marginHorizontal: spazi.s },
}));