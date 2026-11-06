import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { BookObject } from './Books';
import type { Book } from './stories';

/*
 * The child's two shelves: this week's books and their private library.
 * Books can be dragged from one shelf to the other: with a mouse, just drag; on a tablet or phone,
 * press and hold for a moment, then drag (so normal scrolling still works). A plain tap still
 * opens the book, and the "♡ Keep" button in the reader does the same thing without dragging.
 */

type Zone = 'week' | 'library';
interface Drag { id: string; from: Zone; x: number; y: number; over: Zone | null; w: number }
// The ghost book is moved directly (no React re-render per pointer move); state only changes
// when the book is lifted, crosses into another shelf, or is dropped.

const HOLD_MS = 280; // press-and-hold on touch screens before a book lifts
const MOVE_PX = 8; // how far a mouse moves before a press becomes a drag

export function KidShelves({ weekly, library, read, title, onOpen, onKeep, onRemove }: {
  weekly: Book[];
  library: Book[];
  read: string[];
  title: { week: string; weekSub: string; library: string; librarySub: string };
  onOpen: (id: string) => void;
  onKeep: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [drag, setDrag] = useState<Drag | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  const press = useRef<{ id: string; from: Zone; x: number; y: number; w: number; touch: boolean; live: boolean; timer?: number } | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  const ghost = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const handlers = useRef({ onKeep, onRemove });
  handlers.current = { onKeep, onRemove };
  const inLibrary = new Set(library.map((b) => b.id));

  const zoneAt = (x: number, y: number): Zone | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-dropzone]');
    return (el?.getAttribute('data-dropzone') as Zone | null) ?? null;
  };
  const lift = (x: number, y: number) => {
    const p = press.current;
    if (!p) return;
    p.live = true;
    navigator.vibrate?.(12);
    pos.current = { x, y };
    setDrag({ id: p.id, from: p.from, x, y, over: zoneAt(x, y), w: p.w });
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = press.current;
      if (!p) return;
      if (!p.live) {
        const far = Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_PX;
        if (far && p.touch) { window.clearTimeout(p.timer); press.current = null; return; } // a touch that moves early is a scroll
        if (far) lift(e.clientX, e.clientY);
        return;
      }
      pos.current = { x: e.clientX, y: e.clientY };
      if (ghost.current) { ghost.current.style.left = e.clientX + 'px'; ghost.current.style.top = e.clientY + 'px'; }
      const over = zoneAt(e.clientX, e.clientY);
      if (over !== dragRef.current?.over) setDrag((d) => (d ? { ...d, over } : d));
    };
    const end = () => {
      const p = press.current;
      press.current = null;
      if (p?.timer) window.clearTimeout(p.timer);
      const d = dragRef.current;
      if (!d) return;
      // Swallow the click that follows a drag, so dropping a book doesn't also open it.
      const swallow = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
      if (d.over === 'library' && !inLibraryRef.current.has(d.id)) { handlers.current.onKeep(d.id); setLanded(d.id); window.setTimeout(() => setLanded(null), 900); }
      if (d.over === 'week' && d.from === 'library') handlers.current.onRemove(d.id);
      setDrag(null);
    };
    // While a book is lifted on a touch screen, stop the page from scrolling under the finger.
    const noScroll = (e: TouchEvent) => { if (dragRef.current) e.preventDefault(); };
    const cancel = () => { press.current = null; setDrag(null); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('touchmove', noScroll, { passive: false });
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && cancel();
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('touchmove', noScroll);
      window.removeEventListener('keydown', esc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const inLibraryRef = useRef(inLibrary);
  inLibraryRef.current = inLibrary;

  const grab = (id: string, from: Zone) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      const w = e.currentTarget.getBoundingClientRect().width;
      const touch = e.pointerType !== 'mouse';
      press.current = { id, from, x: e.clientX, y: e.clientY, w, touch, live: false };
      if (touch) {
        const { clientX, clientY } = e;
        press.current.timer = window.setTimeout(() => lift(clientX, clientY), HOLD_MS);
      }
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    draggable: false,
  });

  const book = drag ? [...weekly, ...library].find((b) => b.id === drag.id) : undefined;
  const fromWeek = drag?.from === 'week';

  return (
    <div className="bk-shelves" data-dragging={drag ? drag.from : undefined}>
      <section className="bk-shelf bk-shelf-week" aria-labelledby="kid-week-book" data-dropzone="week" data-over={drag && !fromWeek && drag.over === 'week' ? '' : undefined}>
        <div className="bk-shelf-head">
          <h2 id="kid-week-book" lang="fr">{title.week}</h2>
          <span className="small">{title.weekSub}</span>
        </div>
        <div className="bk-fan">
          {weekly.map((b) => (
            <BookObject key={b.id} book={b} read={read.includes(b.id)} onOpen={() => onOpen(b.id)} kept={inLibrary.has(b.id)} lifted={drag?.id === b.id && fromWeek} dragProps={grab(b.id, 'week')} />
          ))}
        </div>
        {drag && !fromWeek && <p className="bk-drop-hint" lang="fr">{fr ? 'Lâche ici pour le retirer de ta bibliothèque' : 'Drop here to take it out of your library'}</p>}
      </section>

      <section className="bk-shelf bk-shelf-private" aria-labelledby="kid-library" data-dropzone="library" data-over={drag && fromWeek && drag.over === 'library' ? '' : undefined}>
        <div className="bk-shelf-head">
          <h2 id="kid-library" lang="fr">{title.library}</h2>
          <span className="small">{title.librarySub}</span>
        </div>
        {library.length ? (
          <div className="bk-fan">
            {library.map((b) => (
              <BookObject key={b.id} book={b} read={read.includes(b.id)} onOpen={() => onOpen(b.id)} lifted={drag?.id === b.id && !fromWeek} landed={landed === b.id} dragProps={grab(b.id, 'library')} />
            ))}
          </div>
        ) : (
          <p className="bk-shelf-empty" lang="fr">{fr ? 'Ta bibliothèque est vide. Fais glisser un livre ici, ou touche « ♡ Garder » dans un livre.' : 'Your library is empty. Drag a book here, or tap “♡ Keep” inside a book.'}</p>
        )}
        {drag && fromWeek && <p className="bk-drop-hint" lang="fr">{inLibrary.has(drag.id) ? (fr ? 'Ce livre est déjà dans ta bibliothèque ♡' : 'This book is already in your library ♡') : fr ? 'Lâche ici pour le garder ♡' : 'Drop here to keep it ♡'}</p>}
      </section>

      {/* The book following the finger or the mouse */}
      {drag && book && (
        <div ref={ghost} className="bk-ghost" style={{ left: pos.current.x, top: pos.current.y, width: Math.min(drag.w, 200) }} aria-hidden>
          <BookObject book={book} onOpen={() => undefined} />
        </div>
      )}
      <p className="sr-only" aria-live="polite">{landed ? (fr ? 'Livre rangé dans ta bibliothèque.' : 'Book put in your library.') : ''}</p>
    </div>
  );
}
