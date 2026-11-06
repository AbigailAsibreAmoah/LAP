import { accessLevel, canBuyLevel, canStudy, LEVEL_UNLOCK_PRICE_GHS, levelIndex, levelProductId, type CefrLevel, type Learner, type Milestone } from '@laporte/shared';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/3d/Portrait';
import { AnimatedBar } from '../../components/animations/Reveal';
import { StatusBadge } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Drawer } from '../../components/ui/Overlay';
import { useI18n } from '../../i18n/I18nProvider';
import { formatDate } from '../../utils/format';

/*
 * The Performance Passport as a traveller's map: each CEFR level is a stop on a Francophone route
 * along the West African coast, ending at La Porte's golden door (C2). Finished levels get a
 * passport stamp, the learner stands on the road between their level and the next, each level's
 * milestones are waypoints on the road, and levels not yet bought are hidden in sea mist.
 * Drawn in the same hand-inked, watercolour style as the La Porte Kids books.
 */

type L10n = { en: string; fr: string };
interface Stop { level: CefrLevel; city: string; country: L10n; canDo: L10n; art: 'arch' | 'market' | 'stilts' | 'lagoon' | 'lighthouse' | 'door' }
const STOPS: Stop[] = [
  { level: 'A1', city: 'Accra', country: { en: 'Ghana', fr: 'Ghana' }, canDo: { en: 'First exchanges: introduce yourself and handle simple, familiar situations.', fr: 'Premiers échanges : se présenter et gérer des situations simples et familières.' }, art: 'arch' },
  { level: 'A2', city: 'Lomé', country: { en: 'Togo', fr: 'Togo' }, canDo: { en: 'Everyday and routine work: short conversations, plans, simple descriptions.', fr: 'Le quotidien et le travail courant : courtes conversations, projets, descriptions simples.' }, art: 'market' },
  { level: 'B1', city: 'Cotonou', country: { en: 'Benin', fr: 'Bénin' }, canDo: { en: 'Independent at work: explain an idea, give reasons, deal with most situations.', fr: 'Autonome au travail : expliquer une idée, la justifier, faire face à la plupart des situations.' }, art: 'stilts' },
  { level: 'B2', city: 'Abidjan', country: { en: 'Côte d’Ivoire', fr: 'Côte d’Ivoire' }, canDo: { en: 'Fluent and persuasive: negotiate, argue a case, follow complex discussions.', fr: 'Aisance et persuasion : négocier, défendre une position, suivre des discussions complexes.' }, art: 'lagoon' },
  { level: 'C1', city: 'Dakar', country: { en: 'Senegal', fr: 'Sénégal' }, canDo: { en: 'Nuanced and professional: lead meetings, write reports, adapt your tone.', fr: 'Nuance et professionnalisme : animer des réunions, rédiger des rapports, adapter son registre.' }, art: 'lighthouse' },
  { level: 'C2', city: 'La Porte', country: { en: 'Mastery', fr: 'Maîtrise' }, canDo: { en: 'Mastery: express yourself precisely and naturally in any setting.', fr: 'Maîtrise : s’exprimer avec précision et naturel dans toutes les situations.' }, art: 'door' },
];

/** Two layouts of the same map: a wide coastal route, and a winding trail for narrow screens. */
const LAYOUTS = {
  wide: { w: 1000, h: 560, stops: [[100, 410], [258, 292], [430, 392], [598, 262], [768, 352], [906, 168]] as [number, number][] },
  tall: { w: 400, h: 1330, stops: [[118, 270], [282, 470], [118, 670], [282, 870], [118, 1070], [250, 1250]] as [number, number][] },
};
type Layout = (typeof LAYOUTS)['wide'];

const INK = '#3a2618';
const SKILL_KINDS: { key: 'speaking' | 'listening' | 'reading' | 'writing'; name: L10n; place: L10n; kinds: string[] }[] = [
  { key: 'speaking', name: { en: 'Speaking', fr: 'Expression orale' }, place: { en: 'The market', fr: 'Le marché' }, kinds: ['speaking', 'live'] },
  { key: 'listening', name: { en: 'Listening', fr: 'Compréhension orale' }, place: { en: 'The radio station', fr: 'La radio' }, kinds: ['video'] },
  { key: 'reading', name: { en: 'Reading', fr: 'Compréhension écrite' }, place: { en: 'The library', fr: 'La bibliothèque' }, kinds: ['reading', 'quiz'] },
  { key: 'writing', name: { en: 'Writing', fr: 'Expression écrite' }, place: { en: 'The post office', fr: 'La poste' }, kinds: ['assignment'] },
];

type StopState = 'passed' | 'current' | 'open' | 'unlock' | 'fog';

function seg(a: [number, number], b: [number, number], tall: boolean) {
  const [x1, y1] = a;
  const [x2, y2] = b;
  if (tall) {
    const dy = (y2 - y1) * 0.55;
    return `M${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
  }
  const dx = (x2 - x1) * 0.55;
  return `M${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export function JourneyMap({ milestones, learner, onOpenMilestone, celebrate, readOnly, tall, extra }: { milestones: Milestone[]; learner: Pick<Learner, 'level' | 'unlockedLevel' | 'progressToNext' | 'firstName' | 'portrait'>; onOpenMilestone: (m: Milestone) => void; celebrate: string | null; readOnly?: boolean; tall: boolean; extra?: (m: Milestone) => ReactNode }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const L: Layout = tall ? LAYOUTS.tall : LAYOUTS.wide;
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap, { once: true, margin: '-60px' });
  const segRefs = useRef<(SVGPathElement | null)[]>([]);
  const [stop, setStop] = useState<Stop | null>(null);

  const cur = levelIndex(learner.level);
  const stateOf = (s: Stop, i: number): StopState => {
    if (i < cur) return 'passed';
    if (i === cur) return 'current';
    if (canStudy(learner, s.level)) return 'open';
    if (!readOnly && canBuyLevel(learner, s.level)) return 'unlock';
    return i === levelIndex(accessLevel(learner)) + 1 ? 'unlock' : 'fog';
  };
  const frac = Math.max(0, Math.min(1, learner.progressToNext / 100));

  // Where milestones (waypoints) and the learner sit on the road, measured from the drawn curves.
  const [spots, setSpots] = useState<{ ms: { m: Milestone; x: number; y: number }[]; me: { x: number; y: number } | null }>({ ms: [], me: null });
  useLayoutEffect(() => {
    const at = (i: number, f: number) => {
      const p = segRefs.current[i];
      if (!p) return null;
      const pt = p.getPointAtLength(p.getTotalLength() * f);
      return { x: pt.x, y: pt.y };
    };
    const ms: { m: Milestone; x: number; y: number }[] = [];
    STOPS.forEach((s, i) => {
      const mine = milestones.filter((m) => m.level === s.level);
      mine.forEach((m, k) => {
        const p = i < STOPS.length - 1 ? at(i, (k + 1) / (mine.length + 1)) : { x: L.stops[i][0] - 60 + k * 40, y: L.stops[i][1] + 70 };
        if (p) ms.push({ m, ...p });
      });
    });
    const me = cur < STOPS.length - 1 ? at(cur, Math.max(0.06, frac)) : { x: L.stops[cur][0], y: L.stops[cur][1] };
    setSpots({ ms, me });
  }, [milestones, tall, cur, frac, L]);

  const pct = (x: number, y: number) => ({ left: `${(x / L.w) * 100}%`, top: `${(y / L.h) * 100}%` });
  const doneOn = (lv: CefrLevel) => milestones.filter((m) => m.level === lv && m.completedOn).map((m) => m.completedOn!).sort().pop();
  const next = STOPS[cur + 1];

  // Skills, from the exercises of this level's milestones (no separate skill scores are stored).
  const levelExercises = milestones.filter((m) => m.level === learner.level).flatMap((m) => m.exercises);
  const skills = SKILL_KINDS.map((s) => {
    const ex = levelExercises.filter((e) => s.kinds.includes(e.kind));
    return { ...s, done: ex.filter((e) => e.done).length, total: ex.length };
  });

  return (
    <div className="jm">
      <div ref={wrap} className={`jm-map${tall ? ' jm-tall' : ''}`} style={{ aspectRatio: `${L.w} / ${L.h}` }}>
        <svg className="jm-svg" viewBox={`0 0 ${L.w} ${L.h}`} aria-hidden>
          <defs>
            <filter id={`paint${uid}`} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="warp" />
              <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="drawn" />
              <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="12" result="blot" />
              <feColorMatrix in="blot" type="matrix" values="0.16 0 0 0 0.86  0.16 0 0 0 0.86  0.16 0 0 0 0.86  0 0 0 0 1" result="wash" />
              <feBlend in="drawn" in2="wash" mode="multiply" result="p1" />
              <feComposite in="p1" in2="drawn" operator="in" />
            </filter>
            <filter id={`fog${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" /></filter>
            <filter id={`grey${uid}`}><feColorMatrix type="saturate" values="0.25" /></filter>
          </defs>

          <g filter={`url(#paint${uid})`} className="jm-ink">
            <Land L={L} tall={tall} />
            {/* the road: the whole route faintly, then the part already travelled in gold */}
            {STOPS.slice(0, -1).map((_, i) => (
              <path key={`r${i}`} ref={(el) => { segRefs.current[i] = el; }} d={seg(L.stops[i], L.stops[i + 1], tall)} fill="none" stroke="#C7AE84" strokeWidth="14" strokeLinecap="round" opacity="0.45" />
            ))}
            {STOPS.slice(0, -1).map((_, i) => <path key={`d${i}`} d={seg(L.stops[i], L.stops[i + 1], tall)} fill="none" stroke="#8C7350" strokeWidth="2.4" strokeDasharray="3 10" strokeLinecap="round" />)}
            {STOPS.slice(0, -1).map((_, i) => {
              const f = i < cur ? 1 : i === cur ? frac : 0;
              if (!f) return null;
              return (
                <motion.path key={`g${i}`} d={seg(L.stops[i], L.stops[i + 1], tall)} fill="none" stroke="#C49A5A" strokeWidth="6" strokeLinecap="round" pathLength={1}
                  initial={{ pathLength: reduce ? f : 0 }} animate={{ pathLength: inView || reduce ? f : 0 }} transition={{ duration: 1.1, delay: reduce ? 0 : 0.3 + i * 0.5, ease: 'easeInOut' }} />
              );
            })}
            {STOPS.map((s, i) => {
              const st = stateOf(s, i);
              const [x, y] = L.stops[i];
              return (
                <g key={s.level} filter={st === 'unlock' || st === 'fog' ? `url(#grey${uid})` : undefined} opacity={st === 'fog' ? 0.55 : 1}>
                  <CityArt kind={s.art} x={x} y={y - 26} lit={st !== 'fog' && st !== 'unlock'} />
                  <circle cx={x} cy={y} r="13" fill={st === 'passed' ? '#C49A5A' : st === 'current' ? '#6E1630' : '#FBF5EC'} stroke={INK} strokeWidth="2.4" />
                </g>
              );
            })}
          </g>

          {/* sea mist over levels that aren't open yet */}
          {STOPS.map((s, i) => stateOf(s, i) === 'fog' && <ellipse key={`f${i}`} cx={L.stops[i][0]} cy={L.stops[i][1] - 30} rx={tall ? 120 : 110} ry="78" fill="#FBF7EF" opacity="0.9" filter={`url(#fog${uid})`} />)}

          {/* passport stamps on finished levels */}
          {STOPS.map((s, i) => stateOf(s, i) === 'passed' && <Stamp key={`s${i}`} id={`${uid}${i}`} x={L.stops[i][0] + (tall ? 70 : 46)} y={L.stops[i][1] - (tall ? 40 : 76)} city={s.city} level={s.level} date={doneOn(s.level)} lang={lang} />)}
        </svg>

        {/* Title cartouche */}
        <div className={`jm-cartouche${tall ? ' jm-cartouche-tall' : ''}`}>
          <span className="jm-kicker">{fr ? 'Passeport de performance' : 'Performance Passport'}</span>
          <strong lang="fr">{fr ? `La route francophone de ${learner.firstName}` : `${learner.firstName}’s Francophone route`}</strong>
        </div>

        {/* Stops (buttons) */}
        {STOPS.map((s, i) => {
          const st = stateOf(s, i);
          const [x, y] = L.stops[i];
          return (
            <button key={s.level} type="button" className="jm-stop" data-state={st} style={pct(x, y)} onClick={() => setStop(s)} aria-label={`${s.level} · ${s.city} — ${stateLabel(st, fr)}`}>
              <span className="jm-stop-label">
                <span className="jm-level">{s.level}</span>
                <span className="jm-city">{s.city}</span>
              </span>
              {st === 'fog' && <span className="jm-lock"><Icon name="lock" size={13} /></span>}
              {st === 'unlock' && !readOnly && <span className="jm-unlock">{fr ? 'À débloquer' : 'Unlock'}</span>}
            </button>
          );
        })}

        {/* Milestones on the road */}
        {spots.ms.map(({ m, x, y }) => {
          const lvl = levelIndex(m.level);
          const hidden = stateOf(STOPS[lvl], lvl) === 'fog';
          if (hidden) return null;
          return (
            <button key={m.id} type="button" className="jm-way" data-status={m.status} style={pct(x, y)} onClick={() => onOpenMilestone(m)} aria-label={`${l(m.title)} (${m.level})`} title={l(m.title)}>
              {m.status === 'completed' ? <Icon name="check" size={12} stroke={3} /> : m.status === 'in-progress' ? <span className="jm-way-dot" /> : <Icon name="lock" size={10} />}
              {celebrate === m.id && extra?.(m)}
            </button>
          );
        })}

        {/* You are here */}
        {spots.me && (
          <div className="jm-me" style={pct(spots.me.x, spots.me.y)}>
            <motion.div className="jm-me-inner" initial={{ opacity: 0, y: -10 }} animate={inView || reduce ? { opacity: 1, y: 0 } : {}} transition={{ delay: reduce ? 0 : 1.6 }}>
            <span className="jm-me-tag">{fr ? 'Vous êtes ici' : 'You are here'} · {learner.progressToNext}%</span>
            <span className="jm-me-pin"><Avatar spec={learner.portrait} size={38} expression="smile" /></span>
            </motion.div>
          </div>
        )}
        <Compass tall={tall} />
      </div>

      {/* Landmarks of the current city: one per skill */}
      <div className="jm-skills" aria-label={fr ? 'Compétences du niveau' : 'Skills at this level'}>
        <div className="jm-skills-head">
          <strong>{fr ? `Les repères de ${STOPS[cur].city}` : `Landmarks in ${STOPS[cur].city}`} · {learner.level}</strong>
          <span className="tiny muted">{fr ? 'D’après les exercices des jalons de ce niveau' : 'From the exercises in this level’s milestones'}</span>
        </div>
        <div className="jm-skill-grid">
          {skills.map((s) => (
            <div key={s.key} className="jm-skill">
              <SkillIcon kind={s.key} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="jm-skill-name">{l(s.name)}</div>
                <div className="tiny muted">{l(s.place)} · {s.total ? `${s.done}/${s.total}` : fr ? 'pas encore d’exercice' : 'no exercise yet'}</div>
                <div className="jm-bar"><span style={{ width: `${s.total ? (s.done / s.total) * 100 : 0}%` }} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Drawer open={!!stop} onClose={() => setStop(null)} title={stop ? `${stop.level} · ${stop.city}` : ''}>
        {stop && (() => {
          const i = levelIndex(stop.level);
          const st = stateOf(stop, i);
          const mine = milestones.filter((m) => m.level === stop.level);
          return (
            <div className="stack" style={{ ['--gap' as string]: '18px' }}>
              <div className="row">
                <span className="chip">CEFR {stop.level}</span>
                <span className="chip chip-outline">{l(stop.country)}</span>
                <span className="tiny muted">{stateLabel(st, fr)}</span>
              </div>
              <div className="jm-drawer-art"><svg viewBox="-80 -110 160 130" aria-hidden><CityArt kind={stop.art} x={0} y={0} lit={st !== 'fog'} big /></svg></div>
              <p className="italic" style={{ fontSize: '1.05rem', color: 'var(--navy)' }}>{l(stop.canDo)}</p>
              {st === 'current' && (
                <>
                  <AnimatedBar value={learner.progressToNext} label={fr ? `Vers ${next?.level ?? ''}` : `Towards ${next?.level ?? ''}`} />
                  {next && <p className="small muted">{fr ? `Prochaine étape : ${next.city} (${next.level}).` : `Next stop: ${next.city} (${next.level}).`}</p>}
                </>
              )}
              {st === 'passed' && <p className="small">✓ {fr ? 'Niveau validé' : 'Level completed'}{doneOn(stop.level) ? ` · ${formatDate(doneOn(stop.level)!, lang, { day: 'numeric', month: 'long', year: 'numeric' })}` : fr ? ' (test de positionnement)' : ' (placement test)'}</p>}
              {(st === 'unlock' || st === 'fog') && (
                <p className="small muted">{fr ? `Les cours ${stop.level} s’ouvrent quand vous débloquez ce niveau, une fois le niveau précédent terminé.` : `${stop.level} courses open when you unlock this level, once you have finished the one before.`}</p>
              )}
              {st === 'unlock' && !readOnly && canBuyLevel(learner, stop.level) && (
                <Link to={`/app/checkout/${levelProductId(stop.level)}`} className="btn btn-primary" onClick={() => setStop(null)}>
                  <Icon name="lock" size={16} /> {fr ? `Débloquer ${stop.level} · GH₵ ${LEVEL_UNLOCK_PRICE_GHS}` : `Unlock ${stop.level} · GH₵ ${LEVEL_UNLOCK_PRICE_GHS}`}
                </Link>
              )}
              {mine.length > 0 && (
                <section>
                  <h3 className="h4" style={{ marginBottom: 8 }}>{fr ? 'Jalons sur la route' : 'Milestones on the road'}</h3>
                  <div className="stack" style={{ ['--gap' as string]: '8px' }}>
                    {mine.map((m) => (
                      <button key={m.id} type="button" className="list-row" style={{ width: '100%', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => { setStop(null); onOpenMilestone(m); }}>
                        <Icon name={m.status === 'completed' ? 'checkCircle' : m.status === 'in-progress' ? 'clock' : 'lock'} size={18} />
                        <span style={{ flex: 1 }}>{l(m.title)}</span>
                        <StatusBadge status={m.status}>{m.status === 'completed' ? (fr ? 'Validé' : 'Done') : m.status === 'in-progress' ? `${m.progress}%` : fr ? 'À venir' : 'Ahead'}</StatusBadge>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
}

const stateLabel = (s: StopState, fr: boolean) =>
  ({ passed: fr ? 'Validé' : 'Completed', current: fr ? 'Votre niveau' : 'Your level', open: fr ? 'Ouvert' : 'Open', unlock: fr ? 'Prochain niveau à débloquer' : 'Next level to unlock', fog: fr ? 'Plus loin sur la route' : 'Further along the route' })[s];

/* ======================= Drawings ======================= */

/** Paper, land, sea, rivers and a few trees. */
function Land({ L, tall }: { L: Layout; tall: boolean }) {
  const { w, h } = L;
  if (tall) {
    return (
      <g>
        <rect width={w} height={h} fill="#F6EEDD" />
        <path d={`M0 0 L 60 0 C 40 200, 70 380, 36 560 S 58 900, 30 1060 S 50 1200, 40 ${h} L 0 ${h} Z`} fill="#BFDCE3" />
        {[180, 420, 700, 980].map((y) => <path key={y} d={`M8 ${y} q 8 -5 16 0 t 16 0`} stroke="#8DB8C6" strokeWidth="2" fill="none" />)}
        {[[230, 260, 80], [140, 460, 70], [270, 660, 90], [160, 860, 80], [280, 1060, 70]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.45} fill={i % 2 ? '#DCCB9A' : '#CBD5A6'} opacity="0.55" />)}
        <path d="M400 300 C 330 320, 360 420, 300 460 S 220 520, 200 620" stroke="#A9CFDA" strokeWidth="7" fill="none" strokeLinecap="round" />
        <Trees pts={[[330, 120], [350, 470], [60, 680], [340, 900], [70, 1110]]} />
      </g>
    );
  }
  return (
    <g>
      <rect width={w} height={h} fill="#F6EEDD" />
      {[[180, 200, 120], [520, 170, 140], [380, 300, 90], [700, 220, 110], [860, 330, 90]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.42} fill={i % 2 ? '#DCCB9A' : '#CBD5A6'} opacity="0.55" />)}
      <path d={`M0 ${h - 70} C 140 ${h - 96}, 300 ${h - 50}, 460 ${h - 82} S 760 ${h - 60}, ${w} ${h - 110} L ${w} ${h} L 0 ${h} Z`} fill="#BFDCE3" />
      {[80, 300, 540, 800].map((x, i) => <path key={x} d={`M${x} ${h - 30 - (i % 2) * 14} q 10 -6 20 0 t 20 0 t 20 0`} stroke="#8DB8C6" strokeWidth="2" fill="none" />)}
      <ellipse cx="648" cy="318" rx="60" ry="16" fill="#BFDCE3" />
      <path d="M520 0 C 500 80, 560 120, 520 190 S 470 260, 500 330" stroke="#A9CFDA" strokeWidth="7" fill="none" strokeLinecap="round" />
      <Trees pts={[[60, 250], [190, 120], [350, 210], [480, 130], [690, 150], [840, 250], [960, 300]]} />
    </g>
  );
}
function Trees({ pts }: { pts: number[][] }) {
  return <g>{pts.map(([x, y], i) => <g key={i}><rect x={x - 2} y={y} width="4" height="14" fill="#6B4A2E" /><circle cx={x} cy={y - 4} r="12" fill={i % 2 ? '#7FA35A' : '#6E944C'} stroke={INK} strokeWidth="1.8" /><circle cx={x + 12} cy={y + 2} r="8" fill="#89AE62" stroke={INK} strokeWidth="1.6" /></g>)}</g>;
}
function Compass({ tall }: { tall: boolean }) {
  return (
    <svg className={`jm-compass${tall ? ' jm-compass-tall' : ''}`} viewBox="-30 -30 60 60" aria-hidden>
      <circle r="22" fill="#FBF5EC" stroke={INK} strokeWidth="1.6" />
      <path d="M0 -26 L 5 0 L 0 26 L -5 0 Z" fill="#6E1630" stroke={INK} strokeWidth="1.2" />
      <path d="M-26 0 L 0 -5 L 26 0 L 0 5 Z" fill="#C49A5A" stroke={INK} strokeWidth="1.2" />
      <text y="-13" textAnchor="middle" fontSize="8" fontWeight="800" fill={INK} dy="-15">N</text>
    </svg>
  );
}

/** A small inked drawing of each city: what you'd sketch on a travel map. */
function CityArt({ kind, x, y, lit, big }: { kind: Stop['art']; x: number; y: number; lit: boolean; big?: boolean }) {
  const s = big ? 1.4 : 1;
  const ink = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' as const };
  const c = (on: string, off = '#D8CDBA') => (lit ? on : off);
  let art: ReactNode = null;
  switch (kind) {
    case 'arch': // Accra: the Independence Arch with its black star
      art = <g><rect x="-44" y="-58" width="88" height="58" fill={c('#E9DCC2')} {...ink} /><path d="M-24 0 V -30 a 24 24 0 0 1 48 0 V 0 Z" fill={c('#F6EEDD')} {...ink} /><rect x="-50" y="-66" width="100" height="10" fill={c('#C9B48E')} {...ink} /><path d="M0 -88 l 5 11 h 12 l -10 7 l 4 12 l -11 -7 l -11 7 l 4 -12 l -10 -7 h 12 z" fill="#1B1B1B" {...ink} strokeWidth={1.2} /></g>;
      break;
    case 'market': // Lomé: market umbrellas and baskets
      art = <g>{[[-34, '#C0392B'], [0, '#E8B23A'], [34, '#1F6B4F']].map(([dx, col], k) => <g key={k}><path d={`M${(dx as number) - 26} -40 Q ${dx} -70 ${(dx as number) + 26} -40 Z`} fill={c(col as string)} {...ink} /><path d={`M${dx} -40 V 0`} stroke={INK} strokeWidth="2.4" /></g>)}<rect x="-52" y="-16" width="104" height="16" fill={c('#C49A5A')} {...ink} />{[-30, -10, 10, 30].map((dx) => <circle key={dx} cx={dx} cy="-20" r="5" fill={c('#E67E22')} {...ink} strokeWidth={1.4} />)}</g>;
      break;
    case 'stilts': // Cotonou: stilt houses on the lake, with a pirogue
      art = <g><ellipse cx="0" cy="-2" rx="58" ry="9" fill={c('#BFDCE3')} {...ink} strokeWidth={1.4} />{[-26, 22].map((dx, k) => <g key={k}>{[-12, 0, 12].map((p) => <path key={p} d={`M${dx + p} -2 V -22`} stroke={INK} strokeWidth="2.4" />)}<rect x={dx - 18} y="-46" width="36" height="24" fill={c('#C9875A')} {...ink} /><path d={`M${dx - 24} -44 L ${dx} -64 L ${dx + 24} -44 Z`} fill={c('#D8B26A')} {...ink} /></g>)}<path d="M-20 2 q 20 8 40 0 z" fill={c('#6E4426')} {...ink} strokeWidth={1.4} /></g>;
      break;
    case 'lagoon': // Abidjan: towers of the Plateau over the lagoon
      art = <g><ellipse cx="0" cy="-2" rx="60" ry="8" fill={c('#BFDCE3')} {...ink} strokeWidth={1.4} />{[[-40, 44, '#9DC3E6'], [-18, 72, '#E6DCC6'], [6, 58, '#C9CFD8'], [30, 40, '#9DC3E6']].map(([dx, hh, col], k) => <rect key={k} x={dx as number} y={-(hh as number)} width="20" height={hh as number} fill={c(col as string)} {...ink} />)}<path d="M-18 -72 L -8 -88 L 2 -72 Z" fill={c('#E6DCC6')} {...ink} />{[-36, -14, 10, 34].map((dx) => <path key={dx} d={`M${dx} -30 h 12 M${dx} -18 h 12`} stroke={INK} strokeWidth="1.2" opacity="0.6" />)}</g>;
      break;
    case 'lighthouse': // Dakar: the lighthouse on the Mamelles hill, and a baobab
      art = <g><path d="M-60 0 Q -30 -40 0 -36 Q 30 -40 60 0 Z" fill={c('#CBB27E')} {...ink} /><path d="M-6 -36 L -4 -84 L 4 -84 L 6 -36 Z" fill={c('#F6EEDD')} {...ink} /><rect x="-7" y="-94" width="14" height="10" fill={c('#C0392B')} {...ink} />{lit && <path d="M7 -89 L 40 -100 L 40 -78 Z" fill="#FFE08A" opacity="0.6" />}<g transform="translate(-38 -16)"><path d="M-4 0 V -22 M4 0 V -22" stroke={INK} strokeWidth="5" /><ellipse cx="0" cy="-28" rx="16" ry="8" fill={c('#7FA35A')} {...ink} /></g></g>;
      break;
    case 'door': // La Porte: the golden arched door, C2
      art = <g>{lit && [0, 1, 2, 3, 4, 5, 6].map((k) => <path key={k} d={`M0 -46 L ${Math.cos(Math.PI + (k * Math.PI) / 6) * 64} ${-46 + Math.sin(Math.PI + (k * Math.PI) / 6) * 64}`} stroke="#E8C26A" strokeWidth="3" opacity="0.6" />)}<path d="M-30 0 V -50 a 30 30 0 0 1 60 0 V 0 Z" fill={c('#6E1630')} {...ink} /><path d="M-20 0 V -48 a 20 20 0 0 1 40 0 V 0 Z" fill={c('#E8C26A')} {...ink} /><circle cx="10" cy="-24" r="3" fill={INK} /></g>;
      break;
  }
  return <g transform={`translate(${x} ${y}) scale(${s})`}>{art}</g>;
}

/** A passport entry stamp: double ring, the city and level around the edge, the date inside. */
function Stamp({ id, x, y, city, level, date, lang }: { id: string; x: number; y: number; city: string; level: string; date?: string; lang: 'en' | 'fr' }) {
  const fr = lang === 'fr';
  return (
    <g transform={`translate(${x} ${y}) rotate(-14)`} className="jm-stamp" opacity="0.88">
      <defs><path id={`arc${id}`} d="M-27 0 a 27 27 0 1 1 54 0 a 27 27 0 1 1 -54 0" /></defs>
      <circle r="36" fill="none" stroke="#8E1F3C" strokeWidth="2.6" />
      <circle r="31" fill="none" stroke="#8E1F3C" strokeWidth="1.2" />
      <text fontSize="8.5" fontWeight="800" letterSpacing="1.6" fill="#8E1F3C"><textPath href={`#arc${id}`}>{`${city.toUpperCase()} · ${level} · LA PORTE ·`}</textPath></text>
      <text y="-2" textAnchor="middle" fontSize="15" fontWeight="900" fill="#8E1F3C">✓ {level}</text>
      <text y="12" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#8E1F3C">{date ? formatDate(date, lang, { day: 'numeric', month: 'short', year: '2-digit' }) : fr ? 'PLACEMENT' : 'PLACED'}</text>
    </g>
  );
}

function SkillIcon({ kind }: { kind: 'speaking' | 'listening' | 'reading' | 'writing' }) {
  const ink = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <svg className="jm-skill-icon" viewBox="-24 -24 48 48" aria-hidden>
      <circle r="23" fill="#FBF5EC" stroke="#E2D3B6" strokeWidth="1.5" />
      {kind === 'speaking' && <g><path d="M-14 -2 Q 0 -20 14 -2 Z" {...ink} fill="#C0392B" /><path d="M0 -2 V 14" {...ink} /><path d="M-12 14 h 24" {...ink} /></g>}
      {kind === 'listening' && <g><path d="M-3 14 L 0 -12 L 3 14 M-8 14 h 16" {...ink} /><path d="M-8 -14 q -6 4 0 8 M8 -14 q 6 4 0 8 M-13 -18 q -9 8 0 16 M13 -18 q 9 8 0 16" {...ink} /></g>}
      {kind === 'reading' && <g><path d="M-14 14 V -6 L 0 -16 L 14 -6 V 14 Z" {...ink} fill="#E9DCC2" /><path d="M-8 14 V 0 M0 14 V 0 M8 14 V 0" {...ink} /></g>}
      {kind === 'writing' && <g><rect x="-14" y="-8" width="28" height="20" rx="2" {...ink} fill="#F6EEDD" /><path d="M-14 -8 L 0 4 L 14 -8" {...ink} /><path d="M6 -18 l 6 6" {...ink} stroke="#6E1630" /></g>}
    </svg>
  );
}

