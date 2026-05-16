# Recherches sur-mesure — Feature complète

## Constat
- La table `sourcing_requests` existe déjà (status `pending`, admin_note, target_market).
- L'utilisateur peut soumettre une recherche depuis `/importers` → insertion en base **sans aucune notification**.
- Aucun espace admin, aucun email envoyé, aucun moyen de livrer un document.

## Plan

### 1. Base de données (migration)
Étendre `sourcing_requests` avec:
- `status` enum élargi: `pending` | `in_progress` | `validated` | `archived` (DELETE déjà couvert par admin)
- `result_file_url`, `result_file_name`, `result_file_size`, `result_file_format` (pdf/docx)
- `validated_at`, `validated_by`, `archived_at`
- `admin_note` existe déjà ✅

Politiques RLS additionnelles:
- Admins: UPDATE + DELETE complets
- Users: SELECT élargi (déjà OK), peuvent voir leur document quand validé

Storage:
- Créer bucket privé `sourcing-results`
- RLS: admins peuvent upload/delete partout; users peuvent download uniquement les fichiers liés à leur user_id (chemin `{user_id}/{request_id}.{ext}`)

### 2. Edge Function `notify-sourcing-submission`
- Déclenchée côté client après insertion réussie dans `sourcing_requests`
- Envoie un email via Resend à `simon@exportvins.fr`
- Contenu: email utilisateur, nom du domaine, marché demandé, lien admin
- Pattern identique à `notify-campaign-submission`

### 3. Edge Function `notify-sourcing-validated`
- Déclenchée quand l'admin valide une recherche
- Envoie email à l'utilisateur avec lien vers `/recherches/{id}` pour télécharger le document

### 4. Page Admin `/admin/recherches` (`AdminSourcing.tsx`)
Route protégée par `AdminRoute`, ajoutée au sidebar admin.
Inspirée de `AdminCampaigns`:
- Tableau: email user / domaine / marché / date / statut / actions
- Filtres par statut (pending/in_progress/validated/archived)
- Actions par ligne:
  - **Valider**: upload document (pdf/docx) obligatoire → upload Storage → update status `validated` + URL → déclenche email user
  - **Marquer en cours**: status `in_progress`
  - **Archiver / Désarchiver**
  - **Supprimer** (avec confirm)
  - **Modifier note admin**
- Affichage des emails utilisateurs via jointure profiles + auth (utiliser `display_name` ou récupérer email depuis `profiles.domain_name` + RPC admin si besoin pour email)

### 5. Page utilisateur `/recherches` (`SourcingRequests.tsx`)
Nouvelle entrée sidebar (sous Importateurs ou Campagnes).
Contenu:
- En-tête avec compteur crédit mensuel + date prochain reset
- Bouton "Lancer ma recherche mensuelle" (réutilise le même flow modal que `/importers`)
- Liste chronologique des recherches passées:
  - Marché, date, statut (badge), note admin si présente
  - Si `validated`: bouton **Télécharger / Visualiser le document** (signed URL Storage)
  - Si `pending`/`in_progress`: message "L'équipe revient sous 72h ouvrés"

### 6. `/importers` — conserver le bouton existant
- Garder le modal actuel
- Après insertion réussie: appeler `notify-sourcing-submission` (en plus du toast déjà présent)

### 7. Notifications in-app (bonus)
- Ajouter événement dans `useNotifications` lorsqu'une recherche utilisateur passe `validated` (realtime sur `sourcing_requests` filtré par user_id)

### 8. i18n
- Ajouter clés FR/EN: `sourcing.page.*`, `admin.sourcing.*`, emails

## Détails techniques

**Format chemin Storage:** `{user_id}/{request_id}.{ext}` pour RLS simple.

**Statuts:** garder `text` plutôt qu'enum pour éviter migration lourde, avec CHECK constraint.

**Email admin:** `simon@exportvins.fr` en dur dans l'edge function (cohérent avec patterns existants).

**Lien admin dans email:** `https://wine-exporters.com/admin/recherches`.

**Lien utilisateur dans email validation:** `https://wine-exporters.com/recherches`.

## Fichiers créés/modifiés
- Migration SQL (table + RLS + bucket + policies)
- `supabase/functions/notify-sourcing-submission/index.ts` (nouveau)
- `supabase/functions/notify-sourcing-validated/index.ts` (nouveau)
- `src/pages/AdminSourcing.tsx` (nouveau)
- `src/pages/SourcingRequests.tsx` (nouveau)
- `src/pages/Importers.tsx` (ajout appel notify)
- `src/App.tsx` (routes)
- `src/components/AppSidebar.tsx` (entrées menu)
- `src/i18n/locales/{fr,en}.json`
