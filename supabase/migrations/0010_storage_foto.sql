-- Fase 1.5: dove stanno le foto delle offerte.
--
-- Bucket in lettura libera: queste immagini finiscono su pagine pubbliche e
-- indicizzate, e devono essere servite dalla rete di distribuzione senza un
-- giro di firma a ogni caricamento.
--
-- Conseguenza da sapere: una foto caricata in un'offerta ancora in bozza e'
-- gia' raggiungibile da chi ne indovina l'indirizzo. Gli indirizzi contengono
-- identificativi casuali, quindi non e' un problema pratico, ma e' meglio
-- saperlo che scoprirlo.
--
-- I documenti dei clienti (carta d'identita', reddito) sono un'altra cosa e
-- andranno in un bucket privato con link firmati, in Fase 3.

insert into storage.buckets (id, name, public)
values ('offerte', 'offerte', true)
on conflict (id) do nothing;

-- Percorso dei file: {user_id}/{offerta_id}/{nomefile}
-- Il primo segmento e' l'identita' del venditore: e' cio' che impedisce a un
-- venditore di sovrascrivere o cancellare le foto di un altro.

create policy "offerte_lettura_libera"
  on storage.objects for select
  to anon, authenticated
  using ( bucket_id = 'offerte' );

create policy "offerte_caricamento_proprio"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'offerte'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "offerte_modifica_propria"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'offerte'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'offerte'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "offerte_cancellazione_propria"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'offerte'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
