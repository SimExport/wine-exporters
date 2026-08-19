# Matching `buyer_contacts` dans `sync-brevo-campaign`

Objectif : les cliqueurs importés depuis Brevo sont d'abord cherchés dans la base d'importateurs (`buyer_contacts`) avant l'appel à Claude, exactement comme dans `enrich-campaign-prospects`. Si la société est trouvée, la description est rédigée à partir des données réelles ; sinon Claude effectue une recherche web.

## Factorisation du code de matching

La logique livrée dans `enrich-campaign-prospects` est déplacée telle quelle dans un module partagé, importé par les deux fonctions. Aucun changement de comportement pour `enrich-campaign-prospects`.

Nouveau fichier `supabase/functions/_shared/buyer-match.ts` contenant, à l'identique :
- `GENERIC_DOMAINS`, `COMPANY_STOPWORDS`
- `stripAccents`, `companyWords`, `normalizeCompany`, `likeFragment`
- `BUYER_FIELDS`, type `BuyerContact`, `completeness`, `mostComplete`
- `findBuyerContact` (3 étapes : email exact → domaine non générique → nom de société, seuil 5 caractères sur le nom normalisé et sur le mot le plus long, fragment sans accents ≥ 4 caractères, règle « un seul nom distinct après dédoublonnage »)

`enrich-campaign-prospects/index.ts` supprime ces définitions locales et les importe depuis `../_shared/buyer-match.ts`.

## Modifications dans `sync-brevo-campaign`

1. `enrichClickerWithAI` reçoit en plus le client admin Supabase et le nom de société éventuellement connu côté Brevo, et appelle `findBuyerContact` avant l'appel Anthropic.
2. Deux prompts :
   - **Société trouvée** : les données vérifiées (email, company_name, phone, website_url, country, state, city, full_address, Facebook, Instagram, LinkedIn) sont injectées dans le prompt, sans `web_search`. Score demandé sur 5-7 (base 5 pour contact vérifié en base, +1 ou +2 selon l'adéquation avec le profil producteur).
   - **Aucune société** : appel avec l'outil `web_search_20250305` (`max_uses: 3`) sur le domaine de l'email. Score demandé sur 4-7, comme aujourd'hui.
3. Sortie JSON inchangée : 2 clés `description` et `score`. Le ton reste neutre et professionnel (pas le ton directif strict de `enrich-campaign-prospects`), description obligatoirement en français dans les deux cas.
4. Parsing adapté : `data.content` filtré sur `type === "text"`, dernier bloc texte retenu, puis nettoyage des fences et `JSON.parse` comme avant. Fonctionne avec et sans `web_search`.
5. Bornage du score : 5-7 quand une société est trouvée, 4-7 sinon.
6. `max_tokens` relevé (600 → 2000) pour absorber les blocs de recherche web.
7. Quand le matching trouve une société, son `company_name` est utilisé en priorité pour le champ `company_name` inséré (au lieu du domaine brut), et son `country` sert de repli si le TLD ne donne rien. Le reste de l'insertion dans `campaign_interested_contacts` est inchangé.

## Points à noter

- L'export Brevo utilisé ici ne fournit que des adresses email (CSV parsé par regex), aucun nom de société. L'étape 3 du matching (nom de société) est donc appelée avec `null` et sort immédiatement : en pratique, les étapes 1 et 2 s'appliquent. Le code de l'étape 3 reste identique et présent, prêt à servir si un nom devient disponible.
- Aucun changement de schéma, d'UI, ni de la branche répondants au formulaire (`submit-campaign-interest` non touchée).
- Les deux Edge Functions sont redéployées après modification.
