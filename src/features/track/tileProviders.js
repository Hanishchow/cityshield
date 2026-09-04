/**
 * Raster tile providers, India first.
 *
 * Why this abstraction exists rather than a hardcoded URL: maps published in
 * India are required to depict India's claimed boundaries, and OSM-derived
 * tilesets do not. For a service pitched at government that is a legal
 * exposure, not a styling preference — so the provider has to be swappable
 * without touching the map component.
 *
 * Mappls is preferred when configured. MapTiler remains the fallback so the map
 * keeps working today, and a labelled schematic grid is the floor when no key
 * exists at all.
 */

const MAPPLS = import.meta.env.VITE_MAPPLS_MAP_KEY;
const MAPTILER = import.meta.env.VITE_MAPS_API_KEY;

/** Attribution is a licence condition of every one of these, not a courtesy. */
export const PROVIDERS = {
  mappls: {
    id: 'mappls',
    label: 'Mappls',
    indiaSpecific: true,
    maxZoom: 18,
    // Mappls serves its raster tiles per z/x/y under the map key in the path.
    url: ({ z, x, y }) => `https://apis.mappls.com/advancedmaps/v1/${MAPPLS}/still_map/${z}/${x}/${y}.png`,
    attribution: [
      { label: 'Mappls', href: 'https://www.mappls.com/about/' },
      { label: 'Survey of India', href: 'https://www.surveyofindia.gov.in/' },
    ],
  },
  maptiler: {
    id: 'maptiler',
    label: 'MapTiler',
    indiaSpecific: false,
    maxZoom: 20,
    url: ({ z, x, y, theme }) =>
      `https://api.maptiler.com/maps/${theme === 'dark' ? 'dataviz-dark' : 'dataviz'}/256/${z}/${x}/${y}.png?key=${MAPTILER}`,
    attribution: [
      { label: 'MapTiler', href: 'https://www.maptiler.com/copyright/' },
      { label: 'OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
    ],
  },
};

/** The provider actually in use, or null when no key is configured anywhere. */
export function activeProvider() {
  if (MAPPLS) return PROVIDERS.mappls;
  if (MAPTILER) return PROVIDERS.maptiler;
  return null;
}
