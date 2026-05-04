## Objectif

Améliorer la sélection des marchés à l'étape 1 de `/create-campaign` : élargir la liste, ajouter une option "ouvert à d'autres marchés", et soigner l'UX (drapeaux, compteur visuel, cards interactives).

## Changements

### 1. Constantes & liste des marchés (`src/pages/CreateCampaign.tsx`)

- `MIN_MARKETS` : 3 → **5**
- `MAX_MARKETS` : 10 → **15**
- Restructurer `MARKETS_BY_CONTINENT` en objets `{ name, flag }` :
  - **Europe** : ajouter Portugal 🇵🇹, Romania 🇷🇴, Croatia 🇭🇷, Greece 🇬🇷, Hungary 🇭🇺, Serbia 🇷🇸 (+ existants)
  - **North America** : Canada 🇨🇦, United States 🇺🇸, **Mexico 🇲🇽** (déplacé)
  - **Latin America** (renommé depuis "South America") : Brazil 🇧🇷, Argentina 🇦🇷, Chile 🇨🇱, Colombia 🇨🇴, Peru 🇵🇪
  - **Asia** : + Singapore 🇸🇬, Vietnam 🇻🇳, India 🇮🇳, UAE 🇦🇪
  - **Oceania & Africa** : + Morocco 🇲🇦, Nigeria 🇳🇬

### 2. Nouvel état & persistance

- Nouveau state : `const [openToOtherMarkets, setOpenToOtherMarkets] = useState(false);`
- Persistance dans la table `campaigns` via une nouvelle colonne **`open_to_other_markets boolean default false`** (migration SQL).
- L'inclure dans `campaignData` pour `saveDraft` et `submitForValidation`.
- Mise à jour `src/integrations/supabase/types.ts` automatique via la migration.

### 3. Refonte UI du bloc "Marchés à cibler"

Composants déjà présents (`Card`, `Checkbox`, `Progress`, `Separator`) — pas de nouvelle dépendance.

- **Header sticky** au-dessus de la grille :
  - Badge dynamique : `X/15 marchés sélectionnés`
  - Barre `Progress` : valeur = `(selected/15)*100`, classe couleur conditionnelle (vert `bg-emerald-500` si ≥5, orange `bg-orange-500` si <5) — appliquée via override de l'indicator avec `[&>div]:bg-...`.
- **Section par continent** :
  - Header de région avec fond `bg-muted/60`, padding, coins arrondis, séparateur visuel.
  - Grille `grid-cols-2 md:grid-cols-3 gap-2`.
- **Card pays** (remplace la simple checkbox) :
  - Bouton/div cliquable avec bordure, drapeau emoji + nom + checkmark `Check` quand sélectionné.
  - États :
    - non sélectionné : `border-border bg-card hover:bg-muted/50`
    - sélectionné : `border-primary bg-primary/10 text-primary` + icône check à droite
    - désactivé (max atteint) : `opacity-50 cursor-not-allowed`
- **Checkbox "Ouvert à d'autres marchés"** :
  - Placée en bas, séparée par un `Separator` + fond `bg-muted/30 rounded-lg p-4 border-dashed`.
  - Label : "Je suis ouvert(e) à recevoir des opportunités sur d'autres marchés non listés ci-dessus".
  - Indépendante du compteur min/max.
- **Message d'aide dynamique** (remplace l'`Alert` statique) :
  - 0 sélectionné : "Sélectionnez au moins 5 marchés pour lancer votre campagne."
  - 1–4 : "Encore {{n}} marché(s) à sélectionner pour atteindre le minimum."
  - 5–14 : "Parfait ! Vous pouvez ajouter jusqu'à {{n}} marchés supplémentaires."
  - 15 : "Maximum atteint (15 marchés)."

### 4. Validation & i18n

- `validateStep1` : message mis à jour avec `min: 5`.
- `src/i18n/locales/fr.json` & `en.json` :
  - Ajouter `createCampaign.step1.openToOthersLabel`
  - Ajouter `createCampaign.step1.helperMessages.{empty,partial,good,full}`
  - Renommer `southAmerica` → `latinAmerica` dans `createCampaign.continents`
  - Mettre à jour `marketsCount`, `infoBlock` (5/15)

### 5. Migration SQL

```sql
ALTER TABLE public.campaigns
  ADD COLUMN open_to_other_markets boolean NOT NULL DEFAULT false;
```

## Fichiers touchés

- `src/pages/CreateCampaign.tsx` (constantes, state, render, validation, save/submit)
- `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`
- Nouvelle migration Supabase

## Hors scope

- Pas de changement sur l'étape 2 ni sur d'autres pages (Profil, Importateurs).
- Pas de modification de l'admin/affichage des campagnes — la nouvelle colonne sera simplement disponible.
