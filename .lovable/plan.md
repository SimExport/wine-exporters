# Supprimer un cliqueur ou un répondant côté admin

Ajout d'une action de suppression dans le panneau « Réponses au formulaire d'intérêt » de la page Campagnes Admin.

## Ce qui change

- Chaque carte de prospect (cliqueur ou répondant) reçoit un bouton corbeille à côté du bouton crayon existant.
- Un clic ouvre une confirmation (« Supprimer ce prospect ? ») rappelant le nom/email, action irréversible.
- Après confirmation, la ligne est supprimée en base et disparaît immédiatement de la liste ; le compteur « Formulaires » de la campagne se met à jour.
- Un toast confirme la suppression ou signale l'erreur.

## Détails techniques

- Fichier modifié : `src/pages/AdminCampaigns.tsx` uniquement (plus les clés i18n).
- Suppression via `supabase.from('campaign_interested_contacts').delete().eq('id', id)` — la policy « Admins manage all interested contacts » (ALL) autorise déjà l'admin, aucune migration nécessaire.
- Mise à jour locale de `responsesByCampaign` en retirant l'entrée supprimée (pas de refetch complet).
- Confirmation via `AlertDialog` (shadcn), même style que les suppressions existantes des opportunités.
- Nouvelles clés i18n FR/EN sous `adminCampaigns.responsesSheet` : `delete`, `deleteConfirmTitle`, `deleteConfirmDescription`, `deleted`, `deleteError`.

## Hors périmètre

- La vue côté utilisateur et le panneau « Prospects qualifiés » restent inchangés.
- Les leads déjà ajoutés au CRM ne sont pas supprimés.
