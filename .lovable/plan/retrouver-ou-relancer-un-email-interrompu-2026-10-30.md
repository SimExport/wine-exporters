# Retrouver ou relancer un email interrompu

## Problème constaté
Sur votre capture : « Aucun email pour l'instant — La génération a déjà été utilisée pour cet email ». La génération a été comptée au démarrage, mais l'email n'a jamais été enregistré (page quittée, coupure…). Le producteur est bloqué sans email et sans bouton.

## Ce qui change
1. **Email déjà prêt** : en revenant sur le brouillon (Campagnes > brouillon), l'email enregistré s'affiche toujours dans l'étape 2, prêt à être modifié (déjà le cas, on vérifie).
2. **Génération en cours** : si une génération a démarré il y a moins de 3 minutes, message « Votre email est en cours de préparation… » avec actualisation automatique, pour récupérer l'email dès qu'il est prêt.
3. **Génération interrompue** : si elle a démarré il y a plus de 3 minutes et qu'aucun email n'existe, le bouton « Générer mon email » réapparaît avec la mention « La préparation précédente n'a pas abouti, vous pouvez relancer ». Aucune génération supplémentaire n'est comptée tant qu'aucun email n'a été produit.
4. La règle « une seule génération réussie par email » reste inchangée : dès qu'un email existe, on ne peut plus regénérer, seulement modifier.

Textes FR/EN.

## Détails techniques
- `generate-campaign-email` : lever le refus 429 quand `email_content` et `message_html` sont vides ET `email_generated_at` > 3 min (réservation orpheline) ; réservation conditionnelle sur l'ancien `email_generated_at` pour éviter deux générations simultanées. Le compteur ne s'incrémente pas dans ce cas.
- Politique partagée (`canGenerateCampaignEmail`) étendue avec ces paramètres + tests unitaires (email absent récent / ancien, email présent).
- `EmailPrepareStep` / `CreateCampaign.tsx` : lire `email_generated_at`, afficher état « en cours » (poll 10 s) ou bouton de relance.
- Redéploiement de `generate-campaign-email` uniquement. Aucune migration, rien d'autre touché.
