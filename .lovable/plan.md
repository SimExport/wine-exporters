## Constat

1. **Aucune autre campagne en attente.** Requête en base : 0 campagne `pending_validation` hors `simon@exportvins.fr` / `simon@frenchwinesexport.com`. Tout est traité.

2. **Aucun email de validation n'est envoyé à l'utilisateur.** `notify-campaign-submission` notifie uniquement l'admin lors d'une nouvelle soumission. Quand l'admin clique "Valider" dans `/admin/campaigns`, le code fait juste un `UPDATE campaigns SET status='active'` — pas de mail au domaine viticole.

## Plan

### 1. Nouvelle Edge Function `notify-campaign-validated`

Modèle calqué sur `notify-sourcing-validated` (qui marche déjà avec le branding WineExporters) :

- Reçoit `{ campaignId }`
- Récupère la campagne, le `user_id`, l'email auth, `display_name`, `target_markets`
- Envoie via Resend (`RESEND_API_KEY` déjà présent), `from: "WineExporters <notifications@wine-exporters.com>"` (même from que les autres mails)
- Sujet : `✅ Votre campagne "{name}" est validée et en cours d'envoi`
- Corps HTML brandé **#59191F** (header bordeaux, logo grappe, typo, bouton CTA)
- Contenu :
  - "Bonne nouvelle, votre campagne **{name}** vient d'être validée par notre équipe."
  - "Elle est désormais en cours d'envoi sur les marchés : {markets}."
  - **"⏱ Les premiers résultats (ouvertures, réponses, prospects) apparaîtront sous 7 à 10 jours en moyenne."**
  - CTA : **"Suivre ma campagne"** → `https://wine-exporters.com/campaigns/{campaignId}`
  - Footer "WineExporters by ExportVins"
- Bilingue FR/EN selon `user_settings.ui_language`

### 2. Déclenchement automatique

Dans `src/pages/AdminCampaigns.tsx`, après l'UPDATE réussi dans `validateCampaign`, ajouter :

```ts
supabase.functions.invoke("notify-campaign-validated", { body: { campaignId } });
```

Best-effort (n'interrompt pas le flow admin si le mail échoue, comme le pattern actuel pour sourcing).

### 3. Vérification

- Re-valider une campagne test depuis `/admin/campaigns`
- Vérifier les logs `notify-campaign-validated`
- Confirmer réception de l'email avec branding 59191F + bouton fonctionnel
