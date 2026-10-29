# Résultats automatiques J+2

## Périmètre
`process-campaign-results` orchestre les fonctions conservées `sync-brevo-campaign`, `enrich-campaign-prospects`, `notify-campaign-completed`. Aucun changement Stripe, lancement ou interface. Les libellés clients et prompts restent inchangés.

**Claude est toujours utilisé** : modèle existant `claude-sonnet-4-5`, mêmes prompts et maximum de trois recherches web. Le mode interne de synchronisation n'appelle pas Claude ; seuls les contacts sans description passent ensuite à l'enrichissement, un par invocation. Une description manuelle est préservée. Aucune migration OpenAI.

## Horaire et progression
La sélection quotidienne `campaign-results-daily` est prévue à **08:00 UTC**, donc **09:00 Paris en hiver / 10:00 en été**. Seules les campagnes actives, non-test, avec identifiant Brevo et lancées depuis au moins 48 heures sont inscrites. Les anciennes campagnes en `results` ne sont pas inscrites.

Le drain `campaign-results-drain` est créé uniquement après inscription de travail et s'arrête après vidage. Il vérifie la progression toutes les minutes, au maximum 1 440 vérifications par jour si du travail reste constamment en attente. Il ne s'agit pas d'une deuxième sélection quotidienne. Délai de reprise normal : une à deux minutes entre lots ; erreur transitoire : cinq minutes ; 429 : au moins 24 heures. Verrous de quatre minutes, 180 invocations maximum par campagne, cinq campagnes maximum par passage. Une campagne de 30–50 contacts peut donc avancer dans la journée sans attendre le prochain jour. Le coût dépend des contacts réellement enrichis et des recherches Claude ; des attentes longues peuvent ajouter des vérifications Supabase sans travail.

L'export Brevo conserve son identifiant de processus puis sa liste de mails dans la file privée ; import par vingt, déduplication existante par email/domaine sous verrou commun aux boutons manuels. L'enrichissement progresse par identifiant/description sauvegardée, sans offset mouvant. Un crash après réponse Claude mais avant écriture peut nécessiter de refaire ce contact : aucune transaction distribuée avec Claude n'est possible.

## Sécurité et envoi
Secret interne généré dans les secrets Supabase puis installé directement dans Vault par le serveur. Jamais inscrit dans SQL, cron ou frontend. Le cron ne contient qu'un appel SQL au dispatcher, qui lit Vault. Les fonctions vérifient les JWT administrateurs existants ou le secret interne ; les modes internes vérifient aussi la campagne, l'étape et le jeton de verrou actif. Aucun accès anon.

Les résultats sont publiés après synchronisation complète et disparition des contacts sans description. La notification possède un marqueur atomique **avant** Resend, commun aux actions manuelles et automatiques. Les anciens journaux d'envoi sont consultés avant tout nouvel envoi. Un résultat d'envoi incertain ne sera jamais renvoyé automatiquement : réconciliation obligatoire dans les logs Resend et la file. Les erreurs d'accès/solde/refus interrompent la campagne ; aucun contournement ni changement de modèle.

La reprise manuelle existante des fonctions reste disponible. Pour reprendre une file interrompue, un administrateur peut appeler `process-campaign-results` avec `campaign_id` et `resume:true`; un marqueur de notification incertain interdit cette reprise tant que son résultat n'a pas été réconcilié. Aucun bouton ajouté. Les erreurs sont consultables par les administrateurs dans `campaign_result_jobs` et les logs des fonctions.

## Vérification
Tests unitaires et orchestrateur avec appels entièrement simulés ; contrôles live limités au refus des appels non authentifiés, à l'installation du secret et au dry-run sur UUID fictif. Aucun appel réel à Brevo/Claude/Resend pendant les tests. La campagne éligible lancée le 27 octobre n'a pas été exécutée manuellement. L'exécution complète réelle reste à constater au prochain déclenchement quotidien.