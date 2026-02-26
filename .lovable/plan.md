
## Plan : Dynamisation du Tableau de Bord

### Analyse de l'état actuel

Le Dashboard actuel (`src/pages/Dashboard.tsx`) :
- 3 cartes d'info (Plan, Campagnes dispo, Domaine) — toutes visuellement identiques
- 2 cartes d'action (Profil + Lancer campagne) — même poids visuel
- Section campagnes en bas

Le problème : la carte "Souscrire un abonnement" (visible pour les utilisateurs gratuits) est terne, et il n'y a aucun bloc de statistiques d'activité pour montrer la valeur de la plateforme.

---

### Changements prévus

**1. Bloc statistiques globales (nouveau)**

Ajouter 3 blocs en haut, sous le titre, affichant des métriques agrégées issues de la table `campaigns` (colonnes `stats_opens`, `stats_replies`, `stats_bounces`) et `leads` :

```text
┌──────────────────┬──────────────────┬──────────────────┐
│  📧 Emails       │  💬 Réponses     │  🌍 Marchés      │
│  envoyés         │  reçues          │  prospectés      │
│  1 240           │  87              │  12              │
└──────────────────┴──────────────────┴──────────────────┘
```

Ces chiffres sont calculés depuis les données réelles de l'utilisateur (somme des `stats_opens` de toutes ses campagnes, etc.). S'ils sont à zéro, on affiche `0` — ça rappelle la promesse de l'outil.

**2. Carte "Upgrade" mise en avant**

Pour les utilisateurs sans abonnement (`subscription_plan === 'none'`), transformer la carte "Lancer une Campagne" en carte premium visuellement distinctive :

- Fond `bg-primary/5` avec bordure `border-primary/30`
- Icône `Crown` dorée
- Titre fort : "Démarrez votre prospection"
- Description : "Accédez à 15 000+ acheteurs qualifiés dans le monde"
- Bouton plein (primary) "Passer Premium" + sous-texte "À partir de 199 €/mois · 3 mois d'engagement"

Pour les utilisateurs avec abonnement, la carte reste normale avec l'action "Nouvelle campagne".

**3. Petites améliorations visuelles**
- Ajouter icônes `Send`, `MessageSquare`, `MapPin` pour les blocs stats
- Import des nouveaux icônes Lucide nécessaires (`Crown`, `Send`, `MessageSquare`, `TrendingUp`)

---

### Fichiers à modifier

1. **`src/pages/Dashboard.tsx`** — seul fichier modifié :
   - Ajout du calcul des stats agrégées (somme depuis les campagnes existantes)
   - Ajout du bloc statistiques entre le titre et les cartes d'info
   - Remplacement de la carte "Lancer campagne" par la version premium mise en avant pour les utilisateurs gratuits
