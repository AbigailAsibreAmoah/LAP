// La Porte Kids: parent-managed child profiles, learning worlds, mini-games and live class quizzes.
// Pure rules shared by the API and the offline demo, like the rest of the content model.
import { SEED_SHIFT_DAYS, shiftDatesInPlace, shiftIso } from './clock';
import { ContentError, type ContentState, type ContentUser } from './content';
import { MORE_KID_UNITS } from './kidStories';
import type { CefrLevel, Localized } from './types';

const L = (en: string, fr: string): Localized => ({ en, fr });
type Ctx = { user: ContentUser; now: string; newId: (prefix: string) => string };
const fail = (status: number, code: string, message: string): never => {
  throw new ContentError(status, code, message);
};

/* ---------------- Profiles and parent settings ---------------- */

export const KID_GAMES = ['quiz', 'memory', 'builder', 'listen', 'speak'] as const;
export type KidGame = (typeof KID_GAMES)[number];

export const KID_GAME_INFO: Record<KidGame, { name: Localized; blurb: Localized; icon: string }> = {
  quiz: { name: L('Le Grand Quiz', 'Le Grand Quiz'), blurb: L('Beat the clock: fast answers score more.', 'Bats le chrono : plus tu réponds vite, plus tu marques.'), icon: '⚡' },
  memory: { name: L('Memory', 'Mémoire'), blurb: L('Find the pairs: picture and French word.', 'Trouve les paires : image et mot français.'), icon: '🃏' },
  builder: { name: L('Word builder', 'Mots en morceaux'), blurb: L('Put the letters in the right order.', 'Remets les lettres dans l’ordre.'), icon: '🧩' },
  listen: { name: L('Listen & pick', 'Écoute et choisis'), blurb: L('Hear the word, tap the right picture.', 'Écoute le mot, touche la bonne image.'), icon: '🎧' },
  speak: { name: L('Say it!', 'Dis-le !'), blurb: L('Say the word out loud: the microphone listens.', 'Dis le mot à voix haute : le micro écoute.'), icon: '🎤' },
};

export const DAILY_LIMITS = [15, 30, 45, 60] as const;

export interface KidSettings {
  dailyMinutes: (typeof DAILY_LIMITS)[number];
  games: Record<KidGame, boolean>;
  /** Live class games hosted by a La Porte tutor (join code, nickname only). */
  liveGames: boolean;
  /** Linked games on outside platforms (Kahoot!, Quizlet, Wordwall, Blooket). Off until a parent allows it. */
  externalGames: boolean;
}

export interface KidProfile {
  id: string;
  parentId: string;
  name: string;
  age: number;
  level: CefrLevel;
  avatar: number;
  /** Demo only: a real portal stores a hash and checks it on the server. */
  pin: string;
  /** Safe display name for live games: never the child's real name. */
  nickname: string;
  settings: KidSettings;
  /** Minutes played per day (YYYY-MM-DD). */
  usage: Record<string, number>;
  /** The child's private library: books saved to read again (only this family sees it). */
  library?: string[];
  /** A parent's choice of book for a given week (otherwise the next book in turn). */
  /** A parent's choice of this week's books (up to four). */
  bookPick?: { week: string; bookIds: string[] };
  createdAt: string;
}

export interface KidActivity {
  id: string;
  kidId: string;
  unitId: string;
  game: KidGame | 'live' | 'story';
  score: number;
  total: number;
  stars: 0 | 1 | 2 | 3;
  at: string;
}

export const defaultKidSettings = (): KidSettings => ({ dailyMinutes: 30, games: { quiz: true, memory: true, builder: true, listen: true, speak: true }, liveGames: true, externalGames: false });

/* ---------------- Safe nicknames ---------------- */

const ANIMALS = ['Lion', 'Panda', 'Koala', 'Dauphin', 'Hibou', 'Renard', 'Tigre', 'Zèbre', 'Pingouin', 'Éléphant', 'Girafe', 'Lapin'];
const ADJECTIVES = ['Doré', 'Bleu', 'Rapide', 'Malin', 'Joyeux', 'Brillant', 'Courageux', 'Curieux', 'Rigolo', 'Vert'];
/** "Panda Malin": French practice and no personal information. */
export function safeNickname(seed: number, taken: string[] = []): string {
  for (let i = 0; i < ANIMALS.length * ADJECTIVES.length; i++) {
    const n = (seed + i * 7) % (ANIMALS.length * ADJECTIVES.length);
    const name = `${ANIMALS[n % ANIMALS.length]} ${ADJECTIVES[Math.floor(n / ANIMALS.length)]}`;
    if (!taken.includes(name)) return name;
  }
  return `Joueur ${taken.length + 1}`;
}
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/* ---------------- Learning worlds ---------------- */

export interface KidWord {
  fr: string; // with article where natural ("le chat")
  word: string; // single word for spelling ("chat")
  en: string;
  emoji: string;
}

export interface KidUnit {
  id: string;
  title: Localized;
  emoji: string;
  colour: string;
  words: KidWord[];
}

const w = (fr: string, word: string, en: string, emoji: string): KidWord => ({ fr, word, en, emoji });

export const KID_UNITS: KidUnit[] = [
  { id: 'ku-bonjour', title: L('Hello!', 'Bonjour !'), emoji: '👋', colour: '#F8E3D6', words: [w('bonjour', 'bonjour', 'hello', '👋'), w('au revoir', 'revoir', 'goodbye', '🌙'), w('merci', 'merci', 'thank you', '🙏'), w('oui', 'oui', 'yes', '👍'), w('non', 'non', 'no', '👎'), w('s’il te plaît', 'plait', 'please', '✨'), w('bonne nuit', 'nuit', 'good night', '😴'), w('pardon', 'pardon', 'sorry', '🙇')] },
  { id: 'ku-couleurs', title: L('Colours', 'Les couleurs'), emoji: '🎨', colour: '#E3EEF8', words: [w('rouge', 'rouge', 'red', '🍎'), w('bleu', 'bleu', 'blue', '🌊'), w('vert', 'vert', 'green', '🌳'), w('jaune', 'jaune', 'yellow', '☀️'), w('orange', 'orange', 'orange', '🍊'), w('rose', 'rose', 'pink', '🌸'), w('violet', 'violet', 'purple', '🍇'), w('blanc', 'blanc', 'white', '☁️')] },
  { id: 'ku-nombres', title: L('Numbers', 'Les nombres'), emoji: '🔢', colour: '#FFF3D6', words: [w('un', 'un', 'one', '1️⃣'), w('deux', 'deux', 'two', '2️⃣'), w('trois', 'trois', 'three', '3️⃣'), w('quatre', 'quatre', 'four', '4️⃣'), w('cinq', 'cinq', 'five', '5️⃣'), w('six', 'six', 'six', '6️⃣'), w('sept', 'sept', 'seven', '7️⃣'), w('huit', 'huit', 'eight', '8️⃣')] },
  { id: 'ku-animaux', title: L('Animals', 'Les animaux'), emoji: '🦁', colour: '#E2F0E7', words: [w('le chat', 'chat', 'the cat', '🐱'), w('le chien', 'chien', 'the dog', '🐶'), w('le lion', 'lion', 'the lion', '🦁'), w('l’oiseau', 'oiseau', 'the bird', '🐦'), w('le poisson', 'poisson', 'the fish', '🐟'), w('l’éléphant', 'elephant', 'the elephant', '🐘'), w('le singe', 'singe', 'the monkey', '🐒'), w('la tortue', 'tortue', 'the tortoise', '🐢')] },
  { id: 'ku-famille', title: L('Family', 'La famille'), emoji: '👨‍👩‍👧', colour: '#F3E1E5', words: [w('la mère', 'mere', 'the mother', '👩'), w('le père', 'pere', 'the father', '👨'), w('la sœur', 'soeur', 'the sister', '👧'), w('le frère', 'frere', 'the brother', '👦'), w('le bébé', 'bebe', 'the baby', '👶'), w('la grand-mère', 'mamie', 'the grandmother', '👵'), w('le grand-père', 'papi', 'the grandfather', '👴'), w('la famille', 'famille', 'the family', '👨‍👩‍👧')] },
  { id: 'ku-nourriture', title: L('Food', 'La nourriture'), emoji: '🍌', colour: '#FDEBD0', words: [w('la banane', 'banane', 'the banana', '🍌'), w('le pain', 'pain', 'the bread', '🍞'), w('le lait', 'lait', 'the milk', '🥛'), w('le riz', 'riz', 'the rice', '🍚'), w('l’eau', 'eau', 'the water', '💧'), w('le gâteau', 'gateau', 'the cake', '🍰'), w('la mangue', 'mangue', 'the mango', '🥭'), w('le poulet', 'poulet', 'the chicken', '🍗')] },
];
KID_UNITS.push(...MORE_KID_UNITS);

/** Deterministic shuffle so a game is the same on the server and in the browser for a given seed. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface KidQuestion {
  id: string;
  prompt: string; // French, short
  /** Shown big above the options. */
  emoji?: string;
  /** Spoken aloud (listen game, or on request). */
  say?: string;
  options: { label: string; emoji?: string }[];
  answer: number;
  explain: Localized;
}

/** Quiz questions for a unit: half "what is this picture?", half "which picture is this word?". */
export function quizFor(unit: KidUnit, seed = 1, count = 6): KidQuestion[] {
  const words = seededShuffle(unit.words, seed).slice(0, count);
  return words.map((target, i) => {
    const others = seededShuffle(unit.words.filter((x) => x !== target), seed + i).slice(0, 3);
    const opts = seededShuffle([target, ...others], seed * 3 + i);
    const pictureFirst = i % 2 === 0;
    return {
      id: `${unit.id}-q${i}`,
      prompt: pictureFirst ? 'Comment dit-on en français ?' : `Où est « ${target.fr} » ?`,
      emoji: pictureFirst ? target.emoji : undefined,
      say: target.fr,
      options: opts.map((o) => (pictureFirst ? { label: o.fr } : { label: o.en, emoji: o.emoji })),
      answer: opts.indexOf(target),
      explain: L(`“${target.fr}” means ${target.en}.`, `« ${target.fr} » : ${target.emoji}`),
    };
  });
}

/** Listen & pick: the word is spoken, the child taps the picture. */
export function listenFor(unit: KidUnit, seed = 1): KidQuestion[] {
  return seededShuffle(unit.words, seed + 11).map((target, i) => {
    const opts = seededShuffle([target, ...seededShuffle(unit.words.filter((x) => x !== target), seed + i).slice(0, 2)], seed + i * 5);
    return { id: `${unit.id}-l${i}`, prompt: 'Écoute et choisis', say: target.fr, options: opts.map((o) => ({ label: o.en, emoji: o.emoji })), answer: opts.indexOf(target), explain: L(`You heard “${target.fr}”.`, `Tu as entendu « ${target.fr} ».`) };
  });
}

/** Points for a live or solo quiz answer: faster correct answers score more (500–1000), plus a streak bonus. */
export function answerPoints(correct: boolean, elapsedMs: number, limitMs: number, streak: number) {
  if (!correct) return 0;
  const speed = Math.max(0, Math.min(1, elapsedMs / limitMs));
  return Math.round(1000 - 500 * speed) + Math.min(streak, 5) * 50;
}

export const starsFor = (score: number, total: number): 0 | 1 | 2 | 3 => {
  if (!total) return 0;
  const r = score / total;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
};

/* ---------------- Progress ---------------- */

/** Off for now: all worlds are open. */
export const KID_WORLDS_IN_ORDER = false;

export function kidProgress(state: Pick<ContentState, 'kidActivities'>, kidId: string) {
  const acts = state.kidActivities.filter((a) => a.kidId === kidId);
  const best = (unitId: string, game: KidGame) => Math.max(0, ...acts.filter((a) => a.unitId === unitId && a.game === game).map((a) => a.stars));
  const units = KID_UNITS.map((u, i) => {
    const games = Object.fromEntries(KID_GAMES.map((g) => [g, best(u.id, g)])) as Record<KidGame, number>;
    const stars = KID_GAMES.reduce((n, g) => n + games[g], 0);
    const done = KID_GAMES.filter((g) => games[g] > 0).length;
    return { unit: u, index: i, games, stars, done, badge: KID_GAMES.every((g) => games[g] >= 2) };
  });
  // For now every world is open. Set KID_WORLDS_IN_ORDER to true to open each world only after
  // two games in the one before (the first two always open).
  const withLock = units.map((u, i) => ({ ...u, unlocked: !KID_WORLDS_IN_ORDER || i < 2 || units[i - 1].done >= 2 }));
  const totalStars = acts.reduce((n, a) => n + a.stars, 0);
  return { units: withLock, totalStars, badges: withLock.filter((u) => u.badge).length, played: acts.length, recent: [...acts].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8) };
}

export const minutesToday = (kid: KidProfile, today: string) => kid.usage[today] ?? 0;

/** Games are on unless a parent switched them off (new games start on for existing profiles). */
export const gameOn = (kid: Pick<KidProfile, 'settings'>, game: KidGame) => kid.settings.games[game] !== false;

/* ---------------- Outside game platforms ---------------- */

export const EXTERNAL_PROVIDERS = {
  kahoot: { name: 'Kahoot!', hosts: ['kahoot.it', 'kahoot.com', 'create.kahoot.it'] },
  quizlet: { name: 'Quizlet', hosts: ['quizlet.com'] },
  wordwall: { name: 'Wordwall', hosts: ['wordwall.net'] },
  blooket: { name: 'Blooket', hosts: ['blooket.com', 'play.blooket.com', 'dashboard.blooket.com'] },
} as const;
export type ExternalProvider = keyof typeof EXTERNAL_PROVIDERS;

export interface ExternalGame {
  id: string;
  unitId: string;
  provider: ExternalProvider;
  url: string;
  title: string;
  addedBy: string;
  at: string;
}

/** Only https links on the approved platforms are accepted. */
export function providerFor(url: string): ExternalProvider | null {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    host = u.hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [id, p] of Object.entries(EXTERNAL_PROVIDERS)) if (p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return id as ExternalProvider;
  return null;
}

/* ---------------- Rules ---------------- */

const ownKid = (state: ContentState, ctx: Ctx, kidId: string) => {
  const kid = state.kids.find((k) => k.id === kidId) ?? fail(404, 'not_found', 'Child profile not found');
  if (kid.parentId !== ctx.user.id) fail(403, 'forbidden', 'Only the parent can manage this profile.');
  return kid;
};

export const kidOps = {
  createKid(state: ContentState, ctx: Ctx, input: Pick<KidProfile, 'name' | 'age' | 'level' | 'avatar' | 'pin'>) {
    if (ctx.user.role !== 'learner') fail(403, 'forbidden', 'Child profiles belong to a parent’s learner account.');
    if (input.name.trim().length < 2) fail(422, 'invalid_name', 'Enter the child’s first name.');
    if (input.age < 4 || input.age > 15) fail(422, 'invalid_age', 'Child profiles are for ages 4 to 15.');
    if (!/^\d{4}$/.test(input.pin)) fail(422, 'invalid_pin', 'Choose a 4-digit PIN.');
    if (state.kids.filter((k) => k.parentId === ctx.user.id).length >= 5) fail(409, 'too_many', 'A family account can have up to 5 child profiles.');
    const next = structuredClone(state);
    const kid: KidProfile = { ...input, name: input.name.trim(), id: ctx.newId('kid'), parentId: ctx.user.id, nickname: safeNickname(hash(input.name + ctx.now), next.kids.map((k) => k.nickname)), settings: defaultKidSettings(), usage: {}, createdAt: ctx.now };
    next.kids.push(kid);
    return { state: next, kid };
  },

  updateKid(state: ContentState, ctx: Ctx, kidId: string, patch: Partial<Pick<KidProfile, 'name' | 'age' | 'level' | 'avatar' | 'pin' | 'library' | 'bookPick'>> & { settings?: Partial<KidSettings> }) {
    if (patch.library && (patch.library.length > 60 || patch.library.some((b) => typeof b !== 'string' || b.length > 40))) fail(422, 'invalid_library', 'Invalid library');
    if (patch.bookPick && (!Array.isArray(patch.bookPick.bookIds) || patch.bookPick.bookIds.length > 4 || patch.bookPick.bookIds.some((b) => typeof b !== 'string' || b.length > 40))) fail(422, 'invalid_book_pick', 'Choose up to four books');
    const next = structuredClone(state);
    const kid = ownKid(next, ctx, kidId);
    if (patch.pin !== undefined && !/^\d{4}$/.test(patch.pin)) fail(422, 'invalid_pin', 'Choose a 4-digit PIN.');
    if (patch.settings?.dailyMinutes !== undefined && !DAILY_LIMITS.includes(patch.settings.dailyMinutes)) fail(422, 'invalid_limit', 'Pick a daily limit.');
    const { settings, ...rest } = patch;
    Object.assign(kid, rest);
    if (settings) kid.settings = { ...kid.settings, ...settings, games: { ...kid.settings.games, ...settings.games } };
    return { state: next, kid };
  },

  removeKid(state: ContentState, ctx: Ctx, kidId: string) {
    ownKid(state, ctx, kidId);
    const next = structuredClone(state);
    next.kids = next.kids.filter((k) => k.id !== kidId);
    next.kidActivities = next.kidActivities.filter((a) => a.kidId !== kidId);
    return { state: next };
  },

  /** Records a finished game (the score is checked against the game's size). */
  recordKidActivity(state: ContentState, ctx: Ctx, input: Pick<KidActivity, 'kidId' | 'unitId' | 'game' | 'score' | 'total'>) {
    const next = structuredClone(state);
    const kid = ownKid(next, ctx, input.kidId);
    if (!KID_UNITS.some((u) => u.id === input.unitId)) fail(404, 'not_found', 'Unknown world');
    if (input.game !== 'live' && input.game !== 'story' && !gameOn(kid, input.game)) fail(403, 'game_off', 'This game is switched off by a parent.');
    if (input.total < 1 || input.total > 20 || input.score < 0 || input.score > input.total) fail(422, 'invalid_score', 'Invalid score');
    const activity: KidActivity = { ...input, id: ctx.newId('ka'), stars: starsFor(input.score, input.total), at: ctx.now };
    next.kidActivities.push(activity);
    return { state: next, activity, kid };
  },

  /** Adds play time; the child screen sends a heartbeat every minute. */
  logKidTime(state: ContentState, ctx: Ctx, kidId: string, minutes: number) {
    const next = structuredClone(state);
    const kid = ownKid(next, ctx, kidId);
    const day = ctx.now.slice(0, 10);
    kid.usage[day] = Math.min(24 * 60, (kid.usage[day] ?? 0) + Math.max(0, Math.min(5, minutes)));
    return { state: next, kid };
  },

  addExternalGame(state: ContentState, ctx: Ctx, input: Pick<ExternalGame, 'unitId' | 'url' | 'title'>) {
    if (ctx.user.role === 'learner') fail(403, 'forbidden', 'Only tutors and the La Porte team link outside games.');
    const provider = providerFor(input.url) ?? fail(422, 'unsupported_link', 'Use an https link from Kahoot!, Quizlet, Wordwall or Blooket.');
    if (!KID_UNITS.some((u) => u.id === input.unitId)) fail(404, 'not_found', 'Unknown world');
    if (input.title.trim().length < 3) fail(422, 'invalid_title', 'Give the game a short title.');
    const next = structuredClone(state);
    const game: ExternalGame = { ...input, title: input.title.trim(), provider, id: ctx.newId('xg'), addedBy: ctx.user.id, at: ctx.now };
    next.externalGames.unshift(game);
    return { state: next, game };
  },

  removeExternalGame(state: ContentState, ctx: Ctx, id: string) {
    if (ctx.user.role === 'learner') fail(403, 'forbidden', 'Only tutors and the La Porte team manage outside games.');
    const next = structuredClone(state);
    next.externalGames = next.externalGames.filter((g) => g.id !== id);
    return { state: next };
  },
};

/** Demo family: Ama's son Kwame, with a little progress. */
export function seedKids(): Pick<ContentState, 'kids' | 'kidActivities' | 'externalGames'> {
  const at = '2026-10-24T16:00:00Z';
  const day = (d: string) => shiftIso(d, SEED_SHIFT_DAYS);
  return shiftDatesInPlace({
    kids: [{ id: 'kid-kwame', parentId: 'lrn-ama', name: 'Kwame', age: 8, level: 'A1', avatar: 1, pin: '1234', nickname: 'Lion Doré', settings: defaultKidSettings(), usage: { [day('2026-10-24')]: 18, [day('2026-10-25')]: 12 }, createdAt: '2026-10-10T10:00:00Z' }],
    kidActivities: [
      { id: 'ka-1', kidId: 'kid-kwame', unitId: 'ku-bonjour', game: 'quiz', score: 5, total: 6, stars: 2, at },
      { id: 'ka-2', kidId: 'kid-kwame', unitId: 'ku-bonjour', game: 'memory', score: 6, total: 6, stars: 3, at },
      { id: 'ka-3', kidId: 'kid-kwame', unitId: 'ku-couleurs', game: 'listen', score: 4, total: 6, stars: 2, at: '2026-10-25T16:30:00Z' },
    ],
    externalGames: [{ id: 'xg-1', unitId: 'ku-couleurs', provider: 'kahoot', url: 'https://kahoot.it/', title: 'Les couleurs: Saturday class quiz (your tutor shares the game PIN)', addedBy: 'tut-aicha', at: '2026-10-20T09:00:00Z' }],
  });
}

/* ---------------- Live class games (tutor-hosted) ---------------- */

export const LIVE_QUESTION_SEC = 20;

/**
 * Demo: every tutor-hosted game uses this code, and a child who types it when no tutor is hosting
 * gets a self-running game with simulated classmates. A live portal issues a fresh code per game.
 */
export const DEMO_GAME_CODE = '123456';

export interface LivePlayer {
  id: string;
  nickname: string;
  kidId?: string;
  /** Simulated classmates in the offline demo. */
  bot?: boolean;
  score: number;
  streak: number;
  answers: Record<number, { choice: number; ms: number; correct: boolean; points: number }>;
}

export interface LiveGame {
  code: string;
  hostId: string;
  unitId: string;
  questions: KidQuestion[];
  players: LivePlayer[];
  phase: 'lobby' | 'question' | 'reveal' | 'podium';
  index: number;
  questionStartedAt?: string;
  createdAt: string;
}

const gameFail = (status: number, code: string, message: string): never => fail(status, code, message);

export const liveOps = {
  create(hostId: string, unitId: string, now: string, code: string): LiveGame {
    const unit = KID_UNITS.find((u) => u.id === unitId) ?? gameFail(404, 'not_found', 'Unknown world');
    return { code, hostId, unitId, questions: quizFor(unit, hash(code), 6), players: [], phase: 'lobby', index: 0, createdAt: now };
  },

  join(game: LiveGame, input: { kidId?: string; nickname?: string; bot?: boolean }, newId: () => string) {
    // A child who reconnects gets their player back, even mid-game.
    const existing = input.kidId ? game.players.find((p) => p.kidId === input.kidId) : undefined;
    if (existing) return existing;
    if (game.phase !== 'lobby') gameFail(409, 'started', 'This game has already started.');
    if (game.players.length >= 40) gameFail(409, 'full', 'This game is full.');
    const player: LivePlayer = { id: newId(), nickname: input.nickname ?? safeNickname(game.players.length * 13 + 5, game.players.map((p) => p.nickname)), kidId: input.kidId, bot: input.bot, score: 0, streak: 0, answers: {} };
    game.players.push(player);
    return player;
  },

  /** Moves the game on: lobby → question → reveal → next question … → podium. */
  advance(game: LiveGame, hostId: string, now: string) {
    if (game.hostId !== hostId) gameFail(403, 'forbidden', 'Only the host controls the game.');
    if (game.phase === 'lobby') {
      if (!game.players.length) gameFail(409, 'no_players', 'Wait for at least one player.');
      Object.assign(game, { phase: 'question', index: 0, questionStartedAt: now });
    } else if (game.phase === 'question') game.phase = 'reveal';
    else if (game.phase === 'reveal') {
      if (game.index + 1 >= game.questions.length) game.phase = 'podium';
      else Object.assign(game, { phase: 'question', index: game.index + 1, questionStartedAt: now });
    }
    return game;
  },

  answer(game: LiveGame, playerId: string, index: number, choice: number, now: string) {
    liveOps.tick(game, now);
    if (game.phase !== 'question' || game.index !== index) gameFail(409, 'closed', 'Too late for this question.');
    const player = game.players.find((p) => p.id === playerId) ?? gameFail(404, 'not_found', 'Player not found');
    if (player.answers[index]) return player;
    const q = game.questions[index];
    const ms = Date.parse(now) - Date.parse(game.questionStartedAt!);
    const correct = choice === q.answer;
    player.streak = correct ? player.streak + 1 : 0;
    const points = answerPoints(correct, ms, LIVE_QUESTION_SEC * 1000, player.streak - 1);
    player.answers[index] = { choice, ms, correct, points };
    player.score += points;
    liveOps.tick(game, now);
    return player;
  },

  /** Closes a question when time is up or everyone has answered. */
  tick(game: LiveGame, now: string) {
    if (game.phase !== 'question') return game;
    const timeUp = Date.parse(now) - Date.parse(game.questionStartedAt!) >= LIVE_QUESTION_SEC * 1000;
    const allIn = game.players.length > 0 && game.players.every((p) => p.answers[game.index]);
    if (timeUp || allIn) game.phase = 'reveal';
    return game;
  },

  /** What a player may see: the answer stays hidden until the reveal. */
  viewFor(game: LiveGame, viewer: { hostId?: string; playerId?: string }) {
    const host = viewer.hostId === game.hostId;
    const showAnswer = host ? game.phase !== 'question' : game.phase === 'reveal' || game.phase === 'podium';
    const ranking = [...game.players].sort((a, b) => b.score - a.score).map((p, i) => ({ rank: i + 1, id: p.id, nickname: p.nickname, score: p.score }));
    const q = game.questions[game.index];
    return {
      code: game.code,
      unitId: game.unitId,
      phase: game.phase,
      index: game.index,
      count: game.questions.length,
      questionStartedAt: game.questionStartedAt,
      limitSec: LIVE_QUESTION_SEC,
      question: game.phase === 'lobby' ? null : { ...q, answer: showAnswer ? q.answer : -1, explain: showAnswer ? q.explain : L('', '') },
      answered: game.players.filter((p) => p.answers[game.index]).length,
      players: game.players.map((p) => ({ id: p.id, nickname: p.nickname })),
      ranking: game.phase === 'question' && !host ? [] : ranking,
      me: viewer.playerId ? game.players.find((p) => p.id === viewer.playerId) ?? null : null,
    };
  },
};
export type LiveGameView = ReturnType<typeof liveOps.viewFor>;
