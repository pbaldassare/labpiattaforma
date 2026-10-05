import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { tab } from '@lab/shared';

import { Icona } from '@/components/icone';
import { Bottone, Campo, Input } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, stiliTema, testi } from '@/lib/tema';

interface Promemoria {
  id: string;
  quando: string;
  motivo: string;
}

/** Scorciatoie per i casi di tutti i giorni: il richiamo si fissa in un tocco. */
const RAPIDI = [
  { etichetta: 'Domani', giorni: 1 },
  { etichetta: 'Fra 3 giorni', giorni: 3 },
  { etichetta: 'Fra una settimana', giorni: 7 },
];

/**
 * Legge giorno e ora scritti a mano: "15/10/2026" e "10:30" (l'ora e'
 * facoltativa, senza vale le 9). null se la data non esiste o e' passata.
 */
function leggiQuando(giorno: string, ora: string): Date | null {
  const d = giorno.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!d) return null;
  const anno = Number(d[3]!.length === 2 ? `20${d[3]}` : d[3]);
  const [g, m] = [Number(d[1]), Number(d[2])];

  let [hh, mm] = [9, 0];
  if (ora.trim()) {
    const o = ora.trim().match(/^(\d{1,2})[:.](\d{2})$/);
    if (!o) return null;
    [hh, mm] = [Number(o[1]), Number(o[2])];
    if (hh > 23 || mm > 59) return null;
  }

  const quando = new Date(anno, m - 1, g, hh, mm);
  // new Date trasforma il 31/02 in 3 marzo senza dire niente: qui si rifiuta.
  if (quando.getDate() !== g || quando.getMonth() !== m - 1) return null;
  if (quando <= new Date()) return null;
  return quando;
}

function descrivi(iso: string): string {
  const d = new Date(iso);
  const giorno = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return `${giorno}, ore ${ora}`;
}

/**
 * I promemoria di una pratica: tutti quelli ancora da fare, ognuno si puo'
 * segnare fatto o cancellare, e se ne aggiunge uno con una scorciatoia o con
 * giorno, ora e motivo scelti a mano.
 */
export function PromemoriaPratica({
  praticaId,
  nomeCliente,
}: {
  praticaId: string;
  nomeCliente: string;
}) {
  const [elenco, setElenco] = useState<Promemoria[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [personalizzato, setPersonalizzato] = useState(false);
  const [giorno, setGiorno] = useState('');
  const [ora, setOra] = useState('');
  const [motivo, setMotivo] = useState('');
  const [inCorso, setInCorso] = useState(false);

  const carica = useCallback(async () => {
    const { data, error } = await supabase
      .from(tab('promemoria'))
      .select('id, quando, motivo')
      .eq('pratica_id', praticaId)
      .eq('fatto', false)
      .order('quando');
    if (error) setErrore(error.message);
    setElenco((data ?? []) as Promemoria[]);
  }, [praticaId]);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data } = await supabase
        .from(tab('promemoria'))
        .select('id, quando, motivo')
        .eq('pratica_id', praticaId)
        .eq('fatto', false)
        .order('quando');
      if (vivo) setElenco((data ?? []) as Promemoria[]);
    })();
    return () => {
      vivo = false;
    };
  }, [praticaId]);

  async function aggiungi(quando: Date, testo?: string) {
    setErrore(null);
    setInCorso(true);
    const { error } = await supabase.from(tab('promemoria')).insert({
      pratica_id: praticaId,
      quando: quando.toISOString(),
      motivo: testo?.trim() || `Richiamare ${nomeCliente}`,
    });
    setInCorso(false);
    if (error) {
      setErrore(error.message);
      return;
    }
    setPersonalizzato(false);
    setGiorno('');
    setOra('');
    setMotivo('');
    await carica();
  }

  function rapido(giorni: number) {
    const quando = new Date();
    quando.setDate(quando.getDate() + giorni);
    quando.setHours(9, 0, 0, 0);
    void aggiungi(quando);
  }

  function salvaPersonalizzato() {
    const quando = leggiQuando(giorno, ora);
    if (!quando) {
      setErrore('Scrivi un giorno futuro come 15/10/2026 e, se vuoi, un’ora come 10:30.');
      return;
    }
    void aggiungi(quando, motivo);
  }

  async function segnaFatto(p: Promemoria) {
    setElenco((x) => x.filter((v) => v.id !== p.id));
    const { error } = await supabase.from(tab('promemoria')).update({ fatto: true }).eq('id', p.id);
    if (error) {
      setErrore(error.message);
      void carica();
    }
  }

  async function cancella(p: Promemoria) {
    setElenco((x) => x.filter((v) => v.id !== p.id));
    const { error } = await supabase.from(tab('promemoria')).delete().eq('id', p.id);
    if (error) {
      setErrore(error.message);
      void carica();
    }
  }

  return (
    <View style={stili.contenitore}>
      {elenco.length === 0 ? (
        <Text style={stili.vuoto}>Nessun promemoria fissato.</Text>
      ) : (
        elenco.map((p) => (
          <View key={p.id} style={stili.riga}>
            <Icona nome="campanello" dimensione={18} colore={colori.primarioChiaro} />
            <View style={stili.testi}>
              <Text style={stili.motivo}>{p.motivo}</Text>
              <Text style={stili.quando}>{descrivi(p.quando)}</Text>
            </View>
            <Pressable
              onPress={() => void segnaFatto(p)}
              accessibilityRole="button"
              accessibilityLabel="Segna come fatto"
              hitSlop={6}
              style={({ pressed }) => [stili.tondo, stili.tondoFatto, pressed && stili.premuto]}
            >
              <Icona nome="spunta" dimensione={16} colore={colori.successo} />
            </Pressable>
            <Pressable
              onPress={() => void cancella(p)}
              accessibilityRole="button"
              accessibilityLabel="Cancella il promemoria"
              hitSlop={6}
              style={({ pressed }) => [stili.tondo, stili.tondoCancella, pressed && stili.premuto]}
            >
              <Text style={stili.croce}>✕</Text>
            </Pressable>
          </View>
        ))
      )}

      <Text style={stili.titoletto}>Aggiungi un promemoria</Text>
      <View style={stili.rapidi}>
        {RAPIDI.map((r) => (
          <Pressable
            key={r.giorni}
            onPress={() => rapido(r.giorni)}
            disabled={inCorso}
            style={({ pressed }) => [stili.chip, pressed && stili.premuto]}
          >
            <Text style={stili.chipTesto}>{r.etichetta}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setPersonalizzato((x) => !x)}
          style={({ pressed }) => [stili.chip, personalizzato && stili.chipAttivo, pressed && stili.premuto]}
        >
          <Text style={[stili.chipTesto, personalizzato && stili.chipTestoAttivo]}>
            Scegli tu…
          </Text>
        </Pressable>
      </View>

      {personalizzato && (
        <View style={stili.personalizzato}>
          <View style={stili.dueCampi}>
            <View style={stili.campoLargo}>
              <Campo etichetta="Giorno">
                <Input
                  value={giorno}
                  onChangeText={setGiorno}
                  placeholder="15/10/2026"
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                />
              </Campo>
            </View>
            <View style={stili.campoStretto}>
              <Campo etichetta="Ora">
                <Input
                  value={ora}
                  onChangeText={setOra}
                  placeholder="09:00"
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                />
              </Campo>
            </View>
          </View>
          <Campo etichetta="Cosa devi fare">
            <Input
              value={motivo}
              onChangeText={setMotivo}
              placeholder={`Richiamare ${nomeCliente}`}
            />
          </Campo>
          <Bottone testo="Salva il promemoria" icona="campanello" inCorso={inCorso} onPress={salvaPersonalizzato} />
        </View>
      )}

      {errore && <Text style={stili.errore}>{errore}</Text>}
    </View>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    contenitore: { gap: spazi.m },
    vuoto: { ...testi.piccolo, color: c.testoTenue },
    riga: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spazi.m,
      padding: spazi.m,
      borderRadius: raggio.m,
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.bordoTenue,
    },
    testi: { flex: 1, gap: 2 },
    motivo: { ...testi.corpo, fontWeight: '600', color: c.testo },
    quando: { ...testi.piccolo, color: c.testoTenue },
    tondo: {
      width: 36,
      height: 36,
      borderRadius: raggio.tondo,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tondoFatto: { backgroundColor: c.successoTenue },
    tondoCancella: { backgroundColor: c.azioneTenue },
    croce: { fontSize: 15, fontWeight: '700', color: c.azione },
    premuto: { opacity: 0.6 },

    titoletto: { ...testi.etichetta, color: c.testoTenue, marginTop: spazi.s },
    rapidi: { flexDirection: 'row', flexWrap: 'wrap', gap: spazi.s },
    chip: {
      minHeight: 40,
      paddingHorizontal: spazi.m,
      borderRadius: raggio.tondo,
      borderWidth: 1,
      borderColor: c.bordo,
      backgroundColor: c.superficieAlta,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipAttivo: { backgroundColor: c.primarioTenue, borderColor: c.primario },
    chipTesto: { fontSize: 14, fontWeight: '600', color: c.primarioChiaro },
    chipTestoAttivo: { color: c.testo },

    personalizzato: { gap: spazi.m },
    dueCampi: { flexDirection: 'row', gap: spazi.s },
    campoLargo: { flex: 3 },
    campoStretto: { flex: 2 },
    errore: { ...testi.piccolo, color: c.errore },
  })
);
