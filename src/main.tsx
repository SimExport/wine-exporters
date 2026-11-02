import { createRoot, hydrateRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import i18n from './i18n'

const container = document.getElementById("root")!;
const tree = (
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Hydrate only a prerendered directory page served for this exact URL, in the
// language it was rendered in (FR); everything else renders client-side as before.
const prerendered = container.dataset.prerendered;
if (prerendered && prerendered === window.location.pathname && container.firstElementChild && i18n.language?.startsWith('fr')) {
  hydrateRoot(container, tree);
} else {
  if (prerendered) container.textContent = '';
  createRoot(container).render(tree);
}
