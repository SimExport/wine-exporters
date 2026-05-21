
## Objectif

Traiter 4 feedbacks utilisateurs dans un seul lot.

---

### 1. Upload vidéo dans Profil > Média (vidéo < 200 Mo échoue)

**Causes identifiées dans `src/pages/Profile.tsx` (`handleMediaUpload`) :**
- Seul `video/mp4` est accepté → `.mov`, `.webm`, `.quicktime` rejetés.
- Le bucket `media` est **privé** mais le code utilise `getPublicUrl()` → URL non lisible côté frontend (les vidéos ne s'affichent pas même après upload).
- L'upload standard `supabase.storage.upload()` échoue souvent au-dessus de ~50 Mo (timeout / payload). Pour les fichiers > 6 Mo, il faut l'upload **resumable (TUS)** : `supabase.storage.from('media').uploadToSignedUrl()` n'est pas adapté ici → on utilisera `upload(..., { upsert:false })` avec l'option resumable via le client JS (déjà supporté nativement).

**Correctifs :**
- Élargir les types acceptés : `video/mp4`, `video/quicktime` (`.mov`), `video/webm`.
- Passer le bucket `media` en **public** (migration SQL) → cohérent avec `getPublicUrl` déjà utilisé pour les images.
- Pour les vidéos, utiliser l'upload resumable du SDK Supabase (chunked) afin de tenir les 200 Mo sans timeout.
- Ajouter un état de progression (`%`) pendant l'upload vidéo + message d'erreur explicite si refus du bucket (taille > limite serveur).
- Vérifier la limite de taille du bucket `media` côté Supabase et la passer à 200 Mo si nécessaire (migration).

---

### 2. Campagne en brouillon impossible à rouvrir / modifier / lancer

**Constat dans `src/pages/Campaigns.tsx` (ligne ~1016) :**
La ligne d'une campagne en `draft` n'affiche que **Voir prospects / Archiver / Supprimer** — aucun bouton "Reprendre / Modifier" pour rouvrir le wizard et la lancer.

**Correctifs :**
- Ajouter un bouton **"Reprendre"** (icône `Pencil` / `Play`) visible uniquement quand `campaign.status === 'draft'`, qui ouvre le wizard de création pré-rempli avec la campagne (via un état `editingDraftId` déjà partiellement présent, ou via `navigate` + paramètre).
- Vérifier que `saveDraft` / `launchCampaign` mettent à jour la campagne existante (pas de doublon) en présence d'un `editingDraftId`.
- S'assurer que **"Voir prospects"** est masqué pour un brouillon (aucun prospect attaché) et remplacé par le bouton Reprendre.

---

### 3. CRM : permettre l'ajout manuel d'un prospect (sans campagne)

**Contrainte DB :** `leads.campaign_id` est `NOT NULL`. Pour éviter une migration risquée, on crée **une campagne "système" par user** appelée `"Prospects manuels"` (status `manual`, jamais envoyée) qui sert de conteneur aux leads ajoutés à la main.

**Correctifs :**
- Bouton **"Ajouter un prospect"** dans le header de `CRM.tsx` (visible en vue Kanban et Liste).
- Modal `AddManualLeadDialog` avec champs : nom société, contact (prénom/nom), email, téléphone, site web, pays, ville, statut initial (`new`), note.
- À la soumission :
  - Trouver ou créer la campagne `"Prospects manuels"` du user (helper `getOrCreateManualCampaign`).
  - Insérer le lead avec `campaign_id` = cette campagne, `created_by` = user.
- Filtre "campagne" dans `Prospects.tsx` : ajouter une option dédiée `"Manuels / hors campagne"`.

---

### 4. Ajouter au CRM depuis le résultat d'une Recherche sur-mesure

**Constat dans `src/components/sourcing/SourcingResultsDialog.tsx` :**
La table `shortlist` affiche les contacts sans action possible.

**Correctifs :**
- Ajouter une colonne **"Action"** avec un bouton **"+ Ajouter au CRM"** par ligne.
- Au clic : créer un lead dans la campagne `"Prospects manuels"` (même helper qu'au point 3), avec les champs : `company_name`, `email`, `phone`, `website_url`, `market = marketLabel`, `message_snippet = reason`, `owner_notes = "Issu de Recherche sur-mesure"`.
- État visuel : bouton qui passe à "✓ Ajouté" et se désactive après succès.
- Option bonus : bouton **"Tout ajouter au CRM"** en haut de la table.

---

## Détails techniques

**Migrations SQL :**
```sql
-- Rendre le bucket media public (cohérent avec getPublicUrl)
update storage.buckets set public = true, file_size_limit = 209715200 where id = 'media';
```
(pas de changement de schéma pour `leads` ; on réutilise la table `campaigns`)

**Nouveaux fichiers / composants :**
- `src/lib/manual-campaign.ts` → helper `getOrCreateManualCampaign(userId)`.
- `src/components/crm/AddManualLeadDialog.tsx` → formulaire d'ajout manuel.
- Modifs : `Profile.tsx`, `Campaigns.tsx`, `CRM.tsx`, `Prospects.tsx`, `Pipeline.tsx`, `SourcingResultsDialog.tsx`.

**i18n :** ajouter les clés FR/EN pour les nouveaux libellés (boutons, modal, toasts).

**Hors scope :** refonte du wizard de campagne, automatisation d'enrichissement, déduplication avancée des leads.
