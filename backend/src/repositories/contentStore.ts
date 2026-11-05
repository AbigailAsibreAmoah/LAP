import { DEMO_TODAY, SEED_ANCHOR, daysBetween, seedContent, shiftDatesInPlace, type ContentState } from '@laporte/shared';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '../config/env';

/**
 * Content library persistence. Unlike the rest of the demo store, content survives restarts:
 * it is written to a JSON file after every change (atomic write via a temp file).
 * Swap this module for a database repository in production; services do not change.
 */
const file = env.contentStore === 'memory' ? null : resolve(process.cwd(), env.contentStore);

function load(): ContentState {
  if (!file) return seedContent();
  try {
    const { seededFor, ...saved } = JSON.parse(readFileSync(file, 'utf8')) as Partial<ContentState> & { seededFor?: string };
    // Saved data follows the calendar too: move it forward by the days since it was last saved.
    shiftDatesInPlace(saved, daysBetween(seededFor ?? SEED_ANCHOR, DEMO_TODAY));
    // Fill collections added after the file was written.
    return { ...seedContent(), ...saved };
  } catch {
    return seedContent();
  }
}

let state = load();

export const contentStore = {
  get: () => state,
  set(next: ContentState) {
    state = next;
    if (!file) return;
    mkdirSync(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify({ ...state, seededFor: DEMO_TODAY }));
    renameSync(tmp, file);
  },
  reset() {
    contentStore.set(seedContent());
  },
  persistence: file ? `file (${env.contentStore})` : 'memory',
};
