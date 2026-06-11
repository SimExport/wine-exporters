## Objectif

Ajouter une fiche admin complète par utilisateur, accessible depuis `/admin/users`, regroupant toutes les informations qu'il a renseignées (domaine, cuvées, documents, médias, campagnes, CRM, crédits, abonnement), avec possibilité de copier chaque champ, télécharger un JSON global, et un ZIP de tous ses documents/médias.

## Changements

### 1. `src/pages/AdminUsers.tsx`
- Ajouter une colonne "Action" avec un bouton **"Voir profil"** (icône `Eye` + label) qui navigue vers `/admin/users/:userId`.

### 2. Nouvelle route `/admin/users/:userId`
- Enregistrer dans `src/App.tsx` (protégée par `AdminRoute` + `DashboardLayout`).
- Nouvelle page `src/pages/AdminUserProfile.tsx`.

### 3. `src/pages/AdminUserProfile.tsx` (nouveau)

Structure de la page :

- **Header** : nom, email, rôle, plan, date inscription, user_id (copiable), bouton "Retour", bouton **"Exporter JSON"**, bouton **"Télécharger ZIP documents"**.
- **Onglets** (`Tabs` shadcn) :
  1. **Domaine** — tous les champs de `profiles` (nom, AOC, localisation, surface, bouteilles/an, bio, couleurs, cépages, marchés cibles, site web, description, etc.). Chaque champ avec un petit bouton copier au survol.
  2. **Cuvées** — table des `wines` du user (toutes, actives ou non) avec colonnes nom, couleur, appellation, cépages, millésimes, prix EXW, bio/biodynamie/nature, awards.
  3. **Documents** — table des `documents` du user : nom, type, taille, date upload, bouton "Télécharger" (signed URL bucket `documents`), bouton "Copier le lien".
  4. **Médias** — grille des `media` du user (photos/vidéos depuis bucket `media` public) avec preview + bouton télécharger.
  5. **Campagnes** — liste des `campaigns` du user (nom, statut, date, cibles, crédits consommés) avec lien vers `/admin/campaigns`.
  6. **CRM & crédits** — leads count par statut, reminders à venir, crédits restants (`user_credits`), historique abonnement (Stripe customer id copiable).

### 4. Edge function `supabase/functions/admin-export-user-zip/index.ts` (nouveau)
- Vérifie JWT + rôle admin via `has_role`.
- Reçoit `{ user_id }`.
- Liste tous les fichiers du user dans les buckets `documents` et `media` (préfixés par `user_id/` selon convention existante).
- Construit un ZIP en mémoire (lib `jsr:@quentinadam/zip` ou équivalent Deno) avec `documents/...` et `media/...` à l'intérieur.
- Retourne le ZIP en `application/zip` au client pour téléchargement.

### 5. Sécurité / accès
- Toute la page est protégée par `AdminRoute`.
- Les requêtes Supabase passent par le client (RLS) ; pour accéder aux données d'autres users, les policies admin existantes (`has_role(auth.uid(),'admin')`) doivent autoriser le SELECT.
- À vérifier sur : `wines`, `documents`, `media`, `campaigns`, `leads`, `user_credits`. Si manquant, ajouter une migration `CREATE POLICY "Admins can view all X" ... USING (has_role(auth.uid(),'admin'))`.

### 6. i18n
- Ajouter clés FR/EN sous `admin.userProfile.*` dans `src/i18n/locales/{fr,en}.json` (tabs, boutons, vides).

## Détails techniques

- **JSON export** : objet `{ profile, wines, documents (metadata only), media (metadata only), campaigns, leads_summary, credits, subscription }` téléchargé côté client via `Blob` + `URL.createObjectURL`.
- **ZIP** : généré côté edge function (les fichiers ne sont pas accessibles publiquement pour `documents`). Utilise `SUPABASE_SERVICE_ROLE_KEY` pour récupérer les blobs via `storage.from(bucket).download(path)`.
- **Copier au clic** : petit helper `<CopyableField>` réutilisable (icône `Copy` au survol, toast "Copié").
- Pagination tables internes : fixe 10/page (memory rule).

## Hors scope

- Pas d'édition des données depuis cette vue (lecture seule + exports). Les actions de modification (rôle, plan, email) restent sur `/admin/users`.
- Pas d'export PDF.
- Pas de modification du système RLS hors policies SELECT admin manquantes.
