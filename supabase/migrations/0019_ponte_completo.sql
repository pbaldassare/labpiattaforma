-- Fase 2.4: tutto passa da viste in "public".
--
-- Lo schema "venditori" risulta non esposto dalle API del progetto: il pannello
-- lo registra, l'API di gestione lo conferma, PostgREST continua a servirne
-- quattro anche dopo un riavvio completo. E' un difetto della piattaforma.
--
-- Queste viste sono security_invoker, quindi le policy applicate restano quelle
-- delle tabelle vere: cambia l'indirizzo, non la sicurezza. Le viste su una
-- sola tabella sono aggiornabili, quindi l'app puo' scriverci come se fossero
-- le tabelle. Si tolgono con un drop quando l'esposizione funzionera'.

create view public.venditori_venditore        with (security_invoker = on) as select * from venditori.venditore;
create view public.venditori_offerta          with (security_invoker = on) as select * from venditori.offerta;
create view public.venditori_offerta_vendita  with (security_invoker = on) as select * from venditori.offerta_vendita;
create view public.venditori_offerta_foto     with (security_invoker = on) as select * from venditori.offerta_foto;
create view public.venditori_offerta_formula  with (security_invoker = on) as select * from venditori.offerta_formula;
create view public.venditori_pagina           with (security_invoker = on) as select * from venditori.pagina;
create view public.venditori_pagina_contatori with (security_invoker = on) as select * from venditori.pagina_contatori;
create view public.venditori_cliente          with (security_invoker = on) as select * from venditori.cliente;
create view public.venditori_pratica          with (security_invoker = on) as select * from venditori.pratica;
create view public.venditori_contatto_storico with (security_invoker = on) as select * from venditori.contatto_storico;
create view public.venditori_promemoria       with (security_invoker = on) as select * from venditori.promemoria;
create view public.venditori_modulo_stato     with (security_invoker = on) as select * from venditori.modulo_stato;

-- I default non attraversano le viste: vanno rimessi qui, o il client sarebbe
-- costretto a mandare la propria identita' (e potrebbe sbagliarla).
alter view public.venditori_venditore    alter column user_id set default auth.uid();
alter view public.venditori_offerta      alter column user_id set default auth.uid();
alter view public.venditori_cliente      alter column user_id set default auth.uid();
alter view public.venditori_pratica      alter column user_id set default auth.uid();
alter view public.venditori_promemoria   alter column user_id set default auth.uid();
alter view public.venditori_modulo_stato alter column user_id set default auth.uid();

grant select, insert, update, delete on
  public.venditori_venditore,
  public.venditori_offerta,
  public.venditori_offerta_vendita,
  public.venditori_offerta_foto,
  public.venditori_offerta_formula,
  public.venditori_pagina,
  public.venditori_cliente,
  public.venditori_pratica,
  public.venditori_contatto_storico,
  public.venditori_promemoria,
  public.venditori_modulo_stato
to authenticated;

grant select on public.venditori_pagina_contatori to authenticated;

create or replace function public.venditori_slug_disponibile(p_slug text)
returns boolean language sql stable security definer set search_path = ''
as $fn$ select venditori.slug_disponibile(p_slug); $fn$;

create or replace function public.venditori_salva_offerta_vendita(p_dati json, p_offerta_id uuid default null)
returns uuid language sql volatile security definer set search_path = ''
as $fn$ select venditori.salva_offerta_vendita(p_dati, p_offerta_id); $fn$;

create or replace function public.venditori_genera_pagine(p_offerta_id uuid)
returns setof venditori.pagina language sql volatile security definer set search_path = ''
as $fn$ select * from venditori.genera_pagine(p_offerta_id); $fn$;

revoke execute on function public.venditori_slug_disponibile(text) from public, anon;
revoke execute on function public.venditori_salva_offerta_vendita(json, uuid) from public, anon;
revoke execute on function public.venditori_genera_pagine(uuid) from public, anon;

grant execute on function public.venditori_slug_disponibile(text) to authenticated;
grant execute on function public.venditori_salva_offerta_vendita(json, uuid) to authenticated;
grant execute on function public.venditori_genera_pagine(uuid) to authenticated;
