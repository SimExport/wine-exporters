import { Fragment } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { ArticleCta } from "./ArticleCta";

/**
 * Rendu Markdown standardisé des articles SEO :
 * ## = H2, ### = H3, > = encadré, [[CTA_ANALYSE_MARCHE]] et [[CTA_DEMO]] = blocs CTA.
 * Les # (H1) du contenu sont rétrogradés en H2 pour garantir un H1 unique.
 */
const CTA_TOKEN = /\[\[(CTA_ANALYSE_MARCHE|CTA_DEMO)\]\]/g;

const Markdown = ({ source }: { source: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      h1: ({ children }) => <h2 className="mt-10 mb-3 font-display text-2xl font-semibold text-foreground">{children}</h2>,
      h2: ({ children }) => <h2 className="mt-10 mb-3 font-display text-2xl font-semibold text-foreground">{children}</h2>,
      h3: ({ children }) => <h3 className="mt-6 mb-2 text-lg font-semibold text-foreground">{children}</h3>,
      p: ({ children }) => <p className="my-4 leading-relaxed text-foreground/90">{children}</p>,
      ul: ({ children }) => <ul className="my-4 list-disc space-y-1.5 pl-6 text-foreground/90">{children}</ul>,
      ol: ({ children }) => <ol className="my-4 list-decimal space-y-1.5 pl-6 text-foreground/90">{children}</ol>,
      blockquote: ({ children }) => (
        <blockquote className="my-6 rounded-r-lg border-l-4 border-primary bg-secondary/50 px-5 py-3 text-foreground [&>p]:my-2">
          {children}
        </blockquote>
      ),
      a: ({ href, children }) => {
        if (href && href.startsWith("/")) {
          return <Link to={href} className="font-medium text-primary underline underline-offset-2">{children}</Link>;
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">
            {children}
          </a>
        );
      },
      table: ({ children }) => <div className="my-6 overflow-x-auto"><table className="w-full text-sm">{children}</table></div>,
      th: ({ children }) => <th className="border-b px-3 py-2 text-left font-semibold">{children}</th>,
      td: ({ children }) => <td className="border-b px-3 py-2">{children}</td>,
      img: ({ src, alt }) => <img src={src} alt={alt ?? ""} loading="lazy" className="my-6 w-full rounded-lg" />,
    }}
  >
    {source}
  </ReactMarkdown>
);

export const ArticleContent = ({ content }: { content: string }) => {
  const parts = content.split(CTA_TOKEN);
  // split with a capture group: [text, token, text, token, ...]
  return (
    <div>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return <ArticleCta key={i} variant={part === "CTA_DEMO" ? "demo" : "market_analysis"} />;
        }
        return part.trim() ? <Fragment key={i}><Markdown source={part} /></Fragment> : null;
      })}
    </div>
  );
};
