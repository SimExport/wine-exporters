## Problème

Sur la page **Campagnes**, les lignes du tableau ne sont pas cliquables. Le seul moyen d'ouvrir une campagne est via les boutons d'action à droite :
- **Brouillon** → bouton « Reprendre » (ouvre le wizard).
- **Autres statuts** (validation, sending, **results**, failed) → bouton « Voir prospects » qui va vers `/prospects?campaign=...` — **pas** vers la page de détail de la campagne où se trouve la carte « Prospects qualifiés ».

C'est pour ça que Lany ne tombe jamais sur la carte : même en cliquant sur le bouton d'action de sa campagne en statut « Résultats », elle est redirigée vers la liste globale des prospects, pas vers le détail de la campagne.

## Correction proposée

Dans `src/pages/Campaigns.tsx`, sur le tableau « Vos campagnes » :

1. **Rendre la ligne entière cliquable**
   - Au clic sur la ligne :
     - Statut `draft` → ouvre le wizard (comportement actuel du bouton « Reprendre »).
     - Tout autre statut → navigue vers `/campaigns/{id}` (page de détail, où s'affiche la carte « Prospects qualifiés »).
   - Curseur `pointer` + effet hover sur la ligne pour signaler la clicabilité.
   - Les boutons d'action (Reprendre / Archiver / Supprimer) gardent leur comportement et stoppent la propagation du clic pour ne pas déclencher la navigation de la ligne.

2. **Renommer et rediriger le bouton d'action des campagnes non-brouillon**
   - « Voir prospects » → **« Voir la campagne »**.
   - Cible : `/campaigns/{id}` au lieu de `/prospects?campaign=...`.
   - Raison : c'est la page de détail qui contient la carte « Prospects qualifiés » + les stats + les actions par contact. La page `/prospects` reste accessible depuis le menu latéral pour la vue globale.

3. **Traductions FR/EN**
   - Mettre à jour `campaigns.list.table.viewProspects` → « Voir la campagne » / « View campaign ».

## Hors scope

- Pas de changement de logique métier ni de RLS/GRANT (déjà corrigés à l'étape précédente).
- Pas de modification de la page de détail elle-même.
- Pas de modification de la page `/prospects`.

## Résultat attendu

Lany peut cliquer directement sur la ligne de sa « campagne 1 » (ou sur « Voir la campagne ») et atterrit sur la page de détail où la carte **« Prospects qualifiés »** avec ses 17 contacts s'affiche automatiquement.
