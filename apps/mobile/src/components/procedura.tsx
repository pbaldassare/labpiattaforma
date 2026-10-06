import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Bottone } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { raggio, spazi, stiliTema, testi } from '@/lib/tema';

export interface Passo {
  titolo: string;
  contenuto: ReactNode;
  /** Se false "Avanti" resta spento e sotto compare il motivo. */
  valido?: boolean;
  motivo?: string;
}

/**
 * Un form lungo diviso in passi.
 *
 * Quattro sezioni una sotto l'altra, col pulsante di salvataggio in fondo,
 * spaventano: non si capisce quanto manca. Qui si vede un passo alla volta,
 * in cima c'e' dove si e' e quanto resta, e i pulsanti per salvare compaiono
 * all'ultimo passo. I passi gia' visti (e tutti, quando si modifica
 * un'offerta esistente) si riaprono toccandone il nome.
 */
export function Procedura({
  passi,
  finale,
  liberi = false,
  onCambiaPasso,
}: {
  passi: Passo[];
  /** Errore e pulsanti di salvataggio, mostrati all'ultimo passo. */
  finale: ReactNode;
  /** Quando si modifica un'offerta esistente si salta dove si vuole. */
  liberi?: boolean;
  /** Per riportare in cima lo scorrimento del form quando cambia il passo. */
  onCambiaPasso?: () => void;
}) {
  const [corrente, setCorrente] = useState(0);
  const [visto, setVisto] = useState(0);
  const passo = passi[corrente]!;
  const ultimo = corrente === passi.length - 1;
  const valido = passo.valido !== false;

  function vai(i: number) {
    setCorrente(i);
    setVisto((v) => Math.max(v, i));
    onCambiaPasso?.();
  }

  return (
    <View style={stili.contenitore}>
      <View style={stili.testa}>
        <Text style={stili.dove}>
          Passo {corrente + 1} di {passi.length}
        </Text>
        <View style={stili.barra}>
          {passi.map((p, i) => (
            <View key={p.titolo} style={[stili.tacca, i <= corrente && stili.taccaPiena]} />
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.nomi}>
          {passi.map((p, i) => {
            const raggiungibile = liberi || i <= visto;
            return (
              <Pressable
                key={p.titolo}
                onPress={() => raggiungibile && vai(i)}
                disabled={!raggiungibile}
                accessibilityRole="button"
                accessibilityState={{ selected: i === corrente, disabled: !raggiungibile }}
                style={({ pressed }) => [stili.nome, i === corrente && stili.nomeAttivo, pressed && { opacity: 0.6 }]}
              >
                <Text
                  style={[
                    stili.nomeTesto,
                    i === corrente && stili.nomeTestoAttivo,
                    !raggiungibile && stili.nomeTestoSpento,
                  ]}
                >
                  {i + 1}. {p.titolo}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={stili.corpo}>{passo.contenuto}</View>

      {ultimo ? (
        <View style={stili.fondo}>
          {finale}
          {corrente > 0 && <Bottone tipo="nudo" testo="Indietro" icona="indietro" onPress={() => vai(corrente - 1)} />}
        </View>
      ) : (
        <View style={stili.fondo}>
          {!valido && passo.motivo ? <Text style={stili.motivo}>{passo.motivo}</Text> : null}
          <Bottone
            testo={`Avanti: ${passi[corrente + 1]!.titolo}`}
            icona="avanti"
            disabilitato={!valido}
            onPress={() => vai(corrente + 1)}
          />
          {corrente > 0 && <Bottone tipo="nudo" testo="Indietro" icona="indietro" onPress={() => vai(corrente - 1)} />}
        </View>
      )}
    </View>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    contenitore: { gap: spazi.l },
    testa: { gap: spazi.s },
    dove: { ...testi.etichetta, color: c.primarioChiaro },
    barra: { flexDirection: 'row', gap: 4 },
    tacca: { flex: 1, height: 5, borderRadius: raggio.tondo, backgroundColor: c.bordoTenue },
    taccaPiena: { backgroundColor: c.primario },
    nomi: { gap: spazi.xs, paddingVertical: 2 },
    nome: { paddingHorizontal: spazi.m, paddingVertical: 6, borderRadius: raggio.tondo },
    nomeAttivo: { backgroundColor: c.primarioTenue },
    nomeTesto: { fontSize: 13, fontWeight: '600', color: c.testoTenue },
    nomeTestoAttivo: { color: c.testo },
    nomeTestoSpento: { opacity: 0.45 },
    corpo: { gap: spazi.l },
    fondo: { gap: spazi.s, paddingTop: spazi.s },
    motivo: { ...testi.piccolo, color: c.accento, textAlign: 'center' },
  })
);
