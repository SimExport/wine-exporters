# Enrichissement Août 2026 : 4 cliqueurs sautés + balises `<cite>` dans les textes

## Ce que dit la base après le run

Sur les 26 cliqueurs de la campagne, **21 ont bien été réécrits** entre 15:51 et 15:53, et le résultat est bon : sociétés réelles (Slocum & Sons, Sazerac, Great Lakes Wine & Spirits, Trialia Foods, Shenzhen Classic Haonian…), pays corrects, actions recommandées présentes, aucun mot hésitant.

Mais le toast « 31/31 » est faux. **5 lignes n'ont pas été touchées par ce run** :

| Contact | Dernière écriture | État |
|---|---|---|
| wine@liquidlibrary.net.au | 15:42 (run précédent) | pays « England (UK) » alors que domaine `.net.au` |
| sverre.tollefsen@prizelius.no | 11:12 | société = `prizelius.no`, pas d'actions |
| reservierung@emma2.de | 07:10 | société = `emma2.de`, description hésitante, pas d'actions |
| fmg@acamacho.com | 07:10 | société = `acamacho.com`, description hésitante, pas d'actions |
| info@jacewines.com | 07:09 | société = `jacewines.com`, description hésitante, pas d'actions |

Deux défauts supplémentaires : les descriptions issues de `web_search` contiennent des balises brutes `<cite index="15-1">…</cite>` (visibles pour 3Kraters et Global Food & Wine), et le compteur affiché additionne les lots sans tenir compte des lignes réellement restantes.

## Causes

1. **Pagination instable.** En mode force, la fonction relit toute la table à chaque appel puis prend `todo.slice(offset, offset+limit)`. La requête n'a **aucun `ORDER BY`** : Postgres peut renvoyer les lignes dans un ordre différent d'un appel à l'autre, surtout après les `UPDATE` du lot précédent. Des lignes glissent d'une page à l'autre et ne sont jamais traitées, pendant que d'autres le sont deux fois — ce qui explique aussi les doublons visibles dans les logs (`grandcruselections` traité 3 fois) et le total gonflé à 31.
2. **Balises de citation.** Claude renvoie le texte avec des balises `<cite>` quand `web_search` est actif ; rien ne les retire avant l'écriture en base.

## Correctif

`supabase/functions/enrich-campaign-prospects/index.ts`
- Ajouter `.order("id")` à la lecture de `campaign_interested_contacts` pour figer l'ordre entre les appels.
- Suivre les lignes déjà traitées par leur `id` plutôt que par un simple offset numérique : la réponse renvoie la liste des ids traités, l'appelant les repasse dans `exclude_ids`, et la fonction retire ces ids de `todo` avant de découper le lot. Plus aucun doublon ni oubli, quel que soit l'ordre.
- Nettoyer les sorties de Claude avant écriture : supprimer les balises `<cite …>` / `</cite>` de `description` et `recommended_actions`.
- `remaining` calculé sur les ids restants, pas sur un offset.

`src/components/admin/EnrichProspectsButton.tsx`
- Accumuler les ids traités et les renvoyer à chaque itération ; le compteur affiche alors le nombre réel de contacts distincts enrichis sur le nombre de candidats.

## Ensuite

Relancer « Tout ré-enrichir » sur Août 2026 : les 5 lignes en retard doivent passer à une vraie société (Prizelius AS, Jace Wines, A. Camacho…), pays cohérent, actions remplies, et les textes doivent être exempts de `<cite>`.
