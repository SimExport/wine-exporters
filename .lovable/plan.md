# Unifier "Reprendre une campagne" avec la création de campagne

## Problème constaté

Deux modules différents coexistent :

- **Créer une campagne** → page `/create-campaign` : 2 étapes (Marchés & vins & documents, puis récapitulatif), sélection des pays par continent avec drapeaux, sélection des vins, présentation / tarifs / fiches techniques, note client.
- **Reprendre une campagne** → ancien assistant en 4 étapes intégré dans la page Campagnes : canaux, segments, tranche de volume, fourchette de prix, langue, estimation du nombre de contacts, objet d'e-mail, expéditeur, séquences, planification, cap journalier… Une liste de pays différente (en français, seulement 3 continents) et une sélection de documents différente.

Résultat : les documents enregistrés ne se retrouvent pas, des champs inutiles perturbent l'utilisateur, et des blocages de validation apparaissent.

## Ce qui sera fait

Un seul et même écran pour créer **et** reprendre une campagne.

1. La page de création accepte un identifiant de campagne existante. Quand on clique sur "Reprendre", on arrive sur exactement le même écran que la création, pré-rempli avec ce qui a été sauvegardé : nom, pays sélectionnés, ouverture à d'autres marchés, vins, présentation, liste de prix, fiches techniques, note client.
2. "Enregistrer le brouillon" et "Envoyer pour validation" mettent à jour la campagne existante au lieu d'en créer une nouvelle (aucun doublon).
3. Le crédit de campagne n'est consommé qu'au moment de la soumission, une seule fois.
4. L'ancien assistant en 4 étapes est retiré de la page Campagnes, ainsi que les champs qui n'existent plus côté création (canaux, segments, volume, prix, langue, estimation d'audience, objet, séquences, planification). La liste des campagnes, les filtres, l'archivage, la suppression et les rapports restent inchangés.
5. Les boutons "Reprendre" (menu et bouton direct) redirigent vers l'écran unifié.

## Détails techniques

- `src/pages/CreateCampaign.tsx` : lire `?id=` via `useSearchParams`, charger la campagne (`campaigns` filtrée sur `user_id`) et hydrater les états ; `saveDraft` et `submitForValidation` font un `update` si un id est présent, sinon `insert` ; garder les validations existantes ; consommer le crédit uniquement lors du passage `draft → pending_validation`. Ne pas autoriser l'édition si le statut n'est pas `draft` (redirection vers le détail de campagne).
- `src/pages/Campaigns.tsx` : `resumeDraft` devient `navigate('/create-campaign?id=' + campaignId)` ; suppression du bloc assistant (états `campaignData`, `currentStep`, `saveDraft`, `launchCampaign`, `getPreflightErrors`, auto-save, `renderStep1..4`) et des imports devenus inutiles (`Stepper`, `CampaignSidebar`, `PreflightBar`).
- Composants `campaign-wizard/CampaignSidebar.tsx` et `campaign-wizard/PreflightBar.tsx` supprimés s'ils ne sont plus référencés.
- Aucune modification de base de données ; les colonnes héritées restent en place et sont simplement ignorées.
