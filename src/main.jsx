import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted. No CDN in an emergency app's render path.
import '@fontsource-variable/public-sans';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/jetbrains-mono';

import './index.css';
import App from './app/App.jsx';
import { registerServiceWorker } from './lib/pwa.js';

/* The head tags scripts/prerender.mjs wrote into the static HTML are for
   crawlers that never get this far. Drop them before React renders, or the Seo
   component's own title, canonical and description would sit beside them as
   duplicates, and go on disagreeing with them after the first navigation. */
document.querySelectorAll('[data-prerender]').forEach((el) => el.remove());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
