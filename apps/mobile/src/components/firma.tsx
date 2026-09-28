import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { firmaValida, type PuntoFirma } from '@lab/shared';

import { Bottone } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { colori, raggio, spazi, stiliTema } from '@/lib/tema';

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
  // I tratti stanno anche in un ref perche' il gestore del tocco si costruisce
  // una volta sola e leggerebbe sempre il primo valore dello stato. Lo stato
  // serve solo a ridisegnare.
  const tutti = useRef<string[]>([]);
  const foglio = useRef<View>(null);
  const parziale = useRef('');

  // Il gestore del tocco si costruisce una volta sola, quindi tiene per sempre
  // la prima `onCambia` che gli capita. Passando dal ref chiama sempre quella
  // di adesso, anche se il modulo attorno si e' ridisegnato.
  const avvisa = useRef(onCambia);
  useEffect(() => {
    avvisa.current = onCambia;
  }, [onCambia]);

  function segnala(tuttiTracciati: string[]) {
    const tracciato = tuttiTracciati.join(' ');
    avvisa.current({ tracciato, valida: firmaValida(punti.current) });
  }

  // Origine del riquadro sullo schermo. Serve perche' le coordinate locali
  // dell'evento (locationX/locationY) non sono affidabili sul web con il
  // mouse: arrivano vuote, e la firma risulterebbe sempre non valida. Le
  // coordinate di pagina invece ci sono sempre, su telefono e su browser.
  const origine = useRef({ x: 0, y: 0 });

  function locale(pageX: number, pageY: number) {
    return { x: pageX - origine.current.x, y: pageY - origine.current.y };
  }

  // useMemo e non useRef: `useRef(...).current` letto qui sarebbe un vero
  // accesso a un ref durante il render, che e' il caso in cui React non
  // garantisce che il componente si aggiorni.
  //
  // La regola segnala comunque i `.current` che vede dentro: non sa che quei
  // corpi girano quando arriva il tocco, non mentre si disegna. Si spegne qui
  // invece di rigirare il codice per farla tacere.
  const gestore = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
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
          if (!finito) return;

          // Fuori dall'aggiornamento di stato: chiamare `segnala` dentro la
          // funzione passata a setTracciati la faceva girare durante il
          // render, e avvisare il modulo li' dentro vuol dire aggiornarlo
          // mentre React sta disegnando ("Cannot update a component while
          // rendering a different component").
          tutti.current = [...tutti.current, finito];
          setTracciati(tutti.current);
          segnala(tutti.current);
        },
      }),
    // Una volta sola: dentro tocca solo ref e aggiornamenti di stato con
    // funzione, quindi non ha bisogno di rileggere niente.
    []
  );

  function cancella() {
    punti.current = [];
    tutti.current = [];
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

const stili = stiliTema((c) => StyleSheet.create({
  contenitore: { gap: spazi.s },
  foglio: {
    height: 160,
    backgroundColor: c.superficie,
    borderWidth: 1,
    borderColor: c.bordo,
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
  suggerimentoTesto: { color: c.testoTenue, fontSize: 14 },
}));