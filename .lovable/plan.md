# Déclencher l'événement Resend après ajout à l'audience

Seul fichier modifié : `supabase/functions/sync-user-to-resend/index.ts`.

## Ce qui change

1. Nouvelle fonction `triggerAddedToAudienceEvent(email)` ajoutée juste après `addContact` :
   - `POST https://api.resend.com/events/send`
   - Header `Authorization: Bearer ${RESEND_API_KEY}`, `Content-Type: application/json`
   - Body `{ "event": "contact.added_to_audience", "email": email }`
   - Retourne `{ ok, status, data }` (même forme que `addContact`)

2. Dans le handler `serve`, juste après l'appel à `addContact` et son `console.log` : si `result.ok`, appeler la nouvelle fonction et logger
   `console.log("sync-user-to-resend:event", email, eventResult.status, eventResult.data)`.

Rien d'autre ne bouge : en-têtes CORS, résolution email/userId/firstName, réponse HTTP et gestion d'erreur globale restent identiques. Un échec de l'événement n'empêche pas la réponse de succès de la fonction.

## Après modification

Déploiement de la seule fonction `sync-user-to-resend`.
