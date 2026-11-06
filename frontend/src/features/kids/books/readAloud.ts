// French read-aloud for La Porte Kids, told like a storyteller rather than a generic computer voice:
//  - picks the most natural French voice on the device (neural/"natural" voices first, robotic ones last);
//  - speaks at a pace and pitch suited to the child's age (slow, warm and bright for 4–5);
//  - reads sentence by sentence with real pauses, gives characters' lines « … » their own livelier
//    voice, and lifts exclamations ("Youpi !", "Boum !") so little ones want to join in;
//  - highlights each word as it is spoken (or on a timer when the voice reports no word positions).
// Browser voices differ by device; recorded narration by real storytellers would be the next step.

export type Listener = 'little' | 'young' | 'middle' | 'teen';
export const listenerFor = (minAge: number): Listener => (minAge <= 5 ? 'little' : minAge <= 7 ? 'young' : minAge <= 10 ? 'middle' : 'teen');

interface Profile { rate: number; pitch: number; pauseSentence: number; pauseQuote: number; quotePitch: number; quoteRate: number; lift: number }
const PROFILES: Record<Listener, Profile> = {
  little: { rate: 0.74, pitch: 1.22, pauseSentence: 700, pauseQuote: 320, quotePitch: 1.42, quoteRate: 0.8, lift: 0.14 },
  young: { rate: 0.82, pitch: 1.14, pauseSentence: 520, pauseQuote: 260, quotePitch: 1.3, quoteRate: 0.86, lift: 0.1 },
  middle: { rate: 0.9, pitch: 1.05, pauseSentence: 380, pauseQuote: 200, quotePitch: 1.16, quoteRate: 0.92, lift: 0.06 },
  teen: { rate: 0.97, pitch: 1.0, pauseSentence: 300, pauseQuote: 160, quotePitch: 1.06, quoteRate: 0.97, lift: 0.03 },
};

const VOICE_KEY = 'laporte-kids-voice';
const synth = () => (typeof window !== 'undefined' ? window.speechSynthesis : undefined);

/** French voices on this device, best first. */
export function frenchVoices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return [];
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|online|premium|enhanced/i.test(v.name) ? 6 : 0) +
    (/google/i.test(v.name) ? 3 : 0) +
    (/am[ée]lie|audrey|aur[ée]lie|denise|[ée]lo[iï]se|vivienne|charlotte|l[ée]a|julie|marie|c[ée]line|hortense|virginie|brigitte|thomas|henri/i.test(v.name) ? 2 : 0) +
    (v.lang.toLowerCase().startsWith('fr-fr') ? 1 : 0) -
    (/compact|espeak|robot/i.test(v.name) ? 5 : 0);
  return s.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr')).sort((a, b) => score(b) - score(a));
}

/** The voice a parent picked for this device, or the best available one. */
export function storyVoice(): SpeechSynthesisVoice | undefined {
  const list = frenchVoices();
  let saved: string | null = null;
  try { saved = localStorage.getItem(VOICE_KEY); } catch { /* storage may be blocked */ }
  return list.find((v) => v.name === saved) ?? list[0];
}
export function setStoryVoice(name: string) {
  try { localStorage.setItem(VOICE_KEY, name); } catch { /* ignore */ }
}
/** Voices often load a moment after the page; call back when they're ready. */
export function onVoicesReady(cb: () => void) {
  const s = synth();
  if (!s) return () => undefined;
  if (s.getVoices().length) cb();
  const h = () => cb();
  s.addEventListener?.('voiceschanged', h);
  return () => s.removeEventListener?.('voiceschanged', h);
}

interface Segment { text: string; first: number; words: string[]; quote: boolean; end: '.' | '!' | '?' | '…' | '' }

/** Splits a page into spoken pieces: sentences, and characters' lines in « … » or “ … ”. */
function segment(text: string): Segment[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: Segment[] = [];
  let cur: string[] = [];
  let first = 0;
  let quote = false;
  const flush = (i: number) => {
    if (!cur.length) return;
    const last = cur[cur.length - 1].replace(/[»”"]+$/, '');
    const end = (/[!?….]$/.exec(last)?.[0] ?? '') as Segment['end'];
    const spoken = cur.join(' ').replace(/[«»“”"]/g, '').replace(/\s+/g, ' ').trim();
    if (spoken) out.push({ text: spoken, first, words: cur, quote, end });
    cur = [];
    first = i;
  };
  words.forEach((w, i) => {
    const opens = /^[«“"]/.test(w) || w === '«';
    if (opens && !quote) { flush(i); quote = true; }
    cur.push(w);
    const closes = /[»”"]$/.test(w) || w === '»';
    if (closes && quote) { flush(i + 1); quote = false; return; }
    if (/[.!?…]$/.test(w.replace(/[»”"]+$/, ''))) flush(i + 1);
  });
  flush(words.length);
  return out;
}

/** Reads a page aloud. Returns a function that stops it. */
export function readAloud(text: string, onWord: (i: number) => void, onEnd: () => void, listener: Listener = 'middle') {
  const p = PROFILES[listener];
  const s = synth();
  const segs = segment(text);
  let stopped = false;
  let timer = 0;
  const clear = () => window.clearTimeout(timer);

  // No speech engine: highlight word by word on a timer.
  if (!s) {
    const all = text.split(/\s+/);
    const step = (i: number) => {
      if (stopped) return;
      if (i >= all.length) { onEnd(); return; }
      onWord(i);
      timer = window.setTimeout(() => step(i + 1), Math.max(300, all[i].length * 95) / p.rate);
    };
    step(0);
    return () => { stopped = true; clear(); };
  }

  s.cancel();
  const voice = storyVoice();
  const speakSeg = (k: number) => {
    if (stopped) return;
    if (k >= segs.length) { onEnd(); return; }
    const seg = segs[k];
    const starts: number[] = [];
    let pos = 0;
    for (const w of seg.words) {
      const clean = w.replace(/[«»“”"]/g, '');
      const at = seg.text.indexOf(clean, pos);
      starts.push(at < 0 ? pos : at);
      pos = (at < 0 ? pos : at) + clean.length;
    }
    const u = new SpeechSynthesisUtterance(seg.text);
    u.lang = voice?.lang ?? 'fr-FR';
    if (voice) u.voice = voice;
    const lift = seg.end === '!' ? p.lift : seg.end === '?' ? p.lift / 2 : 0;
    u.rate = (seg.quote ? p.quoteRate : p.rate) * (seg.words.length <= 3 ? 0.92 : 1); // tiny sentences, said a little slower
    u.pitch = Math.min(2, (seg.quote ? p.quotePitch : p.pitch) + lift);
    let boundaries = false;
    let fallback = 0;
    u.onboundary = (e) => {
      if (e.name && e.name !== 'word') return;
      boundaries = true;
      window.clearTimeout(fallback);
      let i = 0;
      while (i + 1 < starts.length && starts[i + 1] <= e.charIndex) i++;
      onWord(seg.first + i);
    };
    const next = () => {
      window.clearTimeout(fallback);
      if (stopped) return;
      const pause = k + 1 < segs.length && (seg.quote || segs[k + 1].quote) ? p.pauseQuote : p.pauseSentence;
      timer = window.setTimeout(() => speakSeg(k + 1), pause);
    };
    u.onend = next;
    u.onerror = next;
    onWord(seg.first);
    s.speak(u);
    // Some voices never report word positions: move the highlight on a timer instead.
    const timed = (i: number) => {
      if (stopped || boundaries || i >= seg.words.length) return;
      onWord(seg.first + i);
      fallback = window.setTimeout(() => timed(i + 1), Math.max(280, seg.words[i].length * 90) / u.rate);
    };
    fallback = window.setTimeout(() => !boundaries && timed(0), 600);
  };
  speakSeg(0);
  return () => { stopped = true; clear(); s.cancel(); };
}

/** Says one little word or expression (for "Mes petits mots"). */
export function sayWord(text: string, listener: Listener = 'little') {
  const s = synth();
  if (!s) return;
  s.cancel();
  const p = PROFILES[listener];
  const u = new SpeechSynthesisUtterance(text.replace(/[«»“”"]/g, ''));
  const voice = storyVoice();
  u.lang = voice?.lang ?? 'fr-FR';
  if (voice) u.voice = voice;
  u.rate = p.rate * 0.9;
  u.pitch = Math.min(2, p.pitch + (text.includes('!') ? p.lift : 0));
  s.speak(u);
}
