import { ETICHETTA_MODULO, type Modulo } from '@lab/shared';

import { cn } from '@/lib/utils';

/**
 * Il colore di un modulo, sulle pagine pubbliche.
 *
 * La classe fissa le variabili `--colore-modulo` e compagnia (vedi
 * `globals.css`): tutto quello che sta sotto — prezzo, etichetta, bordo al
 * passaggio — le legge da li'. Le pagine non devono sapere che la vendita e'
 * verde: sanno solo che hanno un colore.
 */
export function classeModulo(modulo: Modulo): string {
  return `modulo-${modulo}`;
}

/**
 * L'etichetta del modulo: una pillola col nome per esteso.
 *
 * Il colore da solo non basta a dire di che offerta si tratta, quindi il nome
 * c'e' sempre. `pieno` e' la versione in sfumatura, per le foto e le
 * intestazioni scure dove la pillola tenue sparirebbe.
 */
export function MarchioModulo({
  modulo,
  pieno,
  className,
}: {
  modulo: Modulo;
  pieno?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        classeModulo(modulo),
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
        pieno ? 'sfumatura-modulo shadow-md' : 'bg-modulo-tenue text-modulo',
        className
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', pieno ? 'bg-current opacity-80' : 'bg-modulo')}
      />
      {ETICHETTA_MODULO[modulo]}
    </span>
  );
}
