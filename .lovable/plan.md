# Champ « Informations complémentaires » dans le formulaire d'intérêt

## Objectif
Permettre à l'importateur qui remplit le formulaire d'intérêt (page publique `/interest/:campaignId`) d'ajouter un message libre — notes, informations complémentaires, ce qui l'intéresse dans ces vins — et faire remonter ce message jusqu'à la fiche prospect côté producteur et admin.

## Parcours de la donnée

1. **Formulaire public** (`src/pages/CampaignInterestForm.tsx`)
   - Ajout d'un `Textarea` optionnel « Anything else? Tell us what makes you interested in these wines » (max 1000 caractères), placé sous les cases d'intérêt.
2. **Edge Function** (`supabase/functions/submit-campaign-interest/index.ts`)
   - Accepter `message` (nettoyé, max 1000 caractères).
   - L'injecter dans le prompt d'enrichissement Claude (le prospect peut y préciser volumes, besoins, calendrier → score et actions plus pertinents).
   - L'enregistrer dans la nouvelle colonne `message` de `campaign_interested_contacts`.
3. **Base de données** (migration)
   - `ALTER TABLE campaign_interested_contacts ADD COLUMN message text` (nullable, aucun impact sur l'existant).
4. **Affichage côté producteur** (`src/components/campaigns/InterestedContactsSection.tsx`)
   - Bloc « Message du prospect » affiché sur la carte (avant la description IA), style citation, repliable si long.
5. **Affichage côté admin** (`src/pages/AdminCampaigns.tsx`, sheet « Formulaires »)
   - Afficher le message dans la carte du prospect, et champ éditable dans `EditInterestedContactDialog.tsx`.
6. **Ajout au CRM** (`src/pages/CampaignDetail.tsx`)
   - Lors de l'ajout manuel au CRM, le message est copié dans `owner_notes` de la fiche lead créée.

## Détails techniques
- Migration : ajout colonne `message text` + régénération des types (le fichier `types.ts` est auto-généré).
- Validation : trim + troncature 1000 caractères côté client et serveur ; aucun HTML rendu (affichage en texte brut `whitespace-pre-wrap`).
- i18n : libellé du champ uniquement en anglais sur le formulaire public (formulaire déjà 100 % EN) ; clés FR/EN pour les libellés « Message du prospect » côté app et admin.
- Aucune modification des autres fonctions (enrich-campaign-prospects, sync-brevo-campaign) ni des cliqueurs : `message` reste NULL pour eux.
