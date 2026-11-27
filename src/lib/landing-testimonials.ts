/**
 * Témoignages affichés sur la page d'accueil (section « De nouveaux marchés… »).
 *
 * Volontairement sans React ni i18n : les verbatims clients sont des données,
 * ils ne sont ni traduits ni réécrits. Ce module reste importable par un test.
 */

export type LandingTestimonial = {
  /** Verbatim client, repris tel quel. */
  quote: string;
  /** Nom affiché en gras sous la citation. */
  author: string;
  /** Domaine viticole affiché sous le nom. */
  domain: string;
  /** Résultat résumé, distinct du verbatim client. */
  headline?: string;
};

export const featuredLandingTestimonial: LandingTestimonial = {
  headline: "Deuxième commande au Danemark",
  quote: "J'apprécie beaucoup le partage d'opportunité. […] En tout cas, j'apprécie vraiment notre collaboration, et je la recommande à tout le monde",
  author: "Jérôme Petitjean",
  domain: "Famille Petitjean",
};

export const landingTestimonials: LandingTestimonial[] = [
  featuredLandingTestimonial,
  {
    quote:
      "Après avoir essayé différents outils (listings importateurs, CRM, Brevo), nous avons trouvé avec WineExporters la plateforme tout-en-un, et c'est vraiment facile. Pour le moment, nous avons lancé beaucoup de prospections ; les retours sont longs, mais nous avons eu notre première commande pour un contact en Hollande, c'est un bon début ! Nous sommes vraiment satisfaits de cet outil et souhaiterions pouvoir y consacrer plus de temps. Nous allons préparer nos salons avec WineExporters.",
    author: "Marie Rouanet",
    domain: "Domaine de Saint-Cels",
  },
  {
    quote:
      "La plateforme répond à un vrai besoin pour nous, et nous connaissons la valeur et la pertinence de l'approche de Simon.",
    author: "Mathilde Pauma",
    domain: "Maison Kieffer",
  },
  {
    quote:
      "Ce que j'apprécie le plus : la qualification des leads, tout comme la capacité de la plateforme à s'actualiser pour répondre au plus près de nos besoins.",
    author: "Arnaud Thomassin",
    domain: "Château de France",
  },
  {
    quote:
      "Bravo pour la plateforme, c'est génial ! J'ai de bons contacts et des retours intéressants avec des acheteurs. Je ne regrette pas d'avoir sauté le pas !",
    author: "Julien Orosquette",
    domain: "Château La Grave",
  },
  {
    quote:
      "Je trouve que votre site est très bien conçu, notamment en ce qui concerne la partie CRM, que je trouve particulièrement réussie.",
    author: "Alexandre Pipilis",
    domain: "Domaine Giroud Catherine & Eric",
  },
];

/**
 * La première citation occupe toute la largeur ; la dernière aussi quand le
 * nombre total est pair, pour qu'aucune carte ne reste seule à half-width.
 */
export function testimonialSpansFullWidth(index: number, total: number): boolean {
  if (total <= 0) return false;
  if (index === 0) return true;
  return index === total - 1 && total % 2 === 0;
}
