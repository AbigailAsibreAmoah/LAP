import { store } from './demoStore';

export const learnerRepository = {
  all: () => store.learners,
  byId: (id: string) => store.learners.find((l) => l.id === id),
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
