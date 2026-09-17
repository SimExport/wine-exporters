// Options du formulaire d'analyse de marché.
// `value` est la valeur stockée en base, `key` la clé i18n pour l'affichage.

export interface Option {
  value: string;
  key: string;
}

export const WINE_TYPES: Option[] = [
  { value: "red", key: "red" },
  { value: "white", key: "white" },
  { value: "rose", key: "rose" },
  { value: "sparkling", key: "sparkling" },
  { value: "sweet", key: "sweet" },
  { value: "orange", key: "orange" },
  { value: "other", key: "other" },
];

export const PRICE_RANGES: Option[] = [
  { value: "3-5", key: "r3_5" },
  { value: "5-7", key: "r5_7" },
  { value: "8-10", key: "r8_10" },
  { value: "10+", key: "r10plus" },
];

export const CERTIFICATION_NONE = "none";

export const CERTIFICATIONS: Option[] = [
  { value: "organic", key: "organic" },
  { value: "biodynamic", key: "biodynamic" },
  { value: "hve", key: "hve" },
  { value: "vegan", key: "vegan" },
  { value: "other", key: "other" },
  { value: CERTIFICATION_NONE, key: "none" },
];

export const IMPORTER_LET_US_CHOOSE = "let_wineexporters_choose";

export const IMPORTER_PREFERENCES: Option[] = [
  { value: "generalist", key: "generalist" },
  { value: "french_specialist", key: "frenchSpecialist" },
  { value: "organic_natural", key: "organicNatural" },
  { value: "premium_fine_wine", key: "premium" },
  { value: "horeca", key: "horeca" },
  { value: "retail_specialist", key: "retail" },
  { value: "mass_retail", key: "massRetail" },
  { value: IMPORTER_LET_US_CHOOSE, key: "letUsChoose" },
];

// Marchés cibles disponibles pour cette V1 (liste fermée, sans saisie libre).
// Les codes correspondent à `code` dans src/components/importers/country-data.ts :
// pour ajouter ou retirer un marché, il suffit de modifier cette liste.
export const AVAILABLE_MARKET_CODES: string[] = [
  "GB", // Royaume-Uni
  "DE", // Allemagne
  "NL", // Pays-Bas
  "DK", // Danemark
  "BE", // Belgique
  "CH", // Suisse
  "SE", // Suède
  "CZ", // République tchèque
  "PL", // Pologne
  "IT", // Italie
  "AT", // Autriche
  "ES", // Espagne
  "NO", // Norvège
  "IE", // Irlande
  "US", // États-Unis
  "CA", // Canada
  "JP", // Japon
  "HK", // Hong Kong
  "CN", // Chine
  "SG", // Singapour
  "KR", // Corée du Sud
  "AU", // Australie
  "BR", // Brésil
  "MX", // Mexique
  "FI", // Finlande
];

export interface MarketAnalysisForm {
  winery_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  winery_location: string;
  wine_types: string[];
  appellations_cuvees: string;
  export_price_range: string;
  certifications: string[];
  target_country: string;
  importer_preferences: string[];
  exclusions: string;
  additional_context: string;
}

export const EMPTY_FORM: MarketAnalysisForm = {
  winery_name: "",
  contact_name: "",
  email: "",
  phone: "",
  website: "",
  winery_location: "",
  wine_types: [],
  appellations_cuvees: "",
  export_price_range: "",
  certifications: [],
  target_country: "",
  importer_preferences: [],
  exclusions: "",
  additional_context: "",
};
