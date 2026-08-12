# Permettre de ré-ajouter un prospect qualifié au CRM

## Le problème

Sur « Voir ma campagne → Prospects qualifiés », dès qu'un prospect est ajouté au CRM, l'identifiant de l'utilisateur est mémorisé sur le contact et le bouton est remplacé par un badge figé « Ajouté ». Impossible de le rajouter, même si la fiche a été supprimée du CRM entre-temps.

## Ce qu'on va faire

Remplacer le badge figé par un état « Ajouté » utile et réversible :

1. **État réel plutôt que mémoire figée** : au chargement de la liste, on vérifie si une fiche CRM correspondante existe réellement (par email, ou à défaut par nom de société, dans les prospects issus de cette campagne). Si l'utilisateur a supprimé la fiche, le bouton « Ajouter au CRM » redevient disponible automatiquement.
2. **Badge « Ajouté » cliquable** : il ouvre un petit menu avec deux actions :
   - « Voir dans le CRM » → ouvre la fiche prospect existante,
   - « Ajouter à nouveau » → recrée une fiche (avec confirmation courte pour éviter les doublons involontaires).
3. **Ajout forcé sans blocage** : la logique actuelle ignore silencieusement l'insertion quand une fiche existe déjà. On garde ce comportement pour le clic normal, mais « Ajouter à nouveau » force la création d'une nouvelle fiche.
4. **Compteur d'avancement** (« 4 / 18 ajoutés ») recalculé sur l'état réel.

Aucun changement de mise en page, de scoring, ni des données existantes.

## Détails techniques

- `src/pages/CampaignDetail.tsx` :
  - après `fetchInterested`, une requête `leads` (campagne manuelle de l'utilisateur, `source = 'campaign_interest'`, `source_ref = campaign.id`) renvoie les emails / sociétés déjà présents et leurs `id`; on en dérive une map `email|company -> leadId`.
  - `isAdded` s'appuie sur cette map (et non plus uniquement sur `added_to_crm_by`).
  - `addInterestedToCrm(c, { force })` : quand `force` est vrai, on saute le test de doublon et on insère toujours.
- `src/components/campaigns/InterestedContactsSection.tsx` : le badge « Ajouté » devient un `DropdownMenu` (Voir dans le CRM / Ajouter à nouveau) avec `AlertDialog` de confirmation; nouvelles props `addedLeadId`, `onAddAgain`, `onOpenLead`.
- Nouvelles clés i18n FR/EN : `viewInCrm`, `addAgain`, `addAgainConfirm`, `addedAgainToast`.
