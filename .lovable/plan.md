## Objectif
Éviter qu’un utilisateur avec un abonnement Stripe actif soit bloqué sur les pages Premium, et identifier les autres comptes Stripe actifs non synchronisés côté Supabase.

## Plan
1. **Corriger la fonction `check-subscription`**
   - Quand Stripe trouve un abonnement actif, mettre à jour `profiles` avec :
     - `subscription_plan = 'monthly'` pour rester cohérent avec le webhook existant,
     - `stripe_customer_id`,
     - `campaigns_remaining` conservé au minimum à 1.
   - Quand aucun abonnement actif n’existe, remettre `subscription_plan = 'none'`.
   - Retourner un statut cohérent au frontend.

2. **Brancher la resynchronisation côté frontend**
   - Appeler `check-subscription` automatiquement dans `useSubscription` au chargement de l’utilisateur avant de lire `profiles`.
   - Garder l’accès Premium basé sur `profiles.subscription_plan`, mais le rafraîchir depuis Stripe pour éviter les désynchronisations futures.
   - Ajouter une protection simple contre les appels répétés inutiles pendant le chargement.

3. **Réparer le webhook Stripe**
   - Remplacer `constructEvent(...)` par `constructEventAsync(...)`, car les logs montrent l’erreur actuelle : `SubtleCryptoProvider cannot be used in a synchronous context`.
   - Cela permettra aux prochains événements Stripe d’être traités correctement.

4. **Contrôler les abonnements Stripe actifs restants**
   - Les abonnements actifs Stripe trouvés sont :
     - `cus_UVawwBDE6ChDqA` → marie.rouanet@saintcels.fr : déjà corrigée en `monthly`.
     - `cus_USD4bzA8aZmDkd` → vin@maison-kieffer.com : déjà synchronisé en `monthly`.
     - `cus_UW2g4Z9fLUdf9R` : actif Stripe mais aucun profil Supabase lié par `stripe_customer_id`.
     - `cus_UUu3uqtoekMWiI` : actif Stripe mais aucun profil Supabase lié par `stripe_customer_id`.
   - Après implémentation, ces deux derniers seront automatiquement rattrapés dès que les utilisateurs concernés se reconnectent, car `check-subscription` recherche par email Stripe.

## Validation
- Vérifier que le code appelle bien `check-subscription` sur chargement utilisateur.
- Vérifier que le webhook n’utilise plus l’appel synchrone Stripe qui échoue.
- Vérifier que Marie reste Premium avec `subscription_plan = 'monthly'`.