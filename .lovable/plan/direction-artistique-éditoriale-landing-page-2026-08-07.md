# Direction artistique éditoriale — Landing page

Objectif : renforcer l'impact visuel de `/` sans changer le contenu ni l'ordre des sections existantes. Tout le travail reste dans `src/pages/LandingPage.tsx` + les clés i18n FR/EN de la landing.

## Deux points à valider avant implémentation

1. **Typographie serif** : aujourd'hui les titres de la landing sont en sans-serif (police système, aucun serif défini). Pour respecter la demande, je propose d'introduire un serif de titre (Playfair Display ou Cormorant Garamond) appliqué **uniquement aux titres de la landing**, pas au reste de l'app. À confirmer, sinon je garde le sans-serif actuel.
2. **Section "4 fonctionnalités"** : la section Méthode ne contient aujourd'hui que **3 piliers** (recherche ciblée / campagnes / CRM+opportunités). La base de données figure en callout au-dessus. Je propose de la promouvoir en bloc « 01 » pour obtenir les 4 numéros demandés — sans réécrire les textes existants, seulement le titre/sous-titre déjà présents.

## Nouvelle structure de page

```text
Header (inchangé)
1. Hero (inchangé)
NOUVEAU  A. Bandeau marquee défilant (bordeaux)
2. Problématiques (inchangé)
NOUVEAU  B. Punchline plein écran (crème) — texte à valider
3. Méthode — RESTRUCTURÉE en 01/02/03/04 numérotés
NOUVEAU  C. Compteurs statistiques géants (21 000+ / 15 minutes)
4. Synthèse & expertise (inchangé)
4b. Témoignages (inchangé)
NOUVEAU  D. Punchline plein écran (bordeaux) — optionnelle, texte à valider
5. Tarifs (inchangé)
6. FAQ (inchangé)
7. CTA final (inchangé) + Footer (inchangé)
```

## Détail des nouveaux blocs

**A. Marquee** — fond `#59191F`, texte crème `#FAF6F0` en majuscules, tracking large, ~14px mobile / 16px desktop. Contenu : « 21 000 IMPORTATEURS VÉRIFIÉS · 140 PAYS · UNE PLATEFORME, TOUT INCLUS », séparé par un point doré `#C9A84C`. Défilement CSS pur (keyframe `marquee` dans `tailwind.config.ts`, duplication du contenu pour la boucle sans coupure), ~40s, pause au survol, désactivé si `prefers-reduced-motion`.

**B / D. Blocs punchline plein écran** — pleine largeur, padding vertical généreux (96–140px), texte serif centré, 32px mobile → 56/64px desktop, max-width ~5 colonnes. B en aplat crème, D en aplat bordeaux avec texte crème. Copy proposé pour B : « Chaque mois, une nouvelle liste d'importateurs prête à contacter. » Pour D je laisse un placeholder visible `[PUNCHLINE À VALIDER]` tant que tu n'as pas donné le texte — ou je supprime D si tu préfères un seul bloc.

**C. Compteurs statistiques** — 2 chiffres isolés, corps très grand (56px mobile → 96/112px desktop), chiffre en or `#C9A84C`, légende dessous en petit texte bordeaux majuscules. Contenu repris de la brochure : « 21 000+ / importateurs vérifiés dans 140+ pays » et « 15 minutes / pour lancer une campagne ». Légendes exactes à confirmer.

**Méthode numérotée** — chaque pilier reçoit un gros numéro `01`–`04` en or, très grand corps, placé en tête de bloc. En desktop : les 4 blocs alignés horizontalement (grille 4 colonnes, numéro + titre + texte court + puces). En mobile : empilés verticalement. Les visuels de démonstration actuels (tableau importateurs, campagnes, kanban) sont conservés sous la grille ou repositionnés selon lisibilité — je garde le zigzag existant si tu préfères ne pas toucher aux mockups.

## Technique

- Ajout des couleurs de marque en tokens HSL dans `src/index.css` (crème, or déjà présent via `--gold`) et exposition Tailwind si nécessaire — pas de valeurs hexadécimales en dur dans le JSX.
- Keyframes `marquee` ajoutés à `tailwind.config.ts` (aucune dépendance externe).
- Nouveaux textes ajoutés aux fichiers `src/i18n/locales/fr.json` et `en.json` sous `landing.*`.
- Animations d'entrée réutilisant le composant `FadeIn` existant.
- Aucun autre fichier, page, table ou composant modifié. Témoignages, CTA principal et logique du popup Supademo intacts.
