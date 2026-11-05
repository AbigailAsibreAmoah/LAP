import {
  COURSE_AREAS,
  COURSES,
  LESSON_CONTENT,
  MEMBERSHIP_PLANS,
  MILESTONES,
  PATHWAYS,
  SPEAKING_SCENARIOS,
  TUTORS,
} from '@laporte/shared';

/** Read-only catalogue content. A CMS or database would sit behind this. */
export const catalogRepository = {
  areas: () => COURSE_AREAS,
  courses: () => COURSES,
  course: (id: string) => COURSES.find((c) => c.id === id),
  lesson: (id: string) => LESSON_CONTENT.find((l) => l.id === id),
  pathways: () => PATHWAYS,
  tutors: () => TUTORS,
  tutor: (id: string) => TUTORS.find((t) => t.id === id),
  plans: () => MEMBERSHIP_PLANS,
  plan: (id: string) => MEMBERSHIP_PLANS.find((p) => p.id === id),
  milestones: () => MILESTONES,
  scenarios: () => SPEAKING_SCENARIOS,
  scenario: (id: string) => SPEAKING_SCENARIOS.find((s) => s.id === id),
};
