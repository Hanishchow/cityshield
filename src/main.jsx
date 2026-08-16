import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted. No CDN in an emergency app's render path. See docs/FRONTEND-SPEC.md §3
import '@fontsource-variable/inter';
import '@fontsource/instrument-serif';

import './index.css';
import App from './app/App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
