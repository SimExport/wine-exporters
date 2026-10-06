# Onboarding léger — wording, guide et bloc dashboard

Uniquement de l'UX et des textes (FR/EN). Rien ne change pour les crédits, campagnes, recherches, CRM, opportunités, permissions et règles de la base.

## 1. Page Profil
- Sous le titre « Profil » : encart discret « Votre profil est privé… » (texte fourni, FR/EN).
- Dans la section domaine / vins : petit encart d'aide « Langue recommandée : anglais… » (texte fourni), avec une icône info, sur fond crème et bordure fine.

## 2. Fiches vins (formulaire d'ajout/modification)
- Le libellé du prix devient « Prix EXW indicatif / à partir de » / « Indicative / starting EXW price ».
- Sous le champ, ajout de l'aide « Indiquez ici un prix de référence… ».
- Aucun changement de logique de prix.

## 3. Nouvelle ressource « Bien démarrer avec WineExporters »
- Nouvelle page privée `/ressources/bien-demarrer`, réservée aux utilisateurs connectés comme les 8 autres ressources, construite comme les pages ressources existantes.
- Contenu : les 7 étapes dans l'ordre demandé, chacune avec un bouton vers la bonne page (Profil, Opportunités, Recherche sur mesure, Campagnes, Base importateurs, CRM).
- Encart mis en avant : « WineExporters est un outil de prospection, pas une marketplace. »
- Section « Le rythme recommandé », avec l'exemple fourni.
- Sur la page Ressources (utilisateurs connectés) : une carte mise en avant tout en haut, au-dessus des cartes actuelles.

## 4. Dashboard — bloc « Bien démarrer »
- Bloc compact avec 5 lignes, chacune avec un lien direct : profil, opportunités, première recherche, première campagne, CRM.
- Une étape est cochée seulement si on peut le savoir facilement avec les données qui existent déjà :
  - Profil : domaine et localisation renseignés (même règle que l'onboarding actuel)
  - Recherche : au moins une recherche sur mesure existe
  - Campagne : au moins une campagne existe
  - CRM : au moins un prospect existe
  - Opportunités : on ne peut pas savoir si l'utilisateur les a consultées, donc ce sera un simple lien, sans case cochée
- Lien « Voir le guide complet → » vers la nouvelle ressource.

## Détails techniques
- Textes ajoutés dans `fr.json` / `en.json`, avec de nouvelles clés (`resources.gettingStarted.*`, `dashboard.gettingStarted.*`, `profile.privacyNote`, `profile.languageTip`, `wines.exwHelp`). Les traductions existantes du prix sont reprises.
- Nouveaux fichiers `src/pages/resources/GettingStarted.tsx` et `src/components/dashboard/GettingStartedCard.tsx`. Ajout de la route dans `App.tsx` sous `DashboardLayout`.
- Les données sont seulement lues : nombre de lignes dans `campaigns`, `sourcing_requests` et la table des prospects, pour l'utilisateur connecté. Aucun changement de structure ni de règles d'accès.
- Une ligne `AGENTS.md` sera ajoutée si nécessaire pour la nouvelle route privée.
