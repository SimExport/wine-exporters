import { DIRECTORY_COUNTRIES, type PublicDirectoryCompany } from '../src/lib/directory-countries';

/** Build/server only. Never import this registry into browser code or hydrate it from buyer tables. */
export interface PublicationCandidate {
  existingCompanyId: string;
  approval: { editorial: boolean; rights: boolean; approvedAt: string; evidence: string };
  publicFields: PublicDirectoryCompany;
}

// Candidates supplied by the user, each confirmed (read-only) in buyer_contacts by company name,
// then checked on its official HTTPS website on 2026-10-24. Descriptions are original summaries
// of those public pages: no contact data, internal notes, licensed text or private enrichment.
// `rights: true` means "original text from public sources, no private or licensed data";
// it is NOT a permission obtained from the company. Exclusions are documented in
// docs/public-directory-seo-v1.md. Pages stay noindex until source review + SEO publication decision.
const REVIEWED_AT = '2026-10-24';
const entry = (countryCode: string, slug: string, name: string, description: string, website: string, sources: string[]): PublicationCandidate => ({
  existingCompanyId: `buyer_contacts:${name}`,
  approval: { editorial: true, rights: true, approvedAt: REVIEWED_AT, evidence: 'Original description from the cited public HTTPS pages; company present in buyer_contacts (read-only check).' },
  publicFields: { slug, countryCode, name, description, website, sources },
});

export const APPROVED_PUBLIC_COMPANIES: PublicationCandidate[] = [
  entry("US", "3w-beverage-importers", "3W Beverage Importers", "3W Beverage Importers est un importateur américain spécialisé dans des vins d’Europe centrale et orientale ainsi que d’Afrique du Sud. Son site met en avant des vins de qualité qui racontent leur région, les familles qui les produisent et leurs terroirs.", "https://www.3wimporters.com/", ["https://www.3wimporters.com/"]),
  entry("US", "advintage-distributing", "Advintage Distributing", "Advintage Distributing est un distributeur qui couvre les Carolines et le Tennessee. Son site présente un portefeuille de vins fins, de bières artisanales et de produits pour le bar, avec notamment des producteurs de Champagne et d’Espagne.", "https://www.advintagedistributing.com/", ["https://www.advintagedistributing.com/"]),
  entry("US", "all-star-wine-imports", "All Star Wine Imports", "All Star Wine Imports accompagne les domaines européens qui veulent entrer sur le marché américain : importation, conformité, logistique et préparation commerciale. Le site décrit un lancement dans le Michigan et l’Ohio, puis une extension via des distributeurs partenaires aux États-Unis.", "https://www.allstarwineimports.com/", ["https://www.allstarwineimports.com/"]),
  entry("US", "athenee-importers-distributors", "Athenee Importers & Distributors", "Athenee Importers & Distributors importe et distribue des vins, spiritueux et bières sélectionnés pour leur qualité, leur rapport qualité-prix et leur goût. Ses profils de producteurs comprennent notamment des domaines grecs.", "https://atheneeimporters.com/", ["https://atheneeimporters.com/"]),
  entry("US", "banville-wine-merchants", "Banville Wine Merchants", "Banville Wine Merchants se présente comme un importateur national de vins fins, spiritueux et bières, qui représente ses fournisseurs en exclusivité aux États-Unis. Le site mentionne une distribution à New York, dans le New Jersey, la région Mid-Atlantic et l’Oregon.", "https://www.banvillewine.com/", ["https://www.banvillewine.com/"]),
  entry("US", "brazos-wine-imports", "Brazos Wine Imports", "Brazos Wine Imports importe des vins de vignerons du Chili, d’Argentine et d’Uruguay, entre autres. Le site met l’accent sur de petites productions qui expriment un terroir précis.", "https://www.brazoswine.com/", ["https://www.brazoswine.com/"]),
  entry("US", "terra-firma-wine-company", "Terra Firma Wine Company", "Terra Firma Wine Company est un importateur et distributeur indépendant de vins issus d’exploitations familiales. Son portefeuille privilégie les levures indigènes, l’intervention minimale et des cépages rares ; ses clients sont des restaurants et cavistes de Californie.", "https://terrafirmawineco.com/", ["https://terrafirmawineco.com/about/"]),
  entry("US", "bon-vivant-imports", "Bon Vivant Imports", "Bon Vivant Imports représente de petits producteurs indépendants d’Espagne, de France, d’Italie, du Portugal et de Slovénie. Le site insiste sur des domaines familiaux, cultivés de façon durable et ancrés dans leur lieu d’origine.", "https://www.bonvivantimports.com/", ["https://www.bonvivantimports.com/"]),
  entry("UK", "alliance-wine", "Alliance Wine", "Alliance Wine se décrit comme l’un des principaux importateurs de vin indépendants du Royaume-Uni. Son portefeuille, désormais associé à celui de H2Vin, couvre de nombreux pays producteurs et s’adresse notamment à la restauration indépendante haut de gamme.", "https://www.alliancewine.com/", ["https://www.alliancewine.com/"]),
  entry("UK", "alivini", "Alivini", "Alivini est un spécialiste britannique des produits italiens, présent sur ce marché depuis 1975 selon son site. Son offre réunit des marques italiennes premium et des produits moins connus, dont des vins.", "https://www.alivini.com/", ["https://www.alivini.com/"]),
  entry("UK", "albion-wine-shippers", "Albion Wine Shippers", "Albion Wine Shippers est à la fois agent et caviste à Londres, dans Lamb’s Conduit Street. Le site indique une fondation en 1986 et un portefeuille de vins varié, avec des expéditions au Royaume-Uni.", "https://albionwineshippers.co.uk/", ["https://albionwineshippers.co.uk/"]),
  entry("UK", "berkmann-wine-cellars", "Berkmann Wine Cellars", "Berkmann Wine Cellars importe des vins destinés notamment à la restauration britannique. Son site annonce par exemple son rôle d’importateur au Royaume-Uni de la maison argentine Rutini.", "https://www.berkmann.co.uk/", ["https://www.berkmann.co.uk/"]),
  entry("UK", "ab-vintners", "A&B Vintners", "A&B Vintners entretient des relations directes avec des producteurs depuis 1998, d’après son site. Son portefeuille est centré sur la Bourgogne, la vallée du Rhône, le Piémont et l’Oregon, pour des particuliers, des restaurants et des cavistes spécialisés au Royaume-Uni.", "https://abvintners.co.uk/", ["https://abvintners.co.uk/why-ab"]),
  entry("UK", "ags-vintners", "AGS Vintners", "AGS Vintners se présente comme distributeur, importateur et responsable marketing de vins produits par des familles attachées à leur terroir. Son catalogue comprend notamment des Champagnes, des vins de Bordeaux et de Bourgogne et des sélections italiennes.", "https://www.agsvintners.co.uk/", ["https://www.agsvintners.co.uk/"]),
  entry("UK", "liberty-wines", "Liberty Wines", "Liberty Wines est un importateur britannique dont le site met en avant une expertise reconnue des vins italiens lors des International Wine Challenge awards. Il publie aussi des analyses sur le commerce indépendant du vin.", "https://www.libertywines.co.uk/", ["https://www.libertywines.co.uk/"]),
  entry("UK", "modal-wines", "Modal Wines", "Modal Wines est un importateur spécialisé basé à Londres, guidé par une approche agricole. Il soutient des vignerons engagés en agriculture biologique, biodynamique et régénératrice, avec une vinification peu interventionniste.", "https://www.modalwines.com/", ["https://www.modalwines.com/"]),
  entry("UK", "vine-trail", "Vine Trail", "Vine Trail sélectionne, importe, vend et distribue des vins de France, du nord de l’Espagne et de Sicile. La maison recherche des vins purs, frais et nuancés qui reflètent leur terroir.", "https://www.vinetrail.co.uk/", ["https://www.vinetrail.co.uk/"]),
  entry("UK", "morgenrot", "Morgenrot", "Morgenrot fournit des bars, restaurants et cavistes britanniques en vins, bières et sherries du monde entier. Son importation se concentre sur des vins végans, biodynamiques, biologiques ou nature.", "https://www.morgenrot.co.uk/", ["https://www.morgenrot.co.uk/"]),
  entry("DE", "75cl-distribution", "75cl Distribution", "75cl Distribution se présente comme un spécialiste des vins français en Allemagne. L’entreprise importe et distribue des vins de Champagne, de Bourgogne, du Rhône, de Provence, du Languedoc, de Bordeaux et de Loire auprès de la gastronomie et du commerce spécialisé, en stock ou en import direct.", "https://75cl.wine/", ["https://75cl.wine/"]),
  entry("DE", "amatulli-import", "Amatulli Import", "Amatulli Import est une maison allemande consacrée aux produits italiens : vins, bières, spiritueux et épicerie fine. Son site met en avant l’import direct auprès de producteurs partenaires et un service d’import et de distribution pour les professionnels.", "https://amatulli.de/", ["https://amatulli.de/"]),
  entry("DE", "ardau-weinimport", "Ardau Weinimport", "Ardau Weinimport propose surtout des vins de petits producteurs d’Espagne, du Portugal, d’Italie et d’Allemagne. Son catalogue couvre vins tranquilles, effervescents, sherry et porto, complétés par une offre d’épicerie fine.", "https://www.ardau.de/", ["https://shop.ardau.de/"]),
  entry("DE", "wein-wolf", "Wein Wolf", "Wein Wolf est spécialisée dans l’import exclusif et la distribution de vins, Champagnes et spiritueux internationaux haut de gamme. Basée à Bonn, elle travaille avec la gastronomie, le commerce spécialisé et la grande distribution en Allemagne.", "https://www.weinwolf.de/", ["https://www.weinwolf.de/ueber-uns"]),
  entry("BE", "allied-vintners-international", "Allied Vintners International", "Allied Vintners International est un distributeur de vin implanté en Hesbaye, en Belgique. Il travaille avec des domaines de l’Ancien et du Nouveau Monde et prend en charge la logistique d’entrepôt pour ses partenaires cavistes.", "https://www.alliedvintners.com/", ["https://www.alliedvintners.com/"]),
  entry("BE", "wijnimport-couvreur", "Wijnimport Couvreur", "Wijnimport Couvreur pratique le commerce de gros et de détail de vins français. Le site indique une importation directe depuis toutes les régions de France et propose des coffrets cadeaux pour entreprises et particuliers.", "https://wijnimport-couvreur.be/", ["https://wijnimport-couvreur.be/"]),
  entry("BE", "kaapwijn-import-de-leeuw", "KaapWijn Import De Leeuw", "KaapWijn Import De Leeuw met en avant plus de quarante-cinq ans d’expérience dans l’importation de vin sur le marché belge. Sa spécialité est le vin sud-africain, complétée par des vins d’autres régions du monde.", "https://www.kaapwijn.be/", ["https://www.kaapwijn.be/"]),
  entry("BE", "frui", "Frui", "Frui est une plateforme belge destinée aux cavistes professionnels qui importent eux-mêmes leurs vins. Elle présente les vins de producteurs partenaires, avec des prix départ producteur visibles après connexion, et publie des informations pratiques sur l’importation vers la Belgique.", "https://frui.be/", ["https://frui.be/"]),
  entry("JP", "iconic-wine-japan", "Iconic Wine Japan", "Iconic Wine Japan est un importateur spécialisé dans les vins de Californie. Il importe directement les vins de petits producteurs californiens et les vend en gros aux restaurants et cavistes ainsi qu’en ligne aux particuliers.", "https://www.iconicwinejapan.com/", ["https://www.iconicwinejapan.com/"]),
  entry("JP", "nakagawa-wine", "Nakagawa Wine", "Nakagawa Wine est une entreprise japonaise d’importation et de distribution de vins, active dans l’importation depuis 1985 selon sa page société. Elle se présente comme un pionnier de l’importation de vins californiens au Japon, des cuvées cultes aux vins du quotidien.", "https://nakagawa-wine.co.jp/", ["https://nakagawa-wine.co.jp/company/"]),
  entry("JP", "vintners", "Vintners", "Vintners est un importateur japonais fondé en 1998. Son portefeuille est centré sur la France, l’Italie et l’Espagne, et son site annonce des dégustations professionnelles et des ventes en grands magasins.", "https://www.vintners.co.jp/", ["https://www.vintners.co.jp/company/"]),
  entry("JP", "vinos-yamazaki", "Vinos Yamazaki", "Vinos Yamazaki importe directement des vins auprès des domaines, une démarche présentée comme née des attentes de ses clients. Son site propose aussi des sélections de vins rouges, blancs et effervescents ainsi que du saké.", "https://www.v-yamazaki.co.jp/", ["https://corporate.v-yamazaki.co.jp/", "https://www.v-yamazaki.co.jp/"]),
  entry("CA", "30-50-imports", "30.50 Imports", "30.50 Imports est une agence de vins basée à Toronto, en Ontario. Elle importe des vins artisanaux du monde entier pour les restaurants, les hôtels et les amateurs de la province.", "https://www.3050imports.com/", ["https://www.3050imports.com/"]),
  entry("CA", "abcon-international-wine-merchants", "Abcon International Wine Merchants", "Abcon International Wine Merchants est une agence de vins dont le site présente des sorties limitées à la LCBO, en Ontario. Son portefeuille comprend notamment des vins sud-africains de Stellenbosch.", "https://abconwine.com/", ["https://abconwine.com/"]),
  entry("CA", "the-merchant-vintner", "The Merchant Vintner", "The Merchant Vintner est une agence de vins de l’Ontario qui représente des producteurs sur ce marché. Ses vins sont proposés via LCBO Vintages ou directement aux restaurants et clients privés.", "https://merchantvintner.com/", ["https://merchantvintner.com/"]),
  entry("CA", "authentic-wines-and-spirits", "Authentic Wines and Spirits", "Authentic Wines and Spirits accompagne cavistes, bars, restaurants et hôtels canadiens avec un large portefeuille de vins et spiritueux. Le site couvre plusieurs marchés provinciaux, dont l’Alberta, la Colombie-Britannique, l’Ontario et le Québec.", "https://www.awsm.ca/", ["https://www.awsm.ca/"]),
  entry("CA", "azureau-wine-and-spirits", "Azureau Wine and Spirits", "Azureau Wine and Spirits sélectionne des vins et spiritueux auprès de vignobles de petite taille et de distilleries artisanales. Son site propose la livraison de ses vins en Ontario.", "https://www.azureau.com/", ["https://www.azureau.com/"]),
];

export const MAX_PER_COUNTRY = 10;
export const MAX_TOTAL = 60;

const httpsUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash; }
  catch { return false; }
};
const cleanText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && !/[<>@]|\b(?:\+?\d[\s().-]*){7,}\b/.test(value);

/** Explicit public projection, no object spreading: approval metadata and unknown fields cannot escape. */
export function projectPublicDirectory(candidates: PublicationCandidate[]): PublicDirectoryCompany[] {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  const result: PublicDirectoryCompany[] = [];
  for (const candidate of candidates) {
    const { approval, publicFields: fields } = candidate;
    if (!candidate.existingCompanyId || !approval?.editorial || !approval.rights || !approval.evidence?.trim() || !Number.isFinite(Date.parse(approval.approvedAt))) continue;
    if (!fields || !DIRECTORY_COUNTRIES.some(country => country.code === fields.countryCode)) continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.slug) || !cleanText(fields.name) || !cleanText(fields.description) || !httpsUrl(fields.website)) continue;
    if (!Array.isArray(fields.sources) || !fields.sources.length || !fields.sources.every(httpsUrl)) continue;
    const key = `${fields.countryCode}/${fields.slug}`;
    const count = counts.get(fields.countryCode) ?? 0;
    if (seen.has(key) || count >= MAX_PER_COUNTRY || result.length >= MAX_TOTAL) continue;
    result.push({ slug: fields.slug, countryCode: fields.countryCode, name: fields.name.trim(), description: fields.description.trim(), website: fields.website, sources: [...fields.sources] });
    counts.set(fields.countryCode, count + 1);
    seen.add(key);
  }
  return result;
}

export function directoryPublicationPlugin() {
  const publicJson = () => JSON.stringify(projectPublicDirectory(APPROVED_PUBLIC_COMPANIES));
  return {
    name: 'approved-public-directory',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: unknown, res: { setHeader: (key: string, value: string) => void; end: (body: string) => void }) => void) => void } }) {
      server.middlewares.use('/directory-public.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(publicJson());
      });
    },
    generateBundle(this: { emitFile: (file: { type: 'asset'; fileName: string; source: string }) => void }) {
      this.emitFile({ type: 'asset', fileName: 'directory-public.json', source: publicJson() });
    },
  };
}