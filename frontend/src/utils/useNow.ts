import { useEffect, useState } from 'react';
import { nowIso } from './format';

/**
 * The current (demo-clock) time, re-rendering every `everyMs` while the tab is visible and right
 * away when it comes back into view. Use it for anything that must not go stale on screen:
 * "today", "starts in 12 min", a Join button that opens 10 minutes before a session…
 */
export function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(nowIso);
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') setNow(nowIso()); };
    // align to the next whole minute so clocks on screen change together
    const first = window.setTimeout(() => { tick(); }, everyMs - (Date.now() % everyMs));
    const timer = window.setInterval(tick, everyMs);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => { window.clearTimeout(first); window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); };
  }, [everyMs]);
  return now;
}
