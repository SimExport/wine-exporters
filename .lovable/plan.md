# Notification email "Nouvelles opportunités"

## Objectif
Permettre à l'admin, depuis la page Opportunités Admin, de déclencher manuellement (1 clic) l'envoi d'un email récapitulatif à tous les utilisateurs inscrits pour les avertir que de nouvelles opportunités (demandes directes et/ou appels d'offres) sont disponibles, avec un lien vers `/opportunites`.

Pourquoi un envoi manuel groupé plutôt qu'automatique à chaque publication : l'admin importe souvent plusieurs opportunités d'affilée (CSV Tally, plusieurs PDF). Un envoi par opportunité spammerait les boîtes. Le bouton manuel laisse l'admin maître du moment d'envoi (par ex. après avoir publié un lot complet).

## Ce qui sera fait

### 1. Edge Function `notify-new-opportunities`
Nouvelle fonction Supabase (Resend, comme les autres `notify-*` existantes) :
- Authentifie l'appelant via JWT et vérifie qu'il est admin (`has_role`).
- Récupère la liste des emails de tous les utilisateurs depuis `auth.users` (service role).
- Envoie un email Resend bilingue FR (template HTML simple, cohérent avec la charte WineExporters : bordeaux/gold, logo Grape) :
  - Objet : "Nouvelles opportunités disponibles sur WineExporters"
  - Contenu générique : "De nouvelles opportunités (demandes directes d'importateurs et/ou appels d'offres) viennent d'être publiées sur votre espace."
  - Bouton CTA "Voir les opportunités" → `https://wine-exporters.com/opportunites`
  - Mention courte expliquant comment se désinscrire (lien `mailto:` support, pas de système opt-out à ce stade).
- Utilise l'envoi en batch Resend (jusqu'à 100 destinataires par requête, BCC pour ne pas exposer les emails entre users).
- Retourne `{ sent: number }`.

### 2. UI Admin
Dans `src/pages/AdminOpportunities.tsx`, ajouter en haut à droite du header un bouton **"Notifier les utilisateurs"** (icône `Mail`) :
- Affiche un `AlertDialog` de confirmation indiquant le nombre approximatif de destinataires et rappelant que c'est un envoi groupé.
- Au clic confirmé : appelle l'edge function, affiche un toast de succès avec le nombre d'emails envoyés, ou toast d'erreur.
- État `loading` pendant l'envoi.

### 3. Aucune modification DB
Pas de table de log d'envoi à ce stade (peut être ajouté plus tard si besoin de traçabilité).

## Hors scope
- Pas d'envoi automatique à chaque publication.
- Pas de digest cron quotidien.
- Pas de système d'opt-out granulaire en base (un user qui veut se désabonner contacte le support).
- Pas de personnalisation par profil (tout le monde reçoit le même mail générique).
- Pas de modification des opportunités existantes ni de la page user `/opportunites`.

## Détails techniques
- Resend : déjà configuré (`RESEND_API_KEY` présent), domaine d'envoi réutilisé depuis les fonctions `notify-campaign-*` existantes.
- Récupération users : `supabase.auth.admin.listUsers()` avec pagination (boucle si > 1000).
- Envoi : `resend.batch.send()` par paquets de 100, chaque email avec `to: [SENDER]` + `bcc: [...100 users]` pour confidentialité.
- i18n : email en FR uniquement (cohérent avec les autres `notify-*` du projet qui sont mono-FR).
