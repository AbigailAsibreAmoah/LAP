import type { AppNotification, Message, MessageThread, VocabEntry } from '@laporte/shared';
import { store } from './demoStore';

export const notificationRepository = {
  all: () => store.notifications,
  insert(n: AppNotification) {
    store.notifications.unshift(n);
    return n;
  },
  markRead(id: string) {
    const n = store.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    return n;
  },
};

export const messageRepository = {
  threadsFor: (userId: string) => store.threads.filter((t) => t.participantIds.includes(userId)),
  thread: (id: string) => store.threads.find((t) => t.id === id),
  between: (a: string, b: string) => store.threads.find((t) => t.participantIds.length === 2 && t.participantIds.includes(a) && t.participantIds.includes(b)),
  create(thread: MessageThread) {
    store.threads.unshift(thread);
    return thread;
  },
  append(threadId: string, message: Message) {
    const thread = store.threads.find((t) => t.id === threadId);
    thread?.messages.push(message);
    return thread;
  },
};

export const vocabularyRepository = {
  all: () => store.vocabulary,
  byFrench: (fr: string) => store.vocabulary.find((v) => v.fr.toLowerCase() === fr.toLowerCase()),
  insert(entry: VocabEntry) {
    store.vocabulary.unshift(entry);
    return entry;
  },
  toggleMastered(id: string) {
    const v = store.vocabulary.find((x) => x.id === id);
    if (v) v.mastered = !v.mastered;
    return v;
  },
};
