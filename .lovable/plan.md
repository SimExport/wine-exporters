

## Fonctionnalite "Sourcing sur Mesure"

### 1. Backend -- Schema SQL

**Migration : Nouvelle table `sourcing_requests` + colonne sur `profiles`**

- Ajouter la colonne `sourcing_requests_remaining` (integer, default 1) a la table `profiles`.
- Creer la table `sourcing_requests` :
  - `id` UUID PK (gen_random_uuid())
  - `created_at` timestamptz (default now())
  - `user_id` UUID NOT NULL (references auth.users on delete cascade)
  - `target_market` text NOT NULL
  - `status` text NOT NULL DEFAULT 'pending'
  - `admin_note` text nullable
- Activer RLS sur `sourcing_requests`.
- Politiques RLS :
  - INSERT : `auth.uid() = user_id`
  - SELECT : `auth.uid() = user_id OR has_role(auth.uid(), 'admin')`

**Mise a jour de `types.ts`** pour refleter la nouvelle table et la nouvelle colonne sur `profiles`.

### 2. Frontend -- Page `/importers` (Importers.tsx)

- Ajouter un bouton "Demander une selection sur mesure" en haut de page (visible uniquement pour les utilisateurs avec `hasPaidAccess`).
- Ce bouton ouvre un `Dialog` (composant Radix deja installe) contenant :
  - Titre : "Sourcing Personnalise & Verifie"
  - Description explicative du service (3-5 importateurs selectionnes par l'equipe)
  - Un `Select` pour choisir le marche cible (reutilisation de la liste `COUNTRIES` existante)
  - Affichage du credit restant (`sourcing_requests_remaining` recupere depuis `profiles`)
  - Bouton "Envoyer la demande" : actif si credit > 0, desactive sinon avec message "Quota atteint"
- Logique de soumission :
  - INSERT dans `sourcing_requests` (user_id, target_market)
  - UPDATE `profiles` pour decrementer `sourcing_requests_remaining` de 1
  - Fermer la modale + toast "Demande recue ! Reponse sous 72h."
  - Gestion silencieuse des erreurs (console.error, toast d'erreur)

### 3. Frontend -- Page `/billing` (Billing.tsx)

- Dans la carte "Utilisation du forfait" (deja existante), ajouter une ligne sous "Campagnes restantes" :
  - "Recherches sur mesure : X / 1 par mois" avec une barre de progression
  - Recuperer `sourcing_requests_remaining` depuis le hook `useSubscription`

### 4. Hook `useSubscription`

- Ajouter `sourcing_requests_remaining` au state et a la requete `profiles` existante.
- Exposer cette valeur dans le retour du hook.

### Details techniques

**Fichiers modifies :**
- `supabase/migrations/` -- nouvelle migration SQL (table + colonne + RLS)
- `src/integrations/supabase/types.ts` -- ajout type `sourcing_requests`, mise a jour `profiles`
- `src/hooks/useSubscription.tsx` -- ajout `sourcingRequestsRemaining`
- `src/pages/Importers.tsx` -- bouton + modale sourcing
- `src/pages/Billing.tsx` -- ligne quota sourcing dans la carte utilisation

**Composants UI reutilises :** Dialog, Select, Button, Progress, Badge, toast (tous deja installes).

