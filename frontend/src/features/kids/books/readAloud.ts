// French read-aloud with the word being spoken highlighted (falls back to a timed highlight).
export function readAloud(text: string, onWord: (i: number) => void, onEnd: () => void) {
  const words = text.split(/\s+/);
  const starts: number[] = [];
  let pos = 0;
  for (const w of words) {
    starts.push(text.indexOf(w, pos));
    pos = starts[starts.length - 1] + w.length;
  }
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  let timer = 0;
  let boundaries = false;
  const timed = (i: number) => {
    if (i >= words.length) return;
    onWord(i);
    timer = window.setTimeout(() => timed(i + 1), Math.max(260, words[i].length * 85));
  };
  if (!synth) {
    timed(0);
    timer = window.setTimeout(onEnd, words.length * 420 + 400);
    return () => window.clearTimeout(timer);
  }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[«»]/g, ''));
  u.lang = 'fr-FR';
  u.rate = 0.8;
  const voice = synth.getVoices().find((v) => v.lang.startsWith('fr'));
  if (voice) u.voice = voice;
  u.onboundary = (e) => {
    if (e.name && e.name !== 'word') return;
    boundaries = true;
    window.clearTimeout(timer);
    let i = 0;
    while (i + 1 < starts.length && starts[i + 1] <= e.charIndex) i++;
    onWord(i);
  };
  u.onend = () => {
    window.clearTimeout(timer);
    onEnd();
  };
  u.onerror = () => {
    window.clearTimeout(timer);
    onEnd();
  };
  synth.speak(u);
  // Some voices never report word boundaries: highlight on a timer instead.
  window.setTimeout(() => {
    if (!boundaries) timed(0);
  }, 700);
  return () => {
    window.clearTimeout(timer);
    synth.cancel();
  };
}
