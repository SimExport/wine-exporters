# Bloc « Vidéos pratiques » sur /ressources

Ajouter, sous le bloc « Ressources essentielles », une section « Vidéos pratiques » avec 5 vidéos Loom existantes, ouvertes dans un modal responsive au clic. Aucune autre page ou section modifiée.

## Changements

### 1. `src/pages/Resources.tsx` (seul fichier de code modifié)

**Configuration des vidéos** (en haut du fichier, comme les autres blocs) :

```ts
interface PracticalVideo {
  slug: "sendSamples" | "confirmReceipt" | "tastingFeedback" | "negotiateFirstOrder" | "postOrderFollowUp";
  loomEmbedUrl: string;
}

const PRACTICAL_VIDEOS: PracticalVideo[] = [
  { slug: "sendSamples",           loomEmbedUrl: "https://www.loom.com/embed/4ac94b14e65843afaa809fefc112a4cb" },
  { slug: "confirmReceipt",        loomEmbedUrl: "https://www.loom.com/embed/b4be1b5d48564a51b22fbee48cbff7e8" },
  { slug: "tastingFeedback",       loomEmbedUrl: "https://www.loom.com/embed/761b4b30c0e94adab177128083dc4013" },
  { slug: "negotiateFirstOrder",   loomEmbedUrl: "https://www.loom.com/embed/ec5f43b2902e408aa91279651c61efd9" },
  { slug: "postOrderFollowUp",     loomEmbedUrl: "https://www.loom.com/embed/870ad90a86ae4410ac71bdcf70553b4e" },
];
```

Ajouter une vidéo plus tard = une entrée dans ce tableau + ses clés i18n, sans toucher au composant.

**État** : `const [activeVideo, setActiveVideo] = useState<PracticalVideo | null>(null)`.

**Section** (sous la grille des ressources essentielles, à l'intérieur du même conteneur `space-y-10`) :

- Titre `<h2 className="text-2xl font-bold text-foreground">` + sous-titre `text-muted-foreground` (même pattern que le bloc « Ressources essentielles »).
- Grille `grid gap-4 sm:grid-cols-2` (1 colonne mobile, 2 desktop).

**Carte vidéo** (`Card` + `CardContent p-4`, cohérente avec les cartes existantes) :

- Zone miniature 16:9 : `div aspect-video w-full rounded-md bg-primary/10` cliquable (`cursor-pointer`, `onClick` ouvre le modal), avec icône `Play` (lucide) centrée dans un cercle `bg-background/80`. Aucune iframe chargée dans la page : pas de lecture automatique, pas de chargement des 5 iframes.
- Titre `text-sm font-semibold`, description `text-sm text-muted-foreground`.
- CTA « Voir la vidéo » : bouton texte discret `text-primary` + icône `Play`, `onClick` ouvre le même modal.

**Modal** : composant `Dialog` shadcn existant (`@/components/ui/dialog`) :

- `open={!!activeVideo}`, `onOpenChange` remet `activeVideo` à `null` (fermeture via croix, clic sur l'overlay ou touche Échap — natif au Dialog).
- `DialogContent` en `max-w-3xl` contenant un wrapper `aspect-video w-full` avec l'`<iframe src={activeVideo.loomEmbedUrl} allowFullScreen>` rendue **uniquement quand le modal est ouvert** (rendu conditionnel → l'iframe se décharge à la fermeture, aucune perturbation du reste de la page).
- `DialogTitle` avec le titre de la vidéo (accessibilité ; peut être visuellement discret).

### 2. Traductions `src/i18n/locales/fr.json` et `en.json`

Nouvelle branche `resources.videos`, clés explicites par vidéo :

```json
"videos": {
  "title": "Vidéos pratiques",
  "subtitle": "Des conseils concrets pour faire avancer vos échanges avec les importateurs, de l'envoi des échantillons jusqu'au suivi après commande.",
  "cta": "Voir la vidéo",
  "items": {
    "sendSamples":         { "title": "…", "description": "…" },
    "confirmReceipt":      { "title": "…", "description": "…" },
    "tastingFeedback":     { "title": "…", "description": "…" },
    "negotiateFirstOrder": { "title": "…", "description": "…" },
    "postOrderFollowUp":   { "title": "…", "description": "…" }
  }
}
```

Textes FR et EN exactement tels que fournis dans la demande. `cta` : « Voir la vidéo » / « Watch video ».

## Hors périmètre

- Aucune autre page, section ou navigation modifiée.
- Pas de lecture automatique ni de préchargement des iframes Loom.
- Pas de nouvelle dépendance (Dialog shadcn et lucide-react déjà présents).

## Vérifications

- `bunx tsgo -p tsconfig.app.json --noEmit` OK.
- JSON des deux locales valides.
- Design : tokens existants (`bg-primary/10`, `text-muted-foreground`, Card shadcn), aucune couleur ni dégradé hardcodé.
