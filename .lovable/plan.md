# Actions recommandées pour tous les prospects

## Constat

Dans la campagne affichée (Lanye-Barrac), les prospects « formulaire » ont bien une description d'entreprise **et** des actions recommandées — c'est le rendu de votre capture.

Les prospects « cliqueurs », eux, reçoivent aujourd'hui uniquement une description et une note. La fonction d'enrichissement ne demande pas d'actions recommandées pour eux, et n'écrit ce champ que lorsque l'origine est « formulaire ». Résultat : dans « Voir ma campagne », le bloc « Actions recommandées » est vide pour les cliqueurs.

## Ce qui change

Chaque prospect qualifié, cliqueur inclus, aura :
- une description d'entreprise en français (déjà le cas) ;
- un bloc « Actions recommandées » avec 2 à 4 actions concrètes, adaptées au signal.

Pour un cliqueur, les actions restent prudentes (mail court de qualification, vérifier le positionnement, n'envoyer échantillons qu'après réponse) plutôt que « envoyer les échantillons » réservé aux formulaires. La note reste bornée 4-7 pour les cliqueurs et 6-10 pour les formulaires.

Rien d'autre ne bouge : ni l'affichage utilisateur, ni les badges d'origine, ni les autres écrans.

## Détails techniques

Fichier : `supabase/functions/enrich-campaign-prospects/index.ts`

1. Ajouter la clé `recommended_actions` au JSON attendu dans le prompt « click », avec une consigne explicite : actions de qualification légères, en français, format à puces `• `, 2 à 4 lignes, tenir compte du fait que le contact n'a fait que cliquer.
2. Retirer la condition `origin === "form"` avant l'écriture de `recommended_actions` : le champ est écrit dès que Claude renvoie une valeur exploitable, quelle que soit l'origine.
3. Prévoir un repli si Claude ne renvoie rien pour un cliqueur : une action générique de qualification, pour ne jamais laisser le bloc vide après enrichissement.
4. Redéployer la fonction.

## Après la mise en place

Lancer « Tout ré-enrichir » sur les campagnes concernées pour compléter les cliqueurs existants (les descriptions déjà correctes seront regénérées dans le même format).
