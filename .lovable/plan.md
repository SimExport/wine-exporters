## Diagnostic

- Lany existe bien avec l’email `contact@lanye-barrac.fr`.
- Sa campagne `campagne 1` est bien en statut `results`.
- Les 17 prospects qualifiés sont bien en base pour cette campagne.
- Le blocage principal confirmé : `campaign_interested_contacts` n’a aucun droit Data API effectif (`GRANT` absent), donc l’application ne peut pas lire les lignes même si les règles RLS sont correctes.

## Plan de correction

1. **Appliquer le correctif d’accès base de données**
   - Donner l’accès à la table `campaign_interested_contacts` pour les utilisateurs connectés.
   - Garder les règles RLS existantes : Lany ne verra que les prospects de ses propres campagnes, les admins gardent l’accès complet.
   - Donner l’accès complet au `service_role` pour les imports admin et fonctions Edge.

2. **Vérifier l’accès après migration**
   - Contrôler que les droits existent bien après application.
   - Vérifier que la campagne de Lany retourne toujours 17 prospects qualifiés.

3. **Sécuriser l’expérience côté interface**
   - Si nécessaire, ajuster l’écran campagne pour afficher un message clair quand la campagne est en statut `results` mais que les prospects ne sont pas récupérés, au lieu d’un écran vide silencieux.
   - Conserver le libellé utilisateur `Prospects qualifiés` partout.

## Migration prévue

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_interested_contacts TO authenticated;
GRANT ALL ON public.campaign_interested_contacts TO service_role;
```

## Résultat attendu

Lany doit voir la carte `Prospects qualifiés` sur sa campagne `campagne 1`, avec ses 17 prospects qualifiés et les actions associées.