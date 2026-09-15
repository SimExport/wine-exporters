# Bloc « Ressources essentielles » sur /ressources

## Objectif
Ajouter sous les 4 cartes existantes un second bloc de 8 ressources compactes (guides, modèles, vidéos), sans pages de détail ni liens fonctionnels pour l'instant.

## Modifications

### 1. `src/pages/Resources.tsx` (seul fichier de code modifié)
- Nouvelle configuration typée `ESSENTIAL_RESOURCES` avec la structure demandée :
  ```ts
  interface EssentialResource {
    slug: string;        // clé i18n + futur identifiant
    category: string;    // clé i18n de catégorie
    href?: string;       // prêt pour la prochaine itération
    recommended?: boolean;
  }
  ```
  Les 8 entrées : `firstEmail`, `followCampaign` (recommended), `firstEmailAttachments`, `followUpStructure`, `followUpTemplates`, `respondOpportunity`, `sendSamples`, `followUpTasting`.
- Nouveau bloc sous la grille existante :
  - Titre `resources.essential.title` + sous-titre `resources.essential.subtitle` (même style que le hero, en plus discret).
  - Grille `grid gap-4 sm:grid-cols-2` (1 colonne mobile, 2 desktop).
  - Carte compacte (`Card`/`CardContent` existants, padding réduit `p-4`) :
    - Ligne du haut : `Badge` shadcn variante `secondary` pour la catégorie ; si `recommended`, second badge « Recommandé » en variante `outline` avec accent `primary` (sobre, sans dégradé).
    - Titre (`text-sm font-semibold`).
    - Type + durée en `text-xs text-muted-foreground` (icône lucide selon le type : BookOpen / FileText / Video).
    - Description courte (`text-sm`).
    - CTA discret en bas : texte `text-primary` + `ArrowRight`, wrappé dans un `Link` si `href` présent (même pattern que les cartes principales).
- Aucun changement au hero ni aux 4 cartes existantes.

### 2. Traductions `src/i18n/locales/fr.json` et `en.json`
Clés explicites par ressource (pas de tableau) :
```
resources.essential.title
resources.essential.subtitle
resources.essential.badges.recommended
resources.essential.items.firstEmail.{category,title,type,description,cta}
resources.essential.items.followCampaign.{...}
resources.essential.items.firstEmailAttachments.{...}
resources.essential.items.followUpStructure.{...}
resources.essential.items.followUpTemplates.{...}
resources.essential.items.respondOpportunity.{...}
resources.essential.items.sendSamples.{...}
resources.essential.items.followUpTasting.{...}
```
Contenu FR/EN exact fourni dans la demande (y compris « durée à compléter / duration to be added » pour les vidéos).

## Vérification
- Typecheck `bunx tsgo -p tsconfig.app.json --noEmit`.
- Capture Playwright de /ressources (si session disponible) : grille 2 colonnes desktop, badges, bloc sous les 4 cartes.

## Hors périmètre
Pages de détail, liens réels, filtres, vidéos. Aucune autre page ou composant modifié.
