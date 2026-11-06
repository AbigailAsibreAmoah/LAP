// After a new deploy, a tab still running the previous version may ask for code files that no
// longer exist (each build gives its files new names). Instead of showing an error, reload once
// to pick up the current version. A short guard stops a reload loop if something else is wrong.

const KEY = 'laporte-stale-reload';
const GUARD_MS = 20_000;

/** True when an error means "a file from an older version of the site could not be loaded". */
export function isStaleBuildError(err: unknown) {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? '');
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk [\w-]+ failed|Unable to preload CSS|is not a valid JavaScript MIME type/i.test(msg);
}

/** Reloads the page once (per 20 seconds). Returns false if we already tried, so the caller can show an error. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < GUARD_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage blocked: still try once */
  }
  window.location.reload();
  return true;
}

/** Wraps a dynamic import: on a stale-file error, reload to the current version. */
export function importFresh<M>(load: () => Promise<M>): () => Promise<M> {
  return () =>
    load().catch((err) => {
      if (isStaleBuildError(err) && reloadForNewVersion()) return new Promise<M>(() => undefined); // the page is reloading
      throw err;
    });
}

/** Vite reports failed preloads with this event; handle them the same way. */
export function listenForStaleBuilds() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewVersion()) event.preventDefault();
  });
}
