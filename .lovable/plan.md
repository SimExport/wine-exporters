## Problème

La route `/campaigns/:id` n'est pas déclarée dans `src/App.tsx`. Le composant `CampaignDetail` est importé mais aucun `<Route>` ne le branche — d'où le 404 quand on clique sur une campagne.

## Correction

Ajouter dans `src/App.tsx`, juste après la route `/campaigns` :

```tsx
<Route path="/campaigns/:id" element={<DashboardLayout><CampaignDetail /></DashboardLayout>} />
```

Protégée comme les autres routes utilisateur (DashboardLayout + ProtectedRoute si c'est le pattern utilisé pour `/campaigns`).

## Hors scope

Aucune autre modification.
