# Garder l'email affiché quand on change d'onglet

## Cause
En revenant sur l'onglet, la connexion se rafraîchit automatiquement. La page « Créer une campagne » croit alors qu'il s'agit d'un nouvel utilisateur et recharge tout le brouillon : l'étape email est réinitialisée et la proposition affichée disparaît.

## Correctif
1. La page ne recharge le brouillon, les vins et les documents que si le **compte connecté change réellement**, pas à chaque rafraîchissement de connexion. L'email, la prévisualisation et les modifications en cours restent à l'écran.
2. Filet de sécurité : si un rechargement a lieu quand même, l'email déjà enregistré (désormais sauvegardé dès sa génération) se réaffiche, sans redemander « Générer mon email ».

## Détails techniques
- `CreateCampaign.tsx` : dépendances des deux `useEffect` passées de `[user]` à `[user?.id]` (et `[user?.id, editId]`).
- Vérification Playwright : générer/afficher un brouillon avec email, simuler un `visibilitychange` + rafraîchissement de session, contrôler que l'email reste affiché.
- Aucun changement serveur, base ou autre page.
