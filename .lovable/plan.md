# Supprimer la mention « 72h » lors de la validation / soumission d'une campagne

## Objectif
Quand un utilisateur soumet une campagne (ou la voit en attente de validation), remplacer tout message mentionnant les 72h par la promesse d'emails : un premier email à la validation de la campagne, un second quand les résultats sont disponibles. (Ces deux emails existent déjà côté backend : `notify-campaign-validated` et `notify-campaign-completed`.)

## Périmètre — 3 messages seulement (FR + EN)

1. **Étape 2 de la création de campagne (récapitulatif avant soumission)**
   - `src/i18n/locales/fr.json` → `createCampaign.step2.warningBody`
     - Avant : « Notre équipe prépare votre campagne sous 72h. Vous serez notifié(e) à la validation. Par la suite, sous 7 jours, les importateurs et acheteurs intéressés apparaîtront dans vos espaces Prospects et Pipeline. »
     - Après : « Vous recevrez un email dès la validation de votre campagne, puis un second email dès que les résultats seront disponibles. »
     - Même adaptation en anglais.
   - `warningTitle` reste inchangé.

2. **Bandeau « En attente de validation » (page Campagnes)**
   - `src/components/CampaignStatusBanner.tsx` utilise `campaigns.banner.pendingMessage`.
     - Avant : « Notre équipe prépare votre campagne sous 72h. Vous recevrez une notification à la validation. Sous 7 jours, les importateurs intéressés apparaîtront dans votre espace Prospects. »
     - Après : « Vous recevrez un email dès la validation de votre campagne, puis un second email dès que les résultats seront disponibles. »
     - Même adaptation en anglais.

3. **Toast « Campagne soumise » (après clic sur Soumettre)**
   - `createCampaign.toasts.submitted.description` : « En attente de validation (≤72h) » → « En attente de validation. Vous recevrez un email à la validation, puis un second à la disponibilité des résultats. »

## Hors périmètre (inchangé)
- Badge de statut « En attente de validation » dans les listes (libellé court sans 72h, déjà neutre côté badge).
- Les mentions 72h hors campagne : carte « Recherche sur-mesure » (« Résultats qualifiés sous 72h »), confirmation de demande de recherche sur-mesure, page Aide.
- Backend, Edge Functions, emails existants, RLS, toute autre page.

## Vérification
- Build sans erreur.
- Contrôle visuel Playwright du récapitulatif étape 2 et du bandeau en attente de validation.
