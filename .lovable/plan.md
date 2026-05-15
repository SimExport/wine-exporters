## Refonte du Dashboard `/dashboard`

Objectif : transformer la page en hub d'action épuré (4 cartes 2×2 + bandeau pipeline), supprimer le reporting et l'upsell.

### 1. Suppressions sur `/dashboard`
- Les 3 stat cards "Campagnes envoyées / Importateurs trouvés / Marchés prospectés"
- Le bloc upsell "Passer Premium" (peu importe le plan)
- Les anciennes cards "Plan / Campagnes restantes / Domaine"
- L'ancien header local (logo + email + logout) — déjà couvert par la sidebar
- Le `BillingSummary` et la liste des campagnes en bas (déplacés ailleurs déjà disponibles via `/campagnes`)

### 2. Nouveau layout
1. **Greeting** : `Bonjour, {prénom}` (prénom en accent bordeaux)
2. **Bandeau profil incomplet** (full-width, fond beige doux) — visible uniquement si profil incomplet, avec CTA "Compléter mon profil" → `/profile`. Disparait quand profil complet.
3. **Grille 2×2 d'action cards** :
   - **Recherche sur mesure** — icône `Search` — badge `{N} disponible(s)` (depuis `user_credits.search_credits`) — CTA "Lancer une recherche" → `/importers`
   - **Campagne en cours** — icône `Send` — badge `Active` (vert) si une campagne `status='active'` existe, sinon `Aucune` (gris) — affiche le nom et les marchés de la dernière active — CTA "Voir la campagne" → `/campaigns/{id}` (ou `/campaigns` si aucune)
   - **Importateurs** — icône `Store` — badge `Base complète` — CTA "Explorer la base" → `/importers`
   - **Pipeline export** — icône `Kanban` — badge `{N} opportunités` (leads avec `prospect_status` ouvert) — CTA "Voir le pipeline" → `/pipeline`
4. **Bandeau "État du pipeline"** : 4 colonnes (Contactés / Échantillons / Relances / Négociation) avec compteurs depuis `leads.prospect_status` de l'utilisateur, lien "Voir tout" → `/pipeline`

### 3. Sidebar
- Le pill crédits campagne est déjà présent dans la sidebar pour les utilisateurs payants — le garder tel quel.
- Supprimer le bloc upgrade "Passer Premium" du dashboard (sidebar reste inchangée).

### Détails techniques
- Fichier principal modifié : `src/pages/Dashboard.tsx` (réécriture complète)
- Données déjà disponibles : `profiles`, `campaigns`, `user_credits`, `leads` via Supabase client
- Conditions "profil complet" : `domain_name`, `location`, `contact_name`, `wine_colors` non vides (ajustable)
- Mappage statuts pipeline → colonnes :
  - Contactés : `new`, `contacted`
  - Échantillons : `sample_sent`
  - Relances : `follow_up`
  - Négociation : `negotiation`
- i18n : ajouter clés FR/EN dans `src/i18n/locales/{fr,en}.json` sous `dashboardPage.*`
- Pas de modification DB, pas de nouvelle route, pas de changement business

### Hors scope
- Sidebar et topbar inchangés (sauf suppression header local du Dashboard)
- Aucune autre page modifiée
