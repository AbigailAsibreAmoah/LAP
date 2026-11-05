// French speech recognition in the browser (Web Speech API, fr-FR). Chrome and Edge support it;
// where it isn't available the callers fall back to recording-and-listening or a tutor's review.

type Alt = { transcript: string; confidence: number };
type Result = ArrayLike<Alt> & { isFinal?: boolean };
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<Result> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

const ctor = (): (new () => Recognition) | undefined => {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const recognitionSupported = () => !!ctor();

export interface Heard {
  /** Alternatives for the whole utterance, best first. */
  transcripts: string[];
  /** Recogniser confidence 0–1 (0 when the browser doesn't report it). */
  confidence: number;
  seconds: number;
}

export class RecognitionError extends Error {
  constructor(public code: 'unsupported' | 'denied' | 'no-speech' | 'failed') {
    super(code);
  }
}

/**
 * Listens once. Short mode stops after the first phrase; long mode (Speaking Studio) keeps listening
 * until stop() or maxSeconds.
 */
export function recogniseFrench(opts: { long?: boolean; maxSeconds?: number } = {}) {
  const Ctor = ctor();
  let rec: Recognition | null = null;
  let timer = 0;
  const started = Date.now();
  const promise = new Promise<Heard>((resolve, reject) => {
    if (!Ctor) return reject(new RecognitionError('unsupported'));
    rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.continuous = !!opts.long;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    const finals: Alt[][] = [];
    let failed: RecognitionError | null = null;
    rec.onresult = (e) => {
      finals.length = 0;
      for (let i = 0; i < e.results.length; i++) finals.push(Array.from(e.results[i]));
    };
    rec.onerror = (e) => {
      failed = new RecognitionError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'no-speech' ? 'no-speech' : 'failed');
    };
    rec.onend = () => {
      window.clearTimeout(timer);
      const seconds = (Date.now() - started) / 1000;
      if (!finals.length) return reject(failed ?? new RecognitionError('no-speech'));
      // Join segments (long answers arrive in pieces); alternatives come from the last segment.
      const lead = finals.slice(0, -1).map((alts) => alts[0]?.transcript ?? '').join(' ');
      const last = finals[finals.length - 1];
      const transcripts = last.map((a) => `${lead} ${a.transcript}`.trim());
      const confs = finals.map((alts) => alts[0]?.confidence ?? 0).filter((c) => c > 0);
      resolve({ transcripts, confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0, seconds });
    };
    rec.start();
    timer = window.setTimeout(() => rec?.stop(), (opts.maxSeconds ?? (opts.long ? 60 : 8)) * 1000);
  });
  return { promise, stop: () => rec?.stop(), abort: () => rec?.abort() };
}
