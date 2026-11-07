import type { MessageThread } from '@laporte/shared';
import { useEffect, useRef, useState } from 'react';
import { detectApi, request } from '../../services/http';

/*
 * Live chat for the Messages page: who is typing, and new replies arriving on their own.
 *  - While Messages is open (and the tab is visible) it asks the server every 2.5 s for this
 *    user's conversations and who is typing in each.
 *  - While you type a reply it tells the server, at most every 3 s; stopping, clearing the box,
 *    leaving or sending ends it. The server forgets a signal after 6 s on its own.
 * Offline demo: the same signals go through this browser's storage, so two tabs (say, the
 * learner and the tutor) still see each other typing.
 */

const POLL_MS = 2_500;
const SEND_EVERY_MS = 3_000;
const LOCAL_TTL_MS = 6_000;
const LOCAL_KEY = 'laporte-typing';

type TypingMap = Record<string, string[]>;

function readLocal(userId: string): TypingMap {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as Record<string, Record<string, number>>;
    const now = Date.now();
    const out: TypingMap = {};
    for (const [thread, who] of Object.entries(all)) {
      const ids = Object.entries(who).filter(([id, until]) => id !== userId && until > now).map(([id]) => id);
      if (ids.length) out[thread] = ids;
    }
    return out;
  } catch {
    return {};
  }
}
function writeLocal(threadId: string, userId: string, on: boolean) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as Record<string, Record<string, number>>;
    const who = all[threadId] ?? {};
    if (on) who[userId] = Date.now() + LOCAL_TTL_MS;
    else delete who[userId];
    all[threadId] = who;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch { /* private mode: no indicator offline */ }
}

async function sendTyping(userId: string, threadId: string, on: boolean) {
  if (await detectApi()) {
    await request(`/threads/${threadId}/typing`, { method: 'POST', body: { typing: on }, userId }).catch(() => undefined);
  } else writeLocal(threadId, userId, on);
}

/** Who is typing in each conversation (other people only); keeps the store's threads fresh. */
export function useLiveChat(userId: string, onThreads: (threads: MessageThread[]) => void) {
  const [typing, setTyping] = useState<TypingMap>({});
  const sync = useRef(onThreads);
  sync.current = onThreads;
  useEffect(() => {
    let alive = true;
    let busy = false;
    const poll = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        if (await detectApi()) {
          const r = await request<{ threads: MessageThread[]; typing: TypingMap }>('/threads/live', { userId, timeoutMs: 4000 });
          if (!alive) return;
          sync.current(r.threads);
          setTyping(r.typing);
        } else if (alive) setTyping(readLocal(userId));
      } catch { /* try again next tick */ } finally { busy = false; }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void poll(); };
    const onStorage = (e: StorageEvent) => { if (e.key === LOCAL_KEY) setTyping(readLocal(userId)); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('storage', onStorage);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('storage', onStorage); };
  }, [userId]);
  return typing;
}

/**
 * Call on every change of the reply box. Sends "typing" at most every 3 s while there is text,
 * and "stopped" when the box is cleared, the thread changes or the page closes.
 */
export function useTypingSignal(userId: string, threadId: string | null, draft: string) {
  const last = useRef(0);
  const on = useRef<string | null>(null);
  useEffect(() => {
    if (!threadId || threadId === 'new') return;
    if (draft.trim()) {
      if (Date.now() - last.current > SEND_EVERY_MS || on.current !== threadId) {
        last.current = Date.now();
        on.current = threadId;
        void sendTyping(userId, threadId, true);
      }
    } else if (on.current === threadId) {
      on.current = null;
      last.current = 0;
      void sendTyping(userId, threadId, false);
    }
  }, [userId, threadId, draft]);
  // switching conversation or leaving the page: stop
  useEffect(() => () => {
    if (on.current && threadId) { void sendTyping(userId, on.current, false); on.current = null; last.current = 0; }
  }, [userId, threadId]);
}
