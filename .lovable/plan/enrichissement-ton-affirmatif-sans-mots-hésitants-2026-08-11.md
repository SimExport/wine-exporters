# Enrichissement : ton affirmatif, sans mots hésitants

Objectif : les descriptions et actions recommandées générées par l'IA doivent être écrites au présent, de façon directive et assurée, sans formulations d'incertitude.

## Ce qui change

Consigne de style ajoutée aux prompts d'enrichissement :
- Interdire explicitement : « probable(ment) », « vraisemblablement », « semble », « pourrait », « peut-être », « suggère », « il est possible que », « a priori », « sans doute ».
- Affirmer au présent de l'indicatif ; actions recommandées à l'impératif (« Envoyer… », « Vérifier… »).
- Exception maintenue : quand le domaine de l'email est générique (gmail, yahoo…), écrire une phrase factuelle nette (« La société n'est pas identifiable depuis cette adresse. ») plutôt qu'une hypothèse floue.
- La même consigne est ajoutée au message système du modèle pour renforcer le respect.

## Détails techniques

- `supabase/functions/enrich-campaign-prospects/index.ts` : mise à jour des deux prompts (origine « click » et « form ») et du `system`. Les libellés de champs qui contiennent « probable » (nom de société probable, pays probable) sont reformulés en consignes affirmatives.
- `supabase/functions/submit-campaign-interest/index.ts` : même consigne de style sur le prompt d'enrichissement à la soumission du formulaire, pour cohérence.
- Textes de repli (fallback) : reformulés au ton affirmatif.
- Redéploiement des deux Edge Functions.

Aucune modification de la logique de scoring, des origines, ni de l'interface.
