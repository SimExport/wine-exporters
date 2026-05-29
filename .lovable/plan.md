## Refonte de la page /admin/recherches

Les recherches sur-mesure se lancent désormais automatiquement, donc la liste de validation manuelle n'a plus de sens. On la remplace par un historique consultable des recherches demandées par les utilisateurs.

### Changements `src/pages/AdminSourcing.tsx`

1. **Supprimer le filtre par statut** (`pending`, `in_progress`, `validated`, `archived`) qui n'a plus de sens.
2. **Ajouter un filtre par période** sur `created_at` :
   - 24 heures
   - 7 jours
   - 30 jours
   - 90 jours
   - Tout
   - Défaut : 7 jours
3. **Simplifier le tableau** — colonnes :
   - Utilisateur (domaine ou display_name)
   - Pays (`target_market` traduit)
   - Date de la recherche (`created_at`, format long)
   - Statut (badge compact : en cours, terminée, erreur)
   - Actions (voir résultats si dispo, supprimer)
4. **Conserver** : dialog de résultats (`SourcingResultsDialog`), action de suppression, action "Relancer" si une recherche est en erreur (cas edge), affichage d'`error_message` discret.
5. **Retirer** : bouton "Valider" + dialog d'upload de fichier, bouton "Archiver/Désarchiver", bouton "Lancer" manuel (puisque automatique).
6. **Tri** : par date décroissante (plus récent en haut).

### i18n
Ajouter dans `src/i18n/locales/fr.json` et `en.json` :
- `adminSourcing.filter.period.24h` / `.7d` / `.30d` / `.90d` / `.all`
- `adminSourcing.subtitle` mis à jour ("Historique des recherches sur-mesure lancées par les utilisateurs")

### Hors périmètre
Pas de changement DB, pas de changement edge functions, pas de changement du flow utilisateur côté `/sourcing`.