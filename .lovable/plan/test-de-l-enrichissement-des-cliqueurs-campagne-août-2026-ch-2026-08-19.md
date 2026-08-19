# Test de l'enrichissement des cliqueurs — campagne « Août 2026 » (Château de France)

Campagne ciblée : `Août 2026`, créée le 10/08/2026, Brevo ID 296 — 26 cliqueurs et 5 répondants formulaire.

## 1. Vérification à sec (déjà effectuée)

Simulation des étapes 1 et 2 du matching sur les 26 cliqueurs, contre `buyer_contacts` :

- **20 cliqueurs** ont un match email exact (étape 1) : Slocum & Sons, Elite Wines, Grand Cru Selections, Vinify Wine Company, Premium Blend, Sazerac Company, Knoxville Beverage, Majestic Imports, Wijnhandel Beauvin, Transcendent Wines, One Stop Wine Shop, Trialia Foods, Getranke Power, Wine In-motion, Tokajwijn, Branch & Barrel, Great Lakes Wine & Spirits, Shenzhen Classic Haonian Trading, Emma 2, St. Augustine Investments.
- **1 cliqueur** matche uniquement par domaine (étape 2) : `sverre.tollefsen@prizelius.no` → Robert Prizelius As.
- **5 cliqueurs** n'ont aucun match et passeront donc par `web_search` : `drinks@3kraters.com`, `goldcoast@globalfw.com.au`, `fmg@acamacho.com`, `orders@ifw.com.au`, `wine@liquidlibrary.net.au`.

Attendu après ré-enrichissement : 21 fiches rédigées à partir de données vérifiées avec score borné 5-8, et 5 fiches issues d'une recherche web avec score borné 4-7.

Anomalies visibles à corriger, repérées dans les données actuelles :
- Noms de société encore égaux au domaine : `sazerac.com`, `knoxbev.com`, `emma2.de`, `majesticimports.com`, `beauvin.nl`, `transcendentwines.com`, `jacewines.com`, `globalfw.com.au`, `acamacho.com`, `tokajwijn.nl`, `prizelius.no`.
- Pays incorrects hérités du marché par défaut : Sazerac, Knoxville Beverage, Majestic Imports et Jace Wines sont marqués « United Kingdom » alors que les fiches vérifiées indiquent d'autres pays.

## 2. Lancement du ré-enrichissement

Vous lancez, sur la campagne « Août 2026 » dans Admin → Campagnes, le bouton d'enrichissement en choisissant **Tout ré-enrichir** (`force: true`, indispensable : les descriptions existent déjà et « Enrichir les manquants » ne traiterait rien, et seul le mode force autorise l'écrasement du pays).

L'appel dure plusieurs minutes (31 fiches, dont 5 avec recherche web).

## 3. Comparaison après exécution

Une fois le lancement terminé, je relis la table et je vous restitue, cliqueur par cliqueur :
- Nom de société avant / après (disparition des noms égaux au domaine).
- Pays avant / après (correction des « United Kingdom » erronés).
- Score avant / après, et vérification que les 21 matchés sont bien dans 5-8 et les 5 non matchés dans 4-7.
- Contrôle des descriptions : rédigées en français, ton affirmatif, aucun mot d'hésitation, et présence des coordonnées vérifiées (téléphone, site, réseaux) pour les fiches matchées.
- Lecture des logs de la fonction pour repérer d'éventuels échecs Anthropic ou de mise à jour.

## Notes techniques

- Le bouton « Tout ré-enrichir » appelle bien `enrich-campaign-prospects` avec `{ campaign_id, force: true }` — c'est le chemin complet avec le matching 3 étapes.
- L'étape 3 (nom de société) sera de fait rarement décisive ici : les étapes 1 et 2 couvrent déjà 21 des 26 cliqueurs, et pour les 5 restants le `company_name` actuel est un domaine.
- Aucune modification de code n'est prévue dans ce test ; si la comparaison révèle un écart, il fera l'objet d'un plan séparé.
