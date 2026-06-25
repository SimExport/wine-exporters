# Fix du bouton "Gérer mon abonnement" sur /billing

## Problème
Le bouton appelle l'edge function `create-portal-session`, qui exige que `profiles.stripe_customer_id` soit renseigné. Pour beaucoup d'utilisateurs ce champ est `null` (le webhook Stripe ne l'a pas rempli, ou abonnement créé hors webhook), donc la fonction renvoie une erreur "No Stripe customer ID found" et le toast d'erreur s'affiche.

Une seconde fonction `customer-portal` existe déjà et fait la recherche par email — plus robuste.

## Correction

### `supabase/functions/create-portal-session/index.ts`
- Garder en priorité `profiles.stripe_customer_id` quand il est présent.
- Fallback : si null/introuvable, faire `stripe.customers.list({ email: user.email, limit: 1 })`.
- Si trouvé via email, mettre à jour `profiles.stripe_customer_id` pour la prochaine fois.
- Si toujours rien, renvoyer un 404 explicite ("Aucun abonnement Stripe trouvé pour cet email") au lieu d'une erreur générique.

### `src/pages/Billing.tsx`
- Afficher le message d'erreur retourné par la fonction (au lieu du toast générique) quand `error.context?.status === 404`, pour guider l'utilisateur (ex: "Aucun abonnement Stripe associé à votre email — contactez le support").

### i18n (`src/i18n/locales/{fr,en}.json`)
- Ajouter `billing.portalNoCustomer` (FR : "Aucun abonnement Stripe trouvé pour votre compte. Contactez le support si vous pensez qu'il s'agit d'une erreur.").

## Vérification
- Tester via Playwright sur `/billing` : cliquer "Gérer mon abonnement" → vérifier l'ouverture du portail Stripe dans un nouvel onglet (ou le message d'erreur explicite si pas de customer).
- Consulter les logs de l'edge function pour confirmer le chemin emprunté (profile vs email lookup).

## Hors scope
- Pas de modification du webhook Stripe, du checkout, ni de la table `profiles`.
- La fonction `customer-portal` (doublon) reste en place inchangée.
