## Objectif

Permettre à chaque utilisateur de choisir quelles informations afficher sur les cartes du Kanban CRM (Pipeline). Aujourd'hui les champs sont figés ; on ajoute un menu "Personnaliser" avec des cases à cocher.

## Champs disponibles

Liste proposée (toutes les infos déjà présentes sur les leads) :

- Nom du contact (prénom + nom)
- Email
- Téléphone
- Pays (avec drapeau)
- Provenance (badge Sur-mesure / source)
- Campagne d'origine
- Actions demandées (price list, samples, etc.)
- Étiquette température (hot/warm/cold)
- Date de dernière activité / inactivité
- Rappel (reminder)

**Toujours visibles (non désactivables)** : Nom de société (titre de la carte) + poignée de glisser/déposer. Tout le reste est optionnel.

**Sélection par défaut** (correspond à ce qui s'affiche aujourd'hui pour ne rien casser) : Nom du contact, Email, Téléphone, Pays, Provenance, Campagne, Actions demandées, Température, Inactivité, Rappel.

> Note : "date d'ajout" n'est actuellement pas affichée sur les cartes (on affiche "dernière activité"). Je l'ajoute aussi comme option si tu veux l'avoir. À confirmer en commentaire si tu préfères remplacer l'inactivité par la date de création.

## UX

- Bouton **"Personnaliser la vue"** (icône `Eye` / `Sliders`) à côté de "Gérer les étapes" dans l'en-tête du Pipeline.
- Ouvre un `DropdownMenu` (ou petit `Popover`) avec une liste de `Checkbox` — une par champ.
- Changement appliqué instantanément à toutes les colonnes.
- Préférences **persistées dans `localStorage`** par utilisateur (clé `pipeline-card-fields:<user_id>`). Pas de migration BDD nécessaire, c'est un réglage purement visuel et propre au navigateur.

## Implémentation technique

Fichier unique modifié : `src/pages/Pipeline.tsx`

1. Définir un type `CardField` (union des clés ci-dessus) et un tableau `ALL_CARD_FIELDS` avec leurs labels i18n.
2. Hook `useState<Set<CardField>>` initialisé depuis `localStorage` (fallback = ensemble par défaut).
3. `useEffect` qui sauvegarde dans `localStorage` à chaque changement.
4. Nouveau composant local `CardFieldsMenu` (DropdownMenu + Checkbox) rendu dans l'en-tête.
5. Dans le rendu de chaque carte, envelopper chaque bloc existant (email, téléphone, pays, etc.) par `visibleFields.has('email') && (...)`.
6. Ajouter les clés i18n dans `src/i18n/locales/fr.json` et `en.json` sous `pipeline.customize` :
   - `button` : "Personnaliser" / "Customize"
   - `title` : "Afficher sur les cartes" / "Show on cards"
   - une entrée par champ (`fields.email`, `fields.phone`, etc.)

## Hors périmètre

- Vue Liste (`Prospects.tsx`) inchangée — déjà personnalisable via les colonnes existantes.
- Pas de modification de la base de données.
- Pas de synchronisation des préférences entre appareils (localStorage uniquement). Si tu veux une persistance serveur plus tard, on pourra ajouter une colonne `pipeline_card_fields jsonb` sur `user_settings`.
