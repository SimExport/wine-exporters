# Version anglaise de la homepage alignée sur le nouveau texte français

## Objectif
Mettre la version anglaise de la page d'accueil au même niveau que la nouvelle version française : mêmes messages, même structure, mêmes chiffres — rédigés en anglais naturel (pas une traduction mot à mot), avec le même ton direct, concret et professionnel.

## Périmètre
- `src/i18n/locales/en.json`, uniquement le bloc `landing.*`.
- Aucune modification de `LandingPage.tsx` : les 5 ajustements d'affichage sont déjà en place et fonctionnent pour les deux langues.
- Aucun changement de mise en page, de couleurs, de boutons, de liens ou de fonctionnement.

## Textes anglais prévus

### Hero
- Eyebrow : "The export platform for wine estates"
- Titre : "Find the right importers." / "Grow your export sales."
- Sous-titre : "Access 23,000+ verified importers, target the right buyers and let us run your outreach campaigns — all in one platform."
- Boutons inchangés.
- `hero.database` : "23,000+ verified importers across 145+ countries"

### Bandeau de preuve
"23,000+ VERIFIED IMPORTERS" · "145+ COUNTRIES" · "1 TARGETED SEARCH / MONTH" · "1 MANAGED CAMPAIGN / MONTH"

### Section problème
- Titre : "You know how to make your wines. Finding the right importers is another story."
- Trois cartes : heures perdues à chercher les contacts, prospection sans réponse, opportunités difficiles à suivre.
- Nouvelle clé `pain.transition` : "WineExporters brings sourcing, outreach and export follow-up together in a single platform."

### Section produit (5 piliers)
- Titre : "Everything you need to grow your export markets."
- Base : "23,000+ importers. Not 23,000 scraped rows." + texte incluant "145+ countries, direct contact details, filters by market and profile."
- Recherche ciblée, campagne (avec la 3e puce "Results centralised in your account"), CRM (4 puces), opportunités (3 puces).
- `method.databaseCallout` : "23,000+ verified importers across 145+ countries."

### Modèle hybride
- Titre : "Independent when you want. Supported when you need it."
- Texte correspondant au texte français.

### Statistiques
- Nouvelles clés `bigStats.title` et `bigStats.text`.
- Trois chiffres : "23,000+ — Verified importers", "145+ — Countries covered", "1 + 1 — One targeted search + one managed campaign every month".

### Résultats clients
- Titre : "New markets. Not just new contacts."
- Intro : exemples de marchés ouverts, formulation alignée sur le français.

### Tarifs
- Titre : "One subscription. The whole platform."
- Sous-titre : "Your entire export development for €199 excl. VAT / month."
- Engagement : "No commitment. Cancel anytime."
- Six inclusions alignées sur la liste française.
- Suppression de la promesse "paid back from the first pallet".

### CTA final
- Titre : "Your next market starts with the right importer."
- Nouvelle clé `finalCta.subtitle`, alignée sur le français.

### FAQ
Structure et réponses inchangées, comme côté français.

## Détails techniques
- Clés à ajouter côté anglais (aujourd'hui absentes, donc affichées en français par repli) : `pain.transition`, `method.step2.bullet3`, `bigStats.title`, `bigStats.text`, `finalCta.subtitle`.
- `bigStats.items` passe de 2 à 3 entrées pour correspondre à la grille à 3 colonnes déjà en place.
- Aucune clé supprimée : les clés non affichées restent en place pour éviter tout texte manquant.

## Vérification
- JSON valide et build sans erreur.
- Plus aucune mention de "21,000" ou "140" dans le bloc `landing` anglais.
- Aperçu de la page en anglais sur ordinateur et mobile pour confirmer l'absence de texte français résiduel et de régression de mise en page.
