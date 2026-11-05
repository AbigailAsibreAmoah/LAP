import type { Express } from 'express';
import request from 'supertest';
import { PLACEMENT_BANK } from '../src/data/placementBank';
import type { PlacementQuestion } from '@laporte/shared';

/**
 * Takes the placement test like a learner: starts an attempt (shuffled options, no answers) and
 * answers by shown position. `pick` chooses the ORIGINAL option index for each question.
 */
export async function takePlacement(app: Express, pick: (q: PlacementQuestion) => number, extra: Record<string, unknown> = {}, user = 'lrn-ama') {
  const attempt = await request(app).post('/api/me/placement/attempt').set('x-demo-user', user);
  const answers: Record<string, number> = {};
  for (const item of attempt.body.questions as { id: string; options: string[] }[]) {
    const q = PLACEMENT_BANK.find((x) => x.id === item.id)!;
    answers[item.id] = item.options.indexOf(q.options[pick(q)]);
  }
  return request(app)
    .post('/api/me/placement')
    .set('x-demo-user', user)
    .send({ attemptId: attempt.body.attemptId, answers, writingSample: 'Je travaille à Accra dans une banque et je voudrais parler français avec nos partenaires de Lomé et de Dakar.', goals: ['meetings', 'negotiations'], hoursPerWeek: 4, preferredTimes: ['evening'], ...extra });
}

export const right = (q: PlacementQuestion) => q.answer;
export const wrong = (q: PlacementQuestion) => (q.answer + 1) % q.options.length;
