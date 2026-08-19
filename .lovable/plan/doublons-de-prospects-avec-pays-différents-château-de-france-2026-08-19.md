# Doublons de prospects avec pays différents (Château de France, Août 2026)

## Ce que montre la vérification en base

Sur la campagne « Août 2026 » (33 prospects), deux sociétés apparaissent bien deux fois avec un pays différent :

| Domaine | Ligne 1 | Ligne 2 |
|---|---|---|
| theirishcellar.com | `alex@…` — formulaire — The Irish Cellar — **Ireland** | `info@…` — cliqueur — theirishcellar.com — **United Kingdom** |
| rareandfinewine.com | `philip@…` — formulaire — THE RARE & FINE WINE CO LTD — UNITED KINGDOM | `sales@…` — cliqueur — Rare and Fine Wine — United Kingdom |

Deux causes distinctes :

1. **Le dédoublonnage se fait sur l'adresse email exacte, pas sur le domaine.** À l'import des cliqueurs Brevo, `info@theirishcellar.com` n'est pas reconnu comme la même société que `alex@theirishcellar.com` déjà présent via le formulaire, donc une seconde ligne est créée.
2. **Le pays des cliqueurs en `.com` est faux par défaut.** Le pays vient du TLD ; un `.com` n'est pas dans la table, donc on retombe sur le premier marché ciblé de la campagne (« United Kingdom »). D'où Irlande d'un côté, UK de l'autre — et aussi des erreurs isolées sur d'autres lignes (sazerac.com et knoxbev.com sont américains mais marqués United Kingdom).

Effet secondaire visible dans les mêmes données : plusieurs sociétés cliqueuses portent encore le domaine brut comme nom (`jacewines.com`, `tokajwijn.nl`) et certaines descriptions contiennent des mots hésitants (« suggère », « probablement »).

## Ce qu'on va faire

1. **Fusionner au lieu de dupliquer, sur la base du domaine**
   À l'import des cliqueurs, si une ligne existe déjà pour le même domaine dans la campagne, on ne crée pas de nouvelle ligne. La ligne « formulaire » reste la référence (elle porte les vraies infos société, contact et pays). Les adresses génériques (gmail, outlook…) restent dédoublonnées à l'email exact, puisque le domaine n'y identifie pas une société.

2. **Ne plus inventer le pays**
   Pour un domaine sans TLD pays (`.com`, `.net`…), on n'applique plus le marché de la campagne par défaut : le pays est laissé à l'enrichissement IA (déduit de la société réelle), et vide si indéterminable, plutôt qu'un pays faux.

3. **Nettoyage des données existantes de la campagne**
   Suppression des deux lignes cliqueur en doublon (theirishcellar.com, rareandfinewine.com), la ligne formulaire étant conservée. Puis relance de « Tout ré-enrichir » sur la campagne pour recalculer les pays et remplacer les noms encore égaux au domaine brut.

4. **Vérification sur les autres campagnes**
   Même contrôle doublon-par-domaine passé sur l'ensemble des campagnes, pour nettoyer les cas identiques ailleurs.

## Détails techniques

- `supabase/functions/sync-brevo-campaign/index.ts` : l'ensemble `known` indexe aussi les domaines non génériques déjà présents dans `campaign_interested_contacts` et `leads` pour la campagne ; `marketFor()` renvoie `null` au lieu de `defaultMarket` quand aucun TLD pays ne correspond.
- `supabase/functions/enrich-campaign-prospects/index.ts` : le pays vide est traité comme « à remplir » (déjà le cas via `countryIsDefault`), pas de changement de contrat.
- Nettoyage via migration SQL ciblée (suppression des lignes `origin = 'click'` dont le domaine existe déjà en `origin = 'form'` sur la même campagne).
- Aucun changement de schéma, aucune modification de la vue utilisateur.
