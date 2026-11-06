import { expressionOfDay, msUntilNextSlot, NOTE_SLOTS, slotAt, type CefrLevel, type DailyExpression, type NoteSlot } from '@laporte/shared';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toasts';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { speakFrench } from '../../utils/speech';

/*
 * Expression du jour as a changing sticky note.
 * In the app it is a card; "Pin to desktop" opens it in a small window that stays on top of other
 * apps (Document Picture-in-Picture, Chrome/Edge on computers) or, in other browsers, a small
 * separate window. Every two hours (08:00–20:00) it moves on to the next part of the day.
 */

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Today's expression and the part of the day to show; re-renders itself at each 2-hour change. */
export function useDailyExpression(level: CefrLevel) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setTimeout(() => setNow(new Date()), msUntilNextSlot(now));
    return () => window.clearTimeout(id);
  }, [now]);
  return { expr: expressionOfDay(today(), level), slot: slotAt(now.getHours()), hour: now.getHours() };
}

/** The note's content (used in the app card and in the desktop window). */
export function NoteContent({ expr, slot: liveSlot, hour, inWindow }: { expr: DailyExpression; slot: NoteSlot; hour: number; inWindow?: boolean }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { actions, vocabulary } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [peek, setPeek] = useState<NoteSlot | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  useEffect(() => { setPeek(null); }, [liveSlot]);
  const slot = peek ?? liveSlot;
  const meta = NOTE_SLOTS.find((s) => s.slot === slot)!;
  const next = NOTE_SLOTS.find((s) => s.hour > hour);
  const saved = vocabulary.some((v) => v.fr === expr.fr);
  const save = () => { void actions.addVocab({ fr: expr.fr, en: expr.en, example: expr.work.fr, source: 'Expression du jour' }); toast(fr ? 'Ajoutée à votre vocabulaire' : 'Added to your vocabulary'); };
  const listen = (text: string) => speakFrench(text, () => undefined);
  const reached = (s: (typeof NOTE_SLOTS)[number]) => hour >= s.hour || s.slot === 'meaning';

  const body = (() => {
    switch (slot) {
      case 'meaning':
        return (
          <>
            <p className="dn-fr" lang="fr">{expr.fr}</p>
            <p className="dn-sounds">🔊 {expr.sounds}</p>
            <p className="dn-en">{expr.en}</p>
            <p className="dn-text">{l(expr.meaning)}</p>
          </>
        );
      case 'everyday':
      case 'work': {
        const ex = expr[slot];
        return (
          <>
            <p className="dn-small" lang="fr"><strong>{expr.fr}</strong></p>
            <p className="dn-example" lang="fr">« {ex.fr} »</p>
            <p className="dn-en">{ex.en}</p>
          </>
        );
      }
      case 'watchOut':
        return (
          <>
            <p className="dn-small" lang="fr"><strong>{expr.fr}</strong></p>
            <p className="dn-text">⚠️ {l(expr.watchOut)}</p>
          </>
        );
      case 'quiz':
        return (
          <>
            <p className="dn-example" lang="fr">{expr.quiz.sentence}</p>
            <div className="dn-options">
              {expr.quiz.options.map((o, i) => (
                <button key={o} type="button" className="dn-opt" data-state={pick === null ? undefined : i === expr.quiz.answer ? 'right' : i === pick ? 'wrong' : undefined} onClick={() => setPick(i)} disabled={pick !== null} lang="fr">{o}</button>
              ))}
            </div>
            {pick !== null && <p className="dn-text">{pick === expr.quiz.answer ? '✓ ' : '✗ '}{l(expr.quiz.why)}</p>}
          </>
        );
      case 'yourTurn':
        return (
          <>
            <p className="dn-small" lang="fr"><strong>{expr.fr}</strong></p>
            <p className="dn-text">✍️ {l(expr.yourTurn)}</p>
            <button type="button" className="dn-btn" onClick={() => { navigate('/app/studio'); if (inWindow) window.focus(); }}><Icon name="mic" size={14} /> {fr ? 'S’entraîner à l’oral' : 'Practise speaking'}</button>
          </>
        );
      case 'recap':
        return (
          <>
            <p className="dn-fr dn-fr-sm" lang="fr">{expr.fr}</p>
            <p className="dn-en">{expr.en}</p>
            <p className="dn-example" lang="fr">« {expr.work.fr} »</p>
            <button type="button" className="dn-btn" onClick={save} disabled={saved}><Icon name={saved ? 'check' : 'plus'} size={14} /> {saved ? (fr ? 'Dans votre vocabulaire' : 'In your vocabulary') : fr ? 'Garder dans mon vocabulaire' : 'Save to my vocabulary'}</button>
          </>
        );
    }
  })();

  const speakText = slot === 'everyday' || slot === 'work' ? expr[slot].fr : expr.fr;
  return (
    <div className={`dn${inWindow ? ' dn-window' : ''}`}>
      <div className={inWindow ? 'dn-fit' : 'dn-plain'}>
      <div className="dn-head">
        <span className="dn-kicker" lang="fr">Expression du jour{slot !== 'meaning' && <> · {meta.title[fr ? 'fr' : 'en']}</>}</span>
        <button type="button" className="dn-icon" onClick={() => listen(speakText)} aria-label={fr ? 'Écouter' : 'Listen'}><Icon name="headphones" size={15} /></button>
      </div>
      <div className="dn-body">{body}</div>
      <div className="dn-foot">
        <div className="dn-dots" role="tablist" aria-label={fr ? 'Moments de la journée' : 'Parts of the day'}>
          {NOTE_SLOTS.map((s) => (
            <button key={s.slot} type="button" role="tab" aria-selected={s.slot === slot} className="dn-dot" data-on={s.slot === slot || undefined} disabled={!reached(s)} title={`${String(s.hour).padStart(2, '0')}:00 · ${s.title[fr ? 'fr' : 'en']}`} onClick={() => { setPeek(s.slot === liveSlot ? null : s.slot); setPick(null); }} />
          ))}
        </div>
        <span className="dn-next">{peek ? <button type="button" className="dn-link" onClick={() => setPeek(null)}>{fr ? 'Revenir à maintenant' : 'Back to now'}</button> : next ? `${fr ? 'Ensuite' : 'Next'} · ${String(next.hour).padStart(2, '0')}:00 · ${next.title[fr ? 'fr' : 'en']}` : fr ? 'Nouvelle expression demain' : 'New expression tomorrow'}</span>
      </div>
      </div>
    </div>
  );
}

/* ---------------- The desktop window ---------------- */

type PipWindow = Window & { documentPictureInPicture?: { requestWindow: (o: { width: number; height: number; disallowReturnToOpener?: boolean }) => Promise<Window> } };
let noteWindow: Window | null = null;
let alwaysOnTop = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

/** Whether this browser can keep the note on top of other windows. */
export const canFloatOnTop = () => typeof window !== 'undefined' && 'documentPictureInPicture' in window;

function copyStyles(target: Document) {
  for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) target.head.appendChild(node.cloneNode(true));
  target.documentElement.lang = document.documentElement.lang;
  target.documentElement.className = 'dn-desk-html';
  target.body.style.margin = '0';
  target.body.className = 'dn-desk';
  target.title = 'La Porte · Expression du jour';
}

/** The window is the note: scale the note so it always fits, never scrolls. */
function fitNote(win: Window) {
  const el = win.document.querySelector<HTMLElement>('.dn-window .dn-fit');
  if (!el) return;
  el.style.zoom = '1';
  const box = el.parentElement!;
  const room = box.clientHeight - parseFloat(win.getComputedStyle(box).paddingTop) - parseFloat(win.getComputedStyle(box).paddingBottom);
  const z = Math.min(1.25, room / el.scrollHeight, (box.clientWidth - 36) / Math.max(1, el.scrollWidth));
  el.style.zoom = String(Math.max(0.5, Math.round(z * 100) / 100));
}

/** Drag the note anywhere to move the window across the desktop (pop-up windows).
 *  A floating picture-in-picture window is moved by the browser itself, from its top bar. */
function enableDrag(win: Window) {
  const doc = win.document;
  let start: { x: number; y: number; left: number; top: number } | null = null;
  doc.addEventListener('pointerdown', (e) => {
    if (alwaysOnTop || e.button !== 0 || (e.target as Element).closest('button, a, input, [role="tab"]')) return;
    start = { x: e.screenX, y: e.screenY, left: win.screenX, top: win.screenY };
    doc.body.classList.add('dn-dragging');
    (e.target as Element).setPointerCapture?.(e.pointerId);
  });
  doc.addEventListener('pointermove', (e) => {
    if (!start) return;
    try { win.moveTo(start.left + e.screenX - start.x, start.top + e.screenY - start.y); } catch { /* browser refused: it still moves by its title bar */ }
  });
  const stop = () => { start = null; doc.body.classList.remove('dn-dragging'); };
  doc.addEventListener('pointerup', stop);
  doc.addEventListener('pointercancel', stop);
}

/** Opens (or focuses) the desktop note. Must be called from a click. */
export async function openDesktopNote() {
  if (noteWindow && !noteWindow.closed) { noteWindow.focus(); return 'focused'; }
  const w = window as PipWindow;
  let win: Window | null = null;
  if (w.documentPictureInPicture) {
    win = await w.documentPictureInPicture.requestWindow({ width: 340, height: 330, disallowReturnToOpener: true });
    alwaysOnTop = true;
  } else {
    win = window.open('', 'laporte-note', 'popup=yes,width=360,height=360');
    alwaysOnTop = false;
    if (!win) return 'blocked';
    win.document.body.innerHTML = '';
  }
  copyStyles(win.document);
  const root = win.document.createElement('div');
  root.id = 'note-root';
  win.document.body.appendChild(root);
  win.addEventListener('pagehide', () => { noteWindow = null; emit(); });
  const refit = () => fitNote(win!);
  win.addEventListener('resize', refit);
  // re-fit whenever the note's content changes (new slot, quiz answer, language)
  let frame = 0;
  new (win as unknown as typeof globalThis).MutationObserver(() => { win!.cancelAnimationFrame(frame); frame = win!.requestAnimationFrame(refit); })
    .observe(root, { childList: true, subtree: true, characterData: true });
  enableDrag(win);
  noteWindow = win;
  emit();
  return alwaysOnTop ? 'on-top' : 'window';
}
export function closeDesktopNote() {
  noteWindow?.close();
  noteWindow = null;
  emit();
}

/** Renders the note into the desktop window while it is open (lives in the app layout). */
export function DesktopNoteHost() {
  const win = useSyncExternalStore(subscribe, () => noteWindow);
  const { learner } = useStore();
  const { expr, slot, hour } = useDailyExpression(learner.level);
  const target = win?.document.getElementById('note-root');
  if (!win || !target) return null;
  return createPortal(<NoteContent expr={expr} slot={slot} hour={hour} inWindow />, target);
}

export const useDesktopNoteOpen = () => useSyncExternalStore(subscribe, () => !!noteWindow && !noteWindow.closed);

/** The card on the dashboard, with "Pin to desktop". */
export function DailyNoteCard() {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { learner } = useStore();
  const toast = useToast();
  const { expr, slot, hour } = useDailyExpression(learner.level);
  const open = useDesktopNoteOpen();
  const pin = () => {
    openDesktopNote()
      .then((how) => {
        if (how === 'blocked') toast(fr ? 'Autorisez les fenêtres pop-up pour La Porte, puis réessayez.' : 'Allow pop-ups for La Porte, then try again.');
        else if (how === 'on-top') toast(fr ? 'Note épinglée : elle reste au-dessus de vos autres fenêtres.' : 'Note pinned: it stays on top of your other windows.');
        else if (how === 'window') toast(fr ? 'Note ouverte dans une petite fenêtre.' : 'Note opened in a small window.');
      })
      .catch(() => toast(fr ? 'Impossible d’ouvrir la note sur ce navigateur.' : 'Couldn’t open the note in this browser.'));
  };
  return (
    <section className="card dn-card" aria-label="Expression du jour">
      <NoteContent expr={expr} slot={slot} hour={hour} />
      <div className="dn-pin">
        {open ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={closeDesktopNote}><Icon name="x" size={14} /> {fr ? 'Retirer du bureau' : 'Unpin from desktop'}</button>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={pin}><Icon name="star" size={14} /> {fr ? 'Épingler sur le bureau' : 'Pin to desktop'}</button>
        )}
        <span className="tiny muted">{canFloatOnTop() ? (fr ? 'Reste au-dessus de vos autres fenêtres · laissez La Porte ouverte dans un onglet' : 'Stays on top of your other windows · keep La Porte open in a tab') : fr ? 'S’ouvre dans une petite fenêtre (au-dessus des autres sur Chrome et Edge)' : 'Opens in a small window (always on top in Chrome and Edge)'}</span>
      </div>
    </section>
  );
}
