import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted. No CDN in an emergency app's render path.
import '@fontsource-variable/public-sans';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/jetbrains-mono';

import './index.css';
import App from './app/App.jsx';
import { registerServiceWorker } from './lib/pwa.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
