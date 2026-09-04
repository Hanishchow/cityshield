/**
 * Service worker registration.
 *
 * Deliberately NOT registered in development: a caching worker between you and
 * the dev server turns every edit into a debugging session about whether the
 * change actually shipped.
 *
 * Registration failure is swallowed. Offline support is an enhancement; a
 * console error on a page whose job is summoning an ambulance helps nobody.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {});
  });
}
