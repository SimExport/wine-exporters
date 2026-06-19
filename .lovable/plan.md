## Test email for pierre@chai-bm.com

Le BCC `simon@exportvins.fr` est déjà câblé dans `notify-campaign-interested-contacts` (et le restera pour tous les envois futurs).

### Étapes

1. Récupérer le `user_id` de `pierre@chai-bm.com` via `auth.users`.
2. Trouver sa campagne ayant des `campaign_interested_contacts` (la plus récente s'il y en a plusieurs) et compter les contacts.
3. Invoquer `notify-campaign-interested-contacts` avec `{ campaignId, count }` — cela enverra le mail brandé à Pierre, en BCC simon@exportvins.fr, et loggera dans `campaign_email_logs`.
4. Vérifier les logs de la fonction + l'entrée `campaign_email_logs` pour confirmer `status: sent`.

Aucune modification de code. Si plusieurs campagnes ont des contacts uploadés avant la mise en place du mail, je te demanderai laquelle cibler (ou j'enverrai pour toutes).