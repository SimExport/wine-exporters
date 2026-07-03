## Problème

Dans `src/pages/AdminCampaigns.tsx`, le lien du formulaire d'intérêt est construit avec `window.location.origin`. Quand un admin est sur le preview Lovable (`id-preview--…lovable.app`), le lien copié pointe vers ce domaine, qui exige une connexion Lovable → inaccessible en navigation privée.

La route `/interest/:campaignId` n'a aucun garde d'authentification, donc elle est bien publique — c'est juste le **domaine** utilisé qui est mauvais.

## Correction

Forcer la génération du lien vers le domaine public de production, indépendamment du domaine où se trouve l'admin.

1. Créer une constante `PUBLIC_SITE_URL = "https://wine-exporters.com"` (idéalement lisible via `import.meta.env.VITE_PUBLIC_SITE_URL` avec fallback en dur sur `https://wine-exporters.com`).
2. Dans `AdminCampaigns.tsx`, remplacer les deux occurrences `${window.location.origin}/interest/${campaign.id}` par `${PUBLIC_SITE_URL}/interest/${campaign.id}` (bouton "Ouvrir" + bouton "Copier").
3. Aucune autre page/route à modifier. Le SPA fallback de l'hébergement Lovable sert déjà `/interest/:id` sur `wine-exporters.com`.

## Vérification

- Copier le lien depuis `/admin/campaigns` → il commence par `https://wine-exporters.com/interest/…`.
- Ouvrir ce lien en navigation privée → le formulaire s'affiche sans demande de login.
