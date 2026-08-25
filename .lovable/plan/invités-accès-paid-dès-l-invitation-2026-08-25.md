# Invités = accès "paid" dès l'invitation

## Ce qui se passe aujourd'hui

Le rôle est attribué par un déclencheur automatique au moment de la création du compte, qui regarde si l'email figure déjà dans le journal d'invitations. Or les données montrent que le compte est créé **avant** que l'invitation soit enregistrée (écart d'environ 1,5 à 2 secondes sur toutes les invitations récentes). Au moment du contrôle, l'invitation n'existe donc pas encore : l'utilisateur est créé en "free", et vous devez le passer en "paid" à la main ensuite.

## Correction

Dans la fonction d'invitation (`admin-invite-user`) :

1. Enregistrer l'invitation dans le journal **avant** d'appeler la création du compte, pour que le déclencheur trouve bien l'email.
2. Juste après une invitation réussie, forcer explicitement l'accès payant pour l'utilisateur créé :
   - rôle `paid` dans la table des rôles (sans jamais écraser un rôle `admin`) ;
   - `subscription_plan = 'paid'` sur son profil.
   Ces écritures se font avec les droits service, en plus du déclencheur : ceinture et bretelles, y compris si la création est plus lente que prévu.
3. Même traitement pour le mode "Renvoyer" quand le compte existe déjà mais est resté en `free`.
4. En cas d'échec de l'envoi, l'entrée du journal est mise à jour en "échouée" (au lieu d'insérer une deuxième ligne), pour garder le journal lisible.

Aucune autre page, table ou fonction n'est modifiée. Les invités existants sont déjà en `paid`, aucune reprise de données n'est nécessaire.

## Détails techniques

- Fichier modifié : `supabase/functions/admin-invite-user/index.ts` (réordonnancement de l'insert `admin_invitations`, puis `upsert` sur `user_roles` avec `onConflict: 'user_id'` et `update` de `profiles.subscription_plan`).
- Le déclencheur `handle_new_user_role` reste inchangé : il devient simplement fiable grâce au nouvel ordre d'exécution.
- Redéploiement de la fonction après modification.
