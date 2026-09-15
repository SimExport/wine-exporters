# Recherches sur-mesure : un seul bouton de téléchargement

## Le problème

Sur la page Recherches sur-mesure, deux boutons différents permettent aujourd'hui de récupérer les contacts :

- « Voir les résultats » : ouvre la fenêtre de résultats, dont le téléchargement produit désormais un vrai fichier Excel (colonnes propres).
- « Télécharger » (directement sur la ligne) : ouvre un fichier préparé à la main par l'équipe. Ce fichier reste un CSV à virgules, donc tout arrive dans une seule colonne chez le Domaine Sibille.

## Correction

Un seul chemin, celui qui fonctionne :

- Supprimer le bouton « Télécharger » de la ligne.
- Afficher « Voir les résultats » sur toutes les recherches validées.
- Quand une recherche n'a pas de résultats structurés mais seulement un fichier préparé par l'équipe (anciennes demandes), le même bouton ouvre ce fichier — rien n'est perdu, mais il n'y a plus deux boutons à l'écran.
- L'email de validation continue de renvoyer vers /recherches, où l'utilisateur clique sur « Voir les résultats » ; le texte du mail est ajusté pour parler de consulter ses résultats plutôt que de télécharger.

Résultat : plus de fichier « une seule colonne », un seul bouton, un parcours clair.

## Détails techniques

- `src/pages/SourcingRequests.tsx` : retirer le bloc du bouton `sourcing.download`, rendre le bouton `sourcing.results.viewBtn` visible pour `status === 'validated'` ; si `result_json` est absent et `result_file_url` présent, le clic appelle `handleDownload` au lieu d'ouvrir le dialog. `handleDownload` et son état `downloadingId` sont conservés.
- `supabase/functions/notify-sourcing-validated/index.ts` : ajuster le texte/le libellé du bouton vers « Voir mes résultats », lien inchangé (`/recherches`).
- Aucun changement sur `SourcingResultsDialog` (export Excel par défaut déjà en place), ni sur les crédits, ni sur le stockage.

## Hors périmètre

Pas de reconversion des anciens fichiers CSV déjà déposés en Excel, pas de modification de l'espace admin.
