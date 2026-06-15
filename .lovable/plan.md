## Objectif
Ajouter sur la fiche d’un prospect CRM un bouton d’actions permettant d’archiver ou supprimer le prospect, avec confirmations pour éviter les erreurs.

## Fonctionnement prévu
- Ajouter un bouton menu d’actions à droite du header de la fiche prospect, à côté de `Éditer`.
- Action `Archiver` : masque le prospect du CRM courant sans supprimer ses données.
- Action `Supprimer` : supprime définitivement le prospect après confirmation explicite.
- Après succès, afficher un toast puis rediriger vers le CRM (`/pipeline`).
- En cas d’erreur, afficher un toast d’erreur clair.

## Impact CRM
- Les prospects archivés ne s’afficheront plus dans la vue Kanban ni dans la vue Liste.
- La suppression retirera aussi les éléments liés déjà configurés en cascade côté base quand applicable, comme les notes et échantillons liés.

## Détails techniques
- Ajouter un champ d’archivage léger sur `public.leads` : `archived_at timestamptz`.
- Mettre à jour les types Supabase locaux pour inclure `archived_at`.
- Filtrer les requêtes CRM existantes avec `archived_at IS NULL` dans `ProspectDetail`, `Pipeline` et `Prospects`.
- Ajouter une politique RLS `DELETE` sur `leads` pour permettre à un utilisateur de supprimer uniquement les prospects de ses propres campagnes.
- Implémenter les boutons/actions dans `src/pages/ProspectDetail.tsx` avec les composants de confirmation existants.
- Ajouter les traductions FR/EN nécessaires.