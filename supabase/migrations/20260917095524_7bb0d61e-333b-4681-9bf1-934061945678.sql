-- Suppression des lignes de test internes en doublon (même email), on conserve la plus récente
delete from public.prospect_market_searches
where id in (
  '015bf6ce-d83d-4acf-97d4-f09dbf2e2299',
  '1b2287c6-54c1-47ed-94de-b3e608e44d4e',
  '4dce1885-6e52-46a4-9e1e-f23b9e51351d'
);

-- Une seule analyse gratuite par adresse email (insensible casse/espaces)
create unique index if not exists prospect_market_searches_email_unique
  on public.prospect_market_searches (lower(btrim(email)));