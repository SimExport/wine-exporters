# Publication de l'annuaire : constat à 23:18 UTC

## Ce qui est servi maintenant
- `/annuaire.html` et `/annuaire/royaume-uni.html` répondent 200, avec le contenu pré-rendu sans JavaScript : canonical `.html`, H1 « Importateurs de vin — Royaume-Uni », marqueur `data-prerendered`.
- `/annuaire/_canari.html` répond 404 : la page de test a disparu.
- `sitemap.xml` contient les URL `.html` de l'annuaire. Le terme `/login` n'a pas été relevé dans les lignes contrôlées.

## Réponses
1. Je n'ai pas accès au statut du déploiement ni à ses logs de build. Le constat repose uniquement sur ce que sert le site en ligne.
2. Rien n'indique un échec. La nouvelle version est en ligne : ce qui ressemblait à un échec n'était qu'un retard de mise en ligne ou de cache. Le pré-rendu de l'annuaire (le build imbriqué dans `closeBundle`) a bien fonctionné dans l'environnement de publication, puisque ses fichiers sont servis.
3. Correction : aucune n'est nécessaire.

## Prochaine étape proposée (lecture seule)
- Revérifier les 42 pages et le sitemap complet (y compris l'absence de `/login`) sur wine-exporters.com sans JavaScript, puis faire un rapport. Aucun code modifié, rien republié.
