/*
 * Chi ha pagato cosa: tutte le attivazioni di tutti gli utenti, per il back
 * office. p_fonte filtra fra 'pagamento' e 'admin'; null le da' tutte.
 *
 * Le ultime 300 bastano a scorrere a occhio. Quando i pagamenti saranno
 * tanti servira' una paginazione, non un limite piu' alto.
 */
create or replace function venditori.admin_attivazioni(p_fonte text default null)
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
        select a.user_id           as id_utente,
               u.email             as email,
               v.nome_visualizzato as nome,
               a.modulo,
               a.fino_a,
               a.fonte,
               a.riferimento,
               a.created_at        as creato_il,
               c.email             as creato_da
          from venditori.modulo_attivazione a
          join auth.users u on u.id = a.user_id
          left join venditori.venditore v on v.user_id = a.user_id
          left join auth.users c on c.id = a.creato_da
         where p_fonte is null or a.fonte = p_fonte
         order by a.created_at desc
         limit 300
      ) r
  );
end;
$fn$;

revoke execute on function venditori.admin_attivazioni(text) from public, anon;
grant execute on function venditori.admin_attivazioni(text) to authenticated;

create or replace function public.venditori_admin_attivazioni(p_fonte text default null)
returns json language sql stable security definer set search_path = ''
as $fn$ select venditori.admin_attivazioni(p_fonte); $fn$;

revoke execute on function public.venditori_admin_attivazioni(text) from public, anon;
grant execute on function public.venditori_admin_attivazioni(text) to authenticated;
