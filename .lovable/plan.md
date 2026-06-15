# Debug et fiabilisation du bouton "Notifier les utilisateurs"

## Constat
- L'edge function `notify-new-opportunities` est bien déployée (elle répond 401 sans JWT, donc le code tourne).
- Aucune invocation n'apparaît dans les logs Supabase : la requête du bouton n'arrive pas jusqu'à la fonction, OU elle plante immédiatement côté client/réseau sans toast visible.
- Aucune trace Resend non plus, donc aucun mail n'a pu partir.

Causes les plus probables :
1. `supabase.functions.invoke()` rejette silencieusement (erreur réseau / CORS / session expirée) sans qu'on remonte clairement l'info à l'utilisateur.
2. La fonction tourne mais time-out avant d'envoyer (timeout edge function = 60s ; `auth.admin.listUsers` + plusieurs `resend.emails.send` séquentiels peuvent dépasser).
3. Resend rate-limite (2 req/s en plan gratuit) → erreurs silencieuses.

## Ce qui sera fait

### 1. Edge function : logs + robustesse
Dans `supabase/functions/notify-new-opportunities/index.ts` :
- Ajouter un `console.log` au tout début (`"notify-new-opportunities invoked"`) pour confirmer la réception.
- Logger chaque étape : auth user, role check, nb d'emails récupérés, chaque résultat Resend (ID ou erreur complète).
- Espacer les envois Resend avec un petit `await sleep(600ms)` entre chunks pour rester sous la limite gratuite 2 req/s.
- Réduire la taille du chunk BCC à 50 pour limiter le risque côté Resend.
- Capturer et renvoyer un tableau `errors[]` détaillé dans la réponse JSON.

### 2. Frontend : meilleure remontée d'erreur
Dans `src/pages/AdminOpportunities.tsx` :
- Logger en console la réponse brute de `supabase.functions.invoke` (succès et erreur).
- Si `data.errors.length > 0`, afficher un toast warning avec le détail au lieu d'un succès trompeur.
- Si `data.sent === 0`, toast destructive explicite.

### 3. Vérification
Une fois redéployée, je :
- Te demanderai de re-cliquer sur "Notifier les utilisateurs".
- Lirai immédiatement les logs `notify-new-opportunities` pour confirmer (a) que la fonction est invoquée, (b) le nombre de destinataires, (c) les réponses Resend (succès ou code d'erreur précis — domaine non vérifié, rate limit, etc.).
- Si Resend renvoie une erreur de domaine/clé, je te le signalerai pour qu'on ajuste (clé API ou expéditeur).

## Hors scope
- Pas de changement de design ni d'autres fonctions.
- Pas encore de table de log d'envoi en base (on s'appuie sur les logs edge function pour ce debug).
- Pas de bascule vers un autre provider d'email.
