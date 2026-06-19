## Plan : Email automatique après upload CSV contacts intéressés

### Objectif
Après un upload réussi par l'admin, envoyer un email automatique au propriétaire de la campagne (via Resend), au branding WineExporters by ExportVins / couleur `#59191F`, pour lui dire que les contacts intéressés sont disponibles dans sa campagne.

### 1. Nouvelle edge function
`supabase/functions/notify-campaign-interested-contacts/index.ts`

- Inputs : `{ campaignId: string, count: number }`
- Reprend exactement la structure (header bordeaux, container blanc, footer) de `notify-campaign-validated`.
- Lit `campaigns` (nom, user_id) + email user via `auth.admin.getUserById` + `user_settings.ui_language` pour FR/EN.
- Envoie via Resend depuis `WineExporters <notifications@exportvins.fr>`, BCC `simon@exportvins.fr`.
- Log dans `campaign_email_logs` avec `event_type: 'interested_contacts_uploaded'`.

### Contenu (FR / EN)
- Sujet FR : `🎯 {count} contacts intéressés disponibles pour votre campagne « {nom} »`
- Sujet EN : `🎯 {count} interested contacts available for your campaign "{name}"`
- Corps :
  - H1 : "Vos contacts intéressés sont disponibles" / "Your interested contacts are ready"
  - Paragraphe : `{count}` contacts intéressés issus de votre campagne `{nom}` sont maintenant accessibles dans votre espace.
  - Mode d'emploi en bullets :
    1. Ouvrez le menu **Campagnes** dans le menu latéral.
    2. Cliquez sur votre campagne **« {nom} »**.
    3. Faites défiler jusqu'à la section **Contacts intéressés**.
    4. Cliquez sur **Ajouter au CRM** sur chaque contact pour le suivre.
  - CTA bouton : "Voir mes contacts intéressés" → `https://wine-exporters.com/campaigns/{id}`
  - Footer : "— L'équipe WineExporters"

### 2. Appel depuis l'upload admin
Dans `src/components/admin/CampaignInterestedContactsUpload.tsx`, après `insert` réussi, invoquer en non-bloquant :
```ts
supabase.functions.invoke('notify-campaign-interested-contacts', {
  body: { campaignId, count: parsed.length }
}).catch(e => console.error('notify failed', e));
```

### Hors scope
- Aucun changement aux autres edge functions, ni à CampaignDetail/AdminCampaigns au-delà du composant upload déjà créé.
- Pas de modification du schéma DB (la table `campaign_email_logs` accepte déjà un `event_type` libre — vérifié visuellement).
- Aucune nouvelle clé secrète (RESEND_API_KEY est déjà présente).