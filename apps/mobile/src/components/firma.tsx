import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { firmaValida, type PuntoFirma } from '@lab/shared';

import { Bottone } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { colori, raggio, spazi } from '@/lib/tema';

/**
 * Riquadro per la firma.
 *
 * Il documento (§4.4) chiede di rifiutare la firma vuota "con controllo sui
 * tratti, non solo sulla presenza del canvas": un tocco solo non e' una firma,
 * e nemmeno una riga dritta di due centimetri. Qui si contano i punti e si
 * misura quanto e' larga la scritta, cosi' un dito appoggiato per sbaglio non
 * passa per un consenso.
 *
 * Il risultato e' un tracciato vettoriale, non un'immagine: pesa pochi byte,
 * resta nitido a qualsiasi dimensione e si puo' ricontare se un domani
 * qualcuno contestasse la firma.
 */

export interface EsitoFirma {
  tracciato: string;
  valida: boolean;
}

export function Firma({ onCambia }: { onCambia: (esito: EsitoFirma) => void }) {
  const [tracciati, setTracciati] = useState<string[]>([]);
  const [corrente, setCorrente] = useState('');
  const [dimensioni, setDimensioni] = useState({ larghezza: 0, altezza: 160 });

  // In un ref e non nello stato: servono a ogni movimento del dito, e farli
  // passare da un aggiornamento di stato renderebbe il tratto a scatti.
  const punti = useRef<PuntoFirma[]>([]);
  const foglio = useRef<View>(null);
  const parziale = useRef('');

  function segnala(tuttiTracciati: string[]) {
    const tracciato = tuttiTracciati.join(' ');
    onCambia({ tracciato, valida: firmaValida(punti.current) });
  }

  // Origine del riquadro sullo schermo. Serve perche' le coordinate locali
  // dell'evento (locationX/locationY) non sono affidabili sul web con il
  // mouse: arrivano vuote, e la firma risulterebbe sempre non valida. Le
  // coordinate di pagina invece ci sono sempre, su telefono e su browser.
  const origine = useRef({ x: 0, y: 0 });

  function locale(pageX: number, pageY: number) {
    return { x: pageX - origine.current.x, y: pageY - origine.current.y };
  }

  const gestore = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evento) => {
        const p = locale(evento.nativeEvent.pageX, evento.nativeEvent.pageY);
        punti.current.push(p);
        parziale.current = `M${arrotonda(p.x)} ${arrotonda(p.y)}`;
        setCorrente(parziale.current);
      },

      onPanResponderMove: (evento) => {
        const p = locale(evento.nativeEvent.pageX, evento.nativeEvent.pageY);
        punti.current.push(p);
        parziale.current += ` L${arrotonda(p.x)} ${arrotonda(p.y)}`;
        setCorrente(parziale.current);
      },

      onPanResponderRelease: () => {
        const finito = parziale.current;
        parziale.current = '';
        setCorrente('');
        setTracciati((precedenti) => {
          const nuovi = finito ? [...precedenti, finito] : precedenti;
          segnala(nuovi);
          return nuovi;
        });
      },
    })
  ).current;

  function cancella() {
    punti.current = [];
    parziale.current = '';
    setCorrente('');
    setTracciati([]);
    onCambia({ tracciato: '', valida: false });
  }

  function misura(evento: LayoutChangeEvent) {
    const { width, height } = evento.nativeEvent.layout;
    setDimensioni({ larghezza: width, altezza: height });
    // measureInWindow da' la posizione sullo schermo, che e' cio' che serve
    // per trasformare le coordinate di pagina in coordinate del riquadro.
    foglio.current?.measureInWindow((x, y) => {
      origine.current = { x, y };
    });
  }

  const vuota = tracciati.length === 0 && corrente === '';

  return (
    <View style={stili.contenitore}>
      <View ref={foglio} style={stili.foglio} onLayout={misura} {...gestore.panHandlers}>
        <Svg width={dimensioni.larghezza} height={dimensioni.altezza}>
          {[...tracciati, corrente].filter(Boolean).map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={colori.testo}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
        {vuota && (
          <View style={stili.suggerimento} pointerEvents="none">
            <Text style={stili.suggerimentoTesto}>Firma qui con il dito</Text>
          </View>
        )}
      </View>

      {!vuota && <Bottone tenue testo="Cancella e rifai" onPress={cancella} />}
    </View>
  );
}

function arrotonda(n: number): number {
  return Math.round(n * 10) / 10;
}

const stili = StyleSheet.create({
  contenitore: { gap: spazi.s },
  foglio: {
    height: 160,
    backgroundColor: colori.superficie,
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: raggio.m,
    overflow: 'hidden',
  },
  suggerimento: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggerimentoTesto: { color: colori.testoTenue, fontSize: 14 },
});
