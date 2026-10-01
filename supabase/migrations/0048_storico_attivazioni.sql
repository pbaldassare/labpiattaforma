/*
 * Lo storico delle attivazioni di un utente, per il back office.
 *
 * Senza, l'admin vede solo lo stato di adesso e non sa rispondere alla
 * domanda piu' frequente: "chi me l'ha attivato, e quando?". Le ultime 30
 * bastano: e' uno storico da consultare, non un registro contabile.
 */
create or replace function venditori.admin_storico(p_user uuid)
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
    select coalesce(json_agg(r order by r.creato_il desc), '[]'::json)
      from (
        select a.modulo,
               a.fino_a,
               a.fonte,
               a.created_at as creato_il,
               u.email      as creato_da
          from venditori.modulo_attivazione a
          left join auth.users u on u.id = a.creato_da
         where a.user_id = p_user
         order by a.created_at desc
         limit 30
      ) r
  );
end;
$fn$;

revoke execute on function venditori.admin_storico(uuid) from public, anon;
grant execute on function venditori.admin_storico(uuid) to authenticated;

create or replace function public.venditori_admin_storico(p_user uuid)
returns json language sql stable security definer set search_path = ''
as $fn$ select venditori.admin_storico(p_user); $fn$;

revoke execute on function public.venditori_admin_storico(uuid) from public, anon;
grant execute on function public.venditori_admin_storico(uuid) to authenticated;
