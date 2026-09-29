/*
 * Dati dimostrativi.
 *
 * Servono a far vedere l'app con dentro qualcosa invece che tutta vuota: un
 * venditore con quattro moduli usati, cinque offerte, sei clienti e le loro
 * pratiche. Non e' un collaudo, e' una vetrina.
 *
 * Girano solo se il venditore demo non c'e' gia', quindi si possono ripetere
 * senza duplicare niente.
 *
 * Si applica con:
 *   npx supabase db push --db-url "<url>" --include-seed
 *
 * L'utente demo@example.com dev'essere gia' in auth.users: lo crea il pannello
 * di Supabase, oppure la registrazione dall'app. Il dominio example.com e'
 * riservato dallo standard e non consegna a nessuno, quindi non si rischia di
 * mandare mail a un estraneo.
 */
do $$
declare
  v_utente uuid;
  v_panda uuid;
  v_troc uuid;
  v_polizza uuid;
  v_cinquecento uuid;
  v_jeep uuid;
  v_cliente uuid;
begin
  select id into v_utente from auth.users where email = 'demo@example.com';
  if v_utente is null then
    raise notice 'Utente demo@example.com assente: semina saltata.';
    return;
  end if;
  if exists (select 1 from venditori.venditore where user_id = v_utente) then
    raise notice 'Dati dimostrativi gia presenti: semina saltata.';
    return;
  end if;

  -- ── Il venditore ────────────────────────────────────────────────────────
  insert into venditori.venditore (
    user_id, nome_visualizzato, slug, telefono, whatsapp, presentazione,
    email_pubblica, rui_numero, stato
  ) values (
    v_utente, 'Autosalone Demo', 'demo-verona', '+39 045 1234567', '+39 333 1234567',
    'Auto usate garantite, dal 1998 a Verona.', null, 'B000512847', 'attivo'
  );

  -- ── Vendita ─────────────────────────────────────────────────────────────
  insert into venditori.offerta (user_id, modulo, titolo, stato)
  values (v_utente, 'vendita', 'Fiat Panda 1.2 Easy', 'attiva') returning id into v_panda;

  insert into venditori.offerta_vendita (
    offerta_id, marca, modello, targa, chilometri, anno, alimentazione, cambio,
    prezzo_acquisto_cent, prezzo_pubblico_cent, prezzo_rivenditore_cent, provenienza
  ) values (
    v_panda, 'Fiat', 'Panda 1.2 Easy', 'AB123CD', 84000, 2019, 'benzina', 'manuale',
    650000, 890000, 780000, 'proprio'
  );
  insert into venditori.offerta_formula (offerta_id, formula, provvigione_cent)
  values (v_panda, 'contanti', 0), (v_panda, 'finanziamento', 25000);

  -- ── Noleggio lungo ──────────────────────────────────────────────────────
  insert into venditori.offerta (user_id, modulo, titolo, stato)
  values (v_utente, 'noleggio_lungo', 'Volkswagen T-Roc 1.0 TSI Life', 'attiva')
  returning id into v_troc;

  insert into venditori.offerta_noleggio_lungo (
    offerta_id, marca, modello, allestimento, anticipo_cent, servizi,
    tempi_consegna, riscatto_previsto
  ) values (
    v_troc, 'Volkswagen', 'T-Roc', '1.0 TSI Life', 300000,
    array['assicurazione','manutenzione','bollo']::venditori.servizio_incluso[],
    '45 giorni', false
  );

  -- Tre durate per tre chilometraggi: la griglia dell'esempio del documento.
  insert into venditori.canone_lungo (offerta_id, durata_mesi, km_annui, canone_pubblico_cent, canone_rivenditore_cent)
  select v_troc, d.mesi, k.km,
         d.base + k.aggiunta,
         d.base + k.aggiunta - 3000
    from (values (24, 32900), (36, 28900), (48, 26900)) as d(mesi, base),
         (values (10000, 0), (15000, 3000), (20000, 6000)) as k(km, aggiunta);

  -- ── Assicurazioni ───────────────────────────────────────────────────────
  insert into venditori.offerta (user_id, modulo, titolo, stato)
  values (v_utente, 'assicurazioni', 'Allianz Auto Sicura Plus', 'attiva')
  returning id into v_polizza;

  insert into venditori.offerta_assicurazione (
    offerta_id, compagnia, nome_prodotto, tipo_rischio, premio_partenza_cent,
    provvigione_cent, massimale_cent, franchigia_cent, durata_mesi
  ) values (
    v_polizza, 'Allianz', 'Auto Sicura Plus', 'auto', 45000, 9000, 600000000, 30000, 12
  );

  insert into venditori.garanzia (offerta_id, nome, inclusa, ordine)
  values (v_polizza, 'Responsabilità civile', true, 0),
         (v_polizza, 'Assistenza stradale', true, 1),
         (v_polizza, 'Tutela legale', true, 2),
         (v_polizza, 'Furto e incendio', false, 3),
         (v_polizza, 'Kasko', false, 4),
         (v_polizza, 'Atti vandalici', false, 5);

  -- ── Noleggio breve ──────────────────────────────────────────────────────
  insert into venditori.offerta (user_id, modulo, titolo, stato)
  values (v_utente, 'noleggio_breve', 'Fiat 500 Hybrid', 'attiva')
  returning id into v_cinquecento;

  insert into venditori.offerta_noleggio_breve (
    offerta_id, modello, targa, disponibile_dal, disponibile_al,
    tariffa_giorno_cent, tariffa_oltre_3_cent, tariffa_oltre_7_cent,
    km_inclusi_giorno, costo_km_extra_cent, deposito_cent, eta_minima, patente_anni
  ) values (
    v_cinquecento, 'Fiat 500 Hybrid', 'GE456FH', current_date, current_date + 180,
    4900, 4400, 3900, 150, 30, 25000, 21, 2
  );

  insert into venditori.offerta (user_id, modulo, titolo, stato)
  values (v_utente, 'noleggio_breve', 'Jeep Renegade 4xe', 'attiva')
  returning id into v_jeep;

  insert into venditori.offerta_noleggio_breve (
    offerta_id, modello, targa, disponibile_dal, disponibile_al,
    tariffa_giorno_cent, tariffa_giorno_rivenditore_cent,
    tariffa_oltre_3_cent, tariffa_oltre_7_cent, tariffa_oltre_15_cent,
    km_inclusi_giorno, costo_km_extra_cent, deposito_cent, eta_minima, patente_anni
  ) values (
    v_jeep, 'Jeep Renegade 4xe', 'GP772XK', current_date, current_date + 180,
    7900, 6900, 6900, 5900, 4900, 150, 30, 40000, 21, 2
  );

  /*
   * Le pagine pubbliche e riservate.
   *
   * Scritte a mano invece di chiamare `genera_pagine`, che controlla che
   * l'offerta sia di chi la chiede: da una sessione SQL diretta non c'e'
   * nessun utente collegato e quella verifica fallisce. La regola replicata
   * qui e' la stessa — pagina riservata solo dove esiste un prezzo per i
   * rivenditori.
   */
  insert into venditori.pagina (offerta_id, tipo, codice)
  select o.id, 'pubblica', venditori.nuovo_codice(10)
    from venditori.offerta o where o.user_id = v_utente;

  insert into venditori.pagina (offerta_id, tipo, codice)
  select o.id, 'riservata', venditori.nuovo_codice(24)
    from venditori.offerta o
   where o.user_id = v_utente
     and (
       exists (select 1 from venditori.offerta_vendita v
                where v.offerta_id = o.id and v.prezzo_rivenditore_cent is not null)
       or exists (select 1 from venditori.canone_lungo c
                   where c.offerta_id = o.id and c.canone_rivenditore_cent is not null)
       or exists (select 1 from venditori.offerta_noleggio_breve b
                   where b.offerta_id = o.id and b.tariffa_giorno_rivenditore_cent is not null)
     );

  -- ── I clienti, con le loro pratiche ─────────────────────────────────────
  -- Giulia Ferraro ha due pratiche in due moduli diversi: e' il caso che il
  -- documento porta come esempio, "chi ha noleggiato a giugno e' lo stesso a
  -- cui a ottobre si propone l'acquisto".
  insert into venditori.cliente (user_id, nome, tipo, telefono, email, note) values
    (v_utente, 'Giulia Bianchi',    'privato',     '+39 347 1122334', 'giulia.bianchi@example.com', null),
    (v_utente, 'Giulia Ferraro',    'privato',     '+39 347 8812340', 'giulia.ferraro@example.com',
     'Cerca un usato sotto i 10.000. Ha già noleggiato la 500 a giugno.'),
    (v_utente, 'Autosalone Brenta', 'rivenditore', '+39 049 7712233', 'acquisti@example.com',
     'Compra in blocco, chiede sempre il listino riservato.'),
    (v_utente, 'Marco Testa',       'privato',     '+39 333 4455661', null, null),
    (v_utente, 'Elena Vitali',      'privato',     '+39 328 9900112', 'elena.vitali@example.com',
     'Polizza in scadenza a marzo.');

  insert into venditori.pratica (user_id, cliente_id, offerta_id, modulo, stato, created_at, updated_at)
  select v_utente, c.id, o.id, o.modulo, y.stato::venditori.stato_pratica,
         now() - y.giorni * interval '1 day', now() - y.giorni * interval '1 day'
    from (values
      ('Giulia Bianchi',    'Fiat Panda 1.2 Easy',           'da_richiamare',       0),
      ('Giulia Ferraro',    'Fiat 500 Hybrid',               'chiuso',             96),
      ('Giulia Ferraro',    'Fiat Panda 1.2 Easy',           'in_trattativa',       2),
      ('Autosalone Brenta', 'Volkswagen T-Roc 1.0 TSI Life', 'preventivo_inviato',  5),
      ('Marco Testa',       'Jeep Renegade 4xe',             'da_richiamare',       1),
      ('Elena Vitali',      'Allianz Auto Sicura Plus',      'venduto',            21)
    ) as y(cliente, offerta, stato, giorni)
    join venditori.cliente c on c.nome = y.cliente and c.user_id = v_utente
    join venditori.offerta o on o.titolo = y.offerta and o.user_id = v_utente;

  -- Un messaggio arrivato dal form, cosi' la pratica ha qualcosa da leggere.
  select c.id into v_cliente from venditori.cliente c
   where c.user_id = v_utente and c.nome = 'Giulia Bianchi';

  insert into venditori.contatto_storico (pratica_id, origine, testo)
  select p.id, 'form',
         'Buongiorno, la Panda è ancora disponibile? Posso passare sabato mattina.'
    from venditori.pratica p where p.cliente_id = v_cliente;

  -- ── I contatori dei moduli ──────────────────────────────────────────────
  -- Le assicurazioni a una sola operazione dalla fine: cosi' si vede l'avviso
  -- che chiede il paragrafo 8.5 senza dover consumare niente.
  insert into venditori.modulo_stato (user_id, modulo, utilizzi_consumati)
  values (v_utente, 'vendita', 1),
         (v_utente, 'noleggio_breve', 2),
         (v_utente, 'noleggio_lungo', 1),
         (v_utente, 'assicurazioni', 4)
  on conflict (user_id, modulo) do update set utilizzi_consumati = excluded.utilizzi_consumati;

  raise notice 'Dati dimostrativi creati.';
end $$;
