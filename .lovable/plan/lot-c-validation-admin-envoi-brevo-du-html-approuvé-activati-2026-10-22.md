# Lot C — Validation admin, envoi Brevo du HTML approuvé, activation générale

## A. Audit vérifié (code et données réels)

Données (aujourd'hui) : manual 298, results 51 (41 avec Brevo), draft 9, archived 3, pending_validation 2, active 1. **Aucune campagne n'a de `email_content` ni de `message_html`.** Aucune n'a `send_started_at`. Les 2 campagnes en attente ont un crédit consommé et suivent l'ancien parcours.

Ce qui existe et sera réutilisé tel quel :
- `send-campaign` (admin) : modes `send / check / confirm_send / release`, verrou `send_started_at` + `brevo_campaign_id`, tag `[WE-{id}]` dans le nom Brevo, envoie `message_html` sans Claude, `send_error = uncertain` en cas de timeout, aucun renvoi automatique.
- `save-campaign-email` : seul à écrire `email_content`/`message_html` (rendu serveur), drafts seulement.
- `campaigns_guard` : hors brouillon, le producteur ne peut plus rien modifier.
- `submit_campaign` : un seul débit (`credit_consumed_at`), accepte encore une campagne sans HTML.
- `reject_campaign` : remet en `draft`, garde le crédit.
- `create-campaign` : refuse déjà toute campagne avec `message_html`.
- Éditeur lot B, `EmailPreviewFrame` réutilisable pour l'admin.

Incohérences trouvées, corrigées dans ce lot :
1. **Double notification producteur** : `send-campaign` (comme `create-campaign`) envoie déjà l'email « campagne en ligne », et la page admin appelle en plus `notify-campaign-validated`. De plus le mode `check` peut renvoyer l'email à chaque vérification. Correction : la mise en ligne n'est faite (et la notification envoyée) qu'une seule fois, par une mise à jour conditionnelle `status = pending_validation → active`.
2. **Le motif de rejet écrase les instructions du producteur** : `reject_campaign` et l'ancien rejet écrivent le motif dans `client_note`, qui est le champ « instructions complémentaires ». Correction : le motif est enregistré dans `campaign_events` (type `rejected`, déjà lisible par le producteur propriétaire), `client_note` n'est plus touché.
3. **Ancien rejet** : passe la campagne en `failed` (le producteur ne peut plus la corriger). Pour les campagnes du nouveau parcours, seul `reject_campaign` est utilisé (déjà en place au lot B) ; l'ancien rejet reste pour les 2 campagnes historiques.
4. `check` ne regarde que les 100 dernières campagnes Brevo s'il n'y a pas d'identifiant enregistré : passé à 3 pages de 100 (300), suffisant compte tenu du volume.
5. `generate-campaign-email` / `save-campaign-email` / le hook front dépendent de `has_campaign_editor_access` : il faut y intégrer l'activation générale (section F).
6. Aucune notification de rejet n'existe.

## B. Parcours final

```text
Producteur : Configuration → Email (générer, modifier, images, aperçu, enregistrer) → Validation → Soumettre (1 crédit)
Admin      : Liste "À valider" → Examiner (infos + aperçu email) → Valider et envoyer | Renvoyer pour correction
Envoi      : send-campaign → Brevo (HTML enregistré, tel quel) → active → sync/résultats/CRM inchangés
```

## C. Page d'administration (`AdminCampaigns.tsx`, même page)

- Badges dans la liste : « Email personnalisé », « Ancien parcours », « Vérification Brevo requise » (rouge) quand `send_started_at` est posé sans mise en ligne ou `send_error` présent, « Renvoyée pour correction » (dernier événement `rejected` et statut draft).
- Bouton **Examiner** ouvrant un panneau latéral (`Sheet` déjà utilisé sur la page) : domaine, contact, marchés (avec marchés sans liste Brevo signalés), vins, documents, instructions du producteur, date de soumission, historique des rejets, objet définitif, aperçu ordinateur/mobile de `message_html` (exactement le champ envoyé).
- Actions dans ce panneau pour une campagne personnalisée en attente :
  - **Valider et envoyer** → confirmation (« X marchés, listes Brevo … ») → `send-campaign` mode `send`. Bouton désactivé pendant l'appel et dès qu'un verrou existe (anti double clic ; le verrou serveur couvre deux admins).
  - **Renvoyer pour correction** → zone de texte obligatoire pour le motif → `reject_campaign`.
- Bloc **Vérification Brevo** si état incertain : explication, bouton « Vérifier le statut Brevo » (`check`), puis selon le résultat :
  - déjà envoyée → marquée en ligne, rien n'est renvoyé ;
  - brouillon Brevo trouvé → « Envoyer ce brouillon Brevo » (`confirm_send`) avec confirmation explicite ;
  - rien trouvé → « Débloquer pour un nouvel envoi » (`release`) avec confirmation demandant d'avoir vérifié dans Brevo.
- Campagnes de l'ancien parcours : boutons actuels inchangés (`create-campaign`).

## D. Edge Functions et RPC

- `send-campaign` :
  - exige une campagne « nouveau parcours » (section G) ;
  - `markLive` conditionnel (`.eq('status','pending_validation')`), notification seulement si la ligne a réellement changé ; la page admin n'appelle plus `notify-campaign-validated` pour ce parcours ;
  - enregistre `validated_at`, `admin_reviewer`, `launched_at`, `brevo_campaign_id` (déjà) + événement `campaign_events` `sent` ;
  - option recette `test: true` : remplace les listes par `BREVO_TEST_LIST_ID` (secret à ajouter), refusée si le secret est absent ; nom Brevo préfixé `[TEST]`.
  - Aucune transformation du HTML : `htmlContent = message_html`, `subject = subject_selected`.
- `submit_campaign` (migration) : quand le nouveau parcours est actif, HTML obligatoire, `email_content` version 2 avec au moins un bloc texte non vide, balises obligatoires, objet avec `{{ contact.COMPANY_NAME }}`. Débit unique inchangé. Mode retour arrière : comportement actuel.
- `reject_campaign` (migration) : motif obligatoire, enregistré dans `campaign_events` au lieu de `client_note`.
- `has_campaign_editor_access` (migration) : vrai si admin, droit `campaign_email_editor`, ou activation générale.
- Nouvelle petite fonction `notify-campaign-rejected` (email FR/EN via `_shared/we-email.ts` existant) : motif + lien vers la campagne ; appelée une fois par la page admin après un rejet réussi.
- `create-campaign` : inchangé (garde déjà en place), sert encore aux 2 campagnes historiques.

## E. États et idempotence Brevo

| Situation | Protection |
|---|---|
| Double clic / 2 admins | verrou SQL atomique `send_started_at IS NULL AND brevo_campaign_id IS NULL` ; second appel → 409 |
| Erreur Brevo nette avant création | verrou libéré, `send_error = brevo_create …`, renvoi possible |
| Timeout création | `uncertain`, verrou gardé, `check` obligatoire |
| Créée mais réponse perdue | `check` retrouve la campagne via le tag `[WE-id]` |
| sendNow en échec/timeout | `brevo_campaign_id` déjà enregistré, `check` puis `confirm_send` |
| Envoyée mais mise à jour échouée | `check` voit le statut envoyé → mise en ligne sans renvoi |
| Déjà envoyée | refus 409 |

Aucun nouveau statut : l'état incertain se lit avec `send_started_at` / `send_error` sur une campagne `pending_validation`.

## F. Activation générale et retour arrière

- Une seule table de réglages `app_settings (key, value)` lisible par les connectés, modifiable par les admins, avec la clé `campaign_email_editor_enabled` (activée au déploiement).
- Interrupteur admin sur `AdminCampaigns` : « Nouveau parcours email : activé/désactivé ».
- Désactivé (retour arrière) : l'étape email est masquée pour les producteurs non autorisés, `submit_campaign` accepte à nouveau sans HTML, les brouillons et emails déjà enregistrés restent intacts, et une campagne avec email personnalisé ne peut toujours être envoyée que par `send-campaign` (garde `create-campaign` maintenue).
- Les droits `campaign_email_editor` existants restent valides ; aucune modification des abonnements, crédits, CRM, opportunités.

## G. Campagnes historiques

Classement explicite, pas uniquement par `message_html` :
- **Nouveau parcours** : `email_content.version = 2` **et** `message_html` non vide **et** `brevo_campaign_id` vide. Les deux champs ne peuvent être écrits que par `save-campaign-email` ; aucune campagne existante ne remplit ces conditions.
- **Ancien parcours** : en attente sans `email_content` → bouton actuel `create-campaign`.
- Envoyées / résultats / manuelles / archivées : non touchées.
- Les 9 brouillons historiques passent par l'étape email avant de pouvoir être soumis (configuration conservée).
- Retrait de l'ancien parcours : quand il ne reste plus aucune campagne en attente sans email, `create-campaign` et le bouton « ancien parcours » pourront être retirés (intervention ultérieure, non incluse).

## H. Notifications, résultats, CRM

- Soumission : `notify-campaign-submission` inchangé.
- Mise en ligne : une seule notification (envoyée par `send-campaign`).
- Rejet : `notify-campaign-rejected` (nouveau, simple).
- `sync-brevo-campaign`, `submit-campaign-interest`, `enrich-campaign-prospects`, CRM, rapports : inchangés ; ils reposent sur `brevo_campaign_id` et `/interest/{campaignId}`, que le nouveau parcours renseigne de la même façon.

## I. Sécurité et intégrité

- Envoi : admin vérifié côté serveur ; le producteur ne peut pas appeler `send-campaign`.
- Intégrité : un seul écrivain de l'email (`save-campaign-email`, drafts uniquement), verrou `campaigns_guard` dès la soumission, l'aperçu admin et l'envoi lisent le même champ `message_html`. Pas de hachage ni de versioning nécessaires.
- Variables Brevo et lien d'intérêt revérifiés à la soumission et à l'envoi ; CTA personnalisé conservé tel quel.
- Crédits : débit unique dans `submit_campaign`, conservé au rejet.
- `app_settings` : RLS lecture connectés, écriture admins.

## J. Fichiers et migrations

- Migration : table `app_settings` (+ GRANT, RLS), `has_campaign_editor_access`, `submit_campaign`, `reject_campaign`.
- `supabase/functions/send-campaign/index.ts` (notification unique, garde parcours, mode test, recherche Brevo élargie, événement `sent`).
- `supabase/functions/notify-campaign-rejected/index.ts` (nouveau).
- `src/pages/AdminCampaigns.tsx` + `src/components/admin/CampaignReviewSheet.tsx` (nouveau) + `src/components/admin/BrevoRecoveryPanel.tsx` (nouveau).
- `src/hooks/useCampaignEditorAccess.tsx` (inchangé côté appel, la fonction serveur décide).
- `src/pages/CreateCampaign.tsx` : bandeau de rejet lisant le dernier motif dans `campaign_events`.
- `src/pages/CampaignDetail.tsx` : motif de rejet affiché si présent.
- Traductions FR/EN : module `campaign-email-editor.ts` + clés admin.
- Tests : `_shared/campaign-email_test.ts`, `src/lib/email-draft.test.ts`, nouveau test d'état d'envoi (fonction pure de classement/état).
- `AGENTS.md`, `roadmap.md`, `mem://features/campaign-management`.

## K. Séquence

1. Migration (réglage, RPC).
2. `send-campaign` + `notify-campaign-rejected` + tests Deno ; déploiement.
3. Panneau d'examen, panneau Brevo, badges, interrupteur dans la page admin.
4. Bandeau de rejet côté producteur.
5. Traductions, docs, tests automatiques, tests SQL en transaction annulée (soumission sans HTML refusée en mode actif / acceptée en retour arrière, un seul débit, rejet sans écrasement des instructions), vérification du build.
Aucun envoi Brevo, aucune génération IA, aucun crédit réel pendant le développement.

## L. Recette globale (après validation du déploiement)

Prérequis : compte producteur de test avec 1 crédit, liste Brevo de test (destinataires internes) dont l'identifiant est enregistré dans le secret `BREVO_TEST_LIST_ID`, campagne de test envoyée avec l'option test.
1 configuration · 2 génération Claude · 3 objet · 4 blocs (modifier, déplacer) · 5 images · 6 aperçu ordinateur/mobile · 7 sauvegarde et reprise · 8 régénération sans perte · 9 soumission (1 crédit) · 10 examen admin · 11 rejet motivé, email reçu · 12 resoumission sans débit · 13 validation · 14 HTML Brevo identique à l'aperçu (comparer dans Brevo) · 15 double clic / deuxième onglet refusé · 16 synchronisation des résultats · 17 formulaire d'intérêt · 18 qualification · 19 ajout au CRM · 20 campagnes historiques et 2 en attente via l'ancien bouton.

## M. Hors périmètre

Suppression de `create-campaign` ; édition du contenu par l'admin ; historique de versions ; relances ; personnalisation par importateur ; refonte des résultats, CRM, statistiques ou crédits.

## Ajustements validés

- `app_settings` accepté ; `campaign_email_editor_enabled = false` à la fin. Admins et comptes autorisés testent le parcours complet ; ouverture générale manuelle après recette.
- `check`, `confirm_send`, `release` restent utilisables sur toute campagne en attente ayant un verrou ou un `brevo_campaign_id`, indépendamment du classement du parcours (la garde « nouveau parcours » ne s'applique qu'au mode `send`). `release` exige une confirmation explicite (`confirm: true`) et reste refusé si une campagne Brevo existe.
- Mode test : listes imposées côté serveur à `BREVO_TEST_LIST_ID` seulement (refus si absent ou non numérique, ou si la liste n'existe pas dans Brevo). Il n'est utilisable que sur une campagne de test marquée par un événement `campaign_events` `test_campaign` posé par l'admin ; après envoi la campagne passe en `archived` (et non `active`), aucune notification producteur, et la synchronisation et l'enrichissement ignorent les campagnes portant ce marqueur (seule protection ajoutée à ces modules).
- Notifications : la mise en ligne n'est notifiée que si la transition `pending_validation → active` a réellement eu lieu ; le rejet n'est notifié que si `reject_campaign` a réussi. Une erreur Resend est seulement journalisée, sans effet sur l'envoi Brevo.
- Retour arrière : contenu jamais supprimé ; l'admin peut toujours examiner, envoyer ou rejeter les campagnes personnalisées soumises ; `create-campaign` refuse toujours un email personnalisé.
- Les 2 campagnes en attente et toutes les campagnes historiques ne sont pas modifiées.
- Uniquement tests techniques automatiques et tests SQL annulés ; ni recette fonctionnelle, ni envoi réel, ni débit réel, ni génération IA, ni publication.
