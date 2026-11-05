import { ContentError, kidOps, liveOps, visibleContent, type ContentState, type ContentUser, type KidActivity, type KidProfile, type KidSettings, type LiveGame } from '@laporte/shared';
import { contentStore } from '../repositories/contentStore';
import { nextId } from '../utils/ids';

const ctx = (user: ContentUser) => ({ user, now: new Date().toISOString(), newId: nextId });

function apply<R extends { state: ContentState }>(user: ContentUser, run: (state: ContentState) => R) {
  const result = run(contentStore.get());
  contentStore.set(result.state);
  return { ...result, state: visibleContent(result.state, user) };
}

/** Child profiles, settings, progress and linked outside games (persisted with the content store). */
export const kidsService = {
  create: (user: ContentUser, input: Pick<KidProfile, 'name' | 'age' | 'level' | 'avatar' | 'pin'>) => apply(user, (s) => kidOps.createKid(s, ctx(user), input)),
  update: (user: ContentUser, id: string, patch: Partial<Pick<KidProfile, 'name' | 'age' | 'level' | 'avatar' | 'pin'>> & { settings?: Partial<KidSettings> }) => apply(user, (s) => kidOps.updateKid(s, ctx(user), id, patch)),
  remove: (user: ContentUser, id: string) => apply(user, (s) => kidOps.removeKid(s, ctx(user), id)),
  record: (user: ContentUser, input: Pick<KidActivity, 'kidId' | 'unitId' | 'game' | 'score' | 'total'>) => apply(user, (s) => kidOps.recordKidActivity(s, ctx(user), input)),
  logTime: (user: ContentUser, id: string, minutes: number) => apply(user, (s) => kidOps.logKidTime(s, ctx(user), id, minutes)),
  addExternal: (user: ContentUser, input: { unitId: string; url: string; title: string }) => apply(user, (s) => kidOps.addExternalGame(s, ctx(user), input)),
  removeExternal: (user: ContentUser, id: string) => apply(user, (s) => kidOps.removeExternalGame(s, ctx(user), id)),
};

/*
 * Live class games are short-lived, so they stay in memory (a production build would use Redis or
 * websockets). Players poll the game view about once a second.
 */
const games = new Map<string, LiveGame>();
const GAME_TTL_MS = 3 * 60 * 60 * 1000;

function newCode() {
  for (;;) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (!games.has(code)) return code;
  }
}

function find(code: string) {
  const game = games.get(code);
  if (!game || Date.now() - Date.parse(game.createdAt) > GAME_TTL_MS) throw new ContentError(404, 'not_found', 'No game with this code. Check the code with your tutor.');
  return liveOps.tick(game, new Date().toISOString());
}

export const liveGameService = {
  create(user: ContentUser, unitId: string) {
    if (user.role === 'learner') throw new ContentError(403, 'forbidden', 'Only tutors host live games.');
    for (const [code, g] of games) if (Date.now() - Date.parse(g.createdAt) > GAME_TTL_MS) games.delete(code);
    const game = liveOps.create(user.id, unitId, new Date().toISOString(), newCode());
    games.set(game.code, game);
    return liveOps.viewFor(game, { hostId: user.id });
  },

  /** A child joins from child mode, under the parent's account, only if the parent allows live games. */
  join(user: ContentUser, code: string, kidId: string) {
    const kid = contentStore.get().kids.find((k) => k.id === kidId);
    if (!kid || kid.parentId !== user.id) throw new ContentError(403, 'forbidden', 'Join from your child’s profile.');
    if (!kid.settings.liveGames) throw new ContentError(403, 'live_off', 'Live games are switched off by a parent.');
    const game = find(code);
    const player = liveOps.join(game, { kidId, nickname: game.players.some((p) => p.nickname === kid.nickname) ? undefined : kid.nickname }, () => nextId('pl'));
    return liveOps.viewFor(game, { playerId: player.id });
  },

  view(user: ContentUser, code: string, playerId?: string) {
    const game = find(code);
    return liveOps.viewFor(game, { hostId: user.id, playerId });
  },

  advance(user: ContentUser, code: string) {
    const game = find(code);
    liveOps.advance(game, user.id, new Date().toISOString());
    return liveOps.viewFor(game, { hostId: user.id });
  },

  answer(user: ContentUser, code: string, playerId: string, index: number, choice: number) {
    const game = find(code);
    const player = game.players.find((p) => p.id === playerId);
    const kid = player?.kidId ? contentStore.get().kids.find((k) => k.id === player.kidId) : undefined;
    if (!kid || kid.parentId !== user.id) throw new ContentError(403, 'forbidden', 'Not your player.');
    liveOps.answer(game, playerId, index, choice, new Date().toISOString());
    return liveOps.viewFor(game, { playerId });
  },

  reset: () => games.clear(),
};
