/** Build-only entry: prerenders the public directory with the same tree as the browser app (FR fixed). */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import type { ReactNode } from 'react';
import i18n from './i18n';
import App from './App';

export async function render(url: string) {
  await i18n.changeLanguage('fr');
  const helmetContext: { helmet?: HelmetServerState } = {};
  const Router = ({ children }: { children?: ReactNode }) => <StaticRouter location={url}>{children}</StaticRouter>;
  const html = renderToString(<HelmetProvider context={helmetContext}><App Router={Router} /></HelmetProvider>);
  const h = helmetContext.helmet;
  const head = h ? [h.title, h.meta, h.link, h.script].map(part => part.toString()).join('\n') : '';
  return { html, head };
}
