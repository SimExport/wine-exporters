# « 0 prospect enrichi sur 27 » : d'où ça vient

## Ce que montre la vérification

Les 27 prospects de la campagne Juillet 2026 (Château de France) sont **tous déjà enrichis** : chacun a une description IA en français et une note cohérente (4 à 7, échelle cliqueur). Exemples en base : « Le domaine elitewines.com suggère une société spécialisée dans l'importation… » (7/10), « L'adresse email utilise un domaine grand public (gmail.com)… » (4/10).

Le bouton « Enrichir les prospects » ne traite que les lignes **sans description**. Ici il y en avait zéro, donc il n'avait rien à faire et a répondu « 0 sur 27 ». Ce n'est pas une erreur — mais le message est trompeur : il donne l'impression d'un échec.

## Ce qu'on va faire

1. **Message clair quand tout est déjà enrichi**
   Le toast affichera « Tous les prospects sont déjà enrichis (27) » au lieu de « 0 prospect(s) enrichi(s) sur 27 ». Quand il y a du travail : « 12 prospects enrichis sur 27 (15 déjà à jour) ».

2. **Option « Tout ré-enrichir »**
   Un choix secondaire sur le bouton admin pour relancer l'IA sur **tous** les prospects d'une campagne, y compris ceux déjà décrits (utile si un enrichissement est de mauvaise qualité ou date d'avant les correctifs de score).

## Détails techniques

- `supabase/functions/enrich-campaign-prospects/index.ts` : accepte `force?: boolean` dans le body ; sans `force`, filtre inchangé (description vide) ; avec `force`, traite toutes les lignes de la campagne. La réponse renvoie déjà `total`, `candidates`, `enriched`, `failed` — on s'appuie dessus côté UI.
- `src/components/admin/EnrichProspectsButton.tsx` : passage en `DropdownMenu` (Enrichir les manquants / Tout ré-enrichir) et toast conditionnel selon `candidates === 0`.
- `src/i18n/locales/fr.json` et `en.json` : nouvelles clés `adminCampaigns.enrich.alreadyDone`, `.forceLabel`, `.missingLabel`, et libellé de succès avec compte des déjà à jour.
- Aucun changement de schéma, aucune modification de la vue utilisateur.
