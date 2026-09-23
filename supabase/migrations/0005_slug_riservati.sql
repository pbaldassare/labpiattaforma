-- Fase 0.5: gli slug che non possono essere assegnati.
--
-- I quattro piu' importanti sono v, b, l, a: sono i prefissi dei moduli
-- (nomeapp.it/v/{codice}). Un venditore con slug "v" renderebbe irraggiungibili
-- tutte le pagine di vendita.

insert into venditori.slug_riservato (slug, motivo) values
  ('v', 'prefisso modulo vendita'),
  ('b', 'prefisso modulo noleggio breve'),
  ('l', 'prefisso modulo noleggio lungo'),
  ('a', 'prefisso modulo assicurazioni'),
  ('api',          'infrastruttura'),
  ('app',          'infrastruttura'),
  ('www',          'infrastruttura'),
  ('admin',        'infrastruttura'),
  ('assets',       'infrastruttura'),
  ('static',       'infrastruttura'),
  ('public',       'infrastruttura'),
  ('cdn',          'infrastruttura'),
  ('auth',         'infrastruttura'),
  ('login',        'infrastruttura'),
  ('logout',       'infrastruttura'),
  ('account',      'infrastruttura'),
  ('dashboard',    'infrastruttura'),
  ('privacy',      'pagina legale'),
  ('cookie',       'pagina legale'),
  ('termini',      'pagina legale'),
  ('contatti',     'pagina di servizio'),
  ('supporto',     'pagina di servizio'),
  ('assistenza',   'pagina di servizio'),
  ('sitemap',      'file di servizio'),
  ('robots',       'file di servizio'),
  ('favicon',      'file di servizio'),
  ('labpiattaforma', 'nome del prodotto'),
  ('lab-piattaforma', 'nome del prodotto')
on conflict (slug) do nothing;
