# Refonte Campagnes — Lot A V2 : architecture backend et préparation de l'éditeur

## A. État des lieux vérifié
- **create-campaign** (admin uniquement) enchaîne en un seul appel : récupération de la campagne, du profil et des vins, génération Claude `claude-sonnet-4-6`, extraction de l'objet, association aux listes Brevo (`BREVO_LIST_IDS`), création Brevo puis `sendNow`, passage en `active` (`validated_at`, `launched_at`, `admin_reviewer`, `brevo_campaign_id`), puis email Resend. En cas d'échec, la campagne passe `error`, même si Brevo a déjà envoyé. Le HTML n'est jamais enregistré.
- **Données historiques (requête du jour)** : `message_html` vaut une chaîne vide sur les campagnes, et **0 campagne a un contenu non vide**. Le chiffre de 12 du premier plan comptait les valeurs non nulles mais vides : il était faux. 4 campagnes ont un `subject_selected` renseigné. 42 ont un `brevo_campaign_id`. Statuts en base : `manual` 298, `results` 51, `draft` 9, `archived` 3, `pending_validation` 2, `active` 1.
- **Écritures navigateur actuelles sur `campaigns`** :
  - Producteur : `CreateCampaign.tsx`, qui enregistre le brouillon (`draft`), puis passe la campagne en `pending_validation` et appelle `consume_campaign_credit()` à part.
  - Producteur : `Campaigns.tsx`, qui archive (`archived`) quel que soit le statut.
  - Producteur : `manual-campaign.ts`, qui crée la campagne système (`manual`).
  - Admin : `AdminCampaigns.tsx`, pour le sélecteur de statut libre, `failed` et `results`.
- **Écritures service** : `create-campaign` (statut, Brevo), `sync-brevo-campaign` (`stats_opens`, `stats_clicks`) et l'invitation ExportVins (création de campagne `manual`).
- **Règles d'accès** : le producteur peut modifier sa campagne sans restriction de colonne ni de statut, et peut **créer** une campagne directement en `pending_validation` (sans crédit). La lecture et la suppression sont limitées au producteur ou à l'admin.
- **Médiathèque** : table `media` et bucket public `media` (dossiers `{user_id}/…`).

## B. Architecture cible
```text
Nouveau parcours (actif au lot C) :
Producteur : generate-campaign-email -> édite (lot B) -> save_campaign_email -> submit_campaign
Admin      : relit (lot C) -> send-campaign -> Brevo (HTML enregistré, sans nouvelle génération Claude)

Parcours actuel (inchangé jusqu'au lot C) :
Producteur : submit_campaign (sans HTML) -> Admin : create-campaign (génère + envoie)
```

## C. Modifications du lot A

### Base de données (une migration)
Colonnes ajoutées à `campaigns` :

| Colonne | Justification |
|---|---|
| `email_content jsonb` | Contenu structuré éditable (voir D), indépendant de l'éditeur choisi. Sert à rééditer un brouillon. |
| `credit_consumed_at timestamptz` | Garantit un seul débit, y compris après un rejet et une nouvelle soumission. |
| `email_generated_at timestamptz` | Délai minimal entre deux générations (protection anti-abus simple). |
| `email_generation_count int default 0` | Plafond de générations par campagne (10). |
| `send_started_at timestamptz` | Verrou d'envoi et détection d'un envoi incertain. |
| `send_error text` | Raison d'un échec ou d'un état incertain, affichée à l'admin. |

Réutilisés sans ajout : `message_html` (HTML final envoyé), `subject_selected`, `validation_requested_at`, `validated_at`, `admin_reviewer`, `brevo_campaign_id`, `launched_at`. Non retenus : versions de brouillon et table d'images.

**Trigger `campaigns_guard` (BEFORE INSERT OR UPDATE)**, actif seulement pour un utilisateur non admin, jamais pour `service_role` :
- **Création** : statut `draft` ou `manual` uniquement, et colonnes sensibles vides. Le brouillon actuel et la campagne système restent possibles ; la création directe en `pending_validation` est bloquée.
- **Modification**, colonnes sensibles figées : `status`, `validated_at`, `admin_reviewer`, `brevo_campaign_id`, `launched_at`, `stats_*`, `credit_consumed_at`, `send_*`, `email_generated_at`, `email_generation_count`, `validation_requested_at`.
- **Seule exception de statut** : passage vers `archived` depuis n'importe quel statut sauf `pending_validation` (archivage actuel conservé).
- **Contenu et configuration** (nom, marchés, vins, documents, objet, HTML, contenu) modifiables uniquement si l'ancien statut est `draft`.
- **Règles d'accès** : les politiques existantes sont conservées. Le trigger porte les règles de colonnes et de statuts, plus simples à tester qu'une politique par colonne.

**Cohabitation vérifiée** :

| Opération existante | Effet |
|---|---|
| Brouillon producteur | Inchangé (`draft` vers `draft`). |
| Archivage | Inchangé. |
| Campagne `manual` | Inchangée. |
| Soumission | Passe par `submit_campaign` (SECURITY DEFINER, contrôlée) : seule modification de `CreateCampaign.tsx`. |
| Actions admin (sélecteur, `failed`, `results`) | Exemptées, car `has_role(admin)`. |
| `create-campaign`, `sync-brevo-campaign`, ExportVins | Exemptés, car `service_role`. |
| Campagnes historiques | Aucune donnée réécrite. Seules les modifications futures du producteur sont limitées. |

**RPC (EXECUTE pour `authenticated` uniquement)** :
- `submit_campaign(_id)` : verrou de ligne (`FOR UPDATE`), propriétaire et statut `draft` vérifiés. Si `message_html` n'est pas vide, les balises obligatoires sont contrôlées ; s'il est vide, la campagne suit le parcours actuel, sans contrôle de HTML. Si `credit_consumed_at` est vide et que l'utilisateur n'est pas admin, un crédit est débité (refus si aucun) et `credit_consumed_at` est renseigné. Ensuite : `pending_validation` et `validation_requested_at`. Une nouvelle soumission après rejet ne débite donc rien.
- `save_campaign_email(_id, _subject, _content jsonb, _html)` : propriétaire et statut `draft`, avec des tailles maximales (HTML 200 Ko, contenu 100 Ko).
- `reject_campaign(_id, _reason)` (admin) : `pending_validation` vers `draft`. Le crédit reste acquis et n'est pas remboursé automatiquement.

### Edge Functions
- `_shared/campaign-email.ts` : association des listes Brevo, `normalizeCountry`, contrôle des balises, et `renderEmailHtml(content, campaign, profile)`, le modèle HTML fixe qui reprend la charte actuelle du prompt.
- **generate-campaign-email** (propriétaire ou admin, statut `draft`) : Claude renvoie le **contenu structuré en JSON** (objet, titre, sous-titre, 3 points forts, phrase personnelle). Le serveur le transforme en HTML, puis enregistre `email_content`, `message_html` et `subject_selected`. Garde-fous : 20 secondes minimum entre deux générations et 10 au maximum par campagne. Si la génération est interrompue ou invalide, rien n'est enregistré et une erreur claire est renvoyée. Aucun contact avec Brevo, aucun crédit consommé.
- **send-campaign** (admin) : envoie le `message_html` et le `subject_selected` enregistrés, avec la protection décrite en F. Elle est déployée mais **non branchée** avant le lot C.
- **create-campaign** : comportement inchangé. Elle refuse si `brevo_campaign_id` existe déjà et enregistre `brevo_campaign_id` dès la création Brevo, avant `sendNow`. Elle passe `failed` au lieu de `error`.

### Frontend (minimum)
- `CreateCampaign.tsx` : la soumission appelle `submit_campaign`. Interface identique.
- `AdminCampaigns.tsx` : le passage en `pending_validation` vers `draft` du sélecteur passe par `reject_campaign`. Sinon, rien ne change.

## D. Éditeur (lot B) : comparaison et recommandation

| Critère | Unlayer (`react-email-editor`) | GrapesJS + MJML | Modèle fixe + Tiptap (recommandé) |
|---|---|---|---|
| Gratuit | Oui, avec mention Unlayer ; marque blanche et plusieurs fonctions avancées payantes | Oui, licence BSD | Oui, licence MIT |
| Dépendance externe | Script chargé depuis les serveurs Unlayer | Aucune | Aucune |
| Images Supabase | Oui, via fonction d'envoi personnalisée | Oui, via gestionnaire d'images | Oui, sélecteur de la médiathèque |
| Balises Brevo | Modifiables, donc supprimables par erreur | Modifiables, donc supprimables | Hors des zones éditables, impossibles à supprimer |
| Rendu mobile | Bon | Bon avec MJML | Garanti par le modèle |
| Contenu généré par Claude | Import de HTML brut non fiable | Possible, mais rendu fragile | Natif (JSON vers champs) |
| Réédition | JSON propriétaire | JSON propriétaire | Notre `email_content` |
| Maintenance | Faible, mais dépend d'un tiers | Élevée (configuration, extensions) | Faible |

**Recommandation : un modèle d'email fixe (la structure actuelle), avec texte enrichi Tiptap dans chaque bloc** (titre, paragraphes, gras, liens) et un bloc image facultatif à déplacer, ajouter ou supprimer. Pour des producteurs non techniques, c'est l'option la plus simple et la plus sûre : on édite le contenu, pas la mise en page, donc les balises Brevo et le lien d'intérêt ne peuvent pas être cassés. Ce n'est pas un moteur d'édition sur mesure : la mise en page reste fixe.

**Format de stockage** : `email_content` = `{ version: 1, subject, blocks: [{ type: 'heading' | 'text' | 'image' | 'bullets' | 'signature', ... }] }`. Le HTML est toujours recalculé par `renderEmailHtml`. Si un éditeur libre devient nécessaire plus tard, `email_content` peut être converti, et `message_html` reste la seule source de ce qui est envoyé.

**Images** : réutilisation de `media` et du bucket public `media` (URL stables, compatibles avec Brevo). Formats JPG et PNG, 2 Mo maximum, redimensionnement à 1200 px côté navigateur au lot B. Aucune image n'est obligatoire. Une image supprimée de la médiathèque disparaît des emails déjà envoyés : le lot B avertira avant toute suppression d'une image utilisée.

## E. Stratégie de transition
- **Après le lot A** : le parcours actuel est identique pour le producteur et l'admin. `submit_campaign` accepte une campagne sans HTML, qui suit le parcours actuel. Les campagnes `pending_validation` existantes passent toujours par `create-campaign`.
- **Lot C** : le bouton admin appelle `send-campaign` quand `message_html` est présent, sinon `create-campaign`. Ensuite, `submit_campaign` exigera un HTML. C'est un changement d'une ligne, sans nouveau mode ni nouveau statut.
- Aucune règle de sécurité n'est contournée : la soumission sans HTML passe par la même fonction contrôlée.

## F. Risques et protections
**Envoi Brevo (send-campaign)** :
1. **Verrou** : `UPDATE … SET send_started_at=now() WHERE id=? AND status='pending_validation' AND send_started_at IS NULL AND brevo_campaign_id IS NULL RETURNING`. Sans ligne renvoyée, l'envoi est refusé. Cela protège contre le double clic, les validations simultanées et le rafraîchissement.
2. **Création Brevo** : le nom de la campagne Brevo contient l'identifiant (`… [WE-{id}]`). `brevo_campaign_id` est enregistré immédiatement, puis `sendNow` est appelé, puis la campagne passe `active`.
3. **Réponse perdue ou erreur après Brevo** : la campagne reste `pending_validation` avec `send_started_at` renseigné et `send_error='uncertain'`. **Aucune relance automatique.**
4. **Vérification manuelle (lot C)** : sur action admin, `send-campaign` en mode `check` cherche la campagne Brevo par identifiant ou par nom `[WE-{id}]` et lit son statut.
   - Envoyée ou en cours : passage en `active`, sans renvoi.
   - Brouillon Brevo : l'admin peut confirmer l'envoi de **cette** campagne.
   - Introuvable : l'admin doit confirmer explicitement avant de libérer le verrou.

**Autres risques** :
- **Crédits** : `credit_consumed_at` et le verrou de ligne empêchent la double consommation, la soumission sans crédit et la soumission partielle (une seule transaction).
- **IA** : réponse invalide refusée, aucune écriture partielle, plafond de générations.
- **Règles d'accès** : le trigger bloque les écritures directes via Supabase sur les colonnes sensibles. Admin et service sont exemptés.
- **Historique** : aucune réécriture des campagnes existantes.

## G. Tests
- **SQL** (campagnes de test créées puis supprimées) :
  - création directe en `pending_validation` refusée ;
  - modification d'une colonne sensible refusée ;
  - modification hors `draft` refusée ;
  - archivage autorisé ;
  - campagne d'un autre producteur inaccessible ;
  - soumission sans crédit refusée ;
  - deux soumissions simultanées donnent un seul débit ;
  - rejet puis nouvelle soumission sans second débit ;
  - admin non débité ;
  - mises à jour admin et service non bloquées.
- **Deno** : contrôle des balises, `renderEmailHtml` (balises présentes, sans image, avec image), association des listes, verrou de `send-campaign` avec Brevo **simulé**.
- **Non-régression dans l'aperçu** : brouillon, soumission (crédit débité une fois), archivage, campagne `manual`, et validation admin d'une campagne de test **sans envoi réel**, `create-campaign` étant testée avec Brevo simulé uniquement.

## H. Séquence d'implémentation
1. Migration : colonnes, trigger, RPC.
2. `_shared/campaign-email.ts`, puis `create-campaign` adaptée.
3. `generate-campaign-email` et `send-campaign`.
4. `CreateCampaign.tsx` (soumission) et `AdminCampaigns.tsx` (rejet).
5. Tests SQL et Deno, puis vérification dans l'aperçu.

## I. Périmètre exclu
- Éditeur et prévisualisation (lot B).
- Écran admin de relecture, bascule de l'envoi et bouton de vérification d'un envoi incertain (lot C).
- Avertissement avant suppression d'une image (lot B).
- Remboursement de crédit (action admin distincte, inchangée).
- CRM, Opportunités, Recherches sur mesure, Reporting.
- Aucun envoi Brevo réel, aucune génération IA réelle sur une campagne de production et aucun crédit réel consommé pendant les tests.
