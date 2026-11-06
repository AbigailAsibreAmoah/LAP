import type { MessageThread } from '@laporte/shared';
import { useCallback, useEffect, useState } from 'react';
import { readLocal, writeLocal } from '../../utils/storage';

// Remembers, per device, when each conversation was last opened. A conversation is unread when its
// newest message came from someone else after that moment. (A live portal would store this server-side.)
const KEY = 'laporte-messages-seen';
const EVENT = 'laporte-messages-seen';

/** Each person on the device has their own "read" memory (switching demo roles must not mark others' messages read). */
function readSeen(userId: string): Record<string, string> {
  try {
    return JSON.parse(readLocal(`${KEY}:${userId}`) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function isUnread(thread: MessageThread, userId: string, seen: Record<string, string>) {
  const last = thread.messages[thread.messages.length - 1];
  return !!last && last.from !== userId && last.at > (seen[thread.id] ?? '');
}

export function useUnread(threads: MessageThread[], userId: string) {
  const [seen, setSeen] = useState(() => readSeen(userId));
  useEffect(() => setSeen(readSeen(userId)), [userId]);
  useEffect(() => {
    const sync = () => setSeen(readSeen(userId));
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [userId]);

  const markSeen = useCallback((thread: MessageThread | undefined) => {
    const last = thread?.messages[thread.messages.length - 1];
    if (!thread || !last) return;
    const current = readSeen(userId);
    if ((current[thread.id] ?? '') >= last.at) return;
    writeLocal(`${KEY}:${userId}`, JSON.stringify({ ...current, [thread.id]: last.at }));
    window.dispatchEvent(new Event(EVENT));
  }, [userId]);

  const mine = threads.filter((t) => t.participantIds.includes(userId));
  return {
    count: mine.filter((t) => isUnread(t, userId, seen)).length,
    unread: (t: MessageThread) => isUnread(t, userId, seen),
    markSeen,
  };
}
