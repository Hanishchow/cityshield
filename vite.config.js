import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project from https://<user>.github.io/city-shield/,
// so every asset and route is under a sub-path. `base` feeds import.meta.env.
// BASE_URL, which the router (basename) and the hero manifest both consume.
// Override with BASE_PATH=/ for root-domain hosting.
const base = process.env.BASE_PATH ?? '/city-shield/';

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5178 },
});
