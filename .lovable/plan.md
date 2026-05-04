
# Simplifier l'onboarding wizard : guide pédagogique au lieu de formulaire

## Objectif

Transformer le wizard de bienvenue d'un **formulaire de saisie** (où le domaine remplit nom, région, marchés, etc.) en un **tour guidé pédagogique** qui :
- Explique en 4 étapes ce qu'il faut faire pour bien démarrer sur WineExporters
- Renvoie le domaine vers les bonnes pages (Profil, Campagnes) pour qu'il agisse lui-même
- Garde la même structure visuelle (modal plein écran, barre de progression, dismissible)

## Nouvelle structure des 4 étapes

Toutes les étapes deviennent **informatives** avec une icône, un titre, une description courte et un CTA "Aller à...".

```text
Step 1/4 — Bienvenue 🍷
  Pitch produit + ce qu'on va couvrir (inchangé, déjà pédagogique)
  CTA: "Commencer le tour"

Step 2/4 — Complétez votre profil domaine
  Icône Grape. Texte: "Renseignez votre domaine (nom, région, cuvées,
  certifications, volumes). C'est la base pour cibler les bons importateurs."
  Liste à puces des champs à remplir (nom, région, types de vins, volume,
  certifs, gamme de prix)
  CTA primaire: "Aller à mon profil" → /profile
  CTA secondaire: "Étape suivante"

Step 3/4 — Choisissez vos marchés cibles
  Icône Globe. Texte: "Indiquez les marchés que vous visez en priorité
  (Scandinavie, Benelux, DACH, UK, USA, Asie...). Vous pourrez les modifier
  à tout moment."
  Aperçu des marchés disponibles (chips visuelles non-cliquables, juste
  pour montrer)
  CTA primaire: "Définir mes marchés" → /profile (section marchés)
  CTA secondaire: "Étape suivante"

Step 4/4 — Lancez votre première campagne
  Icône Megaphone. Texte: "Une fois votre profil prêt, créez une campagne
  ciblée. Notre équipe la valide manuellement avant envoi."
  Mini-checklist visuelle: ✓ Profil complété  ✓ Marchés définis  → Campagne
  CTA primaire: "Créer ma première campagne" → /create-campaign
  CTA secondaire: "Accéder à mon tableau de bord" → /dashboard
```

## Comportement

- **Aucune écriture en base** pendant les étapes (plus de `persistStep2` / `persistStep3`).
- À la fin (clic sur n'importe quel CTA final OU "Terminer le tour"), on appelle `markCompleted()` qui :
  - met `profiles.onboarding_completed = true`
  - met `localStorage.onboarding_completed = "true"`
  - puis redirige vers la destination du CTA choisi
- "Passer pour l'instant" et la croix X restent inchangés (set `onboarding_dismissed_at`).
- Possibilité de revenir en arrière entre les étapes.
- Le hook `useOnboarding` reste **inchangé** : il continue à calculer `progress.domain / markets / campaign` en lisant le profil et les campagnes — ça alimente toujours la bannière `OnboardingResumeBanner` et la checklist sidebar.

## Changements de code

**Fichier modifié : `src/components/onboarding/OnboardingWizard.tsx`**
- Supprimer tout le state de formulaire (`domainName`, `region`, `wineTypes`, `volume`, `certifs`, `priceRange`, `markets`, `otherMarket`).
- Supprimer le `useEffect` de pré-remplissage du profil.
- Supprimer `persistStep2` et `persistStep3`.
- Supprimer les composants `StepDomain` et `StepMarkets`.
- Créer 3 nouveaux composants pédagogiques : `StepProfileGuide`, `StepMarketsGuide`, `StepCampaignGuide`, chacun avec icône, description, liste/aperçu, et 2 CTA (action + suivant).
- Garder `StepWelcome` et `markCompleted` / `dismiss`.
- Ajouter un helper `goTo(path: string)` qui appelle `markCompleted()` puis `navigate(path)`.

**Fichier modifié : `src/i18n/locales/fr.json` et `en.json`**
- Remplacer les clés `onboarding.step2.*` (champs de formulaire) par des clés pédagogiques :
  `onboarding.step2.title`, `subtitle`, `bullets.*`, `ctaGoProfile`
- Remplacer `onboarding.step3.*` de la même façon : titre, description, `ctaGoMarkets`
- Adapter `onboarding.step4.*` : ajouter `ctaCreateCampaign` et `ctaDashboard`
- Garder les clés `welcome.*`, `skip`, `start`, `nextStep`, `stepCounter`, `brand`.

**Fichiers non modifiés** :
- `useOnboarding.tsx` — la logique de détection du first-visit reste identique
- `OnboardingResumeBanner.tsx` — continue à fonctionner via le hook
- `DashboardLayout.tsx` — déclenchement inchangé
- Page Help — le lien "Revoir le tutoriel" continue à fonctionner via l'event `open-onboarding`

## Avantages

- Onboarding 2× plus rapide (juste lire 4 écrans, pas de saisie obligatoire).
- Le domaine voit où aller dans l'app et utilise la vraie page Profil (qui a tous les champs propres, validations, etc.) au lieu d'un mini-formulaire dupliqué.
- Moins de duplication de logique entre wizard et page Profil.
- La checklist sidebar et la bannière "Reprendre l'onboarding" restent fonctionnelles puisqu'elles lisent l'état réel du profil.
