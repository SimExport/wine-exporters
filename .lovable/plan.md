## Diagnostic

La recherche bloquée appartient à l'utilisateur `1c668db4-…` (request `8fb91241`, marché États-Unis).

**Pourquoi elle ne s'est pas lancée automatiquement :**
Le même utilisateur avait déjà lancé une recherche **2 minutes avant** (`3b4196ba`, Suisse) qui a consommé son seul crédit mensuel (`search_credits = 1` au plan « paid »). Quand il a soumis la 2ᵉ requête, la fonction `process-sourcing-request` a vérifié `user_credits.search_credits` → 0 → s'est arrêtée immédiatement avec `error_message = "Crédit de recherche insuffisant"`. C'est exactement le comportement attendu côté code, mais il n'est pas visible dans l'admin (pas d'alerte rouge dédiée).

**Pourquoi tu ne peux pas la valider :**
Le bouton « Valider » ouvre une modale qui exige **un fichier de résultat à uploader** (`disabled={!uploadFile}`). Comme la recherche n'a jamais tourné, il n'y a rien à valider — ni résumé IA, ni fichier. Le flux normal attend que `process-sourcing-request` produise un résultat avant que l'admin puisse valider.

## Plan d'intervention

### 1. Débloquer cette requête (action immédiate)
Restaurer `search_credits = 1` pour l'utilisateur `1c668db4-…` puis utiliser le bouton « Relancer » existant dans `/admin/recherches` pour lancer le traitement IA. Une fois le résultat généré, la validation sera possible normalement.

### 2. Améliorer l'admin pour éviter le blocage silencieux (UI)
Dans `src/pages/AdminSourcing.tsx` :
- Afficher clairement `error_message` (badge rouge) à côté du statut quand la requête est `pending` avec une erreur — aujourd'hui ce champ n'est lu nulle part dans la table admin.
- Ajouter un bouton **« Relancer (admin override) »** visible uniquement quand `error_message` contient « crédit » : il appelle `process-sourcing-request` avec un flag `force=true`.

### 3. Backend — bypass crédit pour admin
Dans `supabase/functions/process-sourcing-request/index.ts` :
- Accepter un paramètre `force: boolean` dans le body.
- Quand `force === true`, vérifier via le JWT que l'appelant a `role = 'admin'` (via `has_role`) et sauter la vérification + décrément de crédit (ou décrémenter à 0 sans bloquer).
- Sans `force`, comportement actuel inchangé pour les appels utilisateur.

### Détails techniques

- Le `verify_jwt = false` actuel sur `process-sourcing-request` reste, mais en mode `force` on récupère explicitement `Authorization` header → `supabase.auth.getUser(token)` → on contrôle `user_roles.role = 'admin'` avant de bypasser.
- Aucun changement de schéma DB requis.
- La modale de validation reste inchangée : elle s'utilisera après que le résultat IA aura été généré par la relance.
