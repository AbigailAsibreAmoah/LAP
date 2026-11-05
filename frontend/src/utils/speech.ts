/** Speaks French with the browser's built-in voice. Only ever call this from a user action. */
export function speakFrench(text: string, onEnd: () => void, rate = 0.92) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth) {
    window.setTimeout(onEnd, 1500);
    return () => undefined;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  u.rate = rate;
  const voice = synth.getVoices().find((v) => v.lang.startsWith('fr'));
  if (voice) u.voice = voice;
  u.onend = onEnd;
  u.onerror = onEnd;
  synth.cancel();
  synth.speak(u);
  return () => synth.cancel();
}
