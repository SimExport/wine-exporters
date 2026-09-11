# Mise à jour du copywriting homepage (FR)

## Objectif
Remplacer le texte français de la homepage par la nouvelle version fournie, avec le nouveau positionnement, les chiffres à jour et le ton demandé. Aucune modification fonctionnelle, visuelle ou technique au-delà des ajustements JSX minimaux nécessaires pour afficher les nouveaux textes.

## Périmètre
- `src/i18n/locales/fr.json` : toutes les clés `landing.*` utilisées par `LandingPage.tsx`, plus les clés non affichées mais encore présentes dans la section homepage.
- `src/pages/LandingPage.tsx` : uniquement les 5 micro-modifications JSX listées et confirmées ci-dessous.
- **Aucun texte nouveau en dur dans le JSX** : tous les libellés ajoutés ou modifiés vivent dans `fr.json`. Les textes déjà en dur dans les maquettes visuelles (tableaux/Kanban de démonstration) ne sont pas touchés.

Hors périmètre : locale anglaise, autres pages, dashboard, base importateurs, réponses FAQ, composants, routes, APIs.

## Mapping des textes

### Hero
- `landing.hero.badge` → "La plateforme export des domaines viticoles"
- `landing.hero.titleLead` → "Trouvez les bons importateurs.\n"
- `landing.hero.titleHighlight` → "Développez vos ventes à l’export."
- `landing.hero.subtitle` → "Accédez à 23 000+ importateurs vérifiés, ciblez les bons acheteurs et confiez-nous vos campagnes de prospection — le tout depuis une seule plateforme."
- CTAs `ctaPrimary` / `ctaSecondary` inchangés.

### Bandeau de preuve (Marquee)
- `landing.marquee.items` →
  ```text
  ["23 000+ importateurs vérifiés", "145+ pays", "1 recherche ciblée / mois", "1 campagne gérée / mois"]
  ```

### Section problème
- `landing.pain.title` → "Vous savez produire vos vins. Trouver les bons importateurs est une autre histoire."
- `landing.pain.items.search.title` / `.text`
- `landing.pain.items.silence.title` / `.text`
- `landing.pain.items.tracking.title` / `.text`
- Nouvelle clé `landing.pain.transition` → "WineExporters réunit la recherche, la prospection et le suivi export dans une seule plateforme."

### Section méthode / produit
- `landing.method.title` → "Tout ce qu’il faut pour développer vos marchés export."
- `landing.method.step0.title` / `.text` : base de données. Les points supports ("145+ pays · Coordonnées directes · Filtres par marché et profil") sont ajoutés en **courte phrase finale** dans le texte existant — pas de liste à puces ajoutée, pour préserver la grille actuelle et la lisibilité.
- `landing.method.step1.title` / `.text` : recherche ciblée.
- `landing.method.step2.title` / `.text` / `.bullet3` : campagne (ajout d’une 3e puce via clé i18n).
- `landing.method.step3.title` / `.text` / `.bullet1` à `.bullet4` : CRM.
- `landing.method.step4.title` / `.text` / `.bullet1` à `.bullet3` : opportunités.

### Section modèle hybride (synthèse)
- `landing.synthesis.title` → "Autonome quand vous le voulez. Accompagné quand vous en avez besoin."
- `landing.synthesis.text` → "Explorez la base, consultez vos opportunités et pilotez votre pipeline en autonomie. Pour les tâches les plus chronophages, comme la recherche ciblée et les campagnes, notre équipe prend le relais."
- La mise en page deux colonnes gauche/droite n’est pas ajoutée car le bloc actuel est centré en une seule colonne.

### Statistiques
- Nouvelles clés `landing.bigStats.title` et `landing.bigStats.text`.
- `landing.bigStats.items` →
  ```text
  value: "23 000+", label: "Importateurs vérifiés"
  value: "145+", label: "Pays couverts"
  value: "1 + 1", label: "Recherche ciblée + campagne gérée chaque mois"
  ```
- Le bloc "15 minutes pour lancer une campagne" disparaît donc au profit des nouveaux chiffres demandés.

### Résultats clients
- `landing.testimonials.title` → "De nouveaux marchés. Pas seulement de nouveaux contacts."
- `landing.testimonials.subtitle` → "Quelques exemples de marchés ouverts grâce à notre accompagnement ExportVins et aux outils aujourd’hui réunis dans WineExporters."
- Cartes et témoignages conservés tels quels.

### Tarifs
- `landing.pricing.title` → "Un abonnement. Toute la plateforme."
- `landing.pricing.subtitle` → "Tout votre développement export pour 199 € HT / mois."
- `landing.pricing.inclusions` → liste fournie.
- Prix, engagement et CTA conservés.

### CTA final
- `landing.finalCta.title` → "Votre prochain marché commence par le bon importateur."
- Nouvelle clé `landing.finalCta.subtitle` → "Découvrez comment WineExporters peut vous aider à cibler, contacter et suivre de nouveaux acheteurs à l’international."
- Boutons conservés.

### FAQ
- Structure conservée, réponses non réécrites.

## Les 5 micro-modifications JSX (confirmation)

Toutes sont **purement présentationnelles** : aucune logique, aucun état, aucune donnée, aucun handler, aucune route n’est modifié. Chaque modification ne fait que rendre des clés i18n.

1. **Hero — retour à la ligne du titre.** Ajout de la classe `whitespace-pre-line` sur le `<h1>` existant pour que le `\n` de `landing.hero.titleLead` s’affiche. Mêmes éléments (texte + span surligné), aucun nœud ajouté.
2. **Problème — phrase de transition.** Ajout d’un `<p>` sous la grille des 3 cartes, dans le conteneur existant, rendant `landing.pain.transition`. Un seul nœud texte ajouté.
3. **Campagne — 3e puce.** Ajout de `"bullet3"` dans `pillarsConfig.step2.bulletKeys`. La boucle de rendu existante affiche une puce de plus avec le même markup (`CheckCircle2` + texte). Le texte vient de `landing.method.step2.bullet3`.
4. **Statistiques — en-tête + 3 colonnes.** Ajout d’un bloc titre/sous-titre (`landing.bigStats.title` / `landing.bigStats.text`) au-dessus de `<BigStats>`, et passage de la grille interne de `sm:grid-cols-2` à `sm:grid-cols-3` pour accueillir les 3 statistiques demandées. Ajustement purement visuel.
5. **CTA final — sous-titre.** Ajout d’un `<p>` entre le `<h2>` et la rangée de boutons, rendant `landing.finalCta.subtitle`. Un seul nœud texte ajouté.

## Vérification
- Typecheck (`tsc` / build) sans erreur.
- `rg` sur les clés `landing.*` de `fr.json` : aucun "21 000" / "140" restant dans la section homepage.
- Aperçu desktop et mobile pour confirmer l’absence de régression de mise en page.
- Les CTAs conservent leurs actions actuelles (vidéo Supademo, lien vers `/decouvrir`, lien vers `/demande-demo`).
