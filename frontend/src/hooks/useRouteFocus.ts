import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Client-side navigation is silent to screen readers. On each route change this
 * resets scroll, names the document after the page heading, and moves focus to
 * the main region so keyboard and screen-reader users start at the new content.
 * Hash-only changes (in-page anchors) are left alone.
 */
export function useRouteFocus(mainId: string) {
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Wait a frame so lazy pages have rendered their heading.
    const id = window.setTimeout(() => {
      const main = document.getElementById(mainId);
      const heading = main?.querySelector('h1')?.textContent?.trim();
      document.title = heading ? `${heading} · La Porte French Institute` : 'La Porte French Institute';
      if (first.current) {
        first.current = false;
        return;
      }
      main?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(id);
  }, [pathname, mainId]);
}
