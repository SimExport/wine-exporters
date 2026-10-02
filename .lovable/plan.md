# Modifier le profil d'un utilisateur depuis l'admin

## Ce qui change
Sur la fiche admin d'un utilisateur (Utilisateurs → Voir profil), onglet **Domaine** :
- Un bouton **Modifier** apparaît en haut à droite de « Profil domaine ».
- Il ouvre une fenêtre d'édition avec les champs du profil, regroupés en sections :
  - **Identité** : domaine, contact, localisation, AOC, site web, vidéo en ligne, description
  - **Production** : surface (ha), bouteilles/an, couleurs, types de vin, cépages, cuvées (legacy)
  - **Bio & certifications** : certifications, conversion bio (oui/non), organisme bio, année de conversion
  - **Marchés** : marchés actuels, prioritaires, à éviter, acheteur cible, points forts
  - **Réseaux sociaux** : Twitter, Facebook, LinkedIn, Instagram (champs séparés au lieu du texte brut)
  - **Statut** : profil publié, onboarding terminé
- Les listes (cépages, couleurs, points forts…) se saisissent séparées par des virgules, comme côté utilisateur.
- **Enregistrer** met à jour la fiche immédiatement avec un message de confirmation ; **Annuler** ferme sans rien changer.

## Non modifiable ici (inchangé)
Plan, rôle, Stripe customer, email et crédits : ils gardent leurs outils actuels (liste Utilisateurs, dialogues email et crédits).

## Détails techniques
- Nouveau composant `src/components/admin/EditUserProfileDialog.tsx` ; `AdminUserProfile.tsx` ajoute le bouton et met à jour l'état `profile` après sauvegarde.
- `update` sur `profiles` filtré par `user_id` ; la règle d'accès existante « Admins can update all profiles » le permet déjà, aucune migration.
- Nombres vides → null ; chaînes vides → null ; tableaux nettoyés (trim, vides retirés).
- Interface admin en français, comme le reste de l'administration.
