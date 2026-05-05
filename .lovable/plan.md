## Suppression de slemonnier57@gmail.com

L'utilisateur existe dans `auth.users` (id `b731f85d-372f-4204-8b2b-804e19e3c27b`). Pour le supprimer proprement :

### Action

Exécuter une migration SQL qui appelle :

```sql
DELETE FROM auth.users WHERE id = 'b731f85d-372f-4204-8b2b-804e19e3c27b';
```

Les tables `profiles`, `user_roles`, `user_credits`, `user_settings` reliées à `auth.users` seront purgées automatiquement par les contraintes `ON DELETE CASCADE` existantes.

Aucune ligne dans `admin_invitations` ne sera touchée (le journal d'invitation reste pour traçabilité, ce qui est le comportement attendu pour un audit log).

### Confirmation post-suppression

Vérifier qu'aucune ligne ne subsiste pour cet user_id dans `auth.users`, `profiles`, `user_roles`.