-- Fase 0.3: le regole dello slug, applicate dal database.
--
-- Lo slug finisce stampato su QR e biglietti da visita: le regole non possono
-- vivere solo nell'app, o una chiamata diretta all'API le aggirerebbe.

-- Normalizza, valida e gestisce il passaggio del vecchio slug nello storico.
-- security definer perche' scrive su slug_storico, che il client non tocca mai.
create or replace function venditori.gestisci_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  new.slug := lower(btrim(new.slug));

  if exists (
    select 1 from venditori.slug_riservato r where r.slug = new.slug
  ) then
    raise exception 'slug_riservato'
      using hint = 'Questo indirizzo e'' riservato al funzionamento del sito.';
  end if;

  -- Occupato da un altro venditore, ora o in passato.
  if exists (
    select 1 from venditori.venditore v
    where v.slug = new.slug and v.user_id <> new.user_id
  ) or exists (
    select 1 from venditori.slug_storico s
    where s.slug = new.slug and s.user_id <> new.user_id
  ) then
    raise exception 'slug_occupato'
      using hint = 'Questo indirizzo e'' gia'' di un altro venditore.';
  end if;

  -- Cambio di slug: il vecchio va in archivio e resta bloccato per gli altri.
  if tg_op = 'UPDATE' and old.slug is distinct from new.slug then
    insert into venditori.slug_storico (slug, user_id)
    values (old.slug, old.user_id)
    on conflict (slug) do update
      set user_id = excluded.user_id, dismesso_il = now();
  end if;

  -- Se sta riprendendo un proprio slug abbandonato, esce dall'archivio.
  delete from venditori.slug_storico
  where slug = new.slug and user_id = new.user_id;

  return new;
end;
$fn$;

create trigger venditore_gestisci_slug
  before insert or update of slug on venditori.venditore
  for each row execute function venditori.gestisci_slug();

-- Verifica di disponibilita' per l'app, mentre il venditore digita.
-- Serve una funzione: le policy impediscono (giustamente) di leggere le righe
-- degli altri venditori, quindi il client da solo non puo' sapere se e' libero.
create or replace function venditori.slug_disponibile(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  with s as (select lower(btrim(p_slug)) as slug),
       io as (select coalesce(
         (select auth.uid()),
         '00000000-0000-0000-0000-000000000000'::uuid
       ) as user_id)
  select
    (select slug from s) ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
    and (select slug from s) !~ '--'
    and not exists (
      select 1 from venditori.slug_riservato r where r.slug = (select slug from s)
    )
    and not exists (
      select 1 from venditori.venditore v
      where v.slug = (select slug from s)
        and v.user_id <> (select user_id from io)
    )
    and not exists (
      select 1 from venditori.slug_storico h
      where h.slug = (select slug from s)
        and h.user_id <> (select user_id from io)
    );
$fn$;

revoke execute on function venditori.slug_disponibile(text) from public, anon;
grant execute on function venditori.slug_disponibile(text) to authenticated;
