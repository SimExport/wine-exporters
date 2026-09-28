import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Hide the page from search engines (robots noindex, nofollow) and omit the canonical tag. */
  noindex?: boolean;
  /** Optional absolute canonical URL (defaults to BASE_URL + path). */
  canonical?: string;
  /** Optional absolute share image URL. */
  image?: string;
  /** Optional og:type (defaults to website). */
  type?: "website" | "article";
}

const BASE_URL = "https://wine-exporters.com";

export const SEO = ({ title, description, path, jsonLd, noindex, canonical, image, type }: SEOProps) => {
  const url = canonical || `${BASE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <link rel="canonical" href={url} />
      )}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {type && <meta property="og:type" content={type} />}
      {image && <meta property="og:image" content={image} />}
      {image && <meta name="twitter:image" content={image} />}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};
