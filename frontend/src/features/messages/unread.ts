import type { MessageThread } from '@laporte/shared';
import { useCallback, useEffect, useState } from 'react';
import { readLocal, writeLocal } from '../../utils/storage';

// Remembers, per device, when each conversation was last opened. A conversation is unread when its
// newest message came from someone else after that moment. (A live portal would store this server-side.)
const KEY = 'laporte-messages-seen';
const EVENT = 'laporte-messages-seen';

function readSeen(): Record<string, string> {
  try {
    return JSON.parse(readLocal(KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function isUnread(thread: MessageThread, userId: string, seen: Record<string, string>) {
  const last = thread.messages[thread.messages.length - 1];
  return !!last && last.from !== userId && last.at > (seen[thread.id] ?? '');
}

export function useUnread(threads: MessageThread[], userId: string) {
  const [seen, setSeen] = useState(readSeen);
  useEffect(() => {
    const sync = () => setSeen(readSeen());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const markSeen = useCallback((thread: MessageThread | undefined) => {
    const last = thread?.messages[thread.messages.length - 1];
    if (!thread || !last) return;
    const current = readSeen();
    if ((current[thread.id] ?? '') >= last.at) return;
    writeLocal(KEY, JSON.stringify({ ...current, [thread.id]: last.at }));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const mine = threads.filter((t) => t.participantIds.includes(userId));
  return {
    count: mine.filter((t) => isUnread(t, userId, seen)).length,
    unread: (t: MessageThread) => isUnread(t, userId, seen),
    markSeen,
  };
}
