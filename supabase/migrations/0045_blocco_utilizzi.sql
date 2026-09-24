/*
 * Il blocco quando finiscono le operazioni gratuite (§8.5).
 *
 * Il contatore c'era gia' e si vedeva in app, ma non fermava niente: finite le
 * cinque operazioni comprese si poteva continuare a caricare offerte. Un
 * contatore che non conta per qualcosa e' solo decorazione.
 *
 * E' un trigger e non un controllo dentro le quattro funzioni di salvataggio
 * per due motivi: vale per tutti e quattro i moduli senza doverle riscrivere
 * una per una, e sta sotto di loro, quindi non lo si aggira scrivendo
 * direttamente sulla tabella.
 *
 * "Il blocco riguarda solo il modulo esaurito; gli altri continuano a
 * funzionare": infatti si guarda la riga del solo modulo dell'offerta.
 */
create or replace function venditori.controlla_utilizzi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_consumati  integer;
  v_inclusi    integer;
  v_acquistato timestamptz;
begin
  select ms.utilizzi_consumati, ms.utilizzi_inclusi, ms.acquistato_fino_a
    into v_consumati, v_inclusi, v_acquistato
    from venditori.modulo_stato ms
   where ms.user_id = new.user_id and ms.modulo = new.modulo;

  -- Modulo comprato e ancora valido: nessun limite.
  if v_acquistato is not null and v_acquistato > now() then
    return new;
  end if;

  -- Nessuna riga vuol dire che il modulo non e' mai stato usato.
  if coalesce(v_consumati, 0) >= coalesce(v_inclusi, 5) then
    raise exception 'modulo_esaurito'
      using detail = new.modulo::text,
            hint = 'Le operazioni comprese in questo modulo sono finite.';
  end if;

  return new;
end;
$fn$;

drop trigger if exists offerta_controlla_utilizzi on venditori.offerta;
create trigger offerta_controlla_utilizzi
  before insert on venditori.offerta
  for each row execute function venditori.controlla_utilizzi();
