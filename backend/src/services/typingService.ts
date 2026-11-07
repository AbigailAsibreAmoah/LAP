import { onDemoReset } from '../repositories/demoStore';
import { messageRepository } from '../repositories/engagementRepository';
import { notFound } from '../utils/errors';

/**
 * "…is typing" for conversations. Ephemeral by design: a signal lasts TYPING_TTL_MS unless the
 * typist sends another one, and it is cleared the moment their message is posted. Kept in memory
 * (not in the demo store, so it never gets saved or shifted by the day rollover). In production
 * this would sit in Redis or travel over a WebSocket; the API shape stays the same.
 */
export const TYPING_TTL_MS = 6_000;
const typing = new Map<string, Map<string, number>>(); // threadId → userId → expires at (ms)

export const typingService = {
  set(threadId: string, userId: string, on: boolean) {
    const thread = messageRepository.thread(threadId);
    if (!thread || !thread.participantIds.includes(userId)) throw notFound('Thread');
    const who = typing.get(threadId) ?? new Map<string, number>();
    if (on) who.set(userId, Date.now() + TYPING_TTL_MS);
    else who.delete(userId);
    typing.set(threadId, who);
    return { ok: true };
  },
  clear(threadId: string, userId: string) {
    typing.get(threadId)?.delete(userId);
  },
  /** Who else is typing, in each of this user's conversations. */
  forUser(userId: string): Record<string, string[]> {
    const now = Date.now();
    const out: Record<string, string[]> = {};
    for (const t of messageRepository.threadsFor(userId)) {
      const who = typing.get(t.id);
      if (!who) continue;
      const ids = [...who].filter(([id, until]) => id !== userId && until > now).map(([id]) => id);
      if (ids.length) out[t.id] = ids;
    }
    return out;
  },
  reset() {
    typing.clear();
  },
};

onDemoReset(() => typingService.reset());
