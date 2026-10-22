# Lot B — Préparation, édition et prévisualisation de l'email de campagne

## A. Audit du lot A (vérifié dans le code)

- `generate-campaign-email` : propriétaire ou admin, campagne `draft`, cooldown 20 s, 10 générations max, Claude `claude-sonnet-4-6` renvoie un JSON, transformé par `contentFromClaude` puis rendu par `renderEmailHtml`. **Il écrit immédiatement** `email_content`, `message_html`, `subject_selected` (écrase le travail en cours).
- `email_content` = `{ version: 1, subject, blocks[] }`, blocs `heading | subtitle | text | image | bullets | signature`. Le bloc `bullets` porte en dur le titre de section et le bouton CTA « Send me the price list ».
- `renderEmailHtml` : `{{ mirror }}`, `{{ unsubscribe }}`, domaine/adresse sont déjà dans les parties fixes ; le lien `/interest/{id}` n'existe que dans le bloc `bullets` et autour de l'image → supprimer les puces supprime le CTA. `sanitizeInline` autorise `<strong>/<b>/<em>/<i>/<br>/<a href="http(s)">` ; les accolades `{{ … }}` ne sont pas échappées (OK pour Brevo).
- `save_campaign_email(_id, _subject, _content, _html)` : **accepte un HTML venant du navigateur** → risque de divergence avec `email_content`.
- `submit_campaign` : vérifie balises + `{{ contact.COMPANY_NAME }}` si HTML présent, débite 1 crédit une seule fois, passe en `pending_validation`. `campaigns_guard` bloque toute édition hors `draft`. `reject_campaign` existe mais la page admin ne l'utilise pas.
- `CreateCampaign.tsx` : 2 étapes (configuration → récapitulatif), soumission via `submit_campaign`.
- `AdminCampaigns.tsx` : le bouton de validation appelle toujours `create-campaign`, qui régénère un email via Claude.
- Médiathèque : `Profile.tsx` lit/insère `media`, upload dans le bucket public `media`, suppression = suppression fichier + ligne, sans vérifier l'usage.
- Tiptap : pas installé.

## B. Parcours utilisateur

```text
Étape 1 Configuration (inchangée) → Étape 2 Préparation de l'email (nouvelle) → Étape 3 Validation (récap actuel + soumission)
```

Étape 2, une seule page, deux colonnes (empilées sur mobile) :
- Gauche : objet, puis liste de blocs éditables (texte riche, image), boutons « Ajouter un paragraphe », « Ajouter une image », flèches haut/bas, supprimer.
- Droite : aperçu dans un `iframe` (onglets Ordinateur 600 px / Mobile 375 px), objet + expéditeur affichés au-dessus.
- Barre d'actions : « Générer mon email » (si vide) / « Régénérer avec l'IA », « Enregistrer » avec indicateur « Modifications non enregistrées », compteur de générations restantes.
- Passage à l'étape 3 bloqué tant que non enregistré ; « Soumettre ma campagne pour validation » enregistre puis appelle `submit_campaign`.
- Après soumission : écran verrouillé en lecture (aperçu seul) avec badge de statut ; après rejet (retour `draft`), édition reprise, note admin affichée, aucun nouveau crédit.
- Génération jamais automatique à l'ouverture.

## C. Éditeur : modèle fixe + Tiptap minimal

Retenu : Tiptap, mais **une petite instance par bloc texte** (pas un document unique), ce qui garde le modèle de blocs, les déplacements simples et une conversion triviale.
- Dépendances : `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` (paragraphes, gras, italique, sauts de ligne ; titres/listes/code désactivés), `@tiptap/extension-link` (http/https uniquement), `browser-image-compression`.
- Barre d'outils : Gras, Italique, Lien, Retirer le lien.
- Sortie Tiptap (`<p>`, `<strong>`, `<em>`, `<br>`, `<a>`) stockée telle quelle dans `block.html` ; nettoyage et conversion en styles email inline faits **côté serveur**.
- Images, ordre, ajout/suppression : gérés par une liste React classique, pas par Tiptap.
- Alternative écartée : textarea + markdown (moins intuitif pour des vignerons) ; éditeur HTML libre (casse la structure).

## D. Contenus, sauvegarde, rendu

Nouveau format `email_content` **version 2**, plus libre :
```text
{ version: 2, subject, blocks: [ {id, type:"heading"|"text"|"image", html?, url?, alt?, media_id?} ] }
```
- Plus de « 3 puces obligatoires » : Claude produit toujours son JSON actuel, converti en v2 (titre → heading, sous-titre/intro/chaque puce/closing → blocs texte, titre de section → heading). L'utilisateur peut tout supprimer sauf l'objet et au moins un bloc texte.
- **Parties protégées dans le modèle** (hors éditeur) : lien miroir, bouton CTA « Send me the price list » vers `/interest/{id}` placé toujours après le contenu, pied domaine + adresse + `{{ unsubscribe }}`. L'objet garde `{{ contact.COMPANY_NAME }}` en préfixe non modifiable (affiché comme pastille « Nom de l'importateur »).
- `renderEmailHtml` accepte v1 et v2 (v1 inchangé pour les campagnes existantes et les tests).
- **Source de vérité unique** : nouvelle Edge Function `save-campaign-email` (propriétaire, `draft`) :
  - `mode: "preview"` → reçoit `email_content`, valide, rend le HTML, le renvoie sans écrire.
  - `mode: "save"` → idem puis écrit `email_content`, `message_html`, `subject_selected`.
  - Le navigateur n'envoie jamais de HTML final. La RPC `save_campaign_email` voit son EXECUTE retiré à `authenticated` (non utilisée par le front aujourd'hui).
- Aperçu : rendu serveur uniquement à l'enregistrement ou via un bouton « Actualiser l'aperçu » (mode `preview`) ; badge « Aperçu non à jour » dès qu'une modification n'est pas reflétée. Aucun appel automatique pendant la frappe.
- Protection perte : indicateur de modifications, `beforeunload`, confirmation en quittant l'étape, enregistrement forcé avant soumission.

## E. Images

- Sélecteur dans un `Dialog` : onglet « Ma médiathèque » (`media` de l'utilisateur, type image) et « Importer » (JPG/PNG/WebP, compression navigateur à 1200 px max, ~300 Ko, refus > 5 Mo avant compression) ; l'import crée la ligne `media` et le fichier dans le bucket `media` exactement comme `Profile.tsx` (helper partagé extrait).
- Bloc image : URL publique https + `media_id` + texte alternatif modifiable ; le serveur refuse toute URL hors du bucket `media` du projet et le base64.
- Délivrabilité : 3 images max, avertissement si aucune ligne de texte entre deux images.
- Retirer une image de l'email ne touche pas la médiathèque.
- Suppression dans la médiathèque (`Profile.tsx`) : si le média est utilisé par une campagne non brouillon (soumise, envoyée, résultats), suppression refusée avec message ; si utilisé par un brouillon, confirmation puis l'image apparaît « indisponible » dans l'éditeur.

## F. Cohabitation avec l'ancien parcours (jusqu'au lot C)

Indispensable, deux protections :
1. **Activation restreinte** : la nouvelle étape 2 n'est visible que pour les admins et les comptes ayant un droit `campaign_email_editor` dans `user_entitlements` (même mécanisme que l'essai ExportVins, aucun rôle touché). Les autres producteurs gardent exactement le parcours actuel. Activation générale au lot C.
2. **Garde serveur** : `create-campaign` refuse une campagne dont `message_html` est non vide (« Email préparé par le client : envoi via le lot C ») ; la page admin affiche un badge « Email personnalisé » et désactive le bouton de validation pour ces campagnes. Ainsi l'ancien bouton ne peut jamais générer un email différent de celui approuvé.
- `send-campaign` n'est pas branché, `create-campaign` n'est pas supprimé, aucune campagne historique modifiée (toutes ont `message_html` vide), les 2 campagnes en attente suivent l'ancien parcours.
- Rejet admin : utiliser `reject_campaign` uniquement pour les campagnes « Email personnalisé » (conserve contenu + crédit).

## G. Fichiers concernés

Indispensable :
- `supabase/functions/_shared/campaign-email.ts` : type v2, `contentV2FromClaude`, `sanitizeRichHtml` (allowlist p/br/strong/em/a https), rendu v2, CTA fixe, validation (objet, ≥1 texte, ≤3 images, URL media).
- `supabase/functions/_shared/campaign-email_test.ts` : tests v2.
- `supabase/functions/generate-campaign-email/index.ts` : sortie v2, option `apply: false` qui renvoie la proposition sans écrire (le compteur reste consommé).
- `supabase/functions/save-campaign-email/index.ts` (nouveau) + `supabase/config.toml`.
- `supabase/functions/create-campaign/index.ts` : garde `message_html`.
- Migration : REVOKE EXECUTE `save_campaign_email` pour `authenticated` ; valeur d'entitlement `campaign_email_editor` acceptée.
- `src/pages/CreateCampaign.tsx` : 3 étapes, intégration de l'étape email, verrou après soumission.
- `src/components/campaigns/email-editor/` (nouveau) : `EmailPrepareStep.tsx`, `RichTextBlock.tsx`, `ImageBlock.tsx`, `MediaPickerDialog.tsx`, `EmailPreviewFrame.tsx`, `useEmailDraft.ts`.
- `src/lib/media-upload.ts` (nouveau, extrait de `Profile.tsx`) ; `src/pages/Profile.tsx` : contrôle d'usage avant suppression.
- `src/hooks/useCampaignEditorAccess.tsx` (nouveau).
- `src/pages/AdminCampaigns.tsx` : badge, bouton désactivé, rejet via `reject_campaign` pour ces campagnes.
- `src/pages/CampaignDetail.tsx` : aperçu en lecture de l'email enregistré + statut.
- `src/i18n/locales/campaign-email-editor.ts` (nouveau module FR/EN fusionné, comme importer-profile).
- `AGENTS.md`, `roadmap.md`.

Facultatif : admin « activer l'éditeur pour ce client » dans la fiche utilisateur (sinon activation par requête SQL).

## H. Sécurité et permissions

- Écriture du contenu uniquement via `save-campaign-email` (vérifie jeton, propriétaire ou admin, statut `draft`) ; `campaigns_guard` reste le filet de sécurité.
- Sanitisation serveur stricte ; balises Brevo et lien d'intérêt uniquement dans les parties fixes, toujours revérifiées par `missingEmailTags` à chaque rendu et par `submit_campaign`.
- Aucun crédit pour générer/enregistrer ; un seul débit dans `submit_campaign` ; aucun Brevo.
- Images : bucket `media`, chemin préfixé par `user_id` (politiques existantes), URL contrôlée serveur.

## I. Tests (sans envoi réel)

- Deno : rendu v2 (balises présentes même blocs vides supprimés, script retiré, lien `javascript:` retiré, `{{ contact.COMPANY_NAME }}` intact, image hors bucket refusée, conversion Claude → v2, v1 toujours rendu à l'identique).
- Vitest : `useEmailDraft` (déplacement, suppression, état modifié).
- SQL en transaction annulée : soumission → 1 crédit ; rejet → draft ; resoumission → 0 crédit ; `create-campaign` refuse si `message_html`.
- Fonctionnel (navigateur, compte de test, IA réelle seulement si accord) : scénarios A à H du brief ; si pas de session de test disponible, je le signalerai et vous demanderai de faire A/F/G.

## J. Séquence d'implémentation

1. Shared v2 + tests Deno.
2. `save-campaign-email`, adaptation `generate-campaign-email`, garde `create-campaign`.
3. Migration (révocation RPC, entitlement).
4. Helper média + contrôle suppression dans `Profile.tsx`.
5. Composants éditeur + `useEmailDraft` + aperçu.
6. Intégration `CreateCampaign.tsx` (étapes, verrou, soumission) et `CampaignDetail.tsx`.
7. `AdminCampaigns.tsx` (badge, blocage, rejet).
8. Traductions, AGENTS.md, roadmap, tests, vérification build.

## K. Hors périmètre (lot C et après)

Bouton admin vers `send-campaign` et activation générale de l'éditeur ; obligation d'un HTML à la soumission ; historique de versions ; personnalisation par importateur ; relances ; stats Brevo ; CRM/prospects.

## Ajustements validés

- CTA : texte du bouton modifiable par le producteur (champ dédié, 60 caractères max, défaut proposé par Claude ou « Send me the price list ») ; lien `/interest/{campaignId}` fixe, ajouté par le serveur. Aide affichée : le texte doit correspondre au formulaire (tarifs, échantillons, appel, fiches techniques).
- Brouillons existants sans `email_content` ni `message_html` : ouverture normale, marchés/vins/documents/instructions conservés, étape email vide avec « Générer mon email ». Aucune modification des campagnes historiques.
- Activation restreinte appliquée aussi côté serveur : `generate-campaign-email` et `save-campaign-email` refusent (403) un appelant ni admin ni titulaire du droit `campaign_email_editor` actif.
- Blocage maintenu : `create-campaign` refuse toute campagne avec `message_html` non vide.
- Tests : aucun envoi Brevo, aucun débit réel de crédit (vérifications SQL en transaction annulée). Compte rendu final détaillé (fonctionnalités, fichiers, fonctions déployées, tests exécutés, limites, reste lot C).
