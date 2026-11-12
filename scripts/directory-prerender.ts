import path from 'node:path';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { build, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { DIRECTORY_COUNTRIES, DIRECTORY_EMBED_ID, DIRECTORY_GUIDES_EMBED_ID, DIRECTORY_HOME_PATH, companyPath, countryPath } from '../src/lib/directory-countries';
import { APPROVED_PUBLIC_COMPANIES, projectPublicDirectory } from './public-directory';

/** The 42 prerendered directory URLs, derived from the reviewed registry only. */
export function directoryPrerenderPaths() {
  const rows = projectPublicDirectory(APPROVED_PUBLIC_COMPANIES);
  return [
    DIRECTORY_HOME_PATH,
    ...DIRECTORY_COUNTRIES.map(country => countryPath(country)),
    ...rows.map(row => companyPath(DIRECTORY_COUNTRIES.find(c => c.code === row.countryCode)!, row)),
  ];
}

// Head tags from index.html that each page replaces with its own Helmet output.
const REPLACED_HEAD = [
  /<title>[\s\S]*?<\/title>\s*/,
  /<meta name="description"[^>]*>\s*/,
  /<meta property="og:(?:title|description|url|type)"[^>]*>\s*/g,
  /<meta name="twitter:(?:title|description)"[^>]*>\s*/g,
];

export function injectPrerender(template: string, route: string, head: string, html: string, dataJson: string, guidesJson = '[]') {
  let out = template;
  for (const pattern of REPLACED_HEAD) out = out.replace(pattern, '');
  const safeJson = dataJson.replace(/</g, '\\u003c');
  const safeGuidesJson = guidesJson.replace(/</g, '\\u003c');
  return out
    .replace('<html lang="en">', '<html lang="fr">')
    .replace('</head>', `${head}\n    <script type="application/json" id="${DIRECTORY_EMBED_ID}">${safeJson}</script>\n    <script type="application/json" id="${DIRECTORY_GUIDES_EMBED_ID}">${safeGuidesJson}</script>\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root" data-prerendered="${route}">${html}</div>`);
}

export function directoryPrerenderPlugin(): Plugin {
  let root = process.cwd();
  let outDir = 'dist';
  let isSsrBuild = false;
  return {
    name: 'directory-prerender',
    apply: 'build',
    configResolved(config) { root = config.root; outDir = path.resolve(config.root, config.build.outDir); isSsrBuild = Boolean(config.build.ssr); },
    async closeBundle() {
      if (isSsrBuild) return;
      const ssrOut = path.resolve(root, 'node_modules/.cache/directory-ssr');
      await build({
        configFile: false, root, logLevel: 'warn', mode: 'production',
        plugins: [react()],
        resolve: { alias: { '@': path.resolve(root, 'src') } },
        ssr: { noExternal: true },
        build: { ssr: 'src/entry-server.tsx', outDir: ssrOut, emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'entry-server.mjs', inlineDynamicImports: true } } },
      });
      const { render, fetchPublishedDirectoryGuides } = await import(`${pathToFileURL(path.join(ssrOut, 'entry-server.mjs')).href}?t=${Date.now()}`);
      const rows = projectPublicDirectory(APPROVED_PUBLIC_COMPANIES);
      let guides = [];
      try {
        guides = await fetchPublishedDirectoryGuides();
      } catch (error) {
        // Keep existing static pages buildable if the editorial table is temporarily unavailable.
        console.warn('directory-prerender: published guides unavailable; rendering historical pages', error instanceof Error ? error.message : error);
      }
      (globalThis as { __PUBLIC_DIRECTORY__?: unknown }).__PUBLIC_DIRECTORY__ = rows;
      (globalThis as { __PUBLIC_DIRECTORY_GUIDES__?: unknown }).__PUBLIC_DIRECTORY_GUIDES__ = guides;
      const template = await readFile(path.join(outDir, 'index.html'), 'utf8');
      const dataJson = JSON.stringify(rows);
      const guidesJson = JSON.stringify(guides);
      const routes = directoryPrerenderPaths();
      try {
        for (const route of routes) {
          const { html, head } = await render(route);
          const file = path.join(outDir, route);
          await mkdir(path.dirname(file), { recursive: true });
          await writeFile(file, injectPrerender(template, route, head, html, dataJson, guidesJson));
        }
      } finally {
        delete (globalThis as { __PUBLIC_DIRECTORY__?: unknown }).__PUBLIC_DIRECTORY__;
        delete (globalThis as { __PUBLIC_DIRECTORY_GUIDES__?: unknown }).__PUBLIC_DIRECTORY_GUIDES__;
        await rm(ssrOut, { recursive: true, force: true });
      }
      console.log(`directory-prerender: ${routes.length} pages written`);
    },
  };
}
