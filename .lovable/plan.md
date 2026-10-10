# Invitations ExportVins dans la page Invitations existante

## Audit du système actuel
- **Création** : la page `/admin/invitations` appelle `admin-invite-user`. La fonction crée une ligne dans `admin_invitations` (statut `sent`), puis envoie l'invitation Supabase. Si l'email existe déjà, elle envoie un lien de connexion par email, sans créer de second compte. Le bouton « Renvoyer » utilise le même lien de connexion.
- **Lien de secours** : `admin-invite-link` génère seulement un lien à copier. Il ne donne aucun rôle.
- **Le rôle `paid` est attribué à deux endroits** :
  1. À l'inscription, le déclencheur `handle_new_user_role` donne `paid` à toute adresse présente dans `admin_invitations` avec le statut `sent`.
  2. Après l'envoi, `admin-invite-user` force aussi `paid`, ainsi que `subscription_plan = 'paid'`, sur le compte invité, même s'il existe déjà.
- **Journal** : il affiche l'email, la date, le statut (envoyé ou échec), l'identifiant utilisateur et l'action Renvoyer.

**Pas de contrainte bloquante** : le système s'étend proprement. Il faut seulement ajouter un type d'invitation et s'en servir aux deux endroits qui donnent `paid`.

## Modifications
1. **Base de données**
   - `admin_invitations` reçoit 3 colonnes : `invitation_type` (`classic` par défaut, donc toutes les invitations existantes restent classiques), `domain_name` et `mission_name`.
   - `handle_new_user_role` ne donne `paid` que pour les invitations `classic`.
   - Nouvelle table `exportvins_pending_leads` pour préparer les contacts avant l'activation, liée à l'invitation. Accès réservé aux admins.
2. **`admin-invite-user`**
   - Accepte `type: 'exportvins'` avec domaine, mission et éligibilité au tarif 99 €.
   - Dans ce cas : aucun rôle `paid`, aucun changement de `subscription_plan`, aucun appel Stripe.
   - Crée ou met à jour la ligne `user_entitlements` en statut `invited`, sans date de début.
   - Si le compte est déjà abonné, aucun essai n'est créé : seuls les contacts sont ajoutés.
   - Le mode classique reste identique, ligne pour ligne.
3. **Activation**
   - `activate_exportvins_trial`, appelée à la première connexion, déclenche maintenant le compte à rebours de 30 jours.
   - Au même moment, elle transfère les contacts préparés dans le CRM, dans une campagne système « Mission ExportVins – {mission} », sans doublons grâce à `import_key`.
4. **Page `/admin/invitations`**
   - Un sélecteur : « Invitation classique WineExporters » ou « Client ExportVins — Mission Performance ».
   - En mode ExportVins : email, domaine, mission, mention « CRM offert 30 jours » et case « Éligible au tarif 99 € HT/mois ».
   - Étape d'import CSV : correspondance des colonnes, aperçu, doublons signalés dans le fichier et dans les contacts déjà préparés, étape par défaut « Échantillons à envoyer », récapitulatif.
   - Journal : nouvelle colonne Type. Pour les invitations ExportVins, on voit le statut (en attente, essai actif, lecture seule, expiré, abonné), le début des 30 jours et la date d'expiration.

## Risques
- Un oubli du type à l'un des deux endroits donnerait `paid` à un client ExportVins. Il sera testé en base, avec une invitation fictive non envoyée.
- Si une adresse a déjà reçu une invitation classique `sent`, elle garde son rôle `paid` : c'est le comportement actuel, sans changement.
- Contacts préparés pour un compte qui n'active jamais l'essai : ils restent hors du CRM et peuvent être supprimés par l'admin.

## Tests (sans envoi réel)
- Les fonctions sont vérifiées avec des données de test insérées directement en base, puis supprimées. Aucun appel d'envoi d'email.
- Invitation classique : comportement et rôle inchangés.
- Invitation ExportVins pour un nouveau compte, pour un compte Free existant, puis pour un abonné : aucun `paid`, essai créé seulement s'il n'est pas abonné, contacts importés une seule fois.
