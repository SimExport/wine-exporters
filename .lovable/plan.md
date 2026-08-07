# Landing page : nouveau ton + logo mis en valeur

## En-tête
- Supprimer la mention "by ExportVins" à côté du logo.
- Supprimer le bouton "Demander une démo" de la barre du haut (restent : Découvrir la plateforme en vidéo, sélecteur de langue, Se connecter).
- Agrandir le logo (hauteur ~h-12 mobile / h-14 desktop, hauteur du header adaptée) pour qu'il soit plus présent.

## Réécriture des textes (FR + EN)
Seuls les textes changent : chiffres, témoignages, marchés et tarif restent identiques.

- **Hero** : accroche "🍷 Pour les domaines viticoles qui cherchent des acheteurs, pas des salons.", titre "L'export ne devrait pas être un parcours du combattant.", nouveau sous-texte. CTA et bandeau stats inchangés.
- **Section problème** : titre conservé, 3 cartes réécrites (La recherche interminable / Le silence radio / Le suivi chaotique) + phrase de transition "Chaque mois, une nouvelle liste d'importateurs prête à contacter. Pas une promesse, une liste."
- **Méthode** : titre conservé, 4 blocs réécrits (base de données, recherche ciblée, campagnes, CRM et opportunités).
- **Une seule plateforme** : "Une seule plateforme. Zéro friction. Et de l'humain." + nouveau paragraphe.
- **Résultats** : nouveau titre "Des domaines comme le vôtre ont trouvé leurs acheteurs. Voici les marchés qu'ils ont ouverts." Mention d'attribution, marchés et citations inchangés.
- **Punchline avant le tarif** : "5 ans à ouvrir des marchés pour des domaines comme le vôtre. Pas en théorie, en commandes signées."
- **Bloc tarif** : inchangé (199€ HT/mois, sans engagement, CTA "Demander une démo").

Les textes anglais sont adaptés dans le même ton direct.

## Détails techniques
- Modifications limitées à `src/pages/LandingPage.tsx` (header/logo, suppression du CTA démo en haut) et aux fichiers `src/i18n/locales/fr.json` / `en.json` (clés `landing.*`).
- Aucune autre page, table ou composant n'est touché.
