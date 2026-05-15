## Bug identifié

Le message d'erreur `campaigns_markets_count_check` vient d'une contrainte SQL sur la table `campaigns` qui limite les marchés ciblés entre **3 et 7**.

Or, le wizard "Créer une campagne" (`CreateCampaign.tsx`) autorise **5 à 15 marchés** (`MIN_MARKETS = 5`, `MAX_MARKETS = 15`). Jérôme en a sélectionné **11** → la base rejette l'insertion.

C'est une incohérence entre le front et la contrainte DB (probablement un ancien réglage jamais mis à jour quand la limite UI a évolué).

## Correction proposée

**1. Migration SQL** — aligner la contrainte DB sur la règle métier actuelle du wizard :

```sql
ALTER TABLE public.campaigns DROP CONSTRAINT campaigns_markets_count_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_markets_count_check
  CHECK (array_length(target_markets, 1) >= 5 AND array_length(target_markets, 1) <= 15);
```

**2. Améliorer le message d'erreur côté UI** (`CreateCampaign.tsx`) — afficher un message clair en français au lieu du texte SQL brut quand une contrainte de ce type est violée (filet de sécurité pour les futures incohérences).

## Hors scope

- Pas de changement du wizard `Campaigns.tsx` (l'autre flux de création) tant que la limite DB couvre bien sa plage.
- Pas de modification du schéma au-delà de cette contrainte.

Une fois validé, Jérôme pourra relancer sa campagne "Campagne mai 2026" avec ses 11 marchés sans changer son brouillon.