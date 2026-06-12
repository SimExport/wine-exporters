## 1. Admin `/admin/opportunites` — colonne "Message" éditable

Dans `src/components/admin/TallyCsvImporter.tsx`, ajouter une colonne **Message** dans le tableau preview :

- `<TableCell>` contenant un `<Textarea>` shadcn (rows=2, taille compacte, `min-w-[200px]`) toujours visible, lié à `r.requirements` via `onChange` → met à jour la ligne dans `rows`.
- L'admin peut éditer, vider complètement, ou reformuler avant import.
- La valeur (string vide → `null`) est celle insérée dans `importer_requests.requirements` au moment du bulk INSERT (logique existante inchangée).
- Pas de validation : texte libre.

Aucune autre modification de la logique CSV/parsing/import.

## 2. Page utilisateur `/opportunites` — refonte visuelle

Fichier : `src/pages/Opportunities.tsx`.

### 2.1 Header
- Titre : **« Importateurs en recherche active »** (Georgia, conservé).
- Sous-titre : **« Des acheteurs ont laissé leurs coordonnées pour trouver leur prochain fournisseur. Découvrez aussi les appels d'offres officiels en cours sur les marchés monopoles. »**
- Clés i18n `opportunities.title` / `opportunities.subtitle` mises à jour (FR + EN).

### 2.2 Drapeaux pays (emoji)
- Helper `countryFlag(name: string): string` placé en haut du fichier : mapping nom de pays (FR + EN, lowercased, trimmed) → emoji drapeau (Suède 🇸🇪, France 🇫🇷, Belgique 🇧🇪, Allemagne 🇩🇪, Royaume-Uni 🇬🇧, États-Unis 🇺🇸, Canada 🇨🇦, Suisse 🇨🇭, Pays-Bas 🇳🇱, Italie 🇮🇹, Espagne 🇪🇸, Norvège 🇳🇴, Finlande 🇫🇮, Danemark 🇩🇰, Japon 🇯🇵, Chine 🇨🇳, etc.). Fallback : 🌍.
- Carte demande directe : remplace `<Globe />` + nom pays par `<span className="text-2xl">{flag}</span><span>{country}</span>`.
- Carte appel d'offres : même traitement sur `market` (Systembolaget Suède → 🇸🇪 etc., détection par mot-clé pays dans la string market).

### 2.3 Hiérarchie & pills colorées
Tokens existants (`--primary` bordeaux, ajout d'un token doré). Ajouter dans `src/index.css` :

```css
--gold: 42 55% 60%;          /* doré #c9a96e */
--gold-foreground: 345 50% 15%;
```

Et dans `tailwind.config.ts > colors`, ajouter :

```ts
gold: { DEFAULT: 'hsl(var(--gold))', foreground: 'hsl(var(--gold-foreground))' },
```

Carte demande directe — nouveau layout (espacements `space-y-4`, padding `pt-6 px-5 pb-5`) :

1. Ligne 1 : drapeau + pays (text-base font-semibold) ⟷ date (text-xs muted).
2. Ligne 2 : nom société (text-sm font-medium).
3. Ligne 3 (pills wrap, `flex flex-wrap gap-2`) :
   - `wine_styles` → pill bordeaux (`bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs`).
   - `volume` → pill doré (`bg-gold text-gold-foreground rounded-full px-3 py-1 text-xs`).
   - `origins` → pill outline (`border border-primary/30 text-primary rounded-full px-3 py-1 text-xs`).
4. `requirements` : seulement si non vide après trim → `<p className="text-xs text-muted-foreground/80 leading-relaxed mt-1">{requirements}</p>` (pas de bordure / italique). Si vide → pas de bloc.

Carte appel d'offres — même esprit :
- En-tête : drapeau + market (font-semibold) / référence (mono xs muted) — deadline badge à droite.
- `designation_origin` en titre (text-base font-medium).
- Pills : `category` (bordeaux), `available_volume` (doré), `vintage` (outline), `price` (doré outline).
- `style_profile` et `requirements` en `text-xs text-muted-foreground/80`, conditionnels.

### 2.4 Footer commission (bandeau)
Sous les `<Tabs>` (donc toujours visible) :

```tsx
<div className="mt-8 rounded-md bg-muted/40 border border-border/50 px-4 py-3 text-center text-xs text-muted-foreground">
  WineExporters ne prend aucune commission sur les demandes directes et appels d'offres. Les coordonnées des importateurs et agents vous sont communiquées directement, à vous de mener la relation.
</div>
```

Clé i18n `opportunities.commissionNotice` (FR + EN).

## 3. Hors scope
- Pas de modification des tables, RLS, edge function, logique CRM, boutons "Répondre" / "Ajouter au CRM".
- Pas de touche aux autres pages.
- Pas de refactor en sous-composants (tout reste dans `Opportunities.tsx`) pour limiter les fichiers touchés.

## Fichiers modifiés
- `src/components/admin/TallyCsvImporter.tsx` — colonne Message éditable.
- `src/pages/Opportunities.tsx` — refonte cartes, drapeaux, header, footer.
- `src/index.css` — token `--gold`.
- `tailwind.config.ts` — couleur `gold`.
- `src/i18n/locales/fr.json` + `en.json` — title, subtitle, commissionNotice.
