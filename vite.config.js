import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project from https://<user>.github.io/city-shield/,
// so the BUILD is emitted under that sub-path. `base` feeds import.meta.env
// .BASE_URL, which the router (basename) and the hero manifest both consume.
//
// Dev serves from the root instead. Running the dev server under the deploy
// sub-path meant opening http://localhost:5178 landed on a redirect rather than
// the app, which reads as "the site is broken" for no good reason. The sub-path
// only has to be right where it actually applies, which is the deployed build.
//
// Override either with BASE_PATH, e.g. BASE_PATH=/ for root-domain hosting.
export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH ?? (command === 'build' ? '/city-shield/' : '/'),
  plugins: [react()],
  server: { port: 5178 },
}));
