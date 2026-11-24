# Étendre les marchés de création de campagne WineExporters

## Périmètre

Étendre uniquement le choix des marchés sur `/create-campaign` et la correspondance nécessaire au ciblage Brevo. Conserver les **44 marchés actuels**, les cinq groupes géographiques, leur présentation, les limites **5–15** et la case « autres marchés ».

Ce tour prépare le plan uniquement : aucune modification applicative, migration, import Brevo, campagne ou publication.

## Constats vérifiés en lecture seule

- `CreateCampaign.tsx` contient une liste fixe de 44 marchés. Les noms des pays sont actuellement affichés en anglais même en français.
- `buyer_contacts` a sa RLS activée. `get_enriched_country_counts()` exige une session mais compte les fiches enrichies, pas les emails exploitables : **cet agrégat ne convient pas au seuil demandé**. Aucun autre agrégat de pays adapté n'a été trouvé.
- Des statuts composites existent, notamment `do_not_mail | role_based`. Une exclusion par égalité exacte serait incorrecte.
- La normalisation actuelle du ciblage Brevo ne fusionne pas tous les alias ni les espaces internes. Les chemins legacy et personnalisé ignorent les marchés non reconnus tant qu'au moins une liste correspond.
- Le parcours personnalisé passe par `send-campaign` ou `send-queued-campaign`, puis `sendCustomCampaign`; le parcours legacy passe par `create-campaign`. Tous utilisent la correspondance de `_shared/campaign-email.ts`.
- Preuve dans Brevo : la campagne envoyée **373** contient Canada dans Supabase mais ne cible aucune liste Canada. La campagne **372** contient UAE mais aucune liste correspondante. Il faut donc corriger le ciblage, pas seulement ajouter des boutons.

### Les neuf candidats

Recompte SQL du 24 novembre 2026 : normalisation des pays, extraction des emails, dédoublonnage par pays et exclusion des marqueurs de non-envoi/abus. « Candidat exploitable » ne garantit ni délivrabilité ni absence de blocage Brevo.

| Marché | Fiches avec email, brut | Emails candidats distincts | Brevo vérifié |
|---|---:|---:|---|
| Philippines | 176 | 173 | Aucune liste trouvée |
| Slovaquie | 140 | 139 | Liste 167 : 95 contacts, seulement 25 non bloqués avec syntaxe valide |
| Indonésie | 72 | 67 | Aucune liste trouvée |
| Bulgarie | 69 | 69 | Liste « Bulgarie » 21 : 57 contacts, 16 non bloqués; absente du mapping |
| Chypre | 62 | 62 | Liste 142 : 3 contacts, aucun non bloqué |
| Malaisie | 58 | 56 | Aucune liste trouvée |
| Luxembourg | 57 | 57 | Liste 157 : 1 contact, bloqué |
| Islande | 56 | 56 | Aucune liste trouvée |
| Azerbaïdjan | 55 | 54 | Aucune liste trouvée |

Après regroupement des variantes présentes dans la base, **aucun autre nouveau marché n'atteint 50**. Alias constatés : USA/United States, subdivisions britanniques/United Kingdom, UAE/United Arab Emirates; espaces finaux pour Slovakia, Switzerland, Singapore, Jordan et Macau; Bosnia-Herzegovina/Bosnia and Herzegovina à réunir également, sans atteindre le seuil.

### Lacunes des marchés déjà affichés

- **Mapping absent mais listes existantes** : Portugal 10, Canada 33, Hong Kong 38. Leur lecture donne respectivement 50, 370 et 197 contacts non bloqués avec syntaxe valide. Ces effectifs ne prouvent pas encore leur correspondance avec les contacts Supabase.
- **Mapping et liste absents** : Chili, Pérou, UAE, Maroc, Nigeria.
- **Listes mappées mais vides** : Argentine 134, Colombie 140, Inde 151, Serbie 165.
- Huit marchés actuels sont sous 50 emails candidats : Argentine, Chili, Colombie, Pérou, Serbie, UAE, Maroc, Nigeria. **Ils restent conservés** : le seuil concerne les ajouts, pas le retrait des marchés existants.

## Mise en œuvre proposée

### 1. Un catalogue et une normalisation communs

- Extraire les 44 marchés actuels dans un petit module partagé sans React : valeur anglaise persistée, alias, code ISO, groupe existant et identifiant(s) Brevo vérifiés.
- Ajouter les neuf candidats : Slovaquie, Bulgarie, Chypre, Luxembourg et Islande en Europe; Philippines, Indonésie, Malaisie et Azerbaïdjan dans le groupe Asie existant, comme les marchés de cette zone déjà présents.
- Normaliser casse, espaces ordinaires/insécables et alias avant comparaison. Dédoublonner les pays **avant** de compter les 5–15 sélections et les listes avant ciblage.
- Ne jamais réécrire les valeurs historiques de `buyer_contacts.country` ou des campagnes. Les anciens noms restent acceptés; un brouillon conserve ses choix, même si un nouveau marché devient ensuite indisponible.

### 2. Un agrégat sécurisé, dynamique et spécifique aux campagnes

Créer une RPC de lecture `get_campaign_market_counts()` plutôt que détourner l'agrégat d'enrichissement utilisé ailleurs.

- Retourner uniquement le pays canonique et son nombre d'emails candidats distincts, calculé dans Supabase, sans pagination des contacts dans le navigateur.
- Extraire les adresses historiques multiples, normaliser la casse et exclure les marqueurs `do_not_mail`, blocage, désinscription, rebond invalide et abus, y compris au sein des statuts composites.
- Ne pas inventer une vérification pour les statuts vides, inconnus ou catch-all; conserver cette distinction dans la documentation du calcul.
- Exiger `auth.uid()`, respecter l'exclusion des comptes ExportVins trial et utiliser `SECURITY DEFINER`, un `search_path` verrouillé et des références de schéma explicites. EXECUTE réservé à `authenticated`, pas de données individuelles ni de clé privée côté navigateur.
- Migration versionnée limitée à cette RPC et, si nécessaire, son helper de normalisation propre aux campagnes : aucune nouvelle table, aucun changement de RLS existante ou de données historiques. Ne pas modifier `wx_norm_country` ni les agrégats des autres pages.

### 3. Rendre les marchés réellement ciblables dans Brevo

**Prérequis avant ouverture des nouveaux choix :** réconcilier les listes et leurs destinataires, sans envoyer de campagne.

- Réutiliser les listes existantes après contrôle du pays et des emails : 167, 142, 157, 21, 10, 33 et 38. Ne pas choisir une liste par son nom seul.
- Créer uniquement les listes pays réellement manquantes : Philippines, Indonésie, Malaisie, Islande, Azerbaïdjan, et les cinq marchés historiques sans liste.
- Ajouter les contacts admissibles issus de Supabase et compléter les listes vides/insuffisantes. Script administratif **en lecture seule par défaut**, rapport agrégé, import explicite séparé. Dédupliquer les emails, préserver les attributs existants et ajouter `COMPANY_NAME` uniquement lorsqu'il est réellement connu.
- **Ne jamais réactiver** un contact désinscrit/bloqué, effacer une suppression ou contourner une liste d'exclusion. Contrôler les blocages Brevo lors de la réconciliation; les compteurs `uniqueSubscribers` ne suffisent pas, comme le montrent Chypre et Luxembourg.
- Enregistrer les IDs réellement retournés, jamais des IDs supposés. Pas de mélange avec des listes de producteurs/clients ExportVins, ni d'utilisation de la liste de test.
- Le catalogue affichable est l'union des marchés historiques et des nouveaux pays à ≥50 candidats, **limitée aux correspondances Brevo opérationnelles**. Pour conserver intégralement les marchés historiques sans proposer un ciblage fictif, la mise en service de l'extension attend aussi la réparation de leurs listes manquantes/vides. Si un blocage Brevo empêche cela, le signaler avant publication, sans retirer silencieusement un marché ni prétendre que tout est prêt.

### 4. Patch de `/create-campaign`, sans refonte

- Lire la RPC et appliquer le seuil **≥50** uniquement aux nouveaux marchés; croiser avec le catalogue dont les listes ont été vérifiées.
- Garder les mêmes groupes, grille, drapeaux, sélection, compteur et checkbox « autres marchés ». Aucun nouveau filtre ou changement des autres pages.
- Afficher les libellés FR/EN à partir des codes pays et conserver les valeurs anglaises pour l'enregistrement et le ciblage, y compris dans le récapitulatif de cette page.
- En cas d'échec de lecture, ne pas activer les nouveaux marchés par défaut ni perdre la sélection du brouillon; conserver seulement les choix historiques dont le ciblage a été validé, avec une erreur FR/EN sobre et une possibilité de réessayer.

### 5. Même ciblage sur tous les chemins d'envoi

- Faire utiliser le catalogue/normaliseur commun au mapping legacy et personnalisé; ajouter les correspondances manquantes.
- Refuser **la totalité** du lancement si un marché demandé n'a pas de liste valide ou de destinataire effectivement ciblable. Aucun envoi partiel avec des pays ignorés.
- Vérifier avant toute création Brevo et avant toute mutation d'envoi; conserver les mécanismes d'idempotence, emails, sujets, crédits, statuts, créneaux et traitements de résultats.
- Ne pas élargir le sens de la checkbox « autres marchés » : aucune inclusion automatique d'autres pays.
- **Prudence sur le déploiement futur** : le `queue-worker.ts` local contient encore une garde à un envoi/jour, alors que des campagnes live montrent deux départs le 20 novembre. La source déployée n'a pas été récupérée dans cet audit. Comparer en lecture seule avec la version live avant de livrer un module partagé; ne jamais redéployer le worker local tel quel ni modifier cette règle dans ce ticket.

## Fichiers concernés

**Seule page modifiée**
- `src/pages/CreateCampaign.tsx`

**Catalogue, lecture et traductions ciblées**
- Nouveau `supabase/functions/_shared/campaign-markets.ts` : catalogue et normalisation partagés.
- Nouveau `src/lib/campaign-markets.ts` : lecture RPC et assemblage des choix.
- `src/i18n/locales/fr.json` et `en.json` : uniquement clés de création de campagne nécessaires; réutiliser les noms/codes ISO de `src/components/importers/country-data.ts` sans modifier ce fichier ni ses consommateurs.

**Ciblage uniquement**
- `supabase/functions/_shared/campaign-email.ts`
- `supabase/functions/_shared/custom-campaign-send.ts`
- `supabase/functions/create-campaign/index.ts`
- Migration générée via l'outil Supabase dans `supabase/migrations/` pour la nouvelle RPC.
- Nouveau `scripts/reconcile-campaign-market-lists.ts`, contrôle à sec par défaut et import séparément autorisé.
- Tests du catalogue/lecture, `campaign-email_test.ts`, tests du sender avec réponses simulées et test SQL de sécurité/calcul.
- `AGENTS.md` et une courte documentation des IDs, du calcul et de la réconciliation.

`AdminCampaigns`, `CampaignReviewSheet`, Opportunités, CRM, Importers, Stripe, prix, routage, cron, worker et autres pages restent inchangés. Les fonctions manuelle, legacy et planifiée devront embarquer le même mapping lors d'un futur déploiement explicitement autorisé; pas de déploiement dans ce tour.

## Vérifications prévues, sans email réel

- Seuil : 49 exclu, 50 inclus; les neuf candidats ci-dessus; aucun ajout supplémentaire après normalisation complète.
- Alias : Slovaquie 75+65 = 140 fiches, **139 adresses distinctes**; US/UK/UAE, espaces internes/finals/insécables; pas de doublon de pays ou liste.
- Non-envoi : statuts composites, suppressions Brevo conservées, emails invalides, vides et multiples; aucun reset de blacklist lors de l'import.
- Limites : minimum 5, maximum 15, 16e refusé; case « autres marchés » inchangée; les 44 marchés historiques conservés même sous le seuil.
- Mapping : chaque choix activé a sa vraie liste; France ou une liste étrangère ne peut pas servir de repli. Pays non reconnu, liste supprimée/vide/tous contacts bloqués → aucun appel de création/envoi ni mutation de campagne.
- Sender : chemins legacy/personnalisé/planifié avec appels Brevo **simulés uniquement**; anciens IDs et protections test/anti-doublon conservés.
- Sécurité SQL : session requise, refus anonyme/trial, résultat agrégé seulement et privilèges EXECUTE vérifiés; fixtures transactionnelles avec ROLLBACK.
- Tests ciblés Bun/Deno, contrôle TypeScript et compilation automatique; contrôle visuel FR/EN sur ordinateur/mobile, uniquement création/édition de brouillon sans soumission.

## Condition de mise en service

Diff approuvé, listes réconciliées et ciblage intégral vérifié, puis déploiement ciblé et publication **sur autorisation séparée**. Aucune campagne historique n'est modifiée ou renvoyée pour corriger les anciens marchés ignorés.