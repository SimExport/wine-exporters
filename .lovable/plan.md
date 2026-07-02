## Exposer le lien du formulaire d'intérêt (admin uniquement)

Le lien public `/interest/:campaignId` est actif dès la création de la campagne (aucun filtre de statut). Seul l'admin y accède depuis l'app — le user producteur ne voit ni le lien ni le formulaire pour l'instant.

### 1. Admin — liste des campagnes (`src/pages/AdminCampaigns.tsx`)
Sur chaque ligne, ajouter une action "Formulaire d'intérêt" à côté des actions existantes :
- Icône `ExternalLink` + bouton "Copier le lien" (icône `Copy`) qui copie `${window.location.origin}/interest/${campaign.id}` avec un toast de confirmation.
- Un clic sur "Ouvrir" ouvre le lien dans un nouvel onglet (`target="_blank"`, `rel="noopener noreferrer"`).

### 2. Admin — détail campagne
Deux cas selon ce qui existe déjà :
- S'il y a une page admin dédiée : ajouter une carte "Formulaire d'intérêt public" avec l'URL affichée en lecture seule, un bouton "Copier" et un bouton "Ouvrir dans un nouvel onglet".
- Sinon (le détail admin passe par `CampaignDetail`) : ajouter la même carte dans `CampaignDetail`, mais **conditionnée à `isAdmin`** via `useRole()`, pour ne pas l'exposer au user propriétaire.

### 3. Aucun changement côté user producteur
- Pas de bouton ni de section dans les vues user.
- Pas d'email automatique.
- Pas de modification de la table `campaign_interest_responses` ni du RPC `get_campaign_public_info`.

### 4. i18n
Ajouter sous `admin.campaigns.interestForm.*` (FR/EN) : `label` ("Formulaire d'intérêt"), `copy` ("Copier le lien"), `copied` ("Lien copié"), `open` ("Ouvrir").

### Détails techniques
- Copie via `navigator.clipboard.writeText(...)` avec fallback silencieux.
- URL construite côté client à partir de `window.location.origin` pour rester cohérente entre preview / prod / domaine custom.
- Aucune migration SQL, aucune edge function, aucune modification des politiques RLS.
