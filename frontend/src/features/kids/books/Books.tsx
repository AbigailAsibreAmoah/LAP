import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { readAloud } from './readAloud';
import { Scene } from './Scene';
import type { Book } from './stories';

/* ======================= A book on the shelf (3D object) ======================= */

export function BookObject({ book, recommended, read, onOpen }: { book: Book; recommended?: boolean; read?: boolean; onOpen: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  return (
    <button type="button" className="bk3d-slot" onClick={onOpen} aria-label={`${book.title} · ${fr ? 'pour les' : 'ages'} ${book.ages}${fr ? ' ans' : ''}`}>
      {recommended && <span className="bk3d-ribbon">{fr ? 'Pour toi' : 'For you'}</span>}
      <span className="bk3d" style={{ ['--cloth' as string]: book.cloth, ['--ink' as string]: book.ink }}>
        <span className="bk3d-face bk3d-front">
          <Scene kind={book.cover.scene} time={book.cover.time} props={book.cover.props} cast={book.cover.cast} className="bk3d-art" />
          <span className="bk3d-titlebox">
            <span className="bk3d-title" lang="fr">{book.title}</span>
            <span className="bk3d-sub">{fr ? 'Une histoire bilingue' : 'A bilingual story'}</span>
          </span>
          <span className="bk3d-foot">La Porte Kids · {book.ages} {fr ? 'ans' : 'yrs'}</span>
          {read && <span className="bk3d-read" aria-label={fr ? 'Lu' : 'Read'}>★</span>}
          <span className="bk3d-gloss" aria-hidden />
        </span>
        <span className="bk3d-face bk3d-spine"><span lang="fr">{book.title}</span></span>
        <span className="bk3d-face bk3d-pages" />
        <span className="bk3d-face bk3d-top" />
      </span>
    </button>
  );
}

/* ======================= Reading: an open book with real page turns ======================= */


export function BookReader({ book, childName, saved, onToggleSave, onFinish, onExit }: { book: Book; childName: string; saved?: boolean; onToggleSave?: () => void; onFinish: (score: number, total: number) => void; onExit: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const reduce = useReducedMotion();
  const last = book.pages.length; // index of the end spread; -1 is the title spread
  const [at, setAt] = useState(-1);
  const [flip, setFlip] = useState<null | { from: number; to: number }>(null);
  const [word, setWord] = useState(-1);
  const [reading, setReading] = useState(false);
  const [auto, setAuto] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const [single, setSingle] = useState(false);
  const stop = useRef<() => void>(() => undefined);
  const autoRef = useRef(false);
  autoRef.current = auto;
  const wrap = useRef<HTMLDivElement>(null);

  // One page at a time on narrow screens.
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setSingle(e.contentRect.width < 760));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const turn = useCallback((to: number) => {
    if (flip || to < -1 || to > last || to === at) return;
    stop.current();
    setReading(false);
    setWord(-1);
    if (reduce || single) setAt(to);
    else setFlip({ from: at, to });
  }, [flip, last, at, reduce, single]);

  const read = useCallback((i: number) => {
    const text = book.pages[i]?.fr;
    if (!text) return;
    stop.current();
    setReading(true);
    stop.current = readAloud(text, setWord, () => {
      setReading(false);
      setWord(-1);
    });
  }, [book]);

  // Read each new page in "read it to me" mode, then turn the page by itself.
  useEffect(() => {
    if (!auto || flip || at < 0 || at >= last) return;
    const text = book.pages[at].fr;
    stop.current();
    setReading(true);
    stop.current = readAloud(text, setWord, () => {
      setReading(false);
      setWord(-1);
      window.setTimeout(() => autoRef.current && turn(at + 1), 1100);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, at, flip]);
  useEffect(() => () => stop.current(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') turn(at + 1);
      if (e.key === 'ArrowLeft') turn(at - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn, at]);

  /* ---- what each half of a spread shows ---- */
  const leftOf = (i: number): ReactNode => {
    if (i === -1) return <Endpaper childName={childName} />;
    if (i >= last) return <EndArt book={book} />;
    return <SpreadArt book={book} i={i} side="left" />;
  };
  const rightOf = (i: number): ReactNode => {
    if (i === -1) return <TitlePage book={book} />;
    if (i >= last) return <EndPage book={book} onFinish={onFinish} onAgain={() => setAt(-1)} onExit={onExit} />;
    return (
      <>
        <SpreadArt book={book} i={i} side="right" />
        {textPanel(i)}
      </>
    );
  };
  // The text sits on a cream panel over the quiet part of the picture, as in a printed picture book.
  const textPanel = (i: number) => {
    const p = book.pages[i];
    return (
      <div className="bk-textpanel" style={{ ['--fs' as string]: p.fr.length > 220 ? 0.6 : p.fr.length > 150 ? 0.68 : p.fr.length > 90 ? 0.8 : 1 }}>
        <p className="bk-fr" lang="fr">{frenchWords(p.fr).map(({ w, gap }, k) => <span key={k} className="bk-word" data-on={(i === at && k === word) || undefined}>{w}{gap}</span>)}</p>
        {showEn && <p className="bk-en">{p.en}</p>}
        <span className="bk-folio">{i + 1}</span>
      </div>
    );
  };

  const base: { left: number; right: number } = flip ? (flip.to > flip.from ? { left: flip.from, right: flip.to } : { left: flip.to, right: flip.from }) : { left: at, right: at };
  const forward = flip ? flip.to > flip.from : true;
  const progress = Math.max(0, Math.min(1, (at + 1) / (last + 1)));

  return (
    <div className="bk-reader" ref={wrap}>
      <div className="bk-toolbar">
        <button className="btn btn-ghost btn-sm" onClick={() => { stop.current(); onExit(); }}>← {fr ? 'La bibliothèque' : 'The bookshelf'}</button>
        <span className="bk-progress" aria-hidden><span style={{ width: `${progress * 100}%` }} /></span>
        {onToggleSave && <button className={`btn btn-sm ${saved ? 'btn-brand' : 'btn-ghost'}`} aria-pressed={!!saved} onClick={onToggleSave}>{saved ? '♥' : '♡'} {saved ? (fr ? 'Dans ma bibliothèque' : 'In my library') : fr ? 'Garder' : 'Keep'}</button>}
        <button className="btn btn-ghost btn-sm" aria-pressed={showEn} onClick={() => setShowEn((s) => !s)}>{showEn ? (fr ? 'Cacher l’anglais' : 'Hide English') : 'English'}</button>
      </div>

      {single ? (
        <motion.div key={at} className="bk-single" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
          <div className="bk-paper bk-paper-single">
            {at >= 0 && at < last ? (
              <>
                <Scene kind={book.pages[at].scene} time={book.pages[at].time} props={book.pages[at].props} cast={book.pages[at].cast} />
                {textPanel(at)}
              </>
            ) : (
              rightOf(at)
            )}
          </div>
        </motion.div>
      ) : (
        <div className="bk-desk">
          <div className="bk-open" style={{ ['--cloth' as string]: book.cloth }}>
            <div className="bk-half bk-left"><div className="bk-paper">{leftOf(base.left)}</div></div>
            <div className="bk-half bk-right"><div className="bk-paper">{rightOf(base.right)}</div></div>
            <div className="bk-gutter" aria-hidden />
            {flip && (
              <motion.div
                className={`bk-leaf ${forward ? 'bk-leaf-r' : 'bk-leaf-l'}`}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: forward ? -180 : 180 }}
                transition={{ duration: 0.85, ease: [0.45, 0.05, 0.25, 1] }}
                onAnimationComplete={() => { setAt(flip.to); setFlip(null); }}
              >
                <div className="bk-leaf-face bk-leaf-front"><div className="bk-paper">{forward ? rightOf(flip.from) : leftOf(flip.from)}</div><span className="bk-leaf-shade" /></div>
                <div className="bk-leaf-face bk-leaf-back"><div className="bk-paper">{forward ? leftOf(flip.to) : rightOf(flip.to)}</div><span className="bk-leaf-shade" /></div>
              </motion.div>
            )}
            <span className="bk-stack bk-stack-l" aria-hidden style={{ ['--n' as string]: Math.max(1, at + 2) }} />
            <span className="bk-stack bk-stack-r" aria-hidden style={{ ['--n' as string]: Math.max(1, last - at) }} />
          </div>
        </div>
      )}

      <div className="bk-controls">
        <button className="bk-turn" disabled={at <= -1 || !!flip} onClick={() => turn(at - 1)} aria-label={fr ? 'Page précédente' : 'Previous page'}>‹</button>
        {at >= 0 && at < last ? (
          <>
            <button className="btn btn-secondary" onClick={() => (reading ? (stop.current(), setReading(false), setWord(-1)) : read(at))}>{reading ? '⏸' : '🔊'} {fr ? 'Écouter' : 'Listen'}</button>
            <button className={`btn ${auto ? 'btn-brand' : 'btn-ghost'}`} aria-pressed={auto} onClick={() => { setAuto((a) => !a); if (auto) stop.current(); }}>{fr ? 'Lis-moi l’histoire' : 'Read it to me'}</button>
          </>
        ) : at === -1 ? (
          <button className="btn btn-brand" onClick={() => turn(0)}>{fr ? 'Commencer l’histoire' : 'Start the story'} →</button>
        ) : null}
        <button className="bk-turn" disabled={at >= last || !!flip} onClick={() => turn(at + 1)} aria-label={fr ? 'Page suivante' : 'Next page'}>›</button>
      </div>
    </div>
  );
}

/**
 * Words for display (same split as the read-aloud, so the highlight lines up), joined the way
 * French is printed: a non-breaking space before ? ! : ; » and after «, so they never wrap alone.
 */
function frenchWords(text: string) {
  const words = text.split(/\s+/);
  return words.map((w, k) => {
    const next = words[k + 1];
    const gap = next === undefined ? '' : /^[?!:;»]/.test(next) || w === '«' ? ' ' : ' ';
    return { w, gap };
  });
}

/** One half of a full-spread illustration: the picture runs across both pages, like a printed picture book. */
function SpreadArt({ book, i, side }: { book: Book; i: number; side: 'left' | 'right' }) {
  const p = book.pages[i];
  return (
    <div className={`bk-spread-art bk-spread-${side}`}>
      <Scene kind={p.scene} time={p.time} props={p.props} cast={p.cast} />
    </div>
  );
}

/* ---------------- Special pages ---------------- */

function Endpaper({ childName }: { childName: string }) {
  const { lang } = useI18n();
  return (
    <div className="bk-endpaper">
      <div className="bk-bookplate">
        <span className="bk-bookplate-mark" aria-hidden>❦</span>
        <span lang="fr">Ce livre appartient à</span>
        <strong>{childName}</strong>
        <span className="tiny">{lang === 'fr' ? 'La Porte Kids' : 'La Porte Kids library'}</span>
      </div>
    </div>
  );
}

function TitlePage({ book }: { book: Book }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  return (
    <div className="bk-titlepage">
      <span className="bk-kicker">La Porte Kids · {book.level}</span>
      <h2 className="bk-h" lang="fr">{book.title}</h2>
      {!fr && <span className="bk-sub">{book.titleEn}</span>}
      <div className="bk-vignette"><Scene kind={book.cover.scene} time={book.cover.time} props={book.cover.props} cast={book.cover.cast} /></div>
      <p className="bk-blurb">{fr ? book.blurb.fr : book.blurb.en}</p>
      <span className="bk-age">{fr ? `Pour les ${book.ages} ans` : `For ages ${book.ages}`}</span>
    </div>
  );
}

const EndArt = ({ book }: { book: Book }) => {
  const p = book.pages[book.pages.length - 1];
  return <Scene kind={p.scene} time={p.time === 'day' ? 'dusk' : p.time} props={p.props} cast={p.cast} className="bk-illus" />;
};

function EndPage({ book, onFinish, onAgain, onExit }: { book: Book; onFinish: (score: number, total: number) => void; onAgain: () => void; onExit: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const qs = book.questions ?? [];
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const done = useRef(false);
  const score = qs.filter((q, i) => picked[i] === q.answer).length;
  // Books without questions count as read when the last page is reached.
  useEffect(() => {
    if (!qs.length && !done.current) {
      done.current = true;
      onFinish(1, 1);
    }
  }, [qs.length, onFinish]);
  return (
    <div className="bk-endpage">
      <h2 className="bk-h" lang="fr">Fin</h2>
      <span className="bk-ornament" aria-hidden>❦</span>
      {qs.length > 0 && (
        <div className="bk-quiz">
          <span className="bk-kicker">{fr ? 'As-tu bien compris ?' : 'Did you understand?'}</span>
          {qs.map((q, i) => (
            <fieldset key={i} className="bk-q">
              <legend lang="fr">{i + 1}. {q.q}</legend>
              {q.options.map((o, k) => (
                <label key={k} className="bk-opt" data-state={checked ? (k === q.answer ? 'right' : picked[i] === k ? 'wrong' : undefined) : undefined}>
                  <input type="radio" name={`bkq-${i}`} disabled={checked} checked={picked[i] === k} onChange={() => setPicked((p) => ({ ...p, [i]: k }))} /> <span lang="fr">{o}</span>
                </label>
              ))}
              {checked && <span className="bk-why" lang="fr">{q.why}</span>}
            </fieldset>
          ))}
          {!checked ? (
            <button className="btn btn-brand btn-sm" disabled={Object.keys(picked).length < qs.length} onClick={() => { setChecked(true); if (!done.current) { done.current = true; onFinish(score, qs.length); } }}>{fr ? 'Vérifier' : 'Check'}</button>
          ) : (
            <p className="bk-score">{fr ? `${score} sur ${qs.length}` : `${score} out of ${qs.length}`} {score === qs.length ? '🌟' : ''}</p>
          )}
        </div>
      )}
      {book.glossary && (
        <div className="bk-glossary">
          <span className="bk-kicker">{fr ? 'Mots à retenir' : 'Words to remember'}</span>
          <dl>{book.glossary.map((g) => <div key={g.fr}><dt lang="fr">{g.fr}</dt><dd>{g.en}</dd></div>)}</dl>
        </div>
      )}
      {book.reflect && <p className="bk-reflect">💭 {fr ? book.reflect.fr : book.reflect.en}</p>}
      <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onAgain}>{fr ? 'Relire' : 'Read again'}</button>
        <button className="btn btn-brand btn-sm" onClick={onExit}>{fr ? 'Un autre livre' : 'Another book'}</button>
      </div>
    </div>
  );
}
