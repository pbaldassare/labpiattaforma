/*
 * Crea un utente venditore dal back office.
 *
 * Creare un account in auth richiede la chiave di servizio, che non puo' stare
 * nell'app: per questo passa da qui. La funzione controlla prima che chi la
 * chiama sia admin, con il suo stesso token e la stessa sono_admin() che usa
 * il database, e solo dopo usa la chiave di servizio.
 *
 * L'account nasce gia' confermato: l'admin consegna email e password a mano,
 * non c'e' una mail di conferma da aspettare.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function risposta(corpo: unknown, stato = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status: stato,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return risposta({ errore: 'metodo_non_ammesso' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const chiavePubblica = Deno.env.get('SUPABASE_ANON_KEY')!;
  const chiaveServizio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const token = req.headers.get('Authorization') ?? '';
  const chiamante = createClient(url, chiavePubblica, {
    global: { headers: { Authorization: token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: admin, error: erroreAdmin } = await chiamante.rpc('venditori_sono_admin');
  if (erroreAdmin || admin !== true) return risposta({ errore: 'solo_admin' }, 403);

  let email = '';
  let password = '';
  try {
    const corpo = await req.json();
    email = String(corpo.email ?? '').trim().toLowerCase();
    password = String(corpo.password ?? '');
  } catch {
    return risposta({ errore: 'richiesta_non_valida' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return risposta({ errore: 'email_non_valida' }, 400);
  if (password.length < 8) return risposta({ errore: 'password_corta' }, 400);

  const servizio = createClient(url, chiaveServizio, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await servizio.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const giaPresente = /already|registered|exists/i.test(error.message);
    return risposta({ errore: giaPresente ? 'email_gia_usata' : error.message }, giaPresente ? 409 : 400);
  }

  return risposta({ id: data.user.id, email: data.user.email });
});
