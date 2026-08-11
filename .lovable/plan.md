# Fiabiliser l'origine et l'enrichissement des prospects qualifiés

## Ce que montre la vérification

- En base : 138 prospects « cliqueur » et 49 « formulaire ». Aucun n'est aujourd'hui mal étiqueté, mais le risque est réel : la colonne `origin` a pour valeur par défaut « formulaire », et l'import CSV admin n'envoie jamais l'origine — tout fichier importé pour des cliqueurs est donc enregistré comme « formulaire ».
- Le volet admin « Prospects qualifiés » ne lit pas l'origine stockée : il sépare répondants et cliqueurs selon la présence d'un nom de contact. Un cliqueur avec un nom, ou un répondant sans nom, est classé du mauvais côté.
- Qualité inégale : 59 cliqueurs n'ont aucune description (donc aucun enrichissement visible), et certains cliqueurs ont un score allant jusqu'à 10 alors que l'échelle cliqueur est 4-7.

## Ce qu'on va faire

Tous les prospects restent visibles dans la même liste « Prospects qualifiés », cliqueurs compris. On corrige l'étiquetage et on garantit l'enrichissement.

1. **Origine fiable à l'import**
   - L'import CSV admin accepte une colonne `origin` (formulaire / cliqueur) et propose un choix d'origine par défaut pour tout le fichier. Plus aucune insertion sans origine explicite.
   - Rappel : la synchro Brevo enregistre déjà « cliqueur », le formulaire d'intérêt « formulaire ».

2. **Affichage admin basé sur l'origine réelle**
   - Le volet « Prospects qualifiés » côté admin sépare les deux groupes selon la colonne `origin` (et non plus selon la présence d'un nom), pour que les compteurs et les badges correspondent à la réalité.

3. **Le score reflète l'origine**
   - Application systématique des plages : formulaire 6-10, cliqueur 4-7, à l'import CSV comme à l'enrichissement IA.
   - Correction des scores cliqueurs existants hors plage pour qu'ils repassent dans 4-7.

4. **Tous les prospects sont enrichis**
   - Un bouton admin « Enrichir les prospects » lance l'enrichissement IA (description + score) sur les prospects d'une campagne qui n'en ont pas encore, cliqueurs inclus (les 59 concernés).
   - L'enrichissement d'un cliqueur reste basé sur le domaine de l'email, avec le score plafonné à 7.

## Détails techniques

- `src/components/admin/CampaignInterestedContactsUpload.tsx` : ajout de `origin` aux en-têtes connus + sélecteur d'origine par défaut ; `origin` et score borné (`clampScoreForSource`) inclus dans le payload d'insertion.
- `src/components/admin/CampaignQualifiedProspectsSheet.tsx` : requêtes filtrées sur `origin = 'form'` / `origin = 'click'` au lieu de `contact_name is/not null`.
- Nouvelle Edge Function `enrich-campaign-prospects` (admin uniquement, `verify_jwt = true`) : parcourt les lignes `campaign_interested_contacts` d'une campagne sans `description`, appelle Anthropic `claude-sonnet-4-5` (prompts FR existants, réutilisés selon l'origine), met à jour `description`, `recommended_actions` et `score` borné.
- Bouton déclencheur ajouté à côté de la synchro Brevo dans `src/pages/AdminCampaigns.tsx`.
- Migration de données : `UPDATE campaign_interested_contacts SET score = LEAST(7, GREATEST(4, score)) WHERE origin = 'click'` ; aucune ligne supprimée.
- Aucun changement sur la vue utilisateur `src/pages/CampaignDetail.tsx` (liste unifiée, badges d'origine) hors bénéfice des données corrigées.