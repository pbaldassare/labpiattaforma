-- Fase 3: il preventivo con la firma (§4.4).
--
-- Le regole stanno qui e non nell'app: l'app puo' essere aggirata chiamando
-- l'API a mano, il database no.

create table venditori.preventivo (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
                 references venditori.venditore (user_id) on delete cascade,
  pratica_id   uuid not null references venditori.pratica (id) on delete cascade,
  -- Numero progressivo per venditore: un preventivo senza numero non si
  -- richiama al telefono ne' si ritrova fra un mese.
  numero       integer not null,

  formula      venditori.formula_acquisto not null,
  tipo_cliente venditori.tipo_cliente not null,
  -- Congelato alla firma: se domani il venditore cambia il prezzo dell'offerta,
  -- un preventivo gia' firmato non deve cambiare sotto i piedi al cliente.
  prezzo_cent  bigint not null check (prezzo_cent > 0),

  -- La firma e' un tracciato vettoriale, non un'immagine: pesa pochi byte,
  -- resta nitida a qualsiasi dimensione e si puo' ricontare se serve.
  firma_tracciato text,
  firmato_il      timestamptz,

  doc_identita  boolean not null default false,
  doc_reddito   boolean not null default false,
  doc_passaggio boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, numero)
);

create index preventivo_pratica_idx on venditori.preventivo (pratica_id);

create trigger preventivo_updated_at
  before update on venditori.preventivo
  for each row execute function venditori.set_updated_at();

alter table venditori.preventivo enable row level security;

create policy preventivo_select on venditori.preventivo
  for select to authenticated using ( (select auth.uid()) = user_id );
create policy preventivo_update on venditori.preventivo
  for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy preventivo_delete on venditori.preventivo
  for delete to authenticated using ( (select auth.uid()) = user_id );

-- Nessuna policy di insert: i preventivi nascono solo da crea_preventivo().

create or replace function venditori.crea_preventivo(
  p_pratica_id uuid,
  p_formula    venditori.formula_acquisto,
  p_firma      text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_utente  uuid := (select auth.uid());
  v_cliente venditori.tipo_cliente;
  v_offerta uuid;
  v_prezzo  bigint;
  v_numero  integer;
  v_id      uuid;
begin
  if v_utente is null then raise exception 'non_autenticato'; end if;

  select c.tipo, p.offerta_id
    into v_cliente, v_offerta
    from venditori.pratica p
    join venditori.cliente c on c.id = p.cliente_id
   where p.id = p_pratica_id and p.user_id = v_utente;

  if v_cliente is null then raise exception 'pratica_non_tua'; end if;
  if v_offerta is null then raise exception 'pratica_senza_offerta'; end if;

  -- Non si puo' preventivare un finanziamento che il venditore non ha previsto.
  if not exists (
    select 1 from venditori.offerta_formula f
     where f.offerta_id = v_offerta and f.formula = p_formula
  ) then
    raise exception 'formula_non_prevista';
  end if;

  -- Il prezzo dipende da chi si ha davanti. Se il cliente e' un rivenditore ma
  -- il prezzo riservato manca, si blocca: mandargli il prezzo del cliente
  -- finale e' un errore che costa.
  select case when v_cliente = 'rivenditore'
              then ov.prezzo_rivenditore_cent
              else ov.prezzo_pubblico_cent end
    into v_prezzo
    from venditori.offerta_vendita ov
   where ov.offerta_id = v_offerta;

  if v_prezzo is null then
    raise exception 'prezzo_rivenditore_non_impostato';
  end if;

  -- Non basta che il riquadro sia stato toccato: servono tratti veri.
  if p_firma is null or length(btrim(p_firma)) < 40 then
    raise exception 'firma_mancante';
  end if;

  select coalesce(max(pv.numero), 0) + 1 into v_numero
    from venditori.preventivo pv where pv.user_id = v_utente;

  insert into venditori.preventivo (
    user_id, pratica_id, numero, formula, tipo_cliente, prezzo_cent,
    firma_tracciato, firmato_il
  )
  values (v_utente, p_pratica_id, v_numero, p_formula, v_cliente, v_prezzo,
          p_firma, now())
  returning id into v_id;

  update venditori.pratica
     set stato = 'preventivo_inviato'
   where id = p_pratica_id and stato <> 'venduto';

  return v_id;
end;
$fn$;

revoke execute on function venditori.crea_preventivo(uuid, venditori.formula_acquisto, text)
  from public, anon;
grant execute on function venditori.crea_preventivo(uuid, venditori.formula_acquisto, text)
  to authenticated;

create view public.venditori_preventivo with (security_invoker = on) as
  select * from venditori.preventivo;
grant select, update, delete on public.venditori_preventivo to authenticated;

create or replace function public.venditori_crea_preventivo(
  p_pratica_id uuid, p_formula text, p_firma text
)
returns uuid language sql volatile security definer set search_path = ''
as $fn$
  select venditori.crea_preventivo(
    p_pratica_id, p_formula::venditori.formula_acquisto, p_firma);
$fn$;

revoke execute on function public.venditori_crea_preventivo(uuid, text, text) from public, anon;
grant execute on function public.venditori_crea_preventivo(uuid, text, text) to authenticated;
