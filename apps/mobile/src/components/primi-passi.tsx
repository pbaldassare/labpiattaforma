import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Scheda } from '@/components/base';
import { Icona } from '@/components/icone';
import { Testo as Text } from '@/components/testo';
import { colori, raggio, spazi, stiliTema, testi } from '@/lib/tema';

/**
 * I primi passi di un venditore nuovo, in home finche' non li ha fatti tutti.
 *
 * Tre passi e non un tour a schermate: chi apre l'app la prima volta vuole
 * arrivare al primo cliente, non leggere. Ogni passo si spunta da solo quando
 * succede davvero (il profilo esiste, c'e' un'offerta, qualcuno ha aperto la
 * pagina) e porta dritto dove si fa. Fatti tutti e tre, la scheda sparisce.
 */
export function PrimiPassi({
  haProfilo,
  haOfferte,
  haAperture,
}: {
  haProfilo: boolean;
  haOfferte: boolean;
  /** Qualcuno ha aperto una pagina: l'offerta e' arrivata a un cliente. */
  haAperture: boolean;
}) {
  const router = useRouter();

  const passi = [
    {
      fatto: haProfilo,
      titolo: 'Compila il tuo profilo',
      testo: 'Nome, telefono e l’indirizzo della tua vetrina.',
      vai: () => router.push('/profilo'),
    },
    {
      fatto: haOfferte,
      titolo: 'Carica la prima offerta',
      testo: 'Scegli il modulo, metti foto e prezzo: la pagina per il cliente nasce da sola.',
      vai: () => router.push('/moduli'),
    },
    {
      fatto: haAperture,
      titolo: 'Mandala a un cliente',
      testo: 'Apri l’offerta e tocca “Manda su WhatsApp”. Si spunta quando il cliente la apre.',
      vai: () => router.push('/offerte'),
    },
  ];

  const fatti = passi.filter((p) => p.fatto).length;
  if (fatti === passi.length) return null;

  // Il passo su cui insistere e' il primo non fatto: gli altri restano visibili
  // per far capire dove si va, ma non chiedono attenzione.
  const prossimo = passi.findIndex((p) => !p.fatto);

  return (
    <Scheda rilievo="media" style={stili.scheda}>
      <View style={stili.testa}>
        <View style={stili.flex}>
          <Text style={stili.titolo}>Primi passi</Text>
          <Text style={stili.sottotitolo}>
            {fatti === 0 ? 'Tre passi e sei pronto a lavorare.' : `${fatti} di ${passi.length} fatti, manca poco.`}
          </Text>
        </View>
        <Text style={stili.conto}>
          {fatti}/{passi.length}
        </Text>
      </View>

      <View style={stili.barra}>
        <View style={[stili.barraPiena, { width: `${(fatti / passi.length) * 100}%` }]} />
      </View>

      {passi.map((p, i) => {
        const attivo = i === prossimo;
        return (
          <Pressable
            key={p.titolo}
            onPress={p.vai}
            accessibilityRole="button"
            accessibilityState={{ checked: p.fatto }}
            style={({ pressed }) => [stili.passo, attivo && stili.passoAttivo, pressed && { opacity: 0.7 }]}
          >
            <View style={[stili.cerchio, p.fatto && stili.cerchioFatto, attivo && stili.cerchioAttivo]}>
              {p.fatto ? (
                <Icona nome="spunta" dimensione={14} colore={colori.suPrimario} />
              ) : (
                <Text style={[stili.numero, attivo && stili.numeroAttivo]}>{i + 1}</Text>
              )}
            </View>
            <View style={stili.flex}>
              <Text style={[stili.passoTitolo, p.fatto && stili.passoFatto]}>{p.titolo}</Text>
              {!p.fatto && <Text style={stili.passoTesto}>{p.testo}</Text>}
            </View>
            {!p.fatto && <Icona nome="avanti" dimensione={16} colore={attivo ? colori.primarioChiaro : colori.testoDebole} />}
          </Pressable>
        );
      })}
    </Scheda>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    scheda: { gap: spazi.m, borderWidth: 1, borderColor: c.primario },
    testa: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },
    flex: { flex: 1, gap: 2 },
    titolo: { ...testi.sottotitolo, color: c.testo },
    sottotitolo: { ...testi.piccolo, color: c.testoTenue },
    conto: { ...testi.titolo, fontSize: 22, color: c.primarioChiaro },
    barra: { height: 6, borderRadius: raggio.tondo, backgroundColor: c.bordoTenue, overflow: 'hidden' },
    barraPiena: { height: 6, borderRadius: raggio.tondo, backgroundColor: c.primario },

    passo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spazi.m,
      padding: spazi.m,
      borderRadius: raggio.m,
    },
    passoAttivo: { backgroundColor: c.primarioTenue },
    cerchio: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.bordo,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cerchioAttivo: { borderColor: c.primario },
    cerchioFatto: { backgroundColor: c.primario, borderColor: c.primario },
    numero: { fontSize: 13, fontWeight: '700', color: c.testoTenue },
    numeroAttivo: { color: c.primarioChiaro },
    passoTitolo: { fontSize: 15, fontWeight: '700', color: c.testo },
    passoFatto: { color: c.testoTenue, textDecorationLine: 'line-through' },
    passoTesto: { ...testi.piccolo, color: c.testoTenue },
  })
);
