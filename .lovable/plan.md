# Étendre les marchés de création de campagne WineExporters

## Périmètre

Étendre uniquement le choix des marchés sur `/create-campaign` et la correspondance nécessaire au ciblage Brevo. Conserver les **44 marchés actuels**, les cinq groupes géographiques, leur présentation, les limites **5–15** et la case « autres marchés ».

Ce tour prépare le plan uniquement : aucune modification applicative, migration, import Brevo, campagne ou publication.

## Constats vérifiés en lecture seule

- `CreateCampaign.tsx` liste 44 marchés fixes, avec des noms anglais dans les deux langues.
- RLS activée sur `buyer_contacts`. `get_enriched_country_counts()` compte les fiches enrichies, **pas les emails exploitables**; aucun agrégat adapté trouvé.
- Des statuts composites existent, notamment `do_not_mail | role_based`. Une exclusion par égalité exacte serait incorrecte.
- La normalisation Brevo est incomplète; les deux chemins ignorent les pays inconnus si au moins une liste correspond.
- Parcours réel : `send-campaign`/`send-queued-campaign` → `sendCustomCampaign`; legacy → `create-campaign`. Mapping commun dans `_shared/campaign-email.ts`.
- Preuve dans Brevo : la campagne envoyée **373** contient Canada dans Supabase mais ne cible aucune liste Canada. La campagne **372** contient UAE mais aucune liste correspondante. Il faut donc corriger le ciblage, pas seulement ajouter des boutons.

### Les neuf candidats

SQL du 24 novembre 2026 : pays normalisés, emails distincts et marqueurs de non-envoi/abus exclus. Cela ne garantit pas la délivrabilité ni l'absence de blocage Brevo.

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

**Aucun autre nouveau marché n'atteint 50** après regroupement. Variantes présentes : USA/United States, subdivisions britanniques/United Kingdom, UAE/United Arab Emirates; espaces finaux pour Slovakia, Switzerland, Singapore, Jordan, Macau; Bosnia-Herzegovina/Bosnia and Herzegovina reste sous le seuil.

### Lacunes des marchés déjà affichés

- **Mapping absent, listes présentes** : Portugal 10, Canada 33, Hong Kong 38 : respectivement 50, 370 et 197 contacts non bloqués. Correspondance exacte avec Supabase à réconcilier.
- **Mapping et liste absents** : Chili, Pérou, UAE, Maroc, Nigeria.
- **Listes mappées mais vides** : Argentine 134, Colombie 140, Inde 151, Serbie 165.
- Huit marchés actuels sont sous 50 emails candidats : Argentine, Chili, Colombie, Pérou, Serbie, UAE, Maroc, Nigeria. **Ils restent conservés** : le seuil concerne les ajouts, pas le retrait des marchés existants.

## Mise en œuvre proposée

### 1. Un catalogue et une normalisation communs

- Extraire les 44 marchés dans un module partagé sans React : valeur anglaise persistée, alias, ISO, groupe et IDs Brevo vérifiés.
- Ajouter Slovaquie, Bulgarie, Chypre, Luxembourg, Islande en Europe; Philippines, Indonésie, Malaisie, Azerbaïdjan dans le groupe Asie existant. Aucun nouveau groupe.
- Normaliser casse, espaces ordinaires/insécables et alias. Dédoublonner les pays avant le compteur 5–15 et les listes avant ciblage.
- Aucun changement des valeurs historiques. Anciens noms acceptés et choix des brouillons conservés, même si un nouveau marché devient indisponible.

### 2. Un agrégat sécurisé, dynamique et spécifique aux campagnes

Créer `get_campaign_market_counts()`, sans détourner l'agrégat d'enrichissement.

- Retourner uniquement pays canonique + nombre d'emails distincts; calcul serveur sans lecture paginée des contacts côté navigateur.
- Extraire les emails multiples, normaliser et exclure non-envoi, blocage, désinscription, rebond invalide et abus, même dans les statuts composites. Les statuts vides/inconnus/catch-all ne deviennent pas « vérifiés ».
- `auth.uid()` obligatoire, comptes ExportVins trial exclus, `SECURITY DEFINER`, `search_path` verrouillé et schémas explicites; EXECUTE pour `authenticated` uniquement. Aucune adresse ni clé privée exposée.
- Migration versionnée limitée à la RPC et sa normalisation campagne : aucune table ni modification des données/RLS existantes. `wx_norm_country` et les autres agrégats restent inchangés.

### 3. Rendre les marchés réellement ciblables dans Brevo

**Prérequis avant ouverture des nouveaux choix :** réconcilier les listes et leurs destinataires, sans envoyer de campagne.

- Réutiliser 167, 142, 157, 21, 10, 33 et 38 après contrôle pays/emails, pas sur leur nom seul.
- Créer les cinq nouvelles listes absentes et celles des cinq marchés historiques sans liste.
- Compléter les listes avec les contacts Supabase admissibles. Script **lecture seule par défaut**, rapport agrégé et import explicitement autorisé; emails dédupliqués, attributs préservés, `COMPANY_NAME` seulement si connu.
- **Jamais de réactivation** des désinscrits/bloqués, ni d'effacement/contournement des suppressions. Vérifier les blocages : `uniqueSubscribers` ne suffit pas.
- Utiliser les IDs réellement retournés; jamais les listes de producteurs/clients ExportVins ou de test.
- Affichage = marchés historiques + nouveaux pays à ≥50, **avec correspondances opérationnelles uniquement**. Pour conserver les 44 marchés sans ciblage fictif, l'ouverture attend aussi la réparation des anciennes listes manquantes/vides. Si les suppressions l'empêchent, signaler le blocage avant publication, sans retrait silencieux ni faux succès.

### 4. Patch de `/create-campaign`, sans refonte

- RPC + catalogue vérifié; seuil ≥50 pour les ajouts uniquement.
- Groupes, grille, drapeaux, compteur et checkbox inchangés; aucun nouveau filtre.
- Libellés FR/EN par code ISO, y compris le récapitulatif; valeurs anglaises persistées.
- Erreur RPC : aucun nouvel ajout par défaut, sélection du brouillon préservée; repli sur marchés historiques vérifiés, erreur FR/EN sobre et réessai.

### 5. Même ciblage sur tous les chemins d'envoi

- Mapping commun legacy/personnalisé, avec toutes les correspondances manquantes.
- Refuser tout lancement si un pays n'a pas de liste valide ou de destinataire ciblable, **avant création Brevo et mutation d'envoi**. Aucun pays ignoré silencieusement.
- Préserver idempotence, contenu, sujets, crédits, statuts, créneaux et résultats. La checkbox ne provoque aucune inclusion automatique.
- **Attention déploiement futur** : le worker local garde un quota d'un/jour; le live montre deux départs le 20 novembre. Source distante non récupérée : la comparer avant livraison du module partagé; ne pas redéployer le worker local tel quel ni changer cette règle ici.

## Fichiers concernés

**Seule page modifiée**
- `src/pages/CreateCampaign.tsx`

**Catalogue, lecture et traductions**
- Nouveaux `supabase/functions/_shared/campaign-markets.ts` et `src/lib/campaign-markets.ts`.
- `src/i18n/locales/fr.json` et `en.json` : clés nécessaires uniquement. Réutiliser `country-data.ts` sans le modifier.

**Ciblage uniquement**
- `supabase/functions/_shared/campaign-email.ts`
- `supabase/functions/_shared/custom-campaign-send.ts`
- `supabase/functions/create-campaign/index.ts`
- Migration générée via l'outil Supabase dans `supabase/migrations/` pour la nouvelle RPC.
- Nouveau `scripts/reconcile-campaign-market-lists.ts`, contrôle à sec par défaut.
- Tests catalogue/lecture, `campaign-email_test.ts`, sender simulé, SQL sécurité/calcul.
- `AGENTS.md` et courte documentation IDs/calcul/réconciliation.

Admin, Opportunités, CRM, Importers, Stripe, prix, routage, cron, worker et autres pages inchangés. Futur déploiement des chemins manuel/legacy/planifié avec le même mapping, sur autorisation séparée.

## Vérifications prévues, sans email réel

- Seuil : 49 exclu, 50 inclus; les neuf candidats ci-dessus; aucun ajout supplémentaire après normalisation complète.
- Alias : Slovaquie 75+65 = 140 fiches, **139 adresses distinctes**; US/UK/UAE, espaces internes/finals/insécables; pas de doublon de pays ou liste.
- Statuts composites, suppressions préservées, emails invalides/vides/multiples; aucun reset de blacklist.
- Minimum 5, maximum 15, 16e refusé; checkbox intacte; 44 marchés conservés même sous le seuil.
- Mapping : vraie liste pour chaque choix, aucun repli sur France/autre pays. Liste inconnue/vide/bloquée → zéro création/envoi/mutation.
- Trois chemins d'envoi, Brevo **simulé uniquement**; anciens IDs et anti-doublon inchangés.
- SQL : refus anonyme/trial, agrégats seuls, EXECUTE vérifié; fixtures avec ROLLBACK.
- Bun/Deno ciblés, TypeScript, compilation automatique, contrôle visuel FR/EN ordinateur/mobile sur brouillon sans soumission.

## Condition de mise en service

Diff approuvé, listes réconciliées et ciblage intégral vérifié, puis déploiement ciblé et publication **sur autorisation séparée**. Aucune campagne historique n'est modifiée ou renvoyée pour corriger les anciens marchés ignorés.