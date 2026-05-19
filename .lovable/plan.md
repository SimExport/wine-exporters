## Modifications

### 1. Onglet Général — retirer "Certifications"
Déjà couvert par cuvée (`is_organic`, `is_biodynamic`, `is_natural` sur chaque vin). Suppression de la carte certifications + des handlers/options non utilisés. La colonne `profiles.certifications` est conservée en base (non touchée).

### 2. Déplacer "Points forts du domaine" vers l'onglet Description
La carte avec les 3 champs `strengths` passe de Général à Description, sous la carte de description longue. C'est plus cohérent : storytelling + atouts au même endroit.

### 3. Score de complétion — recalibrer
Retrait de `certifications`. Le critère `strengths` change d'onglet (passe à `description`). Nouveau total : **12 champs**.
```text
domain_name, contact_name, location, aoc, bottles_per_year,     (general)
wines,                                                            (wines)
priority_markets, current_markets, target_buyer_description,      (markets)
description, strengths,                                           (description)
website                                                           (website)
```

### 4. Audit mapping formulaire ↔ table `profiles`
Vérifié colonne par colonne : **tous les champs du formulaire existent en base**. Aucun champ non mappé.

| Champ formulaire | Colonne `profiles` | Statut |
|---|---|---|
| domain_name, contact_name, location | idem | ✓ |
| aoc | aoc (text, joint avec `, `) | ✓ |
| website, social_media | idem | ✓ |
| surface_area, bottles_per_year | idem | ✓ |
| organic_conversion, organic_body, organic_year | idem | ✓ (legacy, non édités dans l'UI) |
| wine_colors, wine_types, certifications, grape_varieties, cuvees | idem | ✓ (legacy, plus édités après ce changement) |
| description, strengths | idem | ✓ |
| is_published | idem | ✓ |
| priority_markets, current_markets, avoid_markets | idem (text joint) | ✓ |
| target_buyer_description | idem | ✓ |

**Colonnes `profiles` non exposées dans le formulaire** (et c'est voulu) :
- `campaigns_remaining`, `sourcing_requests_remaining` — gérées par le système de crédits (`user_credits`).
- `subscription_plan`, `stripe_customer_id` — gérés par Stripe webhook.
- `onboarding_completed`, `onboarding_dismissed_at` — gérés par le wizard d'onboarding.
- `is_published` — pas de toggle UI aujourd'hui (à activer plus tard si besoin d'une page publique).

Rien à corriger côté base.

## Hors périmètre
- Pas de migration SQL.
- Pas de modification des onglets Vins, Marchés, Documents, Médias.
