/*
 * La vetrina mostra il numero giusto per ogni modulo (§3.5).
 *
 * Portava solo il prezzo di vendita: un noleggio o una polizza comparivano
 * senza cifra, cioe' proprio senza la cosa per cui il cliente apre la pagina.
 *
 * Insieme al numero viaggia l'unita' ("al giorno", "al mese", "all'anno") e se
 * e' un minimo: 269 senza "da ... al mese" accanto si legge come il prezzo di
 * un'auto, e sarebbe una bugia involontaria.
 *
 * Il modulo era gia' nei dati, ma senza il numero i filtri in pagina non
 * avevano molto da filtrare.
 */
create or replace function venditori.dati_vetrina(p_slug text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_slug     text := lower(btrim(p_slug));
  v_user     uuid;
  v_corrente text;
begin
  select v.user_id into v_user
    from venditori.venditore v
   where v.slug = v_slug and v.stato = 'attivo';

  -- Slug abbandonato: si risponde con l'indirizzo nuovo, cosi' la pagina puo'
  -- reindirizzare invece di dare errore. E' il motivo per cui i vecchi slug
  -- non si cancellano: un QR su un biglietto da visita non si richiama indietro.
  if v_user is null then
    select v.slug into v_corrente
      from venditori.slug_storico s
      join venditori.venditore v on v.user_id = s.user_id
     where s.slug = v_slug and v.stato = 'attivo';

    if v_corrente is not null then
      return json_build_object('redirect_a', v_corrente);
    end if;
    return null;
  end if;

  return (
    select json_build_object(
      'venditore', json_build_object(
        'slug',          v.slug,
        'nome',          v.nome_visualizzato,
        'presentazione', v.presentazione,
        'telefono',      v.telefono,
        'whatsapp',      v.whatsapp,
        'email',         v.email_pubblica,
        'logo_path',     v.logo_path
      ),
      'offerte', coalesce((
        select json_agg(o ORDER BY o->>'aggiornata' DESC)
        from (
          select json_build_object(
            'titolo',      off.titolo,
            'modulo',      off.modulo,
            'codice',      pg.codice,
            'prezzo_cent', coalesce(
                             ov.prezzo_pubblico_cent,
                             ob.tariffa_giorno_cent,
                             (select min(c.canone_pubblico_cent)
                                from venditori.canone_lungo c where c.offerta_id = off.id),
                             oa.premio_partenza_cent
                           ),
            'unita',       case off.modulo
                             when 'noleggio_breve' then 'al giorno'
                             when 'noleggio_lungo' then 'al mese'
                             when 'assicurazioni'  then 'all''anno'
                             else null
                           end,
            -- Per i noleggi lunghi e le polizze il numero e' un punto di
            -- partenza, non il prezzo finale.
            'da_partire',  off.modulo in ('noleggio_lungo', 'assicurazioni'),
            'copertina',   coalesce(
                             off.copertina_path,
                             (select f.path from venditori.offerta_foto f
                               where f.offerta_id = off.id order by f.ordine limit 1)
                           ),
            'aggiornata',  off.updated_at
          ) as o
          from venditori.offerta off
          join venditori.pagina pg on pg.offerta_id = off.id
                                  and pg.tipo = 'pubblica'
                                  and pg.pubblicata
          left join venditori.offerta_vendita ov        on ov.offerta_id = off.id
          left join venditori.offerta_noleggio_breve ob on ob.offerta_id = off.id
          left join venditori.offerta_assicurazione oa  on oa.offerta_id = off.id
          where off.user_id = v_user and off.stato = 'attiva'
        ) as elenco
      ), '[]'::json)
    )
    from venditori.venditore v where v.user_id = v_user
  );
end;
$fn$;

revoke execute on function venditori.dati_vetrina(text) from public;
grant execute on function venditori.dati_vetrina(text) to anon, authenticated;
