## Contexte

L'Edge Function `notify-sourcing-validated` existe déjà et est bien appelée par `AdminSourcing.tsx` au moment où un admin valide une recherche et uploade le résultat (ligne 143). Elle envoie un mail via Resend au client avec un lien vers `/recherches`.

Le seul ajustement nécessaire : refaire le template HTML aux couleurs WineExporters (#59191F bordeaux) au lieu du violet `#7c3aed` actuel.

## Modification

**Fichier :** `supabase/functions/notify-sourcing-validated/index.ts`

Refonte du HTML de l'email :
- Header avec fond bordeaux `#59191F`, logo/wordmark "WineExporters" en blanc, sous-titre "by ExportVins"
- Titre principal "Votre recherche sur-mesure est prête" en `#59191F`
- Corps en gris foncé `#333`, fond blanc, container centré max 600px, ombre douce
- Mention du marché ciblé en gras bordeaux
- Bouton CTA "Voir mes résultats" → `https://wine-exporters.com/recherches`, fond `#59191F`, texte blanc, padding 14px 28px, border-radius 6px
- Footer discret "— L'équipe WineExporters" en gris clair
- Expéditeur : `WineExporters <notifications@resend.dev>` (inchangé tant qu'aucun domaine vérifié Resend n'est configuré)
- Sujet : `Votre recherche sur-mesure (${marché}) est prête sur WineExporters`

Aucun autre changement : le flux d'appel, la récupération du user_email via `admin.auth.admin.getUserById`, et le déclenchement depuis `AdminSourcing` restent identiques.

## Hors scope

- Pas de changement de provider ni de domaine d'envoi (Resend conservé, expéditeur par défaut `notifications@resend.dev`).
- Pas de modification du flux de validation côté admin.
- Pas de logo image distant (texte stylé, plus robuste en email).
