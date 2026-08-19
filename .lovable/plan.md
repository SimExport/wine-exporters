# Corriger l'échec de "Tout ré-enrichir" (timeout Edge Function)

## Ce qui s'est passé

Les logs de `enrich-campaign-prospects` pour l'exécution de 15:42-15:44 ne contiennent aucune erreur applicative : seulement `booted` puis `shutdown`. Aucun log d'erreur Anthropic, aucun échec de mise à jour. Le front a reçu un code non-2xx à 15:44:32, exactement à l'heure du `shutdown`.

C'est la signature d'une fin d'exécution forcée : la fonction traite les 26 contacts **en série**, chacun avec un appel Claude (et jusqu'à 3 recherches web pour les 5 non matchés). À plusieurs secondes par contact, l'exécution dépasse la limite de temps de la fonction et le worker est tué avant de renvoyer sa réponse. Rien n'est loggé parce que la coupure est brutale.

Note : une partie des contacts a probablement déjà été mise à jour avant la coupure — les écritures se font au fil de l'eau, pas en fin de traitement.

## Correctif proposé

Découper le travail en lots pour que chaque invocation reste largement sous la limite, et faire boucler le bouton admin jusqu'à épuisement.

1. `supabase/functions/enrich-campaign-prospects/index.ts`
   - Accepter deux paramètres optionnels : `limit` (défaut 5) et `offset` (défaut 0), appliqués à la liste `todo`.
   - Traiter les contacts du lot en parallèle contrôlé (3 à la fois) au lieu de la boucle séquentielle.
   - Renvoyer, en plus des compteurs actuels, `processed`, `remaining` et `next_offset` pour que l'appelant sache s'il doit continuer.
   - Garde-temps : si l'exécution approche ~60 s, arrêter proprement le lot et renvoyer le `next_offset` atteint.
   - Logger chaque contact traité (email + matché/web) pour avoir une trace exploitable en cas de nouvel échec.

2. `src/components/admin/EnrichProspectsButton.tsx`
   - Boucler les appels tant que `remaining > 0`, en passant `next_offset`, avec un plafond de sécurité sur le nombre d'itérations.
   - Afficher la progression dans le toast ("12 / 26 enrichis…") au lieu d'un simple spinner.
   - En cas d'erreur en cours de boucle, indiquer combien de contacts ont déjà été traités ; une relance reprendra les restants.

Aucune autre page, table ou fonction n'est modifiée.

## Après le correctif

Relancer "Tout ré-enrichir" sur la campagne Août 2026 (Château de France), puis comparer les 26 cliqueurs à l'instantané pris avant : noms de sociétés remplaçant les domaines, pays corrigés, descriptions sans formules hésitantes.