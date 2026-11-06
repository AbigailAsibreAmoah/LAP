// Staging: how each page of a book is "shot", so books don't all look alike.
//  - poses come from what the page says (court → running, plante → crouching, pleure → sad…);
//  - each book has its own landscape colouring and house style;
//  - pages alternate wide, medium and close-up shots, sometimes seen from the other side;
//  - small everyday details (chickens, a washing line, a motorbike…) change from page to page.
import { isAdult, isElder, type Pose } from './Figure';
import type { Book, CastMember, Page, SceneKind } from './stories';

export type Framing = 'wide' | 'medium' | 'close';
export interface Stage { framing: Framing; mirror: boolean; tone: number; details: number }

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');

/** Words in the page text → what the main character is doing. Checked in order. */
const VERBS: [RegExp, Pose][] = [
  [/\b(dort|dormir|endormi|chut|bonne nuit)\b/, 'sleep'],
  [/\b(pleur\w*|triste|decourag\w*|honte|gorge serree|mal au ventre|seule)\b/, 'sad'],
  [/\b(cour[st]?|courir|courent|couraient|s echappe|court derriere|courait)\b/, 'run'],
  [/\b(saute|sautent|hop|bondit)\b/, 'jump'],
  [/\b(dans(e|ent|aient|ait)|chantai(t|ent)|chante|musique|jouer du tambour|joue devant)\b/, 'dance'],
  [/\b(hourra|bravo|gagne|applaudi\w*|crie|joyeux anniversaire|roule tout seul)\b/, 'cheer'],
  [/\b(seau|panier|porte la|porte le|porte des|porte de l|porter|portaient|apporte\w*|prend un)\b/, 'carry'],
  [/\b(plant\w*|arros\w*|graines?|ramass\w*|creus\w*|cherch\w*|nettoy\w*|sous le lit|dans le sable|recolt\w*|vase|cousait|tendre)\b/, 'crouch'],
  [/\b(assis\w*|s assoit|ecoutait|sous le manguier|raconte\w*)\b/, 'sit'],
  [/\b(lettres?|livres?|lire|ecri\w*|dessin\w*|dictionnaire|telephone|message|cassette|enveloppes?|transcri\w*)\b/, 'read'],
  [/\b(hesit\w*|pens\w*|reflechi\w*|souvien\w*|souvenu|imagin\w*|se demand\w*|peur)\b/, 'think'],
  [/\b(regard\w*|montr\w*|voila|voici|explique|te voila)\b/, 'point'],
  [/\b(bonjour|au revoir|salut|merci)\b/, 'wave'],
  [/\b(march\w*|va au|vont|part|partis|allait|alle\w*|arriv\w*|promen\w*|revenu\w*|monte\w*)\b/, 'walk'],
];
/** Poses that read well behind furniture (only the top half of the body shows). */
const UPPER_ONLY: Pose[] = ['stand', 'wave', 'cheer', 'point', 'think', 'read', 'sad', 'sleep'];
const INDOOR: SceneKind[] = ['bedroom', 'classroom', 'workshop', 'kitchen'];
const BEHIND_FURNITURE: SceneKind[] = ['bedroom', 'classroom', 'workshop', 'kitchen', 'market'];
const SIDE_POSES: Pose[] = ['stand', 'point', 'wave', 'think', 'walk'];

const NAMES: Record<string, RegExp> = {
  kofi: /kofi/, afi: /afi/, awa: /awa/, yao: /yao/, kwesi: /kwesi/, sena: /sena/, ibrahim: /ibrahim/, aminata: /aminata/, fatou: /fatou/,
  maman: /maman|sa mere|la mere/, papa: /papa|son pere|le pere/, mamie: /mamie|grand-mere|tante/, grandpere: /grand-pere|le chef/, prof: /maitresse|professeur|professeure|vendeuse|cliente/,
};

/** Make a pose possible for this character in this place (elders don't jump; bodies behind a bed show only their top half). */
function fit(pose: Pose, who: string, kind: SceneKind): Pose {
  let p = pose;
  if (isElder(who) && (p === 'jump' || p === 'dance' || p === 'run' || p === 'crouch')) p = p === 'run' ? 'walk' : p === 'crouch' ? 'point' : 'wave';
  if (isAdult(who) && p === 'jump') p = 'cheer';
  if (BEHIND_FURNITURE.includes(kind) && !UPPER_ONLY.includes(p)) p = p === 'dance' || p === 'jump' ? 'cheer' : p === 'crouch' || p === 'carry' ? 'point' : 'stand';
  if (p === 'sleep' && kind !== 'bedroom') p = 'stand';
  return p;
}

/** The pose for each character on a page. */
export function castFor(book: Book, i: number, prev?: CastMember[]): CastMember[] {
  const page: Page = book.pages[i];
  const text = plain(page.fr);
  const verb = VERBS.find(([re]) => re.test(text))?.[1];
  // Who is the sentence about? The first character named in it, otherwise the first one drawn.
  let lead = 0;
  let at = Infinity;
  page.cast.forEach((c, k) => {
    const m = NAMES[c.who]?.exec(text);
    if (m && m.index < at) { at = m.index; lead = k; }
  });
  const seed = hash(book.id + i);
  return page.cast.map((c, k) => {
    if (c.pose) return c;
    let pose: Pose;
    if (k === lead && verb) pose = verb;
    else if (verb === 'run' || verb === 'dance' || verb === 'cheer') pose = verb; // everyone joins in
    else {
      const byMood: Record<string, Pose> = { joy: 'cheer', focus: 'point', smile: 'wave', calm: 'stand', laugh: 'cheer', proud: 'wave', surprise: 'stand', worried: 'think', sad: 'sad', sleepy: 'stand', cheeky: 'dance' };
      pose = k === lead ? byMood[c.expression ?? 'calm'] : SIDE_POSES[(seed + k) % SIDE_POSES.length];
    }
    pose = fit(pose, c.who, page.scene);
    // Don't hold the same pose page after page.
    const before = prev?.find((p) => p.who === c.who)?.pose;
    if (before === pose && !(k === lead && verb)) {
      const alts = SIDE_POSES.map((p) => fit(p, c.who, page.scene)).filter((p) => p !== pose);
      pose = alts[(seed + k) % alts.length] ?? pose;
    }
    return { ...c, pose };
  });
}

/** Cast with poses for every page of a book (each page knows the page before it). */
export function stagedCasts(book: Book): CastMember[][] {
  const out: CastMember[][] = [];
  book.pages.forEach((_, i) => out.push(castFor(book, i, out[i - 1])));
  return out;
}

/** Camera and colour choices for a page (the first page opens wide, like an establishing shot). */
export function stageFor(book: Book, i: number): Stage {
  const page = book.pages[i];
  const seed = hash(book.id + ':' + i);
  const shots: Framing[] = ['medium', 'close', 'medium', 'wide', 'close', 'medium'];
  const framing: Framing = i === 0 ? 'wide' : i === book.pages.length - 1 ? 'medium' : shots[(seed + i) % shots.length];
  const hasText = page.props.includes('chalkboard') || page.props.includes('pirogue');
  return { framing, mirror: !hasText && seed % 3 === 1, tone: hash(book.id) % 4, details: seed };
}

export function coverStage(book: Book): Stage {
  return { framing: 'medium', mirror: false, tone: hash(book.id) % 4, details: hash(book.id) };
}

export const isIndoor = (k: SceneKind) => INDOOR.includes(k);
