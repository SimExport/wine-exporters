## Corriger le formulaire d'intérêt + brancher sur "Prospects qualifiés"

### Réponses aux questions
- **La page est-elle publique ?** Oui, la route `/interest/:campaignId` n'a aucun guard d'auth. Elle est accessible à quiconque a le lien.
- **Cause de l'erreur "Une erreur est survenue"** : la migration créée n'a jamais ajouté la table `campaign_interest_responses` — elle ne contient que le RPC `get_campaign_public_info`. L'insert échoue donc côté Supabase (table inexistante / pas de policy anon). Nouvelle approche : on insère directement dans **`campaign_interested_contacts`** (la table déjà affichée dans "Prospects qualifiés").

### 1. Migration DB
- Ajouter `phone text` à `public.campaign_interested_contacts` (nullable).
- Aucune ouverture de RLS pour `anon` sur cette table : l'insert passera par une Edge Function `service_role`.

### 2. Nouvelle Edge Function publique `submit-campaign-interest` (no-JWT)
- `supabase/functions/submit-campaign-interest/index.ts`, déclarée `verify_jwt = false` dans `supabase/config.toml`.
- Reçoit `{ campaign_id, full_name, email, company, country, phone, interests[] }`.
- Validation zod-style : longueurs max (name 120, email 255, company 200, country 100, phone 40), email regex, `interests` restreint aux 6 slugs autorisés.
- Vérifie que la campagne existe (`SELECT id, user_id FROM campaigns WHERE id = ?`).
- Appelle Lovable AI Gateway (`google/gemini-2.5-flash`, `LOVABLE_API_KEY` déjà présent) pour générer en anglais :
  - `description` : 1–2 phrases résumant le prospect (société, pays, contexte).
  - `recommended_actions` : puces courtes basées sur les cases cochées (samples → "Send samples", price_list → "Send price list", visio_call → "Schedule video call", etc.) + éventuelles suggestions.
  - Fallback silencieux si l'IA échoue : `description` = "Submitted the public interest form.", `recommended_actions` = liste textuelle des intérêts.
- INSERT dans `campaign_interested_contacts` :
  - `campaign_id`, `company_name` = `company || full_name`, `contact_name` = `full_name`, `email`, `country`, `phone`, `description`, `recommended_actions`, `score = 5` (opt-in explicite volontaire).
- Retour : `{ ok: true }` ou `{ ok: false, error }` (message générique en anglais côté client).

### 3. Frontend `src/pages/CampaignInterestForm.tsx`
- **Forcer l'anglais** sur cette page uniquement : chaîne codées en dur en anglais (pas d'i18n), et pas de LanguageSwitcher. Le reste de l'app reste bilingue.
- Ajouter champ **Phone** (optionnel, `type="tel"`, maxLength 40).
- Ordre des champs : Full name*, Email*, Company, Phone, Country, "What are you interested in?" (6 checkboxes inchangées), Submit.
- Textes en anglais : title = `producer_name`, subtitle = `"Fill in your details and {producer_name} will get back to you directly within a few days."`, submit = `"Send my interest"`, success = `"Thank you! {producer_name} will be in touch shortly."`, error = `"Something went wrong. Please try again."`, notFound = `"This campaign link is invalid or no longer available."`.
- Le submit appelle désormais `supabase.functions.invoke('submit-campaign-interest', { body: {...} })` au lieu d'un insert direct.
- SEO Helmet inchangé (`noindex`).

### 4. Affichage "Prospects qualifiés"
Aucun changement nécessaire : `CampaignDetail` lit déjà `campaign_interested_contacts` via `fetchInterested()` (ligne 148) et affiche la section "Prospects qualifiés" — la nouvelle soumission apparaîtra automatiquement dans cette liste, accessible via **Campagnes → Voir la campagne**.

### 5. Nettoyage
- Supprimer les clés `interestForm.*` désormais inutilisées dans `src/i18n/locales/{fr,en}.json`.
- Aucune modification des vues user pour l'accès au lien (déjà admin-only comme validé précédemment).

### Détails techniques
- Edge function utilise `SUPABASE_SERVICE_ROLE_KEY` (jamais exposé au client).
- Pas de captcha / rate-limit dans ce lot (à noter comme suivi possible si spam apparaît).
- Le prompt Claude/Gemini reçoit uniquement les champs saisis + la liste des slugs → sortie JSON strict `{ description, recommended_actions }` parsé côté function.
