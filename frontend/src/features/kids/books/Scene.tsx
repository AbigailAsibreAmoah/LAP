import { useReducedMotion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { Figure, isAdult, type Pose } from './Figure';
import { CAST, type CastMember, type PropName, type SceneKind, type TimeOfDay } from './stories';

/*
 * Picture-book illustrations, painted in the browser:
 *  - every shape gets an ink outline and the whole picture passes through a "paint" filter that
 *    wobbles the lines a little (as if drawn by hand) and adds watercolour grain;
 *  - on a page, the picture has no frame: its edges are ragged and fade into the paper;
 *  - characters are drawn full length in a pose (walking, jumping, waving);
 *  - motion is hand-made: the lines "boil" (redrawn three times a second) and walking or jumping
 *    characters swap between two drawn frames, instead of smooth computer easing.
 */

const W = 800;
const H = 500;
const HORIZON = 300;

const SKY: Record<TimeOfDay, [string, string, string]> = {
  day: ['#8DC8EC', '#CFE8F2', '#F7E9CF'],
  dusk: ['#3E4C80', '#E9836A', '#F9CF91'],
  night: ['#0E1631', '#1F2A55', '#3A4673'],
};
/** On a page the sky is a pale wash, so the picture sits in the paper like a painting. */
const SKY_PAGE: Record<TimeOfDay, [string, string, string]> = {
  day: ['#DCEEF5', '#EEF5EE', '#FBF3E2'],
  dusk: ['#B8B2D4', '#F2C2A6', '#FAE2C2'],
  night: ['#25305C', '#36437A', '#55618E'],
};
const GROUND: Record<TimeOfDay, { far: string; mid: string; near: string }> = {
  day: { far: '#C9B07A', mid: '#B9C27E', near: '#8DA85A' },
  dusk: { far: '#A87A5C', mid: '#B48A5E', near: '#7F8A4C' },
  night: { far: '#2C3253', mid: '#343B5E', near: '#252B47' },
};
/** Where characters' feet stand (fraction of the height). Furniture and stalls stand in front of them. */
const FEET: Record<SceneKind, number> = { bedroom: 0.93, classroom: 0.93, market: 0.97, compound: 0.88, savanna: 0.9, coast: 0.9 };

/** A pose that tells the story when the page doesn't name one: happy children jump, busy ones walk. */
function poseFor(c: CastMember, kind: SceneKind, n: number): Pose {
  if (c.pose) return c.pose;
  const inside = kind === 'bedroom' || kind === 'classroom' || kind === 'market';
  const adult = isAdult(c.who);
  switch (c.expression) {
    case 'joy': return adult ? 'wave' : inside ? 'cheer' : 'jump';
    case 'focus': return inside ? 'stand' : 'walk';
    case 'smile': return n === 1 ? 'wave' : 'stand';
    default: return 'stand';
  }
}

export function Scene({ kind, time, props, cast, className, variant = 'cover', live = false }: { kind: SceneKind; time: TimeOfDay; props: PropName[]; cast: CastMember[]; className?: string; variant?: 'cover' | 'page'; live?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const boil = live && !reduce;
  const has = (p: PropName) => props.includes(p);
  const indoor = kind === 'bedroom' || kind === 'classroom';
  const page = variant === 'page';
  const g = GROUND[time];
  const [s1, s2, s3] = (page ? SKY_PAGE : SKY)[time];
  const leaves = !indoor && time !== 'night' && !has('rain') && (kind === 'savanna' || kind === 'compound');

  const back = indoor ? (
    <>
      <rect width={W} height={H} fill={`url(#wall${uid})`} />
      <rect y={H * 0.7} width={W} height={H * 0.3} fill={time === 'night' ? '#4A3A33' : '#C9965F'} />
      <ellipse cx={W * 0.5} cy={H * 0.9} rx="250" ry="34" fill={time === 'night' ? '#5B4636' : '#E2B97A'} />
      {has('window') && <Window time={time} x={500} y={70} uid={uid} />}
      {has('lamp') && <><circle cx="170" cy="210" r="170" fill={`url(#lamp${uid})`} /><Lamp x={170} y={250} /></>}
      {has('chalkboard') && <Chalkboard x={380} y={70} />}
      {kind === 'bedroom' && has('bed') && <Headboard />}
    </>
  ) : (
    <>
      <rect width={W} height={H} fill={`url(#sky${uid})`} />
      {has('stars') && <Stars />}
      {has('moon') && <Moon x={650} y={80} night={page ? '#25305C' : '#1F2A55'} />}
      {has('sun') && (time === 'dusk' ? <circle cx="560" cy={HORIZON - 10} r="90" fill={`url(#sun${uid})`} /> : <><circle cx="660" cy="86" r="90" fill={`url(#sun${uid})`} /><circle cx="660" cy="86" r="34" fill="#FFF2C4" /></>)}
      {has('clouds') && <Clouds dark={time !== 'day'} />}
      {has('birds') && <Birds dark={time === 'night'} />}
      {kind === 'coast' ? (
        <>
          <rect y={HORIZON - 40} width={W} height={H - HORIZON + 40} fill={`url(#sea${uid})`} />
          {has('bridge') && <Bridge time={time} />}
          <Waves y={HORIZON - 10} colour={time === 'day' ? '#BFE6F2' : '#8EA4CF'} />
          {has('pirogueFar') && <g className="sc-bob"><Pirogue x={560} y={HORIZON + 10} scale={0.35} colours={['#C0392B', '#F1C40F', '#1F6B4F']} /></g>}
          <path d={`M0 ${H * 0.74} C 180 ${H * 0.7}, 420 ${H * 0.78}, ${W} ${H * 0.72} L ${W} ${H} L 0 ${H} Z`} fill={time === 'night' ? '#3A3A55' : '#E8C995'} />
        </>
      ) : (
        <>
          <path d={`M0 ${HORIZON - 30} C 140 ${HORIZON - 80}, 260 ${HORIZON - 40}, 380 ${HORIZON - 60} S 640 ${HORIZON - 90}, ${W} ${HORIZON - 40} L ${W} ${H} L 0 ${H} Z`} fill={g.far} />
          {has('acacia') && <><Acacia x={110} y={HORIZON - 40} s={0.7} c={time === 'night' ? '#1C2140' : '#7A5A35'} /><Acacia x={700} y={HORIZON - 50} s={0.55} c={time === 'night' ? '#1C2140' : '#7A5A35'} /></>}
          <path d={`M0 ${HORIZON} C 200 ${HORIZON - 20}, 520 ${HORIZON + 20}, ${W} ${HORIZON - 5} L ${W} ${H} L 0 ${H} Z`} fill={g.mid} />
        </>
      )}
      {kind === 'compound' && (
        <>
          <path d={`M0 ${HORIZON - 10} L ${W} ${HORIZON - 10} L ${W} ${HORIZON + 20} L 0 ${HORIZON + 20} Z`} fill={time === 'night' ? '#3D3550' : '#D3A272'} />
          {has('house') && <><House x={150} y={HORIZON - 70} night={time === 'night'} /><House x={640} y={HORIZON - 50} night={time === 'night'} small /></>}
          {has('well') && <Well x={560} y={HORIZON + 70} />}
          {has('goat') && <g className="sc-nibble"><Goat x={600} y={HORIZON + 95} /></g>}
        </>
      )}
      {kind === 'market' && (
        <>
          <MarketBack time={time} />
          {has('umbrella') && <Umbrella x={640} y={HORIZON - 120} />}
          {has('stall') && <Awning />}
        </>
      )}
      {kind === 'savanna' && (has('baobab') || has('baobabDry')) && <g className="sc-sway-slow"><Baobab x={560} y={HORIZON + 30} leaves={has('baobab')} night={time === 'night'} /></g>}
      {has('well') && kind === 'savanna' && <Well x={380} y={HORIZON + 80} />}
    </>
  );

  const front = (
    <>
      {kind === 'bedroom' && has('bed') && <Bed teddy={has('teddy')} night={time === 'night'} />}
      {kind === 'classroom' && has('desk') && <Desk books={has('books')} />}
      {kind === 'market' && has('stall') && <Table fabric={has('fabric')} mangoes={has('mangoes')} />}
      {kind === 'compound' && has('mortar') && <Mortar x={420} y={H - 70} />}
      {kind === 'coast' && has('pirogue') && <g className="sc-bob"><Pirogue x={W * 0.5} y={H - 70} scale={1} colours={['#1F6B4F', '#F1C40F', '#C0392B']} /></g>}
      {kind === 'coast' && has('nets') && <Nets />}
      {kind === 'coast' && <path d={`M0 ${H * 0.86} C 160 ${H * 0.82}, 360 ${H * 0.9}, 560 ${H * 0.85} S ${W} ${H * 0.84}, ${W} ${H * 0.86} L ${W} ${H} L 0 ${H} Z`} fill={time === 'night' ? '#2F2F48' : '#D9B47A'} />}
      {!indoor && kind !== 'coast' && <Grass colour={g.near} />}
    </>
  );

  const people = (
    <g className="sc-noink">
      {cast.map((c, i) => {
        const s = (c.size / 22) * (indoor ? 1.12 : 1) * (isAdult(c.who) ? 1.04 : 1);
        const x = (c.x / 100) * W;
        const y = FEET[kind] * H;
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${c.flip ? -s : s} ${s})`} style={{ ['--fg-delay' as string]: `${i * 0.23}s` }}>
            <Figure who={c.who} spec={CAST[c.who]} expression={c.expression ?? 'smile'} pose={poseFor(c, kind, cast.length)} uid={`${uid}${i}`} />
          </g>
        );
      })}
    </g>
  );

  return (
    <div className={`sc sc-${variant}${boil ? ' sc-live' : ''} ${className ?? ''}`}>
      <svg className="sc-layer" viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <defs>
          <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s1} /><stop offset="0.55" stopColor={s2} /><stop offset="1" stopColor={s3} /></linearGradient>
          <radialGradient id={`sun${uid}`}><stop offset="0" stopColor="#FFF6D8" /><stop offset="0.45" stopColor={time === 'dusk' ? '#FFB36B' : '#FFE08A'} /><stop offset="1" stopColor={time === 'dusk' ? '#FF8A5C' : '#FFD36B'} stopOpacity="0" /></radialGradient>
          <linearGradient id={`wall${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={time === 'night' ? '#3B3552' : page ? '#F7E9D2' : '#F3DDBD'} /><stop offset="1" stopColor={time === 'night' ? '#2A2640' : '#E7C79C'} /></linearGradient>
          <linearGradient id={`sea${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={time === 'night' ? '#1D2B55' : time === 'dusk' ? '#5C6F9E' : '#7DBBD6'} /><stop offset="1" stopColor={time === 'night' ? '#0F1834' : time === 'dusk' ? '#2E3E6B' : '#3F86AE'} /></linearGradient>
          <radialGradient id={`lamp${uid}`}><stop offset="0" stopColor="#FFD9A0" stopOpacity="0.75" /><stop offset="1" stopColor="#FFD9A0" stopOpacity="0" /></radialGradient>
          {/* Hand-drawn wobble + watercolour grain, applied to the whole picture in one pass. */}
          <filter id={`paint${uid}`} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed="3" result="warp">
              {boil && <animate attributeName="seed" values="3;8;13" dur="0.9s" calcMode="discrete" repeatCount="indefinite" />}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="drawn" />
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="21" result="blot" />
            <feColorMatrix in="blot" type="matrix" values="0.35 0 0 0 0.72  0.35 0 0 0 0.72  0.35 0 0 0 0.72  0 0 0 0 1" result="wash" />
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="5" result="tooth" />
            <feColorMatrix in="tooth" type="matrix" values="0.22 0 0 0 0.84  0.22 0 0 0 0.84  0.22 0 0 0 0.84  0 0 0 0 1" result="grain" />
            <feBlend in="drawn" in2="wash" mode="multiply" result="p1" />
            <feBlend in="p1" in2="grain" mode="multiply" result="p2" />
            <feComposite in="p2" in2="drawn" operator="in" />
          </filter>
          {page && (
            <>
              <filter id={`rag${uid}`} x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="9" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" result="r" />
                <feGaussianBlur in="r" stdDeviation="1.4" />
              </filter>
              <mask id={`edge${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                <g filter={`url(#rag${uid})`}><path d={`M44 70 Q 46 26 110 26 L 690 30 Q 758 32 760 92 L 768 470 Q 766 496 726 496 L 72 494 Q 32 492 34 452 Z`} fill="#fff" /></g>
              </mask>
            </>
          )}
        </defs>
        <g mask={page ? `url(#edge${uid})` : undefined}>
          <g className="sc-ink" filter={`url(#paint${uid})`}>
            {back}
            {people}
            {front}
            {has('rain') && <Rain />}
            {leaves && <Leaves />}
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ---------------- Props ---------------- */

const G = ({ x = 0, y = 0, s = 1, children, className }: { x?: number; y?: number; s?: number; children: ReactNode; className?: string }) => <g transform={`translate(${x} ${y}) scale(${s})`} className={className}>{children}</g>;

/** A few leaves drifting down, as in an autumn picture book. */
function Leaves() {
  const leaf = 'M0 -9 C 7 -6 8 4 0 9 C -8 4 -7 -6 0 -9 Z';
  const spots = [[120, 140, '#C9652B'], [300, 90, '#D9932F'], [520, 160, '#B5472C'], [690, 110, '#D9932F']] as const;
  return (
    <g className="sc-noink">
      {spots.map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g className="sc-fall" style={{ animationDelay: `${i * -2.3}s` }}>
            <path d={leaf} fill={c} stroke="#3a2618" strokeWidth="1.6" />
            <path d="M0 -8 L 0 8" stroke="#3a2618" strokeWidth="1" opacity="0.6" />
          </g>
        </g>
      ))}
    </g>
  );
}

function Stars() {
  const pts = [[60, 40], [140, 90], [230, 30], [320, 70], [410, 25], [470, 110], [90, 150], [260, 130], [720, 160], [760, 40], [540, 60], [380, 150]];
  return <g>{pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 1.6 : 2.4} fill="#FFF6D8" className="sc-twinkle" style={{ animationDelay: `${(i % 5) * 0.6}s` }} />)}</g>;
}
const Moon = ({ x, y, night }: { x: number; y: number; night: string }) => (
  <G x={x} y={y}>
    <circle r="60" fill="#FFF6D8" opacity="0.12" className="sc-noink" />
    <circle r="34" fill="#FBEFC9" />
    <circle cx="13" cy="-8" r="30" fill={night} className="sc-noink" />
  </G>
);
function Clouds({ dark }: { dark: boolean }) {
  const c = dark ? '#7C86AE' : '#FFFFFF';
  const one = (x: number, y: number, s: number, d: number) => (
    <g className="sc-drift" style={{ animationDuration: `${d}s` }}>
      <G x={x} y={y} s={s}><ellipse cx="0" cy="0" rx="70" ry="26" fill={c} opacity="0.92" /><ellipse cx="-34" cy="-14" rx="38" ry="28" fill={c} /><ellipse cx="26" cy="-22" rx="44" ry="32" fill={c} /><ellipse cx="0" cy="8" rx="80" ry="14" fill={dark ? '#5D678F' : '#E6EEF3'} opacity="0.6" /></G>
    </g>
  );
  return <g className="sc-noink">{one(170, 90, 1, 60)}{one(470, 60, 0.8, 80)}{one(700, 120, 0.6, 70)}</g>;
}
function Birds({ dark }: { dark: boolean }) {
  const b = (x: number, y: number, s: number) => <G x={x} y={y} s={s}><path d="M-12 0 Q -6 -8 0 0 Q 6 -8 12 0" fill="none" stroke={dark ? '#C9CFE6' : '#3A2A1E'} strokeWidth="2.4" strokeLinecap="round" /></G>;
  return <g className="sc-fly">{b(300, 110, 1)}{b(330, 96, 0.8)}{b(360, 120, 0.7)}</g>;
}
function Rain() {
  return (
    <g className="sc-rain" opacity="0.55">
      {Array.from({ length: 70 }, (_, i) => {
        const x = (i * 53) % W;
        const y = (i * 97) % H;
        return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 22} stroke="#DDEBF7" strokeWidth="2" strokeLinecap="round" />;
      })}
    </g>
  );
}
const Waves = ({ y, colour }: { y: number; colour: string }) => (
  <g className="sc-wave">
    {[0, 34, 70].map((dy, i) => <path key={i} d={`M-40 ${y + dy} q 25 -8 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0`} fill="none" stroke={colour} strokeWidth={2.5 - i * 0.6} opacity={0.7 - i * 0.18} />)}
  </g>
);
function Bridge({ time }: { time: TimeOfDay }) {
  const c = time === 'night' ? '#141A33' : time === 'dusk' ? '#3A3350' : '#5D6B7E';
  return (
    <g opacity="0.85">
      <rect x="40" y={HORIZON - 70} width="420" height="8" fill={c} />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${60 + i * 100} ${HORIZON - 62} q 50 -46 100 0`} fill="none" stroke={c} strokeWidth="5" />)}
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={56 + i * 100} y={HORIZON - 62} width="8" height="42" fill={c} />)}
    </g>
  );
}
function Pirogue({ x, y, scale, colours }: { x: number; y: number; scale: number; colours: [string, string, string] }) {
  const [a, b, c] = colours;
  return (
    <G x={x} y={y} s={scale}>
      <ellipse cx="0" cy="34" rx="250" ry="14" fill="rgba(0,0,0,.18)" />
      <path d="M-260 -10 Q -200 40 0 42 Q 200 40 260 -10 Q 130 8 0 8 Q -130 8 -260 -10 Z" fill={a} />
      <path d="M-240 -4 Q -130 14 0 14 Q 130 14 240 -4 L 230 4 Q 120 22 0 22 Q -120 22 -230 4 Z" fill={b} />
      {[-160, -80, 0, 80, 160].map((px) => <path key={px} d={`M${px - 14} 28 l 14 -10 l 14 10 z`} fill={c} />)}
      <path d="M-260 -10 l -20 -30 l 14 2 z M260 -10 l 20 -30 l -14 2 z" fill={a} />
      <text x="0" y="36" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" opacity="0.85" fontFamily="Fraunces, Georgia, serif">DEMAIN</text>
    </G>
  );
}
const Nets = () => (
  <G x={110} y={H - 120}>
    <path d="M0 0 Q 40 60 0 110 M30 0 Q 70 60 30 110 M60 0 Q 100 60 60 110 M0 20 L 80 20 M0 55 L 90 55 M0 90 L 80 90" stroke="#E9DCC0" strokeWidth="2" fill="none" opacity="0.8" />
    <rect x="-6" y="-10" width="10" height="130" fill="#6B4A2E" />
  </G>
);
function Acacia({ x, y, s, c }: { x: number; y: number; s: number; c: string }) {
  return <G x={x} y={y} s={s}><rect x="-5" y="-10" width="10" height="70" fill={c} /><path d="M0 -10 L -40 -40 M0 -10 L 40 -42 M0 0 L -20 -30" stroke={c} strokeWidth="6" /><ellipse cx="0" cy="-48" rx="90" ry="20" fill={c} /></G>;
}
function Baobab({ x, y, leaves, night }: { x: number; y: number; leaves: boolean; night: boolean }) {
  const bark = night ? '#3A3046' : '#8A6A4A';
  const barkD = night ? '#2A2236' : '#6E523A';
  return (
    <G x={x} y={y}>
      <ellipse cx="0" cy="6" rx="150" ry="18" fill="rgba(0,0,0,.18)" />
      <path d="M-62 0 C -70 -90, -55 -170, -48 -210 L 48 -210 C 55 -170, 70 -90, 62 0 Z" fill={bark} />
      <path d="M-20 -10 C -26 -90, -22 -160, -18 -205 M 22 -14 C 28 -90, 24 -160, 20 -205" stroke={barkD} strokeWidth="6" fill="none" opacity="0.6" />
      <path d="M-48 -206 C -90 -240, -130 -240, -160 -270 M-30 -208 C -50 -260, -40 -290, -70 -320 M0 -210 C 0 -260, 10 -300, 0 -330 M30 -208 C 60 -250, 50 -290, 90 -320 M48 -206 C 100 -230, 130 -240, 170 -262" stroke={bark} strokeWidth="16" strokeLinecap="round" fill="none" />
      {leaves && [[-160, -278], [-72, -328], [0, -340], [92, -330], [172, -270], [-110, -250], [130, -250]].map(([lx, ly], i) => (
        <g key={i} className="sc-leaf" style={{ animationDelay: `${i * 0.3}s` }}>
          <ellipse cx={lx} cy={ly} rx="46" ry="24" fill={night ? '#2B4A3C' : '#5E8B3E'} />
          <ellipse cx={lx + 10} cy={ly - 6} rx="28" ry="14" fill={night ? '#355846' : '#79A64E'} />
        </g>
      ))}
    </G>
  );
}
function House({ x, y, night, small }: { x: number; y: number; night: boolean; small?: boolean }) {
  return (
    <G x={x} y={y} s={small ? 0.75 : 1}>
      <ellipse cx="0" cy="96" rx="96" ry="10" fill="rgba(0,0,0,.15)" />
      <rect x="-80" y="10" width="160" height="86" rx="6" fill={night ? '#5A4636' : '#C9875A'} />
      <rect x="-80" y="10" width="160" height="10" fill="rgba(0,0,0,.08)" />
      <path d="M-104 16 L 0 -70 L 104 16 Z" fill={night ? '#5E5233' : '#D8B26A'} />
      <path d="M-104 16 L 0 -70 L 104 16" stroke={night ? '#4A4129' : '#B38E4F'} strokeWidth="4" fill="none" />
      {[-60, -30, 0, 30, 60].map((lx) => <line key={lx} x1={lx * 0.9} y1={-40 + Math.abs(lx) * 0.5} x2={lx * 1.6} y2="14" stroke={night ? '#4A4129' : '#B38E4F'} strokeWidth="2" opacity="0.6" />)}
      <rect x="-20" y="40" width="40" height="56" rx="18" fill={night ? '#2A1E16' : '#6E4426'} />
      {night && <rect x="34" y="34" width="26" height="22" rx="4" fill="#FFD27A" opacity="0.85" />}
    </G>
  );
}
const Well = ({ x, y }: { x: number; y: number }) => (
  <G x={x} y={y}>
    <ellipse cx="0" cy="34" rx="64" ry="10" fill="rgba(0,0,0,.15)" />
    <rect x="-50" y="-6" width="100" height="40" rx="8" fill="#B9A58A" />
    <ellipse cx="0" cy="-6" rx="50" ry="12" fill="#8E7C64" />
    <ellipse cx="0" cy="-6" rx="38" ry="8" fill="#3E5A6E" />
    <rect x="-48" y="-62" width="6" height="58" fill="#6B4A2E" /><rect x="42" y="-62" width="6" height="58" fill="#6B4A2E" /><rect x="-50" y="-66" width="100" height="6" fill="#6B4A2E" />
  </G>
);
const Goat = ({ x, y }: { x: number; y: number }) => (
  <G x={x} y={y} s={0.9}>
    <ellipse cx="0" cy="30" rx="44" ry="6" fill="rgba(0,0,0,.15)" />
    <ellipse cx="0" cy="0" rx="40" ry="20" fill="#F1E6D2" />
    {[-26, -10, 14, 28].map((lx) => <rect key={lx} x={lx} y="12" width="6" height="20" fill="#E0D2B8" />)}
    <ellipse cx="40" cy="-16" rx="14" ry="11" fill="#F1E6D2" />
    <path d="M36 -26 q -4 -12 -12 -14 M44 -26 q 4 -12 12 -14" stroke="#8A7A62" strokeWidth="3" fill="none" />
    <circle cx="45" cy="-18" r="2" fill="#2A1E16" />
  </G>
);
function MarketBack({ time }: { time: TimeOfDay }) {
  const cols = ['#C0392B', '#1F6B4F', '#F1C40F', '#2E6FB0', '#C49A5A'];
  return (
    <g opacity={time === 'night' ? 0.6 : 0.95}>
      {cols.map((c, i) => <rect key={i} x={i * 170 - 20} y={HORIZON - 110} width="150" height="120" rx="6" fill={c} opacity="0.55" />)}
      {cols.map((_, i) => <rect key={`d${i}`} x={i * 170 + 30} y={HORIZON - 70} width="50" height="80" rx="24" fill="rgba(0,0,0,.25)" />)}
      <rect y={HORIZON + 8} width={W} height="10" fill="rgba(0,0,0,.08)" />
    </g>
  );
}
function Awning() {
  return (
    <G x={0} y={0}>
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${120 + i * 56} 120 L ${176 + i * 56} 120 L ${172 + i * 56} 178 Q ${146 + i * 56} 190 ${124 + i * 56} 178 Z`} fill={i % 2 ? '#F6E7C8' : '#6E1630'} />)}
      <rect x="116" y="112" width="512" height="10" rx="3" fill="#4A2A1A" />
      <rect x="122" y="120" width="8" height="250" fill="#4A2A1A" /><rect x="612" y="120" width="8" height="250" fill="#4A2A1A" />
    </G>
  );
}
const Umbrella = ({ x, y }: { x: number; y: number }) => (
  <G x={x} y={y} className="sc-sway-slow">
    <path d="M-110 40 Q 0 -60 110 40 Z" fill="#1F6B4F" />
    {[-70, -24, 24, 70].map((ux) => <path key={ux} d={`M${ux} 34 Q ${ux + 10} -10 0 -24`} stroke="#F6E7C8" strokeWidth="6" fill="none" opacity="0.7" />)}
    <rect x="-3" y="-24" width="6" height="200" fill="#4A2A1A" />
  </G>
);
function Table({ fabric, mangoes }: { fabric: boolean; mangoes: boolean }) {
  return (
    <g>
      {fabric && [[200, '#C0392B'], [262, '#1F6B4F'], [324, '#F1C40F'], [386, '#2E6FB0'], [448, '#E67E22']].map(([fx, c]) => (
        <g key={fx as number}>
          <rect x={fx as number} y={H - 150} width="56" height="46" rx="8" fill={c as string} />
          <path d={`M${(fx as number) + 6} ${H - 138} h44 M${(fx as number) + 6} ${H - 124} h44`} stroke="rgba(255,255,255,.55)" strokeWidth="3" strokeDasharray="6 5" />
        </g>
      ))}
      {mangoes && [[540, 0], [570, -6], [600, 2], [556, -26], [588, -28]].map(([mx, my], i) => (
        <g key={i}><ellipse cx={mx} cy={H - 120 + my} rx="18" ry="14" fill={i % 2 ? '#F39C12' : '#E67E22'} /><ellipse cx={mx - 5} cy={H - 125 + my} rx="6" ry="4" fill="#FFF3D6" opacity="0.6" /></g>
      ))}
      <rect x="100" y={H - 110} width="600" height="22" rx="4" fill="#8A5A34" />
      <rect x="100" y={H - 90} width="600" height="90" fill="#6E4426" />
      {[160, 300, 440, 580].map((px) => <rect key={px} x={px} y={H - 88} width="4" height="88" fill="rgba(0,0,0,.18)" />)}
    </g>
  );
}
function Window({ time, x, y, uid }: { time: TimeOfDay; x: number; y: number; uid: string }) {
  return (
    <G x={x} y={y}>
      <rect x="-8" y="-8" width="196" height="166" rx="10" fill="#7A5236" />
      <rect width="180" height="150" rx="6" fill={time === 'night' ? '#16204A' : '#BFE3F5'} />
      {time === 'night' && <><circle cx="132" cy="44" r="20" fill="#FBEFC9" /><circle cx="140" cy="38" r="18" fill="#16204A" />{[[30, 30], [70, 60], [40, 100], [110, 110], [150, 90]].map(([sx, sy], i) => <circle key={i} cx={sx} cy={sy} r="2" fill="#FFF6D8" className="sc-twinkle" style={{ animationDelay: `${i * 0.5}s` }} />)}</>}
      <rect x="86" width="8" height="150" fill="#7A5236" /><rect y="70" width="180" height="8" fill="#7A5236" />
      <path d="M-14 -14 Q 30 70 -10 170 L -30 170 L -30 -14 Z" fill={`url(#lamp${uid})`} opacity="0" />
      <path d="M-20 -16 C 20 40, -10 110, 10 172 L -26 172 L -26 -16 Z" fill="#6E1630" opacity="0.9" />
      <path d="M200 -16 C 160 40, 190 110, 170 172 L 206 172 L 206 -16 Z" fill="#6E1630" opacity="0.9" />
    </G>
  );
}
const Lamp = ({ x, y }: { x: number; y: number }) => (
  <G x={x} y={y}>
    <rect x="-40" y="40" width="80" height="60" rx="6" fill="#8A5A34" />
    <rect x="-6" y="0" width="12" height="40" fill="#C49A5A" />
    <path d="M-34 0 L 34 0 L 22 -46 L -22 -46 Z" fill="#F6E7C8" />
  </G>
);
function Headboard() {
  return <G x={W * 0.18} y={H * 0.36}><rect width={W * 0.62} height="120" rx="26" fill="#7A5236" /><rect x="14" y="14" width={W * 0.62 - 28} height="92" rx="18" fill="#8E6444" /></G>;
}
function Bed({ teddy, night }: { teddy: boolean; night: boolean }) {
  const quilt = night ? '#2E6FB0' : '#3D86C6';
  return (
    <g>
      <ellipse cx={W * 0.49} cy={H - 6} rx={W * 0.36} ry="14" fill="rgba(0,0,0,.2)" />
      <rect x={W * 0.16} y={H * 0.66} width={W * 0.66} height={H * 0.3} rx="22" fill={quilt} />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${W * 0.18 + i * 64} ${H * 0.7} l 22 22 l -22 22 l -22 -22 z`} fill="#F1C40F" opacity="0.75" />)}
      {Array.from({ length: 8 }, (_, i) => <circle key={`c${i}`} cx={W * 0.18 + i * 64 + 32} cy={H * 0.86} r="7" fill="#F6E7C8" opacity="0.8" />)}
      <rect x={W * 0.16} y={H * 0.66} width={W * 0.66} height="14" rx="7" fill="rgba(255,255,255,.18)" />
      {teddy && (
        <G x={W * 0.7} y={H * 0.6} className="sc-teddy">
          <circle cx="0" cy="0" r="30" fill="#B4793F" /><circle cx="-24" cy="-24" r="12" fill="#B4793F" /><circle cx="24" cy="-24" r="12" fill="#B4793F" />
          <circle cx="-24" cy="-24" r="6" fill="#8A5A2E" /><circle cx="24" cy="-24" r="6" fill="#8A5A2E" />
          <ellipse cx="0" cy="8" rx="14" ry="10" fill="#E3C08F" /><circle cx="-10" cy="-6" r="3.4" fill="#2A1E16" /><circle cx="10" cy="-6" r="3.4" fill="#2A1E16" /><ellipse cx="0" cy="4" rx="4" ry="3" fill="#2A1E16" />
          <path d="M-14 30 q 14 10 28 0" stroke="#6E1630" strokeWidth="6" strokeLinecap="round" fill="none" />
        </G>
      )}
    </g>
  );
}
const Chalkboard = ({ x, y }: { x: number; y: number }) => (
  <G x={x} y={y}>
    <rect x="-10" y="-10" width="320" height="180" rx="8" fill="#8A5A34" />
    <rect width="300" height="160" rx="4" fill="#2F4A3E" />
    {/* A plain lesson board that suits every story */}
    <text x="24" y="50" fontSize="26" fill="#F1F1E8" fontFamily="Fraunces, Georgia, serif" opacity="0.85">a  b  c</text>
    <path d="M24 74 h 150" stroke="#F1F1E8" strokeWidth="2" opacity="0.45" />
    <text x="24" y="112" fontSize="20" fill="#F1F1E8" fontFamily="Fraunces, Georgia, serif" opacity="0.7">1 + 2 = 3</text>
    <circle cx="250" cy="110" r="22" stroke="#FFE08A" strokeWidth="3" fill="none" opacity="0.7" />
  </G>
);
function Desk({ books }: { books: boolean }) {
  return (
    <g>
      {books && <><rect x="470" y={H - 160} width="90" height="16" rx="3" fill="#6E1630" /><rect x="476" y={H - 176} width="80" height="16" rx="3" fill="#2E6FB0" /><rect x="482" y={H - 190} width="70" height="14" rx="3" fill="#C49A5A" /></>}
      <rect x="140" y={H - 144} width="520" height="20" rx="4" fill="#A0703F" />
      <rect x="160" y={H - 124} width="480" height="124" fill="#8A5A34" />
      <rect x="180" y={H - 110} width="200" height="50" rx="4" fill="rgba(0,0,0,.1)" />
    </g>
  );
}
const Mortar = ({ x, y }: { x: number; y: number }) => (
  <G x={x} y={y}>
    <ellipse cx="0" cy="62" rx="56" ry="9" fill="rgba(0,0,0,.18)" />
    <path d="M-44 0 L 44 0 L 30 60 L -30 60 Z" fill="#7A5236" />
    <ellipse cx="0" cy="0" rx="44" ry="10" fill="#5E3E28" />
    <rect x="-6" y="-120" width="12" height="124" rx="6" fill="#A0703F" transform="rotate(12)" />
  </G>
);
function Grass({ colour }: { colour: string }) {
  return (
    <g>
      <path d={`M0 ${H - 46} C 120 ${H - 70}, 300 ${H - 40}, 420 ${H - 58} S 680 ${H - 72}, ${W} ${H - 48} L ${W} ${H} L 0 ${H} Z`} fill={colour} />
      {Array.from({ length: 26 }, (_, i) => {
        const gx = i * 31 + 8;
        const gy = H - 46 - ((i * 13) % 18);
        return <path key={i} className="sc-tuft" style={{ animationDelay: `${(i % 6) * 0.4}s` }} d={`M${gx} ${gy + 10} q -4 -18 -10 -26 M${gx} ${gy + 10} q 2 -20 4 -30 M${gx} ${gy + 10} q 6 -16 12 -22`} stroke={colour} strokeWidth="3" fill="none" strokeLinecap="round" />;
      })}
    </g>
  );
}
