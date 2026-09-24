'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Dove atterra il link della mail "password dimenticata".
 *
 * Sta sul sito e non nell'app perche' una mail si apre dove capita, spesso sul
 * computer: una pagina web si apre sempre, un collegamento all'app no.
 *
 * Gira nel browser perche' deve: il token di recupero arriva nel frammento
 * dell'indirizzo (dopo il #), che al server non arriva mai. Il client lo legge
 * da solo e apre una sessione buona per un cambio password e nient'altro.
 */
const MINIMO = 8;

type Stato =
  | { fase: 'controllo' }
  | { fase: 'pronto' }
  | { fase: 'fatto' }
  | { fase: 'scaduto' };

/**
 * Uno solo, creato una volta.
 *
 * Con un client nuovo a ogni chiamata, quello che legge il token
 * dall'indirizzo non e' lo stesso a cui si chiede la sessione, e il link
 * sembra sempre scaduto.
 */
let unico: ReturnType<typeof createClient> | null = null;

function client() {
  if (unico) return unico;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chiave) throw new Error('Manca la configurazione di Supabase.');
  // detectSessionInUrl: e' proprio quello che serve qui, leggere il token
  // dall'indirizzo. persistSession no: questa sessione serve per un cambio
  // password, non per restare dentro.
  unico = createClient(url, chiave, {
    auth: { detectSessionInUrl: true, persistSession: false, autoRefreshToken: false },
  });
  return unico;
}

export default function Reimposta() {
  const [stato, setStato] = useState<Stato>({ fase: 'controllo' });
  const [password, setPassword] = useState('');
  const [ripeti, setRipeti] = useState('');
  const [mostra, setMostra] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    let vivo = true;
    let deciso = false;

    function decidi(pronto: boolean) {
      if (!vivo || deciso) return;
      deciso = true;
      setStato({ fase: pronto ? 'pronto' : 'scaduto' });
    }

    let iscrizione: { unsubscribe: () => void } | undefined;
    try {
      const sb = client();

      // Leggere il token dall'indirizzo richiede un giro asincrono: chiedere
      // subito la sessione la trova vuota anche quando il link e' buono.
      // L'evento arriva quando ha finito davvero.
      iscrizione = sb.auth.onAuthStateChange((_evento, sessione) => {
        if (sessione) decidi(true);
      }).data.subscription;

      void sb.auth.getSession().then(({ data }) => {
        if (data.session) decidi(true);
      });

      // Se dopo qualche secondo non e' successo niente, il link non vale.
      const orologio = setTimeout(() => decidi(false), 4000);
      return () => {
        vivo = false;
        clearTimeout(orologio);
        iscrizione?.unsubscribe();
      };
    } catch {
      decidi(false);
      return () => {
        vivo = false;
      };
    }
  }, []);

  async function salva(evento: React.FormEvent) {
    evento.preventDefault();
    setErrore(null);

    if (password.length < MINIMO) {
      setErrore(`La password deve avere almeno ${MINIMO} caratteri.`);
      return;
    }
    if (password !== ripeti) {
      setErrore('Le due password non coincidono.');
      return;
    }

    setInCorso(true);
    const { error } = await client().auth.updateUser({ password });
    setInCorso(false);

    if (error) {
      setErrore(
        error.message.includes('same')
          ? 'Questa è la password che avevi già: scegline una diversa.'
          : error.message
      );
      return;
    }
    setStato({ fase: 'fatto' });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="font-display text-2xl">Lab Piattaforma</h1>
        <p className="text-testo-tenue mt-2">Scegli la tua nuova password.</p>
      </div>

      {stato.fase === 'controllo' && (
        <p className="text-testo-tenue text-sm">Un momento…</p>
      )}

      {stato.fase === 'scaduto' && (
        <div className="border-bordo bg-superficie rounded-xl border p-6">
          <p className="font-semibold">Questo link non vale più</p>
          <p className="text-testo-tenue mt-2 text-sm">
            I link di recupero scadono dopo un po’, e valgono una volta sola. Torna sull’app e
            chiedine un altro da “Password dimenticata?”.
          </p>
        </div>
      )}

      {stato.fase === 'fatto' && (
        <div className="border-bordo bg-superficie rounded-xl border p-6">
          <p className="font-semibold">Password cambiata</p>
          <p className="text-testo-tenue mt-2 text-sm">
            Torna sull’app e accedi con quella nuova.
          </p>
        </div>
      )}

      {stato.fase === 'pronto' && (
        <form onSubmit={salva} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Nuova password</Label>
            <Input
              id="password"
              type={mostra ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={`Almeno ${MINIMO} caratteri`}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ripeti">Scrivila di nuovo</Label>
            <Input
              id="ripeti"
              type={mostra ? 'text' : 'password'}
              value={ripeti}
              onChange={(e) => setRipeti(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <label className="text-testo-tenue flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mostra}
              onChange={(e) => setMostra(e.target.checked)}
              className="size-4"
            />
            Mostra quello che scrivo
          </label>

          {errore && (
            <p role="alert" className="text-azione text-sm">
              {errore}
            </p>
          )}

          <Button type="submit" size="lg" disabled={inCorso}>
            {inCorso ? 'Un momento…' : 'Salva la nuova password'}
          </Button>
        </form>
      )}
    </main>
  );
}
