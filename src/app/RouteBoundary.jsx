import { Component } from 'react';
import { alreadyReloaded, clearChunkReloadFlag, markReloaded } from './chunkReload.js';

/**
 * Catches a failed route load and recovers from it.
 *
 * The failure this exists for: routes are code-split, so the HTML a tab is
 * holding names specific content-hashed chunks. After a deploy those filenames
 * no longer exist. The tab still works until you navigate, at which point the
 * dynamic import 404s, and with nothing catching it React unmounts the tree and
 * leaves a blank page. Reloading appears to "fix" it because it fetches fresh
 * HTML naming the new chunks.
 *
 * The only real cure for a missing chunk is new HTML, so that is what this
 * does: reload once, automatically. Guarded through sessionStorage, because a
 * reload loop on a page someone is using to call an ambulance would be far
 * worse than the blank page it is meant to replace.
 */

/* Browsers word this differently and none of them expose a stable code, so it
   has to be matched on message and name. */
function isChunkLoadError(error) {
  const text = `${error?.name ?? ''} ${error?.message ?? ''}`;
  return (
    /ChunkLoadError/i.test(text) ||
    /Loading chunk .* failed/i.test(text) ||
    /Failed to fetch dynamically imported module/i.test(text) ||
    /Importing a module script failed/i.test(text) ||
    /error loading dynamically imported module/i.test(text)
  );
}

export default class RouteBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, recoverable: false };
  }

  static getDerivedStateFromError(error) {
    return { failed: true, recoverable: isChunkLoadError(error) };
  }

  componentDidCatch(error) {
    if (!isChunkLoadError(error)) return;

    /* Reload at most once per session. If fresh HTML still cannot load the
       chunk, the problem is not staleness and another reload will not help. */
    if (alreadyReloaded()) return;
    markReloaded();
    window.location.reload();
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center md:px-8">
        <h1 className="text-h1 text-ink">This page could not load</h1>
        <p className="mt-3 text-body text-ink-2">
          {this.state.recoverable
            ? 'The app was updated while this tab was open. Reloading usually fixes it.'
            : 'Something went wrong loading this page.'}
        </p>

        {/* The emergency route out comes first and is never behind a reload. */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="tel:112"
            className="rounded-md bg-signal px-5 py-3 text-small font-semibold text-white no-underline"
          >
            Call 112
          </a>
          <button
            type="button"
            onClick={() => {
              clearChunkReloadFlag();
              window.location.reload();
            }}
            className="rounded-md border border-line-strong px-5 py-3 text-small font-semibold text-ink"
          >
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}

