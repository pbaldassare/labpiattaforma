/*
 * Il secchio delle foto.
 *
 * Mancava: l'app caricava le immagini da mesi verso un secchio che non
 * esisteva, e ogni caricamento falliva. Provandolo dall'API si vede subito
 * ("Bucket not found"), dall'app no, perche' l'errore finiva in un messaggio
 * generico.
 *
 * Lettura libera perche' le pagine pubbliche puntano all'indirizzo diretto
 * dell'immagine: una foto di un'auto in vendita e' gia' pubblica per
 * definizione, e le URL firmate scadrebbero proprio mentre il cliente guarda
 * la pagina che gli e' arrivata su WhatsApp.
 *
 * Il limite di 5 MB e' oltre il doppio di quello che l'app manda davvero
 * (ridimensiona a 1600 px prima di caricare): serve contro il caricamento
 * sbagliato, non contro l'uso normale.
 *
 * Nota per chi mantiene il database: qui si tocca `storage`, che e' condiviso
 * con le altre applicazioni del progetto. Le regole sono tutte legate a
 * `bucket_id = 'offerte'` e hanno il prefisso `venditori_`, quindi non possono
 * cambiare il comportamento degli altri secchi. Si tolgono da sole.
 */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offerte', 'offerte', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- L'app salva in "<utente>/<offerta>/<nome>": la prima cartella e' il
-- proprietario, e questo rende la regola una riga sola invece di un giro sul
-- database per ogni file.
drop policy if exists venditori_foto_lettura on storage.objects;
create policy venditori_foto_lettura on storage.objects
  for select to anon, authenticated
  using ( bucket_id = 'offerte' );

drop policy if exists venditori_foto_inserimento on storage.objects;
create policy venditori_foto_inserimento on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'offerte'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists venditori_foto_modifica on storage.objects;
create policy venditori_foto_modifica on storage.objects
  for update to authenticated
  using (
    bucket_id = 'offerte'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'offerte'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists venditori_foto_cancellazione on storage.objects;
create policy venditori_foto_cancellazione on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'offerte'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
