# /market-analysis : confirmation affichée mais aucune demande enregistrée

## Diagnostic

Vérifications faites dans la base :

- La table `public.prospect_market_searches` existe avec exactement les colonnes envoyées par le formulaire — aucune incohérence de schéma.
- La sécurité est correcte : l'insertion est autorisée pour les visiteurs non connectés (policy d'insertion active, droits accordés à `anon`).
- La table est vide (0 ligne) : aucune demande n'est jamais arrivée.
- Le code n'affiche la confirmation qu'après réponse positive de la base… **sauf dans un cas** : le filtre anti-robots.

Cause identifiée : le formulaire contient un champ piège invisible dont l'étiquette est « Website » et dont le nom ressemble à un champ de site internet. Quand ce champ est rempli, la page affiche volontairement la confirmation **sans rien enregistrer** — silencieusement, sans erreur. Les navigateurs et gestionnaires de mots de passe remplissent automatiquement ce genre de champ caché : un visiteur réel est alors traité comme un robot. Le second filtre (envoi en moins de 3 secondes) mène au même écran de confirmation muet.

## Correctifs

1. Rendre le champ piège non remplissable automatiquement : nom et étiquette neutres (plus de « Website »), champ retiré du flux d'autocomplétion, et prise en compte uniquement s'il a été rempli par une frappe réelle.
2. Ne plus afficher un faux succès : quand un envoi est écarté par le filtre anti-robots, la trace est écrite dans la console du navigateur (motif : piège ou délai) pour que le cas soit visible en diagnostic.
3. Surfacer toute erreur de base : message d'erreur à l'écran (déjà présent) **plus** une trace console complète de l'erreur renvoyée, au lieu d'un simple message générique.
4. Vérification finale : envoi réel du formulaire depuis l'aperçu, puis contrôle qu'une ligne apparaît bien dans la table, et suppression de cette ligne de test.

Aucun changement de design, de textes visibles, d'étapes du formulaire ni d'autre page.

## Détails techniques

- `src/pages/MarketAnalysis.tsx` uniquement :
  - champ honeypot : `id`/`name` neutres (ex. `contact_reference`), `autoComplete="new-password"` + `readOnly` levé au premier `onKeyDown`, ou détection via un flag `humanTyped` — le champ ne compte comme piège que si l'utilisateur a réellement tapé dedans ;
  - branche « robot probable » : `console.warn` avec le motif avant `setSubmitted(true)` ;
  - bloc `catch` : `console.error("market-analysis insert failed", err)` en plus de `setSubmitError`.
- Aucune migration SQL nécessaire : policy et droits sont déjà corrects.
