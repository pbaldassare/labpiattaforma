import type { ReactNode } from 'react';
import { AccessibilityInfo, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useEffect, useState } from 'react';

/**
 * L'ingresso delle cose in schermata.
 *
 * Non e' decorazione: una scheda che sale di pochi pixel mentre compare dice
 * da dove arriva, e la schermata si legge nell'ordine in cui e' stata pensata
 * invece che tutta insieme. Le durate sono corte — chi apre l'app dieci volte
 * al giorno non deve mai aspettare l'animazione.
 *
 * Con "riduci movimento" attivo resta solo la dissolvenza: il gesto rimane
 * leggibile per chi soffre il movimento sullo schermo, che e' il motivo per
 * cui l'impostazione esiste.
 */
const DURATA = 260;
const PASSO = 55;

function useMenoMovimento(): boolean {
  const [ridotto, setRidotto] = useState(false);

  useEffect(() => {
    let vivo = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => vivo && setRidotto(v))
      .catch(() => {});

    const iscrizione = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setRidotto(v)
    );
    return () => {
      vivo = false;
      iscrizione.remove();
    };
  }, []);

  return ridotto;
}

/**
 * Entra dal basso, con un ritardo proporzionale alla posizione.
 *
 * `indice` serve agli elenchi: le righe arrivano una dopo l'altra e l'occhio
 * le segue invece di trovarsele gia' tutte li'. Oltre la sesta il ritardo si
 * ferma, se no le ultime righe di un elenco lungo farebbero aspettare.
 */
export function Entra({
  children,
  indice = 0,
  da = 'basso',
  style,
}: {
  children: ReactNode;
  indice?: number;
  da?: 'basso' | 'alto' | 'fermo';
  style?: StyleProp<ViewStyle>;
}) {
  const ridotto = useMenoMovimento();
  const ritardo = Math.min(indice, 6) * PASSO;

  const ingresso = ridotto
    ? FadeIn.duration(DURATA).delay(ritardo)
    : da === 'alto'
      ? FadeInUp.duration(DURATA).delay(ritardo)
      : da === 'fermo'
        ? FadeIn.duration(DURATA).delay(ritardo)
        : FadeInDown.duration(DURATA).delay(ritardo);

  return (
    <Animated.View entering={ingresso} style={style}>
      {children}
    </Animated.View>
  );
}
