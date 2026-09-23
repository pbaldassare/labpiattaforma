-- Fase 1.2: le pagine pubbliche e il conteggio delle aperture.
--
-- Ogni offerta ha due pagine distinte, una per listino (documento §3.7):
-- la pubblica col prezzo al cliente finale, la riservata col prezzo
-- rivenditore. Sono due righe della stessa tabella: cosi' i due indirizzi,
-- i due contatori e le due regole di indicizzazione vengono da se'.

create type venditori.tipo_pagina as enum ('pubblica', 'riservata');

create table venditori.pagina (
  id         uuid primary key default gen_random_uuid(),
  offerta_id uuid not null references venditori.offerta (id) on delete cascade,
  tipo       venditori.tipo_pagina not null,
  codice     text not null unique,
  -- L'interruttore del documento §3.6: il link resta valido ma mostra
  -- "offerta non piu' disponibile".
  pubblicata boolean not null default true,
  created_at timestamptz not null default now(),

  unique (offerta_id, tipo)
);

create index pagina_offerta_idx on venditori.pagina (offerta_id);

-- ------------------------------------------------------------ gli indirizzi
-- gen_random_uuid() usa il generatore casuale forte del sistema: va bene
-- anche per il codice riservato, che non deve essere indovinabile.
-- Pubblico 10 caratteri (corto, si legge al telefono), riservato 24.
create or replace function venditori.nuovo_codice(p_caratteri integer)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  candidato text;
begin
  loop
    candidato := substr(replace(gen_random_uuid()::text, '-', ''), 1, p_caratteri);
    exit when not exists (
      select 1 from venditori.pagina p where p.codice = candidato
    );
  end loop;
  return candidato;
end;
$fn$;

revoke execute on function venditori.nuovo_codice(integer) from public, anon, authenticated;

-- Crea le pagine mancanti dell'offerta.
-- La riservata nasce solo se il prezzo rivenditore e' compilato: senza,
-- l'offerta ha la sola pagina pubblica (documento §3.7).
create or replace function venditori.genera_pagine(p_offerta_id uuid)
returns setof venditori.pagina
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  con_prezzo_rivenditore boolean;
begin
  if not venditori.offerta_mia(p_offerta_id) then
    raise exception 'offerta_non_tua';
  end if;

  insert into venditori.pagina (offerta_id, tipo, codice)
  values (p_offerta_id, 'pubblica', venditori.nuovo_codice(10))
  on conflict (offerta_id, tipo) do nothing;

  select ov.prezzo_rivenditore_cent is not null
    into con_prezzo_rivenditore
    from venditori.offerta_vendita ov
   where ov.offerta_id = p_offerta_id;

  if coalesce(con_prezzo_rivenditore, false) then
    insert into venditori.pagina (offerta_id, tipo, codice)
    values (p_offerta_id, 'riservata', venditori.nuovo_codice(24))
    on conflict (offerta_id, tipo) do nothing;
  end if;

  return query
    select p.* from venditori.pagina p where p.offerta_id = p_offerta_id order by p.tipo;
end;
$fn$;

revoke execute on function venditori.genera_pagine(uuid) from public, anon;
grant execute on function venditori.genera_pagine(uuid) to authenticated;

-- --------------------------------------------------------------- le aperture
-- Un evento per riga invece di due contatori: costa poco al volume di un
-- singolo venditore e permette poi di rispondere anche a "quante aperture
-- questa settimana", che con due soli numeri sarebbe impossibile.
create type venditori.evento_tipo as enum ('apertura', 'contatto');

create table venditori.evento_pagina (
  id        bigint generated always as identity primary key,
  pagina_id uuid not null references venditori.pagina (id) on delete cascade,
  tipo      venditori.evento_tipo not null,
  creato_il timestamptz not null default now()
);

create index evento_pagina_idx on venditori.evento_pagina (pagina_id, tipo);
create index evento_pagina_data_idx on venditori.evento_pagina (pagina_id, creato_il desc);

-- I due numeri che il venditore guarda per capire se l'annuncio funziona,
-- tenuti separati fra pagina pubblica e riservata (documento §3.6).
-- security_invoker: la vista deve rispettare le policy, non aggirarle.
create view venditori.pagina_contatori
with (security_invoker = on) as
  select
    p.id         as pagina_id,
    p.offerta_id,
    p.tipo,
    p.codice,
    p.pubblicata,
    count(e.id) filter (where e.tipo = 'apertura') as aperture,
    count(e.id) filter (where e.tipo = 'contatto') as contatti
  from venditori.pagina p
  left join venditori.evento_pagina e on e.pagina_id = p.id
  group by p.id;

grant select on venditori.pagina_contatori to authenticated;

-- Registra un'apertura. La chiama il server delle landing mentre compone la
-- pagina, quindi i visitatori anonimi continuano a non avere permessi diretti.
create or replace function venditori.registra_apertura(p_codice text)
returns void
language sql
volatile
security definer
set search_path = ''
as $fn$
  insert into venditori.evento_pagina (pagina_id, tipo)
  select p.id, 'apertura' from venditori.pagina p where p.codice = p_codice;
$fn$;

revoke execute on function venditori.registra_apertura(text) from public, anon, authenticated;
