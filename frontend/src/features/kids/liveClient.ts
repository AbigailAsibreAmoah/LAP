import { ContentError, DEMO_GAME_CODE, liveOps, type ContentUser, type LiveGame, type LiveGameView } from '@laporte/shared';
import { ApiError, detectApi, request } from '../../services/http';

/*
 * Live class games. With the API, tutors host real games and children join from another device.
 * Offline (and for "practice" rounds) the same rules run in the browser with simulated classmates,
 * so the game always works in the demo.
 */

const local = new Map<string, LiveGame & { practice?: boolean; revealAt?: number }>();
let seq = 0;
const id = (p: string) => `${p}-${Date.now().toString(36)}${(++seq).toString(36)}`;
const BOTS = 3;
const now = () => new Date().toISOString();

const wrap = <T,>(fn: () => T): T => {
  try {
    return fn();
  } catch (e) {
    if (e instanceof ContentError) throw new ApiError(e.status, e.code, e.message);
    throw e;
  }
};

/** Simulated classmates answer after a few seconds, mostly correctly. */
function runBots(game: LiveGame & { practice?: boolean; revealAt?: number }) {
  if (game.phase === 'question' && game.questionStartedAt) {
    const elapsed = Date.now() - Date.parse(game.questionStartedAt);
    game.players.filter((p) => p.bot && !p.answers[game.index]).forEach((bot, i) => {
      const delay = 2500 + ((game.index * 7 + i * 13) % 9) * 900;
      if (elapsed < delay) return;
      const q = game.questions[game.index];
      const right = (game.index + i * 3) % 4 !== 0;
      const choice = right ? q.answer : (q.answer + 1) % q.options.length;
      try {
        liveOps.answer(game, bot.id, game.index, choice, new Date(Date.parse(game.questionStartedAt!) + delay).toISOString());
      } catch {
        /* question closed */
      }
    });
  }
  liveOps.tick(game, now());
  // Practice rounds run themselves: a short pause on each answer, then the next question.
  if (game.practice) {
    if (game.phase === 'reveal') {
      game.revealAt ??= Date.now();
      if (Date.now() - game.revealAt > 4000) {
        game.revealAt = undefined;
        liveOps.advance(game, game.hostId, now());
      }
    }
  }
}

function localGame(code: string) {
  const g = local.get(code);
  if (!g) throw new ApiError(404, 'not_found', 'No game with this code. Check the code with your tutor.');
  runBots(g);
  return g;
}

function newLocal(hostId: string, unitId: string, practice = false, code = String(100000 + Math.floor(Math.random() * 900000))) {
  const game = Object.assign(liveOps.create(hostId, unitId, now(), code), { practice });
  for (let i = 0; i < BOTS; i++) liveOps.join(game, { bot: true }, () => id('bot'));
  local.set(code, game);
  return game;
}

export const isLocalGame = (code: string) => local.has(code);

export const liveClient = {
  async create(user: ContentUser, unitId: string): Promise<LiveGameView> {
    if (await detectApi()) return request<LiveGameView>('/games', { method: 'POST', body: { unitId }, userId: user.id });
    return wrap(() => liveOps.viewFor(newLocal(user.id, unitId, false, DEMO_GAME_CODE), { hostId: user.id }));
  },

  /** A practice round for a child: always local, with simulated classmates, runs on its own. */
  practice(user: ContentUser, unitId: string, kidId: string, nickname: string, code?: string) {
    return wrap(() => {
      const game = newLocal(`practice-${user.id}`, unitId, true, code);
      const me = liveOps.join(game, { kidId, nickname }, () => id('pl'));
      liveOps.advance(game, game.hostId, now());
      return { view: liveOps.viewFor(game, { playerId: me.id }), playerId: me.id };
    });
  },

  async join(user: ContentUser, code: string, kidId: string, nickname: string) {
    // Each new try of the demo code starts a fresh round (a tutor-hosted demo game is kept while it runs).
    const previous = code === DEMO_GAME_CODE ? local.get(code) : undefined;
    if (previous && (previous.practice || previous.phase === 'podium')) local.delete(code);
    if (!local.has(code) && (await detectApi())) {
      try {
        const view = await request<LiveGameView>(`/games/${code}/join`, { method: 'POST', body: { kidId }, userId: user.id });
        return { view, playerId: view.me!.id };
      } catch (e) {
        // No tutor is hosting the demo code: start a self-running demo game instead.
        if (!(code === DEMO_GAME_CODE && e instanceof ApiError && (e.status === 404 || e.status === 409))) throw e;
      }
    }
    if (code === DEMO_GAME_CODE && !local.has(code)) return liveClient.practice(user, 'ku-couleurs', kidId, nickname, DEMO_GAME_CODE);
    return wrap(() => {
      const game = localGame(code);
      const me = liveOps.join(game, { kidId, nickname }, () => id('pl'));
      return { view: liveOps.viewFor(game, { playerId: me.id }), playerId: me.id };
    });
  },

  async view(user: ContentUser, code: string, playerId?: string): Promise<LiveGameView> {
    if (local.has(code)) return wrap(() => liveOps.viewFor(localGame(code), { hostId: user.id, playerId }));
    return request<LiveGameView>(`/games/${code}${playerId ? `?player=${encodeURIComponent(playerId)}` : ''}`, { userId: user.id });
  },

  async advance(user: ContentUser, code: string): Promise<LiveGameView> {
    if (local.has(code)) return wrap(() => liveOps.viewFor(liveOps.advance(localGame(code), user.id, now()), { hostId: user.id }));
    return request<LiveGameView>(`/games/${code}/advance`, { method: 'POST', userId: user.id });
  },

  async answer(user: ContentUser, code: string, playerId: string, index: number, choice: number): Promise<LiveGameView> {
    if (local.has(code)) {
      return wrap(() => {
        const game = localGame(code);
        liveOps.answer(game, playerId, index, choice, now());
        return liveOps.viewFor(game, { playerId });
      });
    }
    return request<LiveGameView>(`/games/${code}/answer`, { method: 'POST', body: { playerId, index, choice }, userId: user.id });
  },
};
