# Mise à jour du prompt système `create-campaign`

## Objectif
Remplacer le `SYSTEM_PROMPT` actuel dans l'Edge Function `supabase/functions/create-campaign/index.ts` par la version révisée fournie par l'utilisateur, puis redéployer la fonction.

## Changements prévus
- **Fichier** : `supabase/functions/create-campaign/index.ts`
- **Action** : remplacer la constante `SYSTEM_PROMPT` (lignes 81-113) par le nouveau prompt fourni.
- **Différences clés apportées par le nouveau prompt** :
  - Ton plus court et personnel, style « note réelle » plutôt que « sales deck ».
  - Limite stricte de 180 mots pour le corps du mail.
  - Un seul point fort mis en avant, pas une liste exhaustive.
  - Section bullets : exactement 3 points, titres gras sans emoji, 1-2 phrases chacun.
  - Un seul CTA, libellé « Send me the price list ».
  - Formule de fermeture spécifique et concise, sans phrases toutes faites.
- **Déploiement** : redéployer l'Edge Function `create-campaign` après modification.

## Validation
- S'assurer que le fichier compile et que la fonction est bien redéployée.
- Aucun autre changement de logique métier n'est nécessaire.
