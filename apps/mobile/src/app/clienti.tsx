import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  ETICHETTA_MODULO,
  ETICHETTA_STATO_PRATICA,
  fn,
  quandoBreve,
  type Modulo,
  type StatoPratica,
  type TipoCliente,
} from '@lab/shared';

import { Filtri, Iniziali, Pillola, Scheda, Vuoto } from '@/components/base';
import { Icona } from '@/components/icone';
import { Input } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { TOCCO_MINIMO, colori, raggio, spazi, testi } from '@/lib/tema';

interface OffertaMandata {
  pratica_id: string;
  titolo: string | null;
  modulo: Modulo;
  stato: StatoPratica;
  quando: string;
}

interface Cliente {
  id: string;
  nome: string;
  tipo: TipoCliente;
  telefono: string | null;
  email: string | null;
  note: string | null;
  quante_pratiche: number;
  moduli: Modulo[];
  ultimo_contatto: string | null;
  offerte: OffertaMandata[];
}

/**
 * I contatti (§8.1).
 *
 * "Chi ha noleggiato a giugno e' lo stesso a cui a ottobre si propone
 * l'acquisto": percio' l'elenco e' uno solo per tutti i moduli, e aprendo un
 * cliente si vede tutto quello che gli e' stato mandato, di qualunque modulo.
 *
 * Lo storico arriva gia' dentro la riga: aprire un cliente non deve costare un
 * viaggio di rete, altrimenti si smette di aprirli.
 */
export default function Clienti() {
  const router = useRouter();
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [tipo, setTipo] = useState<TipoCliente | null>(null);
  const [cerca, setCerca] = useState('');
  const [aperto, setAperto] = useState<string | null>(null);
  const [caricato, setCaricato] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const { data } = await supabase.rpc(fn('clienti'));
        if (!vivo) return;
        setClienti((data as Cliente[] | null) ?? []);
        setCaricato(true);
      })();
      return () => {
        vivo = false;
      };
    }, [])
  );

  const visibili = useMemo(() => {
    const parola = cerca.trim().toLowerCase();
    return clienti.filter((c) => {
      if (tipo && c.tipo !== tipo) return false;
      if (!parola) return true;
      return (
        c.nome.toLowerCase().includes(parola) ||
        (c.telefono ?? '').includes(parola) ||
        (c.email ?? '').toLowerCase().includes(parola)
      );
    });
  }, [clienti, tipo, cerca]);

  const privati = clienti.filter((c) => c.tipo === 'privato').length;
  const rivenditori = clienti.length - privati;

  if (!caricato) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  return (
    <View style={stili.contenitore}>
      <View style={stili.ricerca}>
        <Icona nome="cerca" dimensione={18} colore={colori.testoDebole} />
        <Input
          value={cerca}
          onChangeText={setCerca}
          placeholder="Cerca per nome, telefono o email"
          style={stili.campoRicerca}
          autoCorrect={false}
        />
      </View>

      {rivenditori > 0 && privati > 0 && (
        <Filtri
          valore={tipo}
          onCambia={setTipo}
          opzioni={[
            { valore: null, etichetta: `Tutti (${clienti.length})` },
            { valore: 'privato' as TipoCliente, etichetta: `Privati (${privati})` },
            { valore: 'rivenditore' as TipoCliente, etichetta: `Rivenditori (${rivenditori})` },
          ]}
        />
      )}

      <FlatList
        data={visibili}
        keyExtractor={(c) => c.id}
        contentContainerStyle={stili.lista}
        ListEmptyComponent={
          <Vuoto
            icona="utenti"
            titolo={cerca ? 'Nessun cliente trovato' : 'Nessun cliente'}
            testo={
              cerca
                ? 'Prova con un’altra parola: nome, telefono o email.'
                : 'Chi ti scrive da una pagina finisce qui, con tutte le offerte che gli hai mandato.'
            }
          />
        }
        renderItem={({ item }) => (
          <SchedaCliente
            cliente={item}
            aperto={aperto === item.id}
            onApri={() => setAperto(aperto === item.id ? null : item.id)}
            onPratica={(id) => router.push({ pathname: '/pratiche/[id]', params: { id } })}
          />
        )}
      />
    </View>
  );
}

function SchedaCliente({
  cliente,
  aperto,
  onApri,
  onPratica,
}: {
  cliente: Cliente;
  aperto: boolean;
  onApri: () => void;
  onPratica: (praticaId: string) => void;
}) {
  const rivenditore = cliente.tipo === 'rivenditore';

  return (
    <Scheda style={stili.scheda}>
      <Pressable onPress={onApri} style={stili.testa} accessibilityRole="button">
        <Iniziali nome={cliente.nome} tono={rivenditore ? 'attenzione' : 'neutro'} />

        <View style={stili.testi}>
          <View style={stili.rigaNome}>
            <Text style={stili.nome} numberOfLines={1}>
              {cliente.nome}
            </Text>
            {rivenditore && <Pillola testo="rivenditore" tono="attenzione" />}
          </View>
          <Text style={stili.sottotitolo} numberOfLines={1}>
            {cliente.quante_pratiche === 0
              ? 'Nessuna offerta mandata'
              : `${cliente.quante_pratiche} ${
                  cliente.quante_pratiche === 1 ? 'offerta' : 'offerte'
                } · ${cliente.moduli.map((m) => ETICHETTA_MODULO[m]).join(', ')}`}
          </Text>
          {cliente.ultimo_contatto && (
            <Text style={stili.quando}>{quandoBreve(cliente.ultimo_contatto)}</Text>
          )}
        </View>

        <Icona
          nome={aperto ? 'indietro' : 'avanti'}
          dimensione={18}
          colore={colori.testoDebole}
        />
      </Pressable>

      {/* I due tasti che il venditore usa davvero, sempre a portata: chiamare e
          scrivere. Cercarli dentro la scheda del cliente sarebbe un tocco in
          piu' per il gesto piu' frequente. */}
      <View style={stili.azioni}>
        {cliente.telefono && (
          <Tasto
            icona="telefona"
            testo="Chiama"
            onPress={() => void Linking.openURL(`tel:${cliente.telefono}`)}
          />
        )}
        {cliente.telefono && (
          <Tasto
            icona="messaggio"
            testo="WhatsApp"
            onPress={() =>
              void Linking.openURL(
                `https://wa.me/${cliente.telefono!.replace(/[^\d]/g, '')}`
              )
            }
          />
        )}
        {cliente.email && (
          <Tasto
            icona="documento"
            testo="Email"
            onPress={() => void Linking.openURL(`mailto:${cliente.email}`)}
          />
        )}
      </View>

      {aperto && (
        <View style={stili.storico}>
          {cliente.note ? <Text style={stili.note}>{cliente.note}</Text> : null}

          {cliente.offerte.length === 0 ? (
            <Text style={stili.nulla}>Nessuna offerta ancora mandata a questo cliente.</Text>
          ) : (
            cliente.offerte.map((o) => (
              <Pressable
                key={o.pratica_id}
                onPress={() => onPratica(o.pratica_id)}
                style={({ pressed }) => [stili.voce, pressed && stili.premuta]}
              >
                <View style={stili.voceTesti}>
                  <Text style={stili.voceTitolo} numberOfLines={1}>
                    {o.titolo ?? 'Offerta rimossa'}
                  </Text>
                  <Text style={stili.voceDettaglio}>
                    {ETICHETTA_MODULO[o.modulo]} · {ETICHETTA_STATO_PRATICA[o.stato]}
                  </Text>
                </View>
                <Text style={stili.voceQuando}>{quandoBreve(o.quando)}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </Scheda>
  );
}

function Tasto({
  icona,
  testo,
  onPress,
}: {
  icona: 'telefona' | 'messaggio' | 'documento';
  testo: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [stili.tasto, pressed && stili.premuta]}
    >
      <Icona nome={icona} dimensione={15} colore={colori.primario} />
      <Text style={stili.tastoTesto}>{testo}</Text>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: colori.sfondo },
  centrato: { flex: 1, justifyContent: 'center', backgroundColor: colori.sfondo },
  lista: { padding: spazi.l, paddingTop: spazi.s, gap: spazi.s, paddingBottom: spazi.xxxl },

  ricerca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazi.s,
    paddingHorizontal: spazi.l,
    paddingTop: spazi.m,
  },
  campoRicerca: { flex: 1 },

  scheda: { gap: spazi.s, padding: spazi.m },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },
  testi: { flex: 1, gap: 2 },
  rigaNome: { flexDirection: 'row', alignItems: 'center', gap: spazi.s },
  nome: { ...testi.corpo, fontWeight: '700', color: colori.testo, flexShrink: 1 },
  sottotitolo: { fontSize: 12, color: colori.testoTenue },
  quando: { fontSize: 11, color: colori.testoDebole },

  azioni: { flexDirection: 'row', gap: spazi.s },
  tasto: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spazi.xs,
    borderRadius: raggio.s,
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  tastoTesto: { fontSize: 13, fontWeight: '600', color: colori.primario },
  premuta: { opacity: 0.7 },

  storico: {
    gap: spazi.xs,
    borderTopWidth: 1,
    borderTopColor: colori.bordoTenue,
    paddingTop: spazi.s,
  },
  note: { fontSize: 13, color: colori.testoTenue, lineHeight: 18, fontStyle: 'italic' },
  nulla: { fontSize: 13, color: colori.testoDebole },
  voce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazi.s,
    minHeight: TOCCO_MINIMO,
    paddingVertical: spazi.xs,
  },
  voceTesti: { flex: 1, gap: 1 },
  voceTitolo: { fontSize: 14, fontWeight: '600', color: colori.testo },
  voceDettaglio: { fontSize: 12, color: colori.testoTenue },
  voceQuando: { fontSize: 11, color: colori.testoDebole },
});
