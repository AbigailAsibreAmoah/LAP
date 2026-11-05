import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatDate } from '../../utils/format';

/*
 * Deters copying and capturing the entry assessment.
 *
 * Screenshot shortcuts start with a key the page hears first: the Windows key (Win+Shift+S,
 * Win+PrtScn), Cmd on a Mac (Cmd+Shift+3/4/5) or Print Screen. The questions are covered the
 * instant one of those keys goes down, before the operating system takes the picture, and stay
 * covered while the window is in the background (snipping overlay, screen recorder, another app).
 * They come back by themselves once the learner is back and the keys are released.
 * Text can't be selected, copied, cut, dragged or printed, and a watermark with the learner's name
 * and the date makes any photo traceable.
 *
 * A web page cannot block every capture (a phone camera, some capture tools), so these are
 * deterrents; the questions' answers also never reach the browser (scored on the server).
 */

type Reason = 'key' | 'away' | 'print';
const SCREENSHOT_KEYS = new Set(['Meta', 'OS', 'Super', 'Hyper', 'PrintScreen', 'Snapshot']);

// Essential styles are inline so the protection never depends on a stylesheet being loaded.
const wrapStyle: CSSProperties = { position: 'relative', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as CSSProperties;
const markStyle: CSSProperties = { position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 };
const markInner: CSSProperties = { position: 'absolute', inset: '-40%', display: 'flex', flexWrap: 'wrap', alignContent: 'space-around', justifyContent: 'space-around', gap: '56px 40px', transform: 'rotate(-18deg)', opacity: 0.07, fontSize: 13, fontWeight: 700, color: '#141b34', whiteSpace: 'nowrap' };
const coverStyle: CSSProperties = { position: 'absolute', inset: 0, zIndex: 3, display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 8, padding: 20, borderRadius: 16, background: '#f6f1ea', textAlign: 'center' };
const toastStyle: CSSProperties = { position: 'absolute', left: '50%', top: 8, zIndex: 4, transform: 'translateX(-50%)', padding: '8px 14px', borderRadius: 999, background: '#141b34', color: '#fff', fontSize: 13, whiteSpace: 'nowrap' };

export function ProtectedTest({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { learner } = useStore();
  const [reasons, setReasons] = useState<Set<Reason>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const restoreTimer = useRef(0);
  const hidden = reasons.size > 0;

  useEffect(() => {
    const add = (r: Reason) => {
      window.clearTimeout(restoreTimer.current);
      setReasons((s) => (s.has(r) ? s : new Set(s).add(r)));
    };
    // Coming back is delayed slightly so a capture that finishes late still sees the cover.
    const remove = (r: Reason, delay = 350) => {
      window.clearTimeout(restoreTimer.current);
      restoreTimer.current = window.setTimeout(() => setReasons((s) => {
        if (!s.has(r)) return s;
        const n = new Set(s);
        n.delete(r);
        return n;
      }), delay);
    };
    const warn = (msg: string) => {
      setNotice(msg);
      window.setTimeout(() => setNotice(null), 2500);
    };
    const clearClipboard = () => void navigator.clipboard?.writeText('').catch(() => undefined);

    const onKeyDown = (e: KeyboardEvent) => {
      if (SCREENSHOT_KEYS.has(e.key) || e.metaKey || (e.ctrlKey && e.shiftKey)) add('key');
      if (e.key === 'PrintScreen' || e.key === 'Snapshot') {
        e.preventDefault();
        clearClipboard();
        warn(fr ? 'Les captures d’écran du test ne sont pas autorisées.' : 'Screenshots of the test are not allowed.');
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a', 's', 'p', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        warn(fr ? 'La copie du test n’est pas autorisée.' : 'Copying the test is not allowed.');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      // Windows only reports Print Screen on key-up, after the picture went to the clipboard.
      if (e.key === 'PrintScreen' || e.key === 'Snapshot') {
        clearClipboard();
        add('key');
        remove('key', 1500);
        return;
      }
      if (!e.metaKey && !e.getModifierState?.('OS') && !(e.ctrlKey && e.shiftKey)) remove('key');
    };
    const onBlur = () => add('away');
    const onFocus = () => document.visibilityState === 'visible' && remove('away');
    const onVisibility = () => (document.visibilityState === 'hidden' ? add('away') : document.hasFocus() && remove('away'));
    const onBeforePrint = () => add('print');
    const onAfterPrint = () => remove('print');

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(restoreTimer.current);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fr]);

  const block = (e: { preventDefault: () => void }) => e.preventDefault();
  const mark = `${learner.name} · ${formatDate(new Date().toISOString(), lang, { day: 'numeric', month: 'short', year: 'numeric' })} · La Porte`;

  return (
    <div className="protected-test" style={wrapStyle} onCopy={block} onCut={block} onContextMenu={block} onDragStart={block}>
      <div style={{ visibility: hidden ? 'hidden' : 'visible' }} aria-hidden={hidden || undefined}>{children}</div>
      <div style={markStyle} aria-hidden>
        <div style={markInner}>{Array.from({ length: 40 }, (_, i) => <span key={i}>{mark}</span>)}</div>
      </div>
      {hidden && (
        <div style={coverStyle} role="status">
          <strong style={{ fontSize: 18 }}>{fr ? 'Questions masquées' : 'Questions hidden'}</strong>
          <span className="small">
            {reasons.has('away')
              ? fr ? 'Revenez sur cette fenêtre pour continuer le test.' : 'Come back to this window to continue the test.'
              : fr ? 'Relâchez la touche pour continuer. Les captures du test ne sont pas autorisées.' : 'Release the key to continue. Capturing the test isn’t allowed.'}
          </span>
        </div>
      )}
      {notice && <div style={toastStyle} role="alert">{notice}</div>}
      <p className="tiny muted" style={{ marginTop: 10 }}>{fr ? 'Test protégé : copie et captures désactivées.' : 'Protected test: copying and screenshots are disabled.'}</p>
    </div>
  );
}
