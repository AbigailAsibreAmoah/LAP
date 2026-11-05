import type { Learner } from '@laporte/shared';
import { store } from './demoStore';

export const learnerRepository = {
  all: () => store.learners,
  byId: (id: string) => store.learners.find((l) => l.id === id),
  byEmail: (email: string) => store.learners.find((l) => l.email?.toLowerCase() === email.trim().toLowerCase()),
  insert(learner: Learner) {
    store.learners.push(learner);
    return learner;
  },
  adjustCredits(id: string, delta: number) {
    const learner = store.learners.find((l) => l.id === id);
    if (learner) learner.credits = Math.max(0, learner.credits + delta);
    return learner;
  },
  setPlan(id: string, planId: string) {
    const learner = store.learners.find((l) => l.id === id);
    if (learner) learner.planId = planId;
    return learner;
  },
};
