# Rendre visibles tous les prospects qualifiés d'une campagne

## Ce que montre la vérification

La page « Voir ma campagne → Prospects qualifiés » lit uniquement la table `campaign_interested_contacts`, et les droits d'accès sont corrects (le propriétaire de la campagne peut bien lire ses contacts).

Le problème vient des cliqueurs importés depuis Brevo **avant** le changement : ils ont été écrits dans la table `leads` (source `click`) et non dans la liste des prospects de la campagne. Aujourd'hui :

- Une vingtaine de cliqueurs répartis sur plusieurs campagnes (« Campagne 2 », « Summer 2026 », « pays germanophone ») sont invisibles côté utilisateur.
- Aucun doublon : ces emails n'existent pas dans la liste des prospects de campagne.
- Les répondants au formulaire, eux, sont bien présents (21, 18, 17 contacts selon les campagnes) et s'affichent normalement.

De plus, l'import Brevo actuel n'enregistre pas l'origine : tous les nouveaux cliqueurs sont marqués « formulaire » en base (l'écran devine l'origine par l'absence de nom de contact, ce qui reste fragile).

## Ce qu'on va faire

1. **Rapatrier les cliqueurs historiques** dans la liste des prospects qualifiés de leur campagne, avec :
   - origine « cliqueur »,
   - le score existant (4-7/10),
   - la description existante,
   - le marquage « déjà ajouté au CRM » pour le propriétaire, puisqu'une fiche prospect existe déjà (aucun doublon créé, aucune fiche CRM supprimée ou modifiée).

2. **Corriger l'import Brevo** pour qu'il enregistre explicitement l'origine « cliqueur » à chaque nouvel import, et le formulaire d'intérêt l'origine « formulaire ».

3. **Fiabiliser l'affichage** : la liste utilise l'origine stockée en base au lieu de la deviner. Aucun changement de mise en page ni de logique de scoring : formulaire 6-10, cliqueurs 4-7, tous dans la même liste.

## Détails techniques

- Migration de données : INSERT depuis `leads` où `source = 'click'` vers `campaign_interested_contacts` (`origin = 'click'`, `added_to_crm_by = [owner]`, dédoublonnage par email + campagne). Les lignes `leads` restent intactes.
- Backfill `origin = 'click'` pour les contacts existants sans nom de contact importés via Brevo.
- `supabase/functions/sync-brevo-campaign/index.ts` : ajouter `origin: 'click'` à l'insert.
- `supabase/functions/submit-campaign-interest/index.ts` : ajouter `origin: 'form'` à l'insert.
- `src/pages/CampaignDetail.tsx` : sélectionner et utiliser la colonne `origin` (repli sur l'heuristique actuelle si vide).