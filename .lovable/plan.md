## Problème

Dans `src/pages/AdminInvitations.tsx`, la constante `PROD_ORIGIN` utilise `https://wineexporters.com` (sans tiret), alors que le vrai domaine du projet est `https://wine-exporters.com` (avec tiret). Ce mauvais `redirectTo` est envoyé à l'edge function `admin-invite-user`, donc les liens Supabase dans les mails d'invitation/magic link pointent vers un domaine qui n'existe pas.

## Correctifs

### 1. `src/pages/AdminInvitations.tsx`
- Remplacer `const PROD_ORIGIN = "https://wineexporters.com"` par `"https://wine-exporters.com"`.
- La détection `isProdHost` utilise déjà la bonne URL Lovable, on garde.

### 2. Vérification côté Supabase Dashboard (à faire manuellement)
Le `redirectTo` n'est utilisé que si l'URL est dans la liste blanche **Authentication → URL Configuration**. Il faut t'assurer côté dashboard Supabase que :
- **Site URL** = `https://wine-exporters.com`
- **Redirect URLs** contient :
  - `https://wine-exporters.com/**`
  - `https://wine-exporters.lovable.app/**`
  - `https://id-preview--2cbf3846-6e77-4cb7-aac8-1f5496e7b841.lovable.app/**`
- Toute entrée `wineexporters.com` (sans tiret) doit être supprimée.

### 3. SMTP / Templates
Si du SMTP custom (Resend) est configuré dans Supabase, vérifier que le domaine expéditeur est bien `wine-exporters.com` (et non `wineexporters.com`) et que les templates d'email ne contiennent aucune URL hardcodée vers le mauvais domaine.

Une fois le fichier corrigé et le dashboard Supabase vérifié, les liens d'invitation pointeront vers `https://wine-exporters.com/auth`.