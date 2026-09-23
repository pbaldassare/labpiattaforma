-- Fase 1.4: togliere il permesso di esecuzione alle funzioni di trigger.
--
-- Postgres concede EXECUTE a "public" su ogni funzione appena creata, quindi
-- anche i ruoli anon e authenticated se lo ritrovano. Per le funzioni di
-- trigger e' un permesso che non serve a nessuno: vengono eseguite dal motore
-- con i privilegi del proprietario della tabella, non di chi fa la query.
--
-- Non e' sfruttabile (PostgREST non espone come RPC le funzioni che ritornano
-- trigger), ma lasciarlo aperto e' rumore che il controllo di sicurezza
-- segnala e che nasconderebbe un problema vero il giorno che ce ne fosse uno.

revoke execute on function venditori.set_updated_at()   from public, anon, authenticated;
revoke execute on function venditori.normalizza_targa() from public, anon, authenticated;
revoke execute on function venditori.gestisci_slug()    from public, anon, authenticated;
