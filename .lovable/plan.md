# Import complet : Recherche sur-mesure → CRM

## Constat

Aujourd'hui, dans `src/components/sourcing/SourcingResultsDialog.tsx`, la fonction `addToCrm` n'insère dans `leads` que `company_name`, `email`, `phone`, `website_url`, `market`, plus un snippet et le `buyer_id`. Adresse, ville, code postal et pays ne sont jamais transmis, alors que la table `leads` possède bien `address_line1`, `address_line2`, `city`, `postal_code`, `country`, `first_name`, `last_name`.

La raison : le LLM (`process-sourcing-request`) ne renvoie dans le `shortlist` que `company_name`, `email`, `phone`, `website_url`, `score`, `reason`. Les champs d'adresse existent côté source (`buyer_contacts.street/city/postal_code/country/full_address`) mais ne remontent pas jusqu'au dialog. À noter : `buyer_contacts` n'a pas de `first_name`/`last_name`, donc ces deux champs resteront vides (non disponibles dans la donnée source).

## Correctif (logique d'import uniquement)

Modifications limitées à `src/components/sourcing/SourcingResultsDialog.tsx`. Aucune autre page, table ou composant n'est touché. Aucun changement de schéma. Aucun changement à l'edge function.

### 1. Récupérer le pays contexte de la recherche

Ajouter une nouvelle prop optionnelle `marketCountry?: string | null` au dialog (en plus du `marketLabel` déjà existant, qui est un libellé d'affichage). Les deux appelants (`SourcingRequests.tsx`, `AdminSourcing.tsx`) sont déjà autorisés à être ajustés ? Non — la consigne est de ne rien toucher hors logique d'import. Donc on n'ajoute pas de prop : on réutilise `marketLabel` qui contient déjà le nom du marché (pays) ciblé par la recherche, et on l'utilise comme fallback `country`.

### 2. Enrichir chaque item à l'import

Dans `addToCrm(item, idx)`, avant l'`insert` dans `leads` :

- Faire un lookup `buyer_contacts` pour récupérer les champs d'adresse :
  - Priorité 1 : match par `email` (si `item.email` présent), via `.eq('email', item.email).maybeSingle()`.
  - Priorité 2 (fallback) : match par `company_name` exact + `country` ∈ variantes du marché ; on simplifie en `eq('company_name', item.company_name).limit(1).maybeSingle()`.
  - Si aucun match, on continue sans enrichissement (le LLM peut avoir reformulé un nom).
- Sélectionner `street, city, postal_code, country, phone, website_url, email` sur ce lookup.

### 3. Mapping complet vers `leads`

Construire le payload d'insert avec :

| Champ leads        | Source                                                                  |
|--------------------|-------------------------------------------------------------------------|
| `company_name`     | `item.company_name`                                                     |
| `email`            | `item.email ?? contact?.email`                                          |
| `phone`            | `item.phone ?? contact?.phone`                                          |
| `website_url`      | `item.website_url ?? contact?.website_url`                              |
| `address_line1`    | `contact?.street`                                                       |
| `city`             | `contact?.city`                                                         |
| `postal_code`      | `contact?.postal_code`                                                  |
| `country`          | `contact?.country ?? marketLabel`                                       |
| `first_name`       | `null` (non disponible dans `buyer_contacts`)                           |
| `last_name`        | `null` (idem)                                                           |
| `market`           | `marketLabel` (inchangé)                                                |
| `message_snippet`  | `item.reason` (inchangé)                                                |
| `owner_notes`      | `'Issu de Recherche sur-mesure'` (inchangé)                             |
| `buyer_id`         | `item.email \|\| item.company_name` (inchangé)                          |
| `prospect_status`  | `'new'` (inchangé)                                                      |
| `created_by`       | `user.id` (inchangé)                                                    |
| `last_activity_at` | `now()` (inchangé)                                                      |

### 4. Dédup

Le check existant (skip si `email` déjà présent sur la même campagne) reste inchangé.

## Hors scope

- Pas de modification de `process-sourcing-request` (l'edge function continue de renvoyer le même shortlist compact).
- Pas de modification de `SourcingRequests.tsx` / `AdminSourcing.tsx` / `Pipeline.tsx` / migrations / `types.ts`.
- `first_name` / `last_name` restent vides faute de donnée source ; pourra être traité ultérieurement si on enrichit `buyer_contacts` ou le prompt LLM.

## Fichier modifié

- `src/components/sourcing/SourcingResultsDialog.tsx` — uniquement la fonction `addToCrm`.
