## Contexte

Sur `/campaigns/:id`, la section "Prospects qualifiés" est un tableau où les colonnes **Description** et **Actions recommandées** contiennent des paragraphes entiers issus du CSV admin. Résultat : lignes très hautes, lecture en diagonale difficile, action "Ajouter au CRM" repoussée hors écran, ergonomie médiocre sur laptop.

## Objectif

Rendre l'information scannable en un coup d'œil, tout en gardant accès au texte complet à la demande. Pas de changement de données ni de logique métier — uniquement l'UI de cette section dans `src/pages/CampaignDetail.tsx`.

## Proposition

Remplacer le tableau par une **liste de cartes prospects**, une carte par contact, avec hiérarchie visuelle claire :

```text
┌─────────────────────────────────────────────────────────────┐
│  🏢 True Terroir Ltd                        [5/5]  🇬🇧 UK   │
│  👤 Diego Pistellato · ✉ diego@trueterroir.co.uk            │
│                                                             │
│  Importateur spécialisé UK axé sur les vins de producteurs  │
│  artisanaux, bio, biodynamiques… [Voir plus]                │
│                                                             │
│  ▸ Actions recommandées (repliable)                         │
│                                                             │
│                              [✓ Ajouté]  ou  [+ Au CRM]     │
└─────────────────────────────────────────────────────────────┘
```

### Détails d'ergonomie

1. **En-tête de carte dense** : nom société en titre, score en badge à droite, drapeau + pays (helper `country-flag.ts` déjà en place), contact/email sur une ligne.
2. **Description tronquée à ~3 lignes** (`line-clamp-3`) avec bouton texte "Voir plus / Voir moins" qui déplie inline. Pas de modal — la lecture reste dans le flux.
3. **Actions recommandées dans un `<Collapsible>`** replié par défaut, avec chevron et libellé "Actions recommandées". Icône dédiée (ex. `Sparkles`/`Target`) pour la différencier visuellement de la description.
4. **CTA "Ajouter au CRM"** ancré en bas à droite de la carte, toujours visible sans scroll horizontal. État "Ajouté" garde le même badge vert actuel.
5. **Barre d'outils** au-dessus de la liste :
   - Champ recherche (filtre client sur société / contact / email / description)
   - Tri : Score décroissant (défaut) · Nom · Pays
   - Filtre score (≥ 4, ≥ 3, tous)
   - Bouton "Tout déplier / tout replier" pour les actions
6. **Responsive** : grille 1 colonne mobile, 2 colonnes ≥ `lg`. Cartes de hauteur homogène (flex).
7. **Compteur & progression** : à côté du titre, "X sur Y ajoutés au CRM" avec petite barre de progression, pour donner un sens de complétion à l'utilisateur qui traite la liste.
8. **Vide/aucun résultat de recherche** : `EmptyState` réutilisé (pattern déjà standardisé dans le projet).

### Aspects techniques

- Fichier unique modifié : `src/pages/CampaignDetail.tsx`.
- Composants shadcn déjà présents : `Card`, `Collapsible`, `Input`, `Select`, `Badge`, `Button`, `Progress`.
- Utilitaires : `line-clamp-3` (Tailwind), helper drapeau existant, i18n étendu (`campaigns.detail.interestedContacts.*` : `seeMore`, `seeLess`, `recommendedActions`, `search`, `sortBy`, `expandAll`, `collapseAll`, `progress`).
- Aucune migration, aucun changement de RLS, aucun changement backend.

## Questions avant implémentation

1. OK pour passer du tableau à une **grille de cartes 2 colonnes** en desktop, ou préférez-vous conserver un tableau mais avec description tronquée + expand inline ?
2. Faut-il ajouter la **barre d'outils recherche/tri/filtre** dans cette itération, ou rester minimal (cartes + expand seulement) pour livrer vite ?
