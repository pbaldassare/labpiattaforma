-- Fase 1.4b: l'offerta appartiene a un profilo venditore, non a un utente.
--
-- Prima puntava direttamente a auth.users. Un'offerta senza profilo pero' non
-- ha senso: non avrebbe un nome da mostrare ne' una vetrina dove comparire.
-- Con questo vincolo diventa anche possibile risalire dal profilo alle offerte
-- in una query sola.

alter table venditori.offerta
  drop constraint offerta_user_id_fkey;

alter table venditori.offerta
  add constraint offerta_user_id_fkey
  foreign key (user_id) references venditori.venditore (user_id) on delete cascade;
