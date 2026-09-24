import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

/**
 * Le icone dell'app.
 *
 * Una famiglia sola — Feather, tratto 2, stessa costruzione geometrica — e un
 * elenco chiuso con nomi in italiano. Serve a due cose: che nessuna schermata
 * inventi un'icona fuori famiglia, e che cambiare il disegno di "telefona"
 * voglia dire toccare una riga sola invece di cercarla in dieci file.
 *
 * Feather arriva con Expo: niente pacchetti di terze parti, come raccomanda
 * la guida del progetto. Lucide, provato prima, rompeva la risoluzione dei
 * moduli di Metro nel monorepo.
 */

type NomeFeather = ComponentProps<typeof Feather>['name'];

const MAPPA = {
  casa: 'home',
  negozio: 'shopping-bag',
  apri: 'external-link',
  auto: 'truck',
  telefona: 'phone-call',
  messaggio: 'message-circle',
  occhio: 'eye',
  campanello: 'bell',
  piu: 'plus',
  impostazioni: 'settings',
  esci: 'log-out',
  indietro: 'chevron-left',
  avanti: 'chevron-right',
  copia: 'copy',
  condividi: 'share-2',
  spunta: 'check',
  utente: 'user',
  utenti: 'users',
  documento: 'file-text',
  calendario: 'calendar',
  cartellino: 'tag',
  collegamento: 'link-2',
  attenzione: 'alert-circle',
  matita: 'edit-2',
  cerca: 'search',
} as const;

export type NomeIcona = keyof typeof MAPPA;

export function Icona({
  nome,
  dimensione = 20,
  colore,
}: {
  nome: NomeIcona;
  dimensione?: number;
  colore?: string;
}) {
  return <Feather name={MAPPA[nome] as NomeFeather} size={dimensione} color={colore} />;
}
