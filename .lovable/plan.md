# Corriger l'enrichissement des cliqueurs (société et pays)

## Ce que montre la vérification

Sur les prospects « cliqueur » en base, deux profils cohabitent :

- Lignes correctes : société réelle (« Déjà Vu Wine Company Pty Ltd », « Robert Rolls & Co. Limited ») et pays réel (Australie, UK, Corée…).
- Lignes fausses : société = le texte avant le @ (« orders », « goldcoast ») et pays = « United States » alors que le domaine dit autre chose (`goldcoast@globalfw.com.au`).

Origine exacte :

- `supabase/functions/sync-brevo-campaign/index.ts` insère `company_name` = partie locale de l'email, et `country` = `campaign.target_markets[0]` pour tous les cliqueurs (donc « United States » pour une campagne US, quel que soit le domaine).
- `supabase/functions/enrich-campaign-prospects/index.ts` ne met à jour que `description`, `score` et `recommended_actions`. Il ne corrige jamais la société ni le pays — donc « Tout ré-enrichir » laisse les erreurs en place.

## Ce qu'on va faire

1. **L'enrichissement déduit aussi la société et le pays**
   L'IA renvoie, en plus de la description et du score, un nom de société probable et un pays probable, déduits du domaine de l'email. Si le domaine est générique (gmail, seznam…) ou l'info non déductible, la valeur est laissée telle quelle plutôt que devinée.
   Règle d'écrasement : on remplace la société uniquement quand elle est manifestement fausse (identique à la partie locale de l'email, ou vide) ; on remplace le pays quand il vaut la valeur par défaut de la campagne et que le domaine indique clairement un autre pays. Avec « Tout ré-enrichir », l'écrasement est complet.

2. **Plus de fausses valeurs à l'import Brevo**
   À l'import des cliqueurs, la société n'est plus la partie locale de l'email (laissée vide ou reprise du domaine), et le pays est déduit du TLD du domaine en priorité, avec le marché de la campagne seulement en repli.

3. **Nettoyage des lignes existantes**
   Relancer « Tout ré-enrichir » sur les campagnes concernées corrigera les lignes déjà en base une fois le correctif en place.

## Détails techniques

- `enrich-campaign-prospects/index.ts` : prompt cliqueur étendu (`company_name`, `country` en plus de `description`/`score`) ; helpers `shouldReplaceCompany(row, email)` et `shouldReplaceCountry(row, campaignDefaultMarket, inferred)` ; payload d'update conditionnel.
- `sync-brevo-campaign/index.ts` : `company_name: null` (ou libellé de domaine), et `marketFor()` inversé — TLD d'abord, `target_markets[0]` en repli, « Unknown » en dernier.
- Aucun changement de schéma, aucune modification de la vue utilisateur ni des prospects « formulaire ».
