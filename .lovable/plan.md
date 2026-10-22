# Refonte Campagnes — Lot A : architecture backend et préparation de l'éditeur

## A. État des lieux vérifié
- **create-campaign** (admin uniquement, vérifié via `has_role`) fait tout : récupère campagne, profil et vins (vins sélectionnés, sinon tous les vins actifs), génère avec Claude `claude-sonnet-4-6`, extrait l'objet, associe les marchés aux listes Brevo (`BREVO_LIST_IDS`), crée la campagne Brevo, appelle `sendNow`, passe la campagne `active` (`validated_at`, `launched_at`, `admin_reviewer`, `brevo_campaign_id`) et envoie un email Resend. En cas d'échec, la campagne passe `error`, y compris quand Brevo a déjà envoyé. Le HTML et l'objet générés **ne sont pas enregistrés en base**.
- **CreateCampaign.tsx** : le brouillon est enregistré directement en table (`status: 'draft'`). À la soumission, la campagne passe `pending_validation` **par écriture navigateur**, puis `consume_campaign_credit()` est appelée **à part**. Une soumission sans crédit est donc possible si l'appel échoue (un message s'affiche, mais le statut reste).
- **AdminCampaigns.tsx** : « Valider » appelle `create-campaign` puis `notify-campaign-validated`. Les changements de statut manuels (`failed`, `results`, sélecteur libre) sont des écritures navigateur.
- **Règles d'accès `campaigns`** : le propriétaire peut modifier sa campagne sans aucune restriction de colonne ni de statut (faille confirmée). Les admins peuvent tout modifier. Lecture et suppression : propriétaire ou admin.
- **Statuts réellement en base** : `manual` 298, `results` 51, `draft` 9, `archived` 3, `pending_validation` 2, `active` 1. Le code mentionne aussi `error`, `failed`, `approved`, `sending`, `completed` (dans l'interface), sans aucune ligne en base. 42 campagnes ont un `brevo_campaign_id`, 12 un `message_html` (contenu historique).
- **Médiathèque** : table `media` (le propriétaire gère, l'admin lit) et bucket public `media`, organisé en dossiers `{user_id}/…`. Le prompt prévoit déjà une photo optionnelle.
- **À préserver tel quel** : `sync-brevo-campaign` (se base sur `brevo_campaign_id`), `/interest/:campaignId`, `submit-campaign-interest`, `enrich-campaign-prospects`, `campaign_interested_contacts`, les rapports et les notifications.

## B. Architecture cible
```text
Producteur : configure -> [generate-campaign-email] -> édite (lot B) -> enregistre -> [submit_campaign RPC]
Admin      : prévisualise (lot C) -> [send-campaign] -> Brevo (HTML enregistré, sans nouvelle génération Claude)
```
- **generate-campaign-email** (Edge Function, propriétaire ou admin) : reprend le prompt et la construction du message de `create-campaign`, déplacés dans `_shared/campaign-email.ts`. Elle enregistre `message_html` et `subject_selected` et renvoie le contenu. Elle ne contacte jamais Brevo et ne consomme aucun crédit. Elle est refusée si le statut n'est pas modifiable.
- **Sauvegarde** : RPC `save_campaign_email(_id, _subject, _html, _design jsonb)`, propriétaire uniquement, statut modifiable uniquement, taille limitée.
- **submit_campaign(_id)** (RPC SECURITY DEFINER) : une seule transaction avec verrou de ligne (`FOR UPDATE`). Elle vérifie le propriétaire, le statut `draft` et la présence du HTML, de l'objet et des balises obligatoires. Elle débite 1 crédit, sauf pour les admins (règle actuelle), puis passe la campagne `pending_validation` avec `validation_requested_at`. Ainsi, aucune double consommation et aucune soumission sans crédit.
- **send-campaign** (Edge Function, admin uniquement) : lit le HTML et l'objet enregistrés, applique le même mapping des listes, crée la campagne Brevo puis l'envoie, et conserve les notifications. Aucune génération Claude.

## C. Modifications du lot A
**Base de données (une seule migration)**
- `campaigns` : ajout de `email_design jsonb` (format de l'éditeur), `email_generated_at`, `email_generation_count int default 0`, `send_locked_at timestamptz`, `send_error text`. Aucune nouvelle table.
- Remplacement de la règle « le propriétaire modifie sans restriction » par : modification autorisée seulement quand le statut est `draft` avant **et** après la modification. En complément, un trigger `BEFORE UPDATE` empêche un non-admin, hors traitements serveur, de modifier `status`, `validated_at`, `admin_reviewer`, `brevo_campaign_id`, `launched_at`, `stats_*`, `send_*` et `email_generation_count`. Les règles des autres tables restent inchangées.
- RPC `save_campaign_email` et `submit_campaign`, exécutables uniquement par les utilisateurs connectés, avec contrôles internes.

**Edge Functions**
- Nouvelle : `generate-campaign-email`.
- Nouvelle : `send-campaign`, qui contient l'envoi actuel séparé de la génération.
- `_shared/campaign-email.ts` : prompt, construction du message, mapping Brevo, `normalizeCountry`, `extractSubject`, plus un contrôle des balises (`{{ unsubscribe }}`, `{{ mirror }}`, `{{ contact.COMPANY_NAME }}` dans l'objet, lien `/interest/{id}`).
- `create-campaign` : utilise le module partagé et garde le même comportement (transition). Seul changement : avec un `brevo_campaign_id` existant, refus au lieu d'un renvoi (sécurité anti-doublon dès maintenant).

**Frontend (strict minimum)**
- `CreateCampaign.tsx` : la soumission appelle `submit_campaign` au lieu de l'écriture directe suivie du débit de crédit, car la nouvelle règle d'accès bloquerait l'ancien parcours. Interface identique.
- `AdminCampaigns.tsx` : les changements de statut manuels restent possibles pour les admins (règle admin conservée). Aucun changement visuel.

## D. Compatibilité lots B et C
- **Éditeur recommandé : Unlayer via `react-email-editor`** (offre gratuite, éditeur par glisser-déposer pensé pour l'emailing, HTML compatible avec les clients email). Il produit un **design JSON** pour la réédition (`email_design`) et un **HTML exporté** (`message_html`) envoyé à Brevo. Il accepte les balises Brevo dans le texte et un sélecteur d'images personnalisé branché sur la médiathèque. Sa mention « Unlayer » et son chargement depuis leur CDN sont à accepter. **Alternative 100 % libre : GrapesJS + preset newsletter**, plus lourd à configurer et moins simple pour les producteurs.
- **Point clé** : Claude produit du HTML et non un design JSON. Au lot B, on n'importe pas le HTML brut dans Unlayer : Claude génère le contenu (objet, titre, sous-titre, 3 puces, phrase personnelle) et on remplit un modèle Unlayer fixe. Le prompt sera donc adapté au lot B pour produire du JSON structuré. Le lot A prévoit déjà `email_design`. `message_html` reste la seule source de ce qui est envoyé.
- **Interface du futur frontend** : `invoke('generate-campaign-email')`, `rpc('save_campaign_email')`, `rpc('submit_campaign')`, et `invoke('send-campaign')` pour l'admin.

## Images
- Réutilisation de la table `media` et du bucket public `media` (URL publiques stables, compatibles avec Brevo). Formats JPG, PNG et WebP converti en JPG, 2 Mo maximum, redimensionnement à 1200 px de large côté navigateur au lot B. Envoyer une campagne sans image reste possible.
- Le HTML contient l'URL publique. Si une image de la médiathèque est supprimée, les emails déjà envoyés perdent l'image. Au lot B, la suppression d'un média utilisé par une campagne envoyée sera donc refusée (contrôle de `message_html` sur les campagnes `active` et `results`). Aucun nouveau système d'images.

## E. Stratégie de transition
- Le lot A ne change rien au parcours visible : les producteurs soumettent comme aujourd'hui, et l'admin « Valide » toujours via `create-campaign` (génération et envoi).
- `generate-campaign-email`, `save_campaign_email` et `send-campaign` sont déployées sans être appelées par l'interface.
- Lot C : le bouton admin bascule vers `send-campaign` seulement si `message_html` est présent, sinon il garde l'ancien parcours pour les campagnes déjà soumises. Ensuite, `create-campaign` sera retirée.
- Campagnes historiques : non modifiées, aucun contenu ajouté a posteriori.

## F. Risques et protections
- **Doubles envois** : verrou en base (`UPDATE … SET send_locked_at=now() WHERE id=? AND status='pending_validation' AND brevo_campaign_id IS NULL AND send_locked_at IS NULL RETURNING`). Sans ligne renvoyée, refus. `brevo_campaign_id` est enregistré **dès la création Brevo**, avant `sendNow`. En reprise, si `brevo_campaign_id` existe, on lit le statut Brevo (`GET /emailCampaigns/{id}`) : déjà envoyée, on passe `active` sans renvoi ; encore en brouillon, `sendNow` est autorisé une seule fois après action explicite de l'admin. Un échec passe la campagne `failed` avec `send_error`, sans renvoi automatique.
- **Erreurs IA** : délai maximal, réponse sans HTML ou balises manquantes, l'erreur est renvoyée sans modifier la campagne. Protection anti-abus : 10 générations maximum par campagne (`email_generation_count`) et 20 secondes minimum entre deux générations (`email_generated_at`), sans infrastructure de quotas.
- **Crédits** : débit uniquement dans `submit_campaign`, dans la même transaction que le changement de statut.
- **Statuts** : on conserve `draft`, `pending_validation`, `active`, `results`, `failed`, `archived`, `manual`. `error` est remplacé par `failed` dans les nouvelles fonctions. Rejet admin : retour en `draft` sans remboursement automatique (à confirmer). Aucun statut nouveau.

## G. Tests
- Tests base de données (requêtes SQL sur campagnes de test) : modification refusée hors `draft`, champs sensibles protégés, accès à la campagne d'un autre producteur refusé, `submit_campaign` sans crédit refusé, deux soumissions simultanées donnant un seul débit, admin non débité.
- Tests Deno : contrôle des balises, mapping des marchés, extraction de l'objet.
- `send-campaign` testée avec Brevo **simulé** (aucun appel réel). Appel réel uniquement vers une liste de test interne, si vous en fournissez une.
- Non-régression : brouillon puis soumission dans l'aperçu, validation admin sur campagne de test **sans envoi réel**, `sync-brevo-campaign` et `/interest` inchangés.

## H. Séquence d'implémentation
1. Migration : colonnes, nouvelle règle d'accès, trigger de protection, RPC.
2. `_shared/campaign-email.ts` et `create-campaign` adaptée.
3. `generate-campaign-email` et `send-campaign`.
4. `CreateCampaign.tsx` : soumission via `submit_campaign`.
5. Tests SQL et Deno, puis vérification dans l'aperçu.

## I. Périmètre exclu
Éditeur visuel, changement du prompt en JSON, interface de prévisualisation (lot B) ; écran admin de relecture et bascule de l'envoi (lot C) ; protection de suppression des médias (lot B) ; CRM, Opportunités, Recherches sur mesure, Reporting ; aucune génération IA, aucun envoi Brevo et aucune consommation de crédit réels pendant les tests.

## Points à confirmer
- Rejet admin : retour en brouillon sans remboursement, ou avec remboursement du crédit ?
- Éditeur : Unlayer (simple, mention « Unlayer ») ou GrapesJS (entièrement libre, plus de travail) ?
