## Objectif

Ajouter une nouvelle fonctionnalité « Opportunités » : importer (admin) et afficher (utilisateur) des demandes directes d'importateurs et des appels d'offres officiels (Systembolaget, Alko, …), avec deux actions sur chaque carte : révéler les coordonnées et ajouter l'entrée au pipeline CRM.

Aucune page, table ou composant existant n'est modifié hors :
- Ajout d'un item « Opportunités » dans la sidebar utilisateur.
- Ajout d'un item « Opportunités » dans la section Admin de la sidebar.
- Migration `leads.campaign_id` → nullable (validée).

---

## 1. Base de données (1 migration)

### Table `tender_agents`
- `id uuid pk`, `name`, `company`, `email` (unique), `phone`, `address`
- RLS : admin = full ; authenticated = SELECT (pour usage côté admin uniquement, pas exposé en front utilisateur).

### Table `importer_requests`
Champs du scope (full_name, company_name, country, email, phone, wine_styles, origins, volume, requirements, status default 'published', submitted_at, created_at).
- RLS : `SELECT` pour `authenticated` où `status = 'published'` ; INSERT/UPDATE/DELETE admin uniquement.

### Table `tender_requests`
Champs du scope + `agent_id uuid → tender_agents(id)`.
- RLS : idem importer_requests.

### Modification `leads`
- `ALTER TABLE leads ALTER COLUMN campaign_id DROP NOT NULL`.
- Ajout colonne `source text default 'campaign'` (valeurs : `campaign`, `opportunity_direct`, `opportunity_tender`).
- Ajout colonne `source_ref uuid` (id de l'opportunité d'origine, pour éviter les doublons).

### Seed
- 1 `tender_agents` : Rebecka Sjons Hedlund / Wineability AB.
- 1 `tender_requests` : référence 657-190 (Systembolaget Suède, AOP Beaujolais-Villages), liée à l'agent ci-dessus, `status = 'published'`.

### GRANTS
Inclus dans la migration pour les 3 nouvelles tables (`anon` exclu — accès auth-only).

---

## 2. Edge Function `extract-tender-pdf`

- Reçoit le PDF (base64) depuis l'admin.
- Appelle Claude (`ANTHROPIC_API_KEY` déjà configurée) avec un prompt structuré demandant un JSON array `{reference, market, category, designation_origin, price, available_volume, vintage, deadline_answer, deadline_sample, style_profile, requirements}`.
- Le `market` est déduit du contexte du document.
- Retourne le JSON brut au front (pas d'insertion auto — la validation se fait dans la preview admin).

CORS standard, validation JWT en code, admin-only (vérification `has_role`).

---

## 3. Page admin `/admin/opportunites`

Route protégée par `AdminRoute` (cohérent avec `/admin/users`, `/admin/campaigns`, …).

### Onglet « Demandes directes (Tally) »
- Drop-zone CSV (parsé client-side avec PapaParse — déjà à ajouter si absent, sinon parsing manuel).
- Mapping de colonnes du scope.
- Tableau preview : checkbox « Publier » cochée par défaut, bouton exclure par ligne.
- Bouton « Importer la sélection » → INSERT en bulk avec `status = 'published'`. Toast avec compte.

### Onglet « Appels d'offres (PDF) »
- Drop-zone PDF → conversion base64 → appel `extract-tender-pdf`.
- Tableau preview des références extraites, checkbox « Publier » **décochée** par défaut.
- Par ligne sélectionnée : `Select` agent existant (alimenté par `tender_agents`) + bouton « Nouveau » qui ouvre un Dialog pour créer un agent inline.
- Bouton « Importer la sélection » : crée/réutilise les agents puis insère les `tender_requests` avec `status='published'` + `agent_id`.

---

## 4. Page utilisateur `/opportunites`

Route dans `DashboardLayout`. Lien sidebar utilisateur (icône `Sparkles` ou `Briefcase`) entre « Recherche sur-mesure » et « Pipeline ».

### Structure
- Header : titre « Opportunités d'export » + sous-titre court.
- `Tabs` shadcn : « Demandes directes » | « Appels d'offres ».
- Grille de cartes responsive (1/2/3 colonnes selon viewport).

### Carte Demande directe
Affiche pays, styles, origines, volume, requirements (si présent). Coordonnées masquées.
- Bouton « Voir les coordonnées » → Dialog révélant email + téléphone.
- Bouton « Ajouter au CRM » → insert `leads` avec `source='opportunity_direct'`, `source_ref=importer_requests.id`, `campaign_id=null`, `prospect_status='new'`, pré-remplissage company/email/phone/country. Toast + lien vers la fiche. Désactivé si déjà ajouté (check via `source_ref`).

### Carte Appel d'offres
Affiche référence, marché, catégorie, désignation, prix, volume, millésime, style profile, requirements, deadlines.
- Badge urgence (rouge si `deadline_answer` < 30j, orange < 60j).
- Bouton « Voir l'agent à contacter » → Dialog révélant nom, société, email, téléphone, adresse.
- Bouton « Ajouter au CRM » → insert `leads` avec `source='opportunity_tender'`, `source_ref=tender_requests.id`, company = agent_company, email = agent_email, phone = agent_phone, country dérivé du market, owner_notes pré-rempli avec la référence et la deadline.

---

## 5. Design

Tokens existants (couleur primaire bordeaux #59191F, accent doré, Georgia, fond beige) via les variables CSS déjà en place dans `index.css`. Pas de couleurs hardcodées. Badge deadline = variantes destructive/warning du système.

---

## 6. i18n

Ajout d'une clé `nav.opportunities` (FR « Opportunités » / EN « Opportunities ») et namespaces `opportunities.*` pour les libellés de la page utilisateur, dans `src/i18n/locales/fr.json` et `en.json`. Contenu base toujours en anglais brut (jamais traduit).

---

## Hors scope (confirmé)
- Pas de notifications Resend.
- Pas d'impact crédits.
- Aucune modification des pages CRM, Campagnes, Profil, Recherche sur-mesure existantes.
- L'enrichissement « répondre via plateforme » sera fait plus tard — ici on révèle juste les coordonnées.

---

## Détails techniques (récap pour l'implémentation)

```text
DB
├─ migration: tender_agents, importer_requests, tender_requests, leads.campaign_id nullable + leads.source + leads.source_ref, seed agent + tender 657-190
Edge fn
├─ supabase/functions/extract-tender-pdf/index.ts (Claude API)
Front
├─ src/pages/AdminOpportunities.tsx
├─ src/pages/Opportunities.tsx
├─ src/components/opportunities/ImporterRequestCard.tsx
├─ src/components/opportunities/TenderRequestCard.tsx
├─ src/components/admin/TallyCsvImporter.tsx
├─ src/components/admin/TenderPdfImporter.tsx
├─ src/App.tsx (2 routes)
├─ src/components/AppSidebar.tsx (2 items)
├─ src/i18n/locales/{fr,en}.json
```
