# Audit Dashboard producteur (/dashboard) — aucun changement de code

## Partie 1 — Audit factuel (état actuel)

Fichiers : `src/pages/Dashboard.tsx`, `src/components/dashboard/GettingStartedCard.tsx`, `src/components/importers/EnrichmentActivityCard.tsx`, `useCredits`, textes `dashboardPage.*` / `gettingStarted.*` (fr.json / en.json). Route : `DashboardLayout > TrialHomeRedirect > Dashboard` (les essais ExportVins sont redirigés ailleurs).

### Données chargées (navigateur, au montage)
- `profiles` : domain_name, contact_name, location, priority_markets.
- `campaigns` : toutes les campagnes de l'utilisateur (id, name, status, target_markets, launched_at, created_at).
- `importer_requests` + `tender_requests` : comptage `status='published'` (aucun filtre d'échéance).
- `leads` : `prospect_status` des leads liés aux campagnes de l'utilisateur (inclut donc le conteneur manuel CRM).
- `user_credits` via `useCredits` (searchCredits, campaignCredits).
- GettingStartedCard : comptages `sourcing_requests`, `campaigns`, `leads` (jointure campaigns).
- EnrichmentActivityCard : RPC `get_enrichment_activity` (chiffres par pays, aujourd'hui sinon 7 jours).
- Chargement : écran plein « Chargement… » ; aucun état d'erreur (une requête en échec donne des zéros silencieux).

### Blocs, dans l'ordre
1. **Salutation** « Bonjour, {prénom} » (repli « Vigneron »).
2. **Bandeau profil incomplet** si l'un de domain_name / contact_name / location / priority_markets manque → CTA « Compléter mon profil » (/profile).
3. **Bien démarrer** (5 étapes cochables) : profil (domain_name + location seulement), opportunités (jamais cochée), recherche (≥1 sourcing_request), campagne (≥1 campagne, même brouillon), CRM (≥1 lead). Lien guide /ressources/bien-demarrer. Toujours affiché, même tout coché.
4. **Activité d'enrichissement** (prospects enrichis par pays, max 6 + « +N »).
5. **Grille 2×2** :
   - Recherche sur-mesure : badge « N disponibles » (searchCredits) → /recherches.
   - Campagne en cours : uniquement la plus récente `status='active'` ; sinon « Aucune campagne active » + badge crédits ou « Aucune » → /create-campaign. Les statuts pending_validation, programmée (file d'envoi) et results ne sont pas montrés.
   - Importateurs : texte statique « +20 000 contacts dans +140 pays » → /importers.
   - Pipeline export : badge « N opportunités » = leads non won/lost → /pipeline.
6. **Opportunités** : badge « N opportunités disponibles » (demandes + appels d'offres publiés, expirés inclus) → /opportunites.
7. **État du pipeline** (4 tuiles) : Contactés = statut `new` ; Échantillons = samples_requested + samples_sent (« en attente ») ; Relances = received + tasted (« programmées ») ; Négociation = negotiation. Won/lost non affichés.

### Écarts et risques constatés
- **Chiffres trompeurs** : « Contactés » compte les leads `new` (souvent des cliqueurs/prospects importés, pas des contacts réalisés) ; « Relances programmées » compte des échantillons reçus/dégustés, sans lien avec `remind_at` ; le badge « opportunités » du pipeline (leads ouverts) porte le même mot que les opportunités export publiées.
- **Volume incohérent** : « +20 000 contacts » alors que la formulation validée est 27 000+ fiches de contacts.
- **Opportunités** : le compteur inclut les échéances passées, alors que /opportunites ne présente plus les expirées comme « en cours ».
- **Campagnes** : une campagne en validation, programmée (date estimée) ou avec résultats disponibles n'apparaît pas ; le producteur voit « Aucune campagne active ».
- **Onboarding** : l'étape 2 ne se coche jamais ; « campagne » cochée par un simple brouillon ; la carte ne disparaît jamais.
- **Aucune action datée** : les rappels CRM (`remind_at`, `next_action_at`) et les ventes gagnées ne sont pas exploités.
- **Charte** : badges en couleurs codées en dur (vert/bleu) au lieu des jetons ; emoji dans le titre.
- **Performance** : requêtes leads/campagnes dupliquées entre Dashboard et GettingStartedCard.

## Partie 2 — Recommandations prioritaires (expérience actuelle conservée)

1. **Carte campagne « vraie situation »** — coût léger. Afficher la campagne la plus récente selon le statut : En validation / Programmée (date estimée, déjà calculée côté file) / En cours d'envoi / Résultats disponibles (« Voir mes cliqueurs et prospects qualifiés », libellés existants inchangés). Impact : réassurance, moins de tickets « où est ma campagne ».
2. **Corriger les libellés du pipeline** — coût léger. « Contactés » → « Nouveaux prospects » ; « Relances » → « Échantillons reçus / dégustés » ; badge pipeline → « N prospects en cours » ; ajouter une tuile « Gagnés ». Aucun nouveau calcul de clic : un cliqueur reste un prospect à qualifier, jamais « intéressé ».
3. **Bloc « À faire aujourd'hui »** — coût moyen. 3 lignes max à partir de `leads.remind_at` / `next_action_at` échus (requête existante enrichie) avec lien vers la fiche prospect ; état vide positif (« Aucune relance prévue »). Plus forte valeur commerciale.
4. **Opportunités fiables** — coût léger. Réutiliser la règle d'expiration de /opportunites pour ne compter que les opportunités ouvertes ; afficher « nouvelles depuis votre dernière visite » via `opportunity_views` si simple, sinon seulement le total ouvert.
5. **Onboarding qui avance et s'efface** — coût léger. Cocher l'étape Opportunités via `opportunity_views`, cocher Campagne seulement si soumise (pas brouillon), masquer la carte (ou la replier) quand les 5 étapes sont faites ; aligner le critère profil avec le bandeau.
6. **Cohérence chiffres et charte** — coût léger. « +20 000 » → « 27 000+ fiches de contacts » (FR/EN) ; badges sur jetons du thème (#59191F primaire) ; état d'erreur discret au lieu de zéros silencieux.

Ordre conseillé : 2, 6, 1, 4, 5 (lot léger unique), puis 3 (lot moyen). Toutes les nouvelles chaînes en FR/EN ; aucune modification de base de données requise pour 1, 2, 4, 5, 6.

## Hypothèses / non vérifié
- Audit fait sur le code ; je n'ai pas ouvert le Dashboard dans un navigateur ni interrogé les données réelles.
- Le statut exact « programmée » se lit dans `campaign_send_queue` (RLS à confirmer pour le producteur avant le point 1).
