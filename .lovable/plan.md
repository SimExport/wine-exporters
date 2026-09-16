# Nouvelle page publique : analyse de marché

Formulaire public en 4 étapes sur `/market-analysis`, accessible sans compte, qui enregistre la demande dans une nouvelle table dédiée. Aucun résultat, aucune IA à cette étape.

## Ce que verra le visiteur

- Une page centrée, sobre, aux couleurs WineExporters (bordeaux, fond crème), responsive mobile et desktop.
- Un indicateur de progression 1/4 → 4/4, transitions douces entre les étapes, bouton Retour dès l'étape 2, Continuer aux étapes 1 à 3.
- Étape 1 « Parlez-nous de votre domaine » : nom du domaine, nom et prénom, email professionnel, site internet, pays / région / appellation.
- Étape 2 « Quels vins souhaitez-vous développer à l'export ? » : types de vins (cases à cocher), appellations ou cuvées, fourchette de prix EXW (choix unique), certifications (facultatif ; cocher « Aucune » décoche les autres).
- Étape 3 « Quel marché souhaitez-vous développer ? » : pays ciblé (liste complète, avec recherche, un seul pays), types d'importateurs (facultatif ; « Je préfère laisser WineExporters sélectionner » décoche les autres), acteurs à éviter.
- Étape 4 « Une dernière chose » : précision libre, phrase de rappel avant le bouton, CTA « Analyser mon marché » et texte explicatif en dessous.
- Sous le bouton, une mention : « En envoyant ce formulaire, vous acceptez que WineExporters utilise ces informations pour préparer votre analyse. Voir notre politique de confidentialité. » (pas de case à cocher).
- Après envoi : « Votre demande a bien été enregistrée. » / « Nous préparons la prochaine étape de votre analyse. »

## Règles de saisie

- Les valeurs sont conservées quand on revient en arrière.
- Impossible de continuer si un champ obligatoire est vide ou si l'email est invalide ; les messages d'erreur s'affichent sous le champ concerné.
- Aucun rechargement de page entre les étapes.
- Bouton désactivé pendant l'envoi avec état de chargement, pour éviter les doubles soumissions ; en cas d'échec, message d'erreur clair et possibilité de réessayer.

## Anti-robots (léger)

- Un champ piège invisible (honeypot), invisible pour un visiteur mais rempli par la plupart des robots : si le champ est rempli, la page affiche la confirmation sans rien enregistrer.
- Un délai minimum entre l'ouverture de la page et l'envoi (quelques secondes) pour écarter les envois automatiques instantanés.
- Pas de CAPTCHA en V1.

## Détails techniques

Fichiers créés :
- `src/pages/MarketAnalysis.tsx` — page publique, gestion des 4 étapes et de l'envoi.
- `src/components/market-analysis/` — sous-composants d'étapes (`StepWinery`, `StepWines`, `StepMarket`, `StepDetails`), un sélecteur de pays avec recherche (Popover + Command, alimenté par `COUNTRIES` de `src/components/importers/country-data.ts`) et un fichier de configuration des options (types de vins, prix, certifications, profils d'importateurs) — architecture prête à brancher un traitement automatique et une page de résultats plus tard.

Fichiers modifiés :
- `src/App.tsx` — ajout de la route publique `/market-analysis` (hors `DashboardLayout`, hors `ProtectedRoute`).
- `src/i18n/locales/fr.json` et `en.json` — nouvelles clés `marketAnalysis.*` (textes FR fournis ; version EN traduite en cohérence, à relire).

Table Supabase `prospect_market_searches` : `id`, `created_at`, `winery_name`, `contact_name`, `email`, `website`, `winery_location`, `wine_types text[]`, `appellations_cuvees`, `export_price_range`, `certifications text[]`, `target_country`, `importer_preferences text[]`, `exclusions`, `additional_context`, `status` (défaut `new`), `source`, `campaign`, `referrer` (ces trois derniers présents mais non utilisés visuellement pour l'instant).

Accès (strict) :
- `GRANT INSERT` uniquement à `anon` et `authenticated` (aucun `SELECT`, `UPDATE`, `DELETE`), `GRANT ALL` à `service_role`.
- RLS activée avec une seule policy : insertion pour `anon` et `authenticated`. Aucune policy de lecture, de modification ou de suppression : un visiteur ne peut ni relire sa demande ni voir celles des autres. La consultation se fera plus tard via une interface authentifiée réservée aux administrateurs (policy de lecture ajoutée à ce moment-là, basée sur `has_role(auth.uid(), 'admin')`).
- L'identifiant reste un `uuid` aléatoire (`gen_random_uuid()`), jamais séquentiel : il servira de base au lien unique de la future page de résultats. Aucune route publique ne devra exposer d'identifiant prévisible.

Non inclus à cette étape : page de résultats, traitement automatique, email de notification, entrée dans l'espace admin, page « politique de confidentialité » (le lien pointera vers la page existante si elle existe, sinon il faudra me le confirmer).

## Point à valider

Les textes anglais ne sont pas fournis : je les traduirai à partir du français pour rester cohérent avec le reste du site bilingue. Dites-moi si vous préférez une page uniquement en français.
