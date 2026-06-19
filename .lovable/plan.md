## Cause racine

La table `campaign_interested_contacts` n'a **aucun GRANT** dans Postgres. Conséquence : même si les politiques RLS autorisent le propriétaire de la campagne à lire ses contacts, PostgREST refuse silencieusement la requête côté client (`authenticated` n'a aucun privilège SELECT). C'est pour ça que **Lany ne voit rien** : la requête `fetchInterested()` revient vide, donc la carte (rendue uniquement si `interested.length > 0`) n'apparaît pas. Côté admin ça marche parce que l'upload passe par un contexte privilégié.

## Étape 1 — Corriger l'accès en base (migration)

Ajouter les GRANTs manquants :

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_interested_contacts TO authenticated;
GRANT ALL ON public.campaign_interested_contacts TO service_role;
```

Les politiques RLS existantes continuent de filtrer ligne par ligne : Lany ne verra que les contacts de **ses** campagnes, les admins voient tout. Après cette migration, Lany verra immédiatement ses 17 prospects sur `/campaigns/71c4a4fe-…`.

## Étape 2 — Renommer « Contacts intéressés » → « Prospects qualifiés »

Remplacement de libellé uniquement (aucun changement de logique, de table ou de colonne). Fichiers touchés :

- **`src/i18n/locales/fr.json`** — clés sous `campaigns.detail.interestedContacts*` et `campaigns.detail.interestedContactsCard` :
  - Titre carte : « Contacts intéressés » → « Prospects qualifiés »
  - Toast d'ajout : « Contact ajouté au CRM » (inchangé) / wording cohérent
- **`src/i18n/locales/en.json`** — mêmes clés : « Interested contacts » → « Qualified prospects »
- **`src/components/admin/CampaignInterestedContactsUpload.tsx`** — texte du bouton/zone d'upload côté admin : « Importer les prospects qualifiés (CSV) »
- **`src/pages/AdminCampaigns.tsx`** — toute mention visible « contacts intéressés »
- **`supabase/functions/notify-campaign-interested-contacts/index.ts`** — sujet et corps de l'email :
  - FR : « Vos prospects qualifiés sont disponibles » + « X prospects qualifiés issus de votre campagne … »
  - EN : « Your qualified prospects are ready » + équivalent
  - Instructions : « ouvrez l'onglet Campagnes → cliquez sur votre campagne → faites défiler jusqu'à *Prospects qualifiés* → cliquez sur *Ajouter au CRM* »

Les **identifiants techniques restent inchangés** (nom de table `campaign_interested_contacts`, nom de l'edge function, colonne `added_to_crm_by`, event_type des logs). Seuls les textes visibles utilisateur changent.

## Étape 3 — Vérification

Une fois la migration appliquée :
1. Vérifier en lecture que `SELECT … FROM campaign_interested_contacts WHERE campaign_id = '71c4a4fe-…'` exécutée en tant qu'authenticated avec l'`auth.uid()` de Lany retourne bien 17 lignes.
2. Demander à Lany de recharger sa campagne — la carte « Prospects qualifiés (17) » doit apparaître avec le tableau et le bouton « Ajouter au CRM » par ligne.
3. Optionnel : renvoyer l'email de notification (déjà fait précédemment) si tu veux qu'elle reçoive la version avec le nouveau libellé.

## Hors-périmètre

- Pas de changement sur `campaign_reports` (PDF) : Lany n'en a pas, ce n'est pas le problème.
- Pas de changement sur la logique « Ajouter au CRM » ni sur la table `leads`.
- Pas de renommage de la table ni de l'edge function (risque inutile).
