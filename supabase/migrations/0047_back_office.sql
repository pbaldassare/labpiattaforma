/*
 * Il back office: un livello admin che vede gli utenti, li crea e attiva i
 * moduli a pagamento.
 *
 * Chi e' admin sta in una tabella e non nei metadati del token: togliere un
 * admin deve valere subito, non al prossimo rinnovo della sessione. La tabella
 * non ha policy ne' permessi: dall'app non la legge e non la scrive nessuno,
 * ci passano solo le funzioni qui sotto.
 *
 * L'attivazione di un modulo passa da un'unica funzione, attiva_modulo, che
 * non chiede chi e' il chiamante: decide chi puo' chiamarla. Oggi la chiama
 * l'admin dal back office; quando arriveranno i pagamenti la chiamera' il
 * server che riceve la conferma del pagamento, con la chiave di servizio, e il
 * modulo si attivera' senza che l'admin debba approvare niente. Ogni
 * attivazione resta nello storico con la sua fonte.
 *
 * Gli utenti si creano da una Edge Function (admin-crea-utente), perche'
 * creare un account in auth richiede la chiave di servizio.
 */

create table venditori.admin (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table venditori.admin enable row level security;
revoke all on venditori.admin from public, anon, authenticated;

create table venditori.modulo_attivazione (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  modulo      venditori.modulo not null,
  -- null vuol dire disattivato: il modulo torna alle operazioni gratuite.
  fino_a      timestamptz,
  fonte       text not null check (fonte in ('admin', 'pagamento')),
  -- L'identificativo del pagamento, quando ci sara'.
  riferimento text,
  creato_da   uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index modulo_attivazione_user_idx on venditori.modulo_attivazione (user_id, modulo);

alter table venditori.modulo_attivazione enable row level security;
revoke all on venditori.modulo_attivazione from public, anon, authenticated;

-- ── Chi e' admin ────────────────────────────────────────────────────────────

create or replace function venditori.sono_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from venditori.admin a where a.user_id = (select auth.uid())
  );
$fn$;

revoke execute on function venditori.sono_admin() from public, anon;
grant execute on function venditori.sono_admin() to authenticated;

-- ── L'unica porta per attivare un modulo ────────────────────────────────────

create or replace function venditori.attiva_modulo(
  p_user        uuid,
  p_modulo      venditori.modulo,
  p_fino_a      timestamptz,
  p_fonte       text,
  p_riferimento text default null,
  p_creato_da   uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into venditori.modulo_stato (user_id, modulo, acquistato_fino_a, origine_acquisto)
  values (p_user, p_modulo, p_fino_a, p_fonte)
  on conflict (user_id, modulo) do update
     set acquistato_fino_a = excluded.acquistato_fino_a,
         origine_acquisto  = excluded.origine_acquisto;

  insert into venditori.modulo_attivazione
    (user_id, modulo, fino_a, fonte, riferimento, creato_da)
  values
    (p_user, p_modulo, p_fino_a, p_fonte, p_riferimento, p_creato_da);
end;
$fn$;

-- Nessun ruolo dell'app la chiama direttamente: solo le funzioni admin qui
-- sotto e, domani, il server dei pagamenti con la chiave di servizio.
revoke execute on function venditori.attiva_modulo(uuid, venditori.modulo, timestamptz, text, text, uuid)
  from public, anon, authenticated;
grant execute on function venditori.attiva_modulo(uuid, venditori.modulo, timestamptz, text, text, uuid)
  to service_role;

-- ── Le funzioni del back office ─────────────────────────────────────────────

create or replace function venditori.admin_utenti()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $fn$
begin
  if not venditori.sono_admin() then
    raise exception 'solo_admin' using errcode = '42501';
  end if;

  return (
    select coalesce(json_agg(json_build_object(
             'id', u.id,
             'email', u.email,
             'creato_il', u.created_at,
             'ultimo_accesso', u.last_sign_in_at,
             'nome', v.nome_visualizzato,
             'moduli', (
               select json_agg(json_build_object(
                        'modulo', m.modulo,
                        'utilizzi_consumati', coalesce(ms.utilizzi_consumati, 0),
                        'utilizzi_inclusi', coalesce(ms.utilizzi_inclusi, 5),
                        'acquistato_fino_a', ms.acquistato_fino_a,
                        'origine_acquisto', ms.origine_acquisto
                      ) order by m.ordine)
                 from (values
                   ('vendita'::venditori.modulo, 1),
                   ('noleggio_breve', 2),
                   ('noleggio_lungo', 3),
                   ('assicurazioni', 4)
                 ) as m(modulo, ordine)
                 left join venditori.modulo_stato ms
                        on ms.user_id = u.id and ms.modulo = m.modulo
             )
           ) order by u.created_at desc), '[]'::json)
      from auth.users u
      left join venditori.venditore v on v.user_id = u.id
     where not exists (select 1 from venditori.admin a where a.user_id = u.id)
  );
end;
$fn$;

revoke execute on function venditori.admin_utenti() from public, anon;
grant execute on function venditori.admin_utenti() to authenticated;

create or replace function venditori.admin_imposta_modulo(
  p_user   uuid,
  p_modulo text,
  p_fino_a timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if not venditori.sono_admin() then
    raise exception 'solo_admin' using errcode = '42501';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'utente_inesistente';
  end if;

  perform venditori.attiva_modulo(
    p_user, p_modulo::venditori.modulo, p_fino_a, 'admin', null, (select auth.uid())
  );
end;
$fn$;

revoke execute on function venditori.admin_imposta_modulo(uuid, text, timestamptz) from public, anon;
grant execute on function venditori.admin_imposta_modulo(uuid, text, timestamptz) to authenticated;

-- ── Il ponte su public (vedi PONTE_PUBLIC in packages/shared/src/db.ts) ─────

create or replace function public.venditori_sono_admin()
returns boolean language sql stable security definer set search_path = ''
as $fn$ select venditori.sono_admin(); $fn$;

create or replace function public.venditori_admin_utenti()
returns json language sql stable security definer set search_path = ''
as $fn$ select venditori.admin_utenti(); $fn$;

create or replace function public.venditori_admin_imposta_modulo(
  p_user uuid, p_modulo text, p_fino_a timestamptz
)
returns void language sql security definer set search_path = ''
as $fn$ select venditori.admin_imposta_modulo(p_user, p_modulo, p_fino_a); $fn$;

revoke execute on function public.venditori_sono_admin() from public, anon;
revoke execute on function public.venditori_admin_utenti() from public, anon;
revoke execute on function public.venditori_admin_imposta_modulo(uuid, text, timestamptz) from public, anon;
grant execute on function public.venditori_sono_admin() to authenticated;
grant execute on function public.venditori_admin_utenti() to authenticated;
grant execute on function public.venditori_admin_imposta_modulo(uuid, text, timestamptz) to authenticated;
