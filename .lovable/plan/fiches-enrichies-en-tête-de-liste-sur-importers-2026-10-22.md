# Fiches enrichies en tête de liste sur /importers

## Résultat attendu
Dans chaque pays (avec ou sans recherche), les importateurs ayant une fiche enrichie apparaissent en premier, triés par ordre alphabétique, puis tous les autres, eux aussi par ordre alphabétique. La pagination (10 par page), la sélection multiple, les crédits et les exports restent identiques.

## Ce qui change
- Liste par pays : le tri se fait côté serveur pour que l'ordre reste juste d'une page à l'autre (et pas seulement sur la page affichée).
- Recherche : même priorité appliquée aux résultats de recherche.
- Exports « pays » et « recherche » : même ordre que la liste affichée, pour que le fichier corresponde à ce que l'utilisateur voit (le nombre de lignes exportées et les crédits ne changent pas).
- Aucun nouveau badge ni changement visuel (le badge « Profil enrichi » existant reste dans le panneau).

## Définition de « fiche enrichie »
Un contact qui possède une ligne dans les données d'enrichissement (tous statuts : verified, partial, review_needed). À confirmer si vous préférez ne prioriser que les fiches au statut validé.

## Détails techniques
- Nouvelle RPC `list_buyer_contacts(_countries text[], _offset int, _limit int)` SECURITY DEFINER, mêmes contrôles d'accès que `search_buyer_contacts` (auth.uid() requis, essais ExportVins exclus comme pour /importers), renvoie `row_data` + `total_count`, ordre `ORDER BY (EXISTS enrichment) DESC, company_name ASC, id`. Aucune colonne d'enrichissement exposée, seulement l'ordre. EXECUTE pour `authenticated` uniquement.
- `search_buyer_contacts` : ajout du même critère de priorité dans son ORDER BY (logique de filtre inchangée).
- `src/pages/Importers.tsx` : liste et export « pays » appellent la nouvelle RPC (pagination par lots de 100 pour l'export, comme la recherche). L'export de sélection garde son tri alphabétique local.
- Aucune modification de buyer_contacts, RLS des tables enrichies, crédits, CRM, campagnes ou routines d'enrichissement.
- Tests : RPC refusée pour anon, ordre vérifié par requête (enrichis puis alphabétique), pagination page 1/2 cohérente.
