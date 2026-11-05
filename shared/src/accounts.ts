// Learner accounts. Sign-up creates a learner who starts at A1 with no credits; they then choose
// to take the entry assessment or start at A1. The demo seed keeps Ama Owusu as a ready-made account.
import { COURSE_AREAS, DEMO_LEARNER_ID } from './demo-data';
import type { CourseAreaId, Learner, PortraitSpec } from './types';

export interface SignUpInput {
  name: string;
  email: string;
  areaId: CourseAreaId;
}

export const normEmail = (email: string) => email.trim().toLowerCase();
export const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

const SKINS = ['#4E2F1F', '#6B3F26', '#8A5634', '#B47A4E', '#E3BC98'];
const HAIR: PortraitSpec['hair'][] = ['short', 'curls', 'puff', 'bob', 'waves', 'headwrap', 'locs'];
const OUTFITS = ['#6E1630', '#141B34', '#1F6B4F', '#2E6FB0', '#C49A5A'];
const BGS = ['#F3E1E5', '#E3EEF8', '#E2F0E7', '#FFF3D6', '#F8E3D6'];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** A friendly default avatar, stable for a given email. */
export function defaultPortrait(seed: string): PortraitSpec {
  const h = hash(seed);
  return { skin: SKINS[h % SKINS.length], hair: HAIR[(h >> 3) % HAIR.length], hairColor: '#1A120D', outfit: OUTFITS[(h >> 5) % OUTFITS.length], accent: '#F1E6D2', bg: BGS[(h >> 7) % BGS.length] };
}

export function newLearner(input: SignUpInput, id: string, today: string): Learner {
  const name = input.name.trim().replace(/\s+/g, ' ');
  const area = COURSE_AREAS.find((a) => a.id === input.areaId) ?? COURSE_AREAS[0];
  return {
    id,
    name,
    firstName: name.split(' ')[0],
    email: normEmail(input.email),
    city: '',
    level: 'A1',
    progressToNext: 0,
    goal: { en: `Learn ${area.name.en}`, fr: `Apprendre : ${area.name.fr}` },
    areaId: area.id,
    portrait: defaultPortrait(normEmail(input.email)),
    joined: today,
    lastActive: today,
    planId: 'plan-essentials',
    credits: 0,
    streakDays: 0,
    lessonsCompleted: 0,
    lessonsTotal: 0,
  };
}

/** Seed records without an owner belong to the demo learner, Ama. */
export const ownedBy = (record: { learnerId?: string }, learnerId: string) => (record.learnerId ?? DEMO_LEARNER_ID) === learnerId;
