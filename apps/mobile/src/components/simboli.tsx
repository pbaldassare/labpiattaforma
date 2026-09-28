import Svg, { Path, Rect } from 'react-native-svg';

import type { NomeModulo } from '@/lib/tema';

/**
 * I simboli dei quattro moduli.
 *
 * Disegnati qui invece di pescati da una famiglia generica per una ragione
 * pratica: le icone a filo sottile, dentro un blocco di venti pixel, non hanno
 * peso — si vedono quattro trattini tutti uguali. Queste sono sagome piene,
 * ognuna con una silhouette diversa dalle altre, cosi' si riconoscono dalla
 * forma prima che dal dettaglio.
 *
 * Il trucco che le fa leggere a questa misura e' il vuoto: le ruote e il
 * quadrante sono buchi nella stessa sagoma (`fillRule="evenodd"`), non forme
 * appoggiate sopra. Un'auto tutta piena, a ventidue pixel, e' una macchia.
 *
 * Ognuna dice il suo modulo in modo diretto: la macchina si vende, il
 * cronometro conta i giorni, la chiave resta in mano per anni, lo scudo copre.
 */
export function Simbolo({
  modulo,
  dimensione = 22,
  colore,
}: {
  modulo: NomeModulo;
  dimensione?: number;
  colore: string;
}) {
  const comune = { width: dimensione, height: dimensione, viewBox: '0 0 24 24' };

  if (modulo === 'vendita') {
    return (
      <Svg {...comune}>
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          fill={colore}
          d={
            // Carrozzeria, con l'incavo dei passaruota.
            'M2.6 13.6c0-.8.5-1.5 1.3-1.7l1.8-.5 2.1-2.9a3.5 3.5 0 0 1 2.8-1.4h3.7c1.2 0 2.2.6 2.8 1.5l1.7 2.8 1.4.4c.8.2 1.4.9 1.4 1.7v1.9c0 .5-.4.9-.9.9h-.8a3.5 3.5 0 0 0-7 0h-1.8a3.5 3.5 0 0 0-7 0h-.9c-.5 0-.9-.4-.9-.9Z' +
            // Il finestrino, che e' un buco nella carrozzeria.
            'M10.6 8.7h2.1v2.4H8.8Z' +
            // Le ruote: anelli, non dischi. E' questo che le fa vedere.
            'M7.4 14.5a2.9 2.9 0 1 1 0 5.9 2.9 2.9 0 0 1 0-5.9Zm0 1.9a1 1 0 1 0 0 2.1 1 1 0 0 0 0-2.1Z' +
            'M16.6 14.5a2.9 2.9 0 1 1 0 5.9 2.9 2.9 0 0 1 0-5.9Zm0 1.9a1 1 0 1 0 0 2.1 1 1 0 0 0 0-2.1Z'
          }
        />
      </Svg>
    );
  }

  if (modulo === 'noleggio_breve') {
    return (
      <Svg {...comune}>
        {/* Corona e pulsante: senza, il cronometro e' un cerchio qualunque. */}
        <Rect x="9.5" y="1.6" width="5" height="2.1" rx="1" fill={colore} />
        <Rect
          x="17.6"
          y="3.4"
          width="3.6"
          height="2"
          rx="1"
          fill={colore}
          transform="rotate(45 19.4 4.4)"
        />
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          fill={colore}
          d={
            // La cassa.
            'M12 3.9a9.2 9.2 0 1 0 0 18.4 9.2 9.2 0 0 0 0-18.4Z' +
            // Il quadrante vuoto, con la lancetta che ci resta dentro piena.
            'M12 6.1a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z' +
            'M12.9 9.4a.9.9 0 0 0-1.8 0v3.7c0 .5.4.9.9.9h2.8a.9.9 0 0 0 0-1.8h-1.9Z'
          }
        />
      </Svg>
    );
  }

  if (modulo === 'noleggio_lungo') {
    return (
      <Svg {...comune}>
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          fill={colore}
          d={
            // Chiave: testa tonda in alto, stelo lungo, due denti in basso.
            // Lo stelo lungo e' il punto: un contratto che dura anni.
            'M12 1.9a5.6 5.6 0 0 0-1.2 11.1v6.4c0 .3.1.5.3.7l1.5 1.4c.3.3.8.3 1.1 0l1.7-1.6a.8.8 0 0 0 0-1.2l-1.1-1 1.1-1a.8.8 0 0 0 0-1.2l-1.1-1 .9-.8c.2-.2.3-.4.3-.7V13a5.6 5.6 0 0 0-3.5-11.1Z' +
            // Il foro della testa: senza, e' un lecca-lecca.
            'M12 5.1a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2Z'
          }
        />
      </Svg>
    );
  }

  return (
    <Svg {...comune}>
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        fill={colore}
        d={
          // Scudo.
          'M11.6 1.9 4.3 4.6a1.3 1.3 0 0 0-.8 1.2v5.9c0 4.5 3.2 8.6 8 10.4.3.1.7.1 1 0 4.8-1.8 8-5.9 8-10.4V5.8a1.3 1.3 0 0 0-.8-1.2L12.4 1.9a1.2 1.2 0 0 0-.8 0Z' +
          // La spunta, ritagliata: sul colore pieno un segno sopra sparirebbe.
          'm11.1 15.6-2.9-2.8a1.1 1.1 0 0 1 1.5-1.6l1.8 1.8 4.1-4.4a1.1 1.1 0 1 1 1.6 1.5l-4.9 5.4a1.1 1.1 0 0 1-1.2.1Z'
        }
      />
    </Svg>
  );
}
