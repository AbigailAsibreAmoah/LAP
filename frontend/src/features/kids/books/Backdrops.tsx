import type { ReactNode } from 'react';
import type { SceneKind, TimeOfDay } from './stories';

/*
 * The extra places stories happen (a town street, a football pitch, a vegetable garden, a rocky
 * hill, a sewing workshop, a mangrove, a kitchen, a village festival), plus small everyday details
 * that change from page to page. Drawn in the same ink-and-wash style as the rest of the scene.
 */

const W = 800;
const H = 500;
const HORIZON = 300;
const INK = '#3a2618';

export interface Tone { far: string; mid: string; near: string; wall: string; door: string; metalRoof: boolean }
export const TONES: Tone[] = [
  { far: '#C9B07A', mid: '#B9C27E', near: '#8DA85A', wall: '#C9875A', door: '#6E4426', metalRoof: false }, // dry season
  { far: '#9DB86F', mid: '#86B25E', near: '#5E8F45', wall: '#E6DCC6', door: '#2E6FB0', metalRoof: true }, // rainy season
  { far: '#C98A5A', mid: '#C9A064', near: '#8C8A45', wall: '#D9A54A', door: '#6E1630', metalRoof: true }, // red earth
  { far: '#E2C48E', mid: '#D9BE88', near: '#B9A264', wall: '#C97B6A', door: '#1F6B4F', metalRoof: false }, // Sahel sand
];

export const NEW_KINDS: SceneKind[] = ['street', 'pitch', 'garden', 'hill', 'workshop', 'mangrove', 'kitchen', 'festival'];

const G = ({ x = 0, y = 0, s = 1, children, className }: { x?: number; y?: number; s?: number; children: ReactNode; className?: string }) => <g transform={`translate(${x} ${y}) scale(${s})`} className={className}>{children}</g>;
const night = (t: TimeOfDay) => t === 'night';

/* ======================= Backgrounds (behind the characters) ======================= */

export function Backdrop({ kind, time, uid, tone }: { kind: SceneKind; time: TimeOfDay; uid: string; tone: Tone }) {
  switch (kind) {
    case 'street': return <StreetBack time={time} tone={tone} />;
    case 'pitch': return <PitchBack time={time} tone={tone} />;
    case 'garden': return <GardenBack time={time} tone={tone} />;
    case 'hill': return <HillBack time={time} tone={tone} />;
    case 'workshop': return <WorkshopBack time={time} uid={uid} />;
    case 'mangrove': return <MangroveBack time={time} uid={uid} />;
    case 'kitchen': return <KitchenBack time={time} uid={uid} />;
    case 'festival': return <FestivalBack time={time} tone={tone} />;
    default: return null;
  }
}

export function Foreground({ kind, time, tone }: { kind: SceneKind; time: TimeOfDay; tone: Tone }) {
  switch (kind) {
    case 'street': return <path d={`M0 ${H - 34} L ${W} ${H - 40} L ${W} ${H} L 0 ${H} Z`} fill={night(time) ? '#3B3A50' : '#CDBFA6'} />;
    case 'pitch': return <><NearGrass colour={night(time) ? '#283050' : tone.near} /><Ball x={W * 0.52} y={H - 34} /></>;
    case 'garden': return <><PlantRow y={H - 18} s={1.2} night={night(time)} sidesOnly /><WateringCan x={150} y={H - 64} /></>;
    case 'hill': return <><path d={`M0 ${H - 60} C 200 ${H - 80}, 520 ${H - 50}, ${W} ${H - 72} L ${W} ${H} L 0 ${H} Z`} fill={night(time) ? '#2C2F48' : '#A8835A'} /><Boulder x={70} y={H - 40} s={1.2} /><Boulder x={740} y={H - 30} s={0.9} /></>;
    case 'workshop': return <SewingTable />;
    case 'mangrove': return <><path d={`M0 ${H - 54} C 180 ${H - 70}, 420 ${H - 44}, ${W} ${H - 62} L ${W} ${H} L 0 ${H} Z`} fill={night(time) ? '#2E2C3E' : '#7A6146'} />{[110, 180, 610, 690].map((x, i) => <Seedling key={x} x={x} y={H - 48 + (i % 2) * 8} />)}<Reeds x={30} /><Reeds x={760} /></>;
    case 'kitchen': return <KitchenTable />;
    case 'festival': return <><NearGrass colour={night(time) ? '#283050' : tone.near} /><Djembe x={90} y={H - 20} s={1.1} /><Djembe x={150} y={H - 12} s={0.85} c="#6E1630" /></>;
    default: return null;
  }
}

/* ---------- Town street (Lomé, Cotonou, Accra…) ---------- */
function StreetBack({ time, tone }: { time: TimeOfDay; tone: Tone }) {
  const cols = ['#E9C46A', '#E76F51', '#8AB17D', '#F4A6A6', '#9DC3E6', tone.wall];
  const heights = [190, 150, 215, 170, 200];
  const n = night(time);
  return (
    <g>
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={`s${i}`} x={i * 150 - 30} y={HORIZON - 160 + (i % 3) * 30} width="120" height="200" fill={n ? '#2A3156' : '#C9CFD8'} opacity="0.45" className="sc-noink" />)}
      {heights.map((h, i) => {
        const x = i * 165 - 12;
        const c = cols[(i + tone.wall.length) % cols.length];
        const top = 340 - h;
        return (
          <g key={i}>
            <rect x={x} y={top} width="158" height={h} fill={c} />
            <rect x={x - 4} y={top - 8} width="166" height="10" fill="rgba(0,0,0,.18)" className="sc-noink" />
            {[0, 1].map((r) => [0, 1, 2].map((k) => h > 160 || r === 0 ? <rect key={`${r}${k}`} x={x + 18 + k * 46} y={top + 22 + r * 50} width="28" height="32" rx="3" fill={n ? '#FFD27A' : '#3C5A78'} opacity={n ? 0.9 : 0.8} /> : null))}
            {i % 2 === 0 && <path d={`M${x + 8} ${top + 70} h 142`} stroke={INK} strokeWidth="3" />}
            {/* shop front with a striped awning */}
            <rect x={x + 30} y={300} width="96" height="40" fill={n ? '#2A1E16' : '#5B3A28'} />
            {Array.from({ length: 6 }, (_, k) => <path key={k} d={`M${x + 24 + k * 18} 284 h 18 l -2 16 h -14 z`} fill={k % 2 ? '#F6E7C8' : c === '#E76F51' ? '#1F6B4F' : '#C0392B'} />)}
          </g>
        );
      })}
      {/* electricity pole and sagging wires */}
      <rect x="606" y="70" width="9" height="272" fill="#5B4636" />
      <rect x="586" y="84" width="50" height="6" fill="#5B4636" />
      <path d="M-10 120 Q 300 170 610 88 M 610 88 Q 720 120 810 104 M-10 132 Q 300 186 630 90" stroke={INK} strokeWidth="1.6" fill="none" opacity="0.7" />
      <path d={`M0 338 L ${W} 334 L ${W} ${H} L 0 ${H} Z`} fill={n ? '#3F3D52' : '#BCA98E'} />
      <path d={`M0 338 L ${W} 334 L ${W} 346 L 0 350 Z`} fill={n ? '#555268' : '#DCCFB8'} />
      <path d="M40 420 h 60 M160 418 h 60 M280 416 h 60 M400 414 h 60 M520 412 h 60 M640 410 h 60" stroke="#F3EBDD" strokeWidth="4" opacity="0.6" />
    </g>
  );
}

/* ---------- Football pitch (dusty, with a hand-made goal) ---------- */
function PitchBack({ time, tone }: { time: TimeOfDay; tone: Tone }) {
  const n = night(time);
  return (
    <g>
      {[60, 150, 250, 560, 660, 760].map((x, i) => <g key={x}><rect x={x - 4} y={HORIZON - 40} width="8" height="44" fill="#6B4A2E" /><circle cx={x} cy={HORIZON - 56} r={26 + (i % 2) * 8} fill={n ? '#1E3326' : '#4F7A3A'} /></g>)}
      <path d={`M0 ${HORIZON - 8} L ${W} ${HORIZON - 12} L ${W} ${H} L 0 ${H} Z`} fill={n ? '#3A3A55' : '#CFAE72'} />
      {[[160, 360, 120], [520, 420, 160], [300, 460, 90], [700, 360, 70]].map(([x, y, rx], i) => <ellipse key={i} cx={x} cy={y} rx={rx} ry="16" fill={n ? '#30405A' : tone.near} opacity="0.55" className="sc-noink" />)}
      <path d={`M0 ${HORIZON + 30} L ${W} ${HORIZON + 26}`} stroke="#FFFFFF" strokeWidth="3" opacity="0.7" />
      <ellipse cx="380" cy="400" rx="150" ry="30" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" />
      {/* the goal: two posts, a crossbar and a patched net */}
      <g>
        <path d="M640 360 L 640 236 L 770 236 L 770 360" fill="none" stroke="#F5F1E6" strokeWidth="8" strokeLinejoin="round" />
        <path d="M640 360 L 640 236 L 770 236 L 770 360" fill="none" stroke={INK} strokeWidth="1.5" />
        {Array.from({ length: 7 }, (_, k) => <path key={`v${k}`} d={`M${652 + k * 17} 240 L ${656 + k * 15} 350`} stroke="#F5F1E6" strokeWidth="1.2" opacity="0.7" />)}
        {Array.from({ length: 6 }, (_, k) => <path key={`h${k}`} d={`M644 ${254 + k * 18} L 766 ${256 + k * 17}`} stroke="#F5F1E6" strokeWidth="1.2" opacity="0.7" />)}
      </g>
      {/* friends watching from the side */}
      {Array.from({ length: 9 }, (_, k) => <g key={`c${k}`}><circle cx={30 + k * 22} cy={HORIZON + 4} r="8" fill={['#6B3F26', '#4E2F1F', '#8A5634'][k % 3]} /><rect x={22 + k * 22} y={HORIZON + 10} width="16" height="16" rx="5" fill={['#C0392B', '#2E6FB0', '#E8B23A', '#1F6B4F'][k % 4]} /></g>)}
    </g>
  );
}

/* ---------- Vegetable garden (stakes, tomatoes, a stick fence) ---------- */
function GardenBack({ time, tone }: { time: TimeOfDay; tone: Tone }) {
  const n = night(time);
  return (
    <g>
      <path d={`M0 ${HORIZON - 30} C 160 ${HORIZON - 70}, 420 ${HORIZON - 40}, ${W} ${HORIZON - 60} L ${W} ${H} L 0 ${H} Z`} fill={n ? '#2C3253' : tone.far} />
      <path d={`M0 ${HORIZON - 4} L ${W} ${HORIZON - 8} L ${W} ${H} L 0 ${H} Z`} fill={n ? '#3B3346' : '#8E6B4A'} />
      {/* the fence the class built from branches and old rope */}
      {Array.from({ length: 25 }, (_, k) => <path key={k} d={`M${k * 34 + 6} ${HORIZON + 10} L ${k * 34 + 4 + (k % 3)} ${HORIZON - 58 - (k % 4) * 6}`} stroke="#6B4A2E" strokeWidth="6" strokeLinecap="round" />)}
      <path d={`M0 ${HORIZON - 34} Q 400 ${HORIZON - 24} ${W} ${HORIZON - 36} M0 ${HORIZON - 12} Q 400 ${HORIZON - 4} ${W} ${HORIZON - 14}`} stroke="#C9A66B" strokeWidth="3" fill="none" />
      {/* furrows */}
      {[350, 395, 445].map((y, i) => <path key={y} d={`M0 ${y} Q 400 ${y - 10} ${W} ${y}`} stroke="#6E4F33" strokeWidth={6 + i * 2} fill="none" opacity="0.7" className="sc-noink" />)}
      <PlantRow y={340} s={0.55} night={n} />
      <PlantRow y={386} s={0.75} night={n} offset={30} />
    </g>
  );
}
function PlantRow({ y, s, night: n, offset = 0, sidesOnly = false }: { y: number; s: number; night: boolean; offset?: number; sidesOnly?: boolean }) {
  const count = Math.ceil(W / (90 * s)) + 1;
  // In front of the children, plants grow only at the edges so they never hide anyone.
  const xs = Array.from({ length: count }, (_, k) => offset + k * 90 * s).filter((x) => !sidesOnly || x < 130 || x > 680);
  return (
    <g>
      {xs.map((px, k) => (
        <G key={k} x={px} y={y} s={s}>
          <path d="M0 0 L 2 -96" stroke="#8A6A4A" strokeWidth="4" />
          <ellipse cx="-16" cy="-40" rx="22" ry="12" fill={n ? '#284434' : '#5E8F45'} transform="rotate(-25 -16 -40)" />
          <ellipse cx="16" cy="-58" rx="22" ry="12" fill={n ? '#2E4C3A' : '#6FA34E'} transform="rotate(25 16 -58)" />
          <ellipse cx="-8" cy="-80" rx="18" ry="10" fill={n ? '#284434' : '#5E8F45'} />
          {k % 2 === 0 && <><circle cx="10" cy="-36" r="9" fill="#D9452B" /><circle cx="-14" cy="-62" r="8" fill="#E8613E" /></>}
        </G>
      ))}
    </g>
  );
}
function WateringCan({ x, y }: { x: number; y: number }) {
  return <G x={x} y={y}><path d="M-26 0 L 26 0 L 22 40 L -22 40 Z" fill="#4F9FB8" /><path d="M24 10 L 56 -14 L 60 -8 L 28 18 Z" fill="#4F9FB8" /><path d="M-20 -2 Q 0 -30 20 -2" fill="none" stroke={INK} strokeWidth="4" /></G>;
}

/* ---------- Rocky hill (with a rock that looks like a lion) ---------- */
function HillBack({ time, tone }: { time: TimeOfDay; tone: Tone }) {
  const n = night(time);
  const rock = n ? '#3A3A55' : '#9A8468';
  return (
    <g>
      <path d={`M0 ${HORIZON + 10} C 120 ${HORIZON - 40}, 300 ${HORIZON - 150}, 500 ${HORIZON - 176} C 640 ${HORIZON - 160}, 720 ${HORIZON - 80}, ${W} ${HORIZON - 40} L ${W} ${H} L 0 ${H} Z`} fill={n ? '#2C3253' : '#B8925F'} />
      <path d={`M0 ${HORIZON + 60} C 200 ${HORIZON + 20}, 460 ${HORIZON + 50}, ${W} ${HORIZON + 30} L ${W} ${H} L 0 ${H} Z`} fill={n ? '#30365A' : tone.far} />
      <path d={`M120 ${H - 70} Q 260 ${HORIZON + 40} 210 ${HORIZON - 20} Q 330 ${HORIZON - 60} 300 ${HORIZON - 100} Q 420 ${HORIZON - 140} 470 ${HORIZON - 170}`} stroke={n ? '#4A4F70' : '#E6D3AE'} strokeWidth="9" fill="none" strokeLinecap="round" className="sc-noink" />
      {[[240, HORIZON - 70, 0.8], [640, HORIZON - 110, 1], [360, HORIZON - 120, 0.6], [700, HORIZON - 40, 0.7]].map(([x, y, s], i) => <Boulder key={i} x={x} y={y} s={s} c={rock} />)}
      {/* the "lion": a big rock with a dry bush for a mane */}
      <G x={500} y={HORIZON - 172}>
        <path d="M-60 0 C -60 -40, -20 -60, 10 -56 C 40 -70, 70 -40, 66 0 Z" fill={rock} />
        {Array.from({ length: 11 }, (_, k) => <path key={k} d={`M${-8 + Math.cos(k * 0.6) * 4} -44 l ${Math.cos(k * 0.57) * 26} ${-Math.abs(Math.sin(k * 0.57)) * 24}`} stroke={n ? '#4E4A3A' : '#8A6A3A'} strokeWidth="3" strokeLinecap="round" />)}
      </G>
    </g>
  );
}
function Boulder({ x, y, s = 1, c = '#9A8468' }: { x: number; y: number; s?: number; c?: string }) {
  return <G x={x} y={y} s={s}><path d="M-40 0 C -44 -26, -14 -40, 8 -36 C 34 -36, 46 -16, 42 0 Z" fill={c} /><path d="M-18 -26 q 10 -6 22 -2" stroke="#fff" strokeWidth="3" opacity="0.25" fill="none" /></G>;
}

/* ---------- Sewing workshop (Adjamé market) ---------- */
function WorkshopBack({ time, uid }: { time: TimeOfDay; uid: string }) {
  const rolls = ['#C0392B', '#1F6B4F', '#E8B23A', '#2E6FB0', '#B5475F', '#D9822B', '#5B3A8C', '#2A8C82'];
  return (
    <g>
      <rect width={W} height={H} fill={`url(#wall${uid})`} />
      <rect y={H * 0.7} width={W} height={H * 0.3} fill={night(time) ? '#4A3A33' : '#B98A5A'} />
      {/* shelves of wax-print rolls */}
      {[110, 190, 270].map((y, r) => (
        <g key={y}>
          <rect x="30" y={y} width="300" height="10" fill="#7A5236" />
          {Array.from({ length: 6 }, (_, k) => {
            const c = rolls[(k + r * 3) % rolls.length];
            return <g key={k}><rect x={40 + k * 48} y={y - 40} width="42" height="40" rx="4" fill={c} /><path d={`M${44 + k * 48} ${y - 30} h 34 M${44 + k * 48} ${y - 14} h 34`} stroke="#F6E7C8" strokeWidth="2.5" strokeDasharray="5 4" /></g>;
          })}
        </g>
      ))}
      {/* cloth drying on a line */}
      <path d="M380 70 Q 590 100 790 70" stroke={INK} strokeWidth="2" fill="none" />
      {[[420, '#E8B23A'], [520, '#1F6B4F'], [620, '#C0392B'], [710, '#2E6FB0']].map(([x, c], i) => (
        <g key={i} className="sc-sway-slow"><path d={`M${x} ${84 + i * 2} h 74 v 70 l -12 -8 l -12 8 l -12 -8 l -12 8 l -12 -8 l -14 8 z`} fill={c as string} /><circle cx={(x as number) + 20} cy={110} r="6" fill="#F6E7C8" opacity="0.8" /><circle cx={(x as number) + 50} cy={128} r="6" fill="#F6E7C8" opacity="0.8" /></g>
      ))}
      {/* a dress form */}
      <G x={700} y={300}><path d="M-26 -90 Q 0 -100 26 -90 L 34 -20 Q 0 -10 -34 -20 Z" fill="#B5475F" /><rect x="-3" y="-20" width="6" height="40" fill="#5B4636" /><path d="M-24 20 h 48" stroke="#5B4636" strokeWidth="6" /></G>
    </g>
  );
}
function SewingTable() {
  return (
    <g>
      <rect x="90" y={H - 140} width="640" height="20" rx="4" fill="#A0703F" />
      <rect x="110" y={H - 120} width="600" height="120" fill="#8A5A34" />
      {/* the sewing machine */}
      <G x={520} y={H - 140}>
        <path d="M-70 0 L -70 -26 Q -70 -70 -30 -70 L 50 -70 Q 66 -70 66 -54 L 66 -40 L 30 -40 L 30 -14 L 60 -14 L 60 0 Z" fill="#1F1B1A" />
        <path d="M-62 -40 Q -60 -62 -30 -62 L 48 -62" stroke="#C49A5A" strokeWidth="3" fill="none" />
        <circle cx="-74" cy="-40" r="16" fill="#2E2A28" /><circle cx="-74" cy="-40" r="5" fill="#C49A5A" />
        <rect x="42" y="-14" width="4" height="14" fill="#C49A5A" />
      </G>
      <path d={`M190 ${H - 146} l 120 -6 l 10 10 l -126 4 z`} fill="#E8B23A" />
      <path d={`M210 ${H - 146} l 14 -4 l 6 4 l -14 3 z M280 ${H - 150} l 10 4`} stroke="#F6E7C8" strokeWidth="2" />
    </g>
  );
}

/* ---------- Mangrove (Saloum delta) ---------- */
function MangroveBack({ time, uid }: { time: TimeOfDay; uid: string }) {
  const n = night(time);
  const leaf = n ? '#1E3326' : '#3E6B3A';
  return (
    <g>
      <rect y={HORIZON - 50} width={W} height={H - HORIZON + 50} fill={`url(#sea${uid})`} />
      {Array.from({ length: 14 }, (_, k) => <ellipse key={k} cx={k * 62} cy={HORIZON - 52} rx="46" ry="20" fill={leaf} opacity="0.8" />)}
      {[[90, 1], [700, 0.9], [330, 0.55], [520, 0.6]].map(([x, s], i) => <MangroveTree key={i} x={x} y={HORIZON + 40 + (s < 0.7 ? -30 : 0)} s={s} leaf={leaf} />)}
      <path d={`M0 ${HORIZON + 70} q 40 -6 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0`} stroke="#DDEFF5" strokeWidth="2" fill="none" opacity="0.5" className="sc-wave" />
    </g>
  );
}
function MangroveTree({ x, y, s, leaf }: { x: number; y: number; s: number; leaf: string }) {
  return (
    <G x={x} y={y} s={s}>
      {[-60, -30, 0, 30, 60].map((dx) => <path key={dx} d={`M0 -60 Q ${dx * 0.6} -30 ${dx} 0`} stroke="#6B4A2E" strokeWidth="6" fill="none" />)}
      <rect x="-6" y="-150" width="12" height="94" fill="#6B4A2E" />
      <ellipse cx="0" cy="-160" rx="90" ry="44" fill={leaf} />
      <ellipse cx="-40" cy="-190" rx="50" ry="28" fill={leaf} />
      <ellipse cx="44" cy="-186" rx="54" ry="30" fill={leaf} />
    </G>
  );
}
function Seedling({ x, y }: { x: number; y: number }) {
  return <G x={x} y={y}><path d="M0 0 L 0 -30" stroke="#6B4A2E" strokeWidth="3" /><ellipse cx="-7" cy="-30" rx="8" ry="4" fill="#6FA34E" transform="rotate(-30 -7 -30)" /><ellipse cx="7" cy="-34" rx="8" ry="4" fill="#5E8F45" transform="rotate(30 7 -34)" /></G>;
}
function Reeds({ x }: { x: number }) {
  return <G x={x} y={H - 30}>{[-14, -6, 2, 10, 18].map((dx, i) => <path key={i} d={`M${dx} 0 q ${dx * 0.3} -40 ${dx * 0.6 + 4} -${60 + (i % 2) * 18}`} stroke="#6E7F3A" strokeWidth="3" fill="none" />)}</G>;
}

/* ---------- Kitchen ---------- */
function KitchenBack({ time, uid }: { time: TimeOfDay; uid: string }) {
  const bowls = ['#2E6FB0', '#C0392B', '#1F6B4F', '#E8B23A'];
  return (
    <g>
      <rect width={W} height={H} fill={`url(#wall${uid})`} />
      <rect y={H * 0.7} width={W} height={H * 0.3} fill={night(time) ? '#4A3A33' : '#C9965F'} />
      {/* tiles behind the cooker */}
      {Array.from({ length: 6 }, (_, k) => <rect key={k} x={430 + (k % 3) * 46} y={150 + Math.floor(k / 3) * 46} width="42" height="42" fill="#E6EEF0" />)}
      <rect x="40" y="130" width="300" height="10" fill="#7A5236" />
      {bowls.map((c, k) => <g key={k}><path d={`M${60 + k * 70} 130 q 25 -36 50 0 z`} fill={c} /><circle cx={70 + k * 70} cy={116} r="3" fill="#fff" opacity="0.8" /></g>)}
      {/* clay pots and a hanging ladle */}
      <G x={640} y={260}><path d="M-34 0 C -44 -40, 44 -40, 34 0 C 30 20, -30 20, -34 0 Z" fill="#A0582E" /><path d="M-20 -26 h 40" stroke="#6E3A1E" strokeWidth="5" /></G>
      <path d="M380 60 L 380 140" stroke="#5B4636" strokeWidth="3" /><ellipse cx="380" cy="150" rx="14" ry="10" fill="#9AA5AE" />
      <G x={170} y={260} className="sc-noink"><rect x="-80" y="-80" width="160" height="110" rx="8" fill="#7A5236" /><rect x="-70" y="-70" width="140" height="90" rx="6" fill={night(time) ? '#16204A' : '#BFE3F5'} /><rect x="-4" y="-70" width="8" height="90" fill="#7A5236" /></G>
    </g>
  );
}
function KitchenTable() {
  return (
    <g>
      <rect x="110" y={H - 132} width="600" height="18" rx="4" fill="#A0703F" />
      <rect x="130" y={H - 114} width="560" height="114" fill="#8A5A34" />
      <G x={420} y={H - 132}><path d="M-60 0 Q -56 -44 0 -46 Q 56 -44 60 0 Z" fill="#E6EEF0" /><path d="M-52 -14 h 104" stroke="#2E6FB0" strokeWidth="4" /><path d="M20 -40 L 60 -96" stroke="#A0703F" strokeWidth="6" strokeLinecap="round" /></G>
      <G x={230} y={H - 132}><path d="M-26 0 L -30 -60 Q 0 -70 30 -60 L 26 0 Z" fill="#F3EBDD" /><path d="M-30 -60 Q 0 -50 30 -60" stroke={INK} strokeWidth="2" fill="none" /></G>
      {[560, 590, 620].map((x, i) => <ellipse key={x} cx={x} cy={H - 142} rx="12" ry="15" fill={i === 1 ? '#F6E7C8' : '#E9D5B2'} />)}
    </g>
  );
}

/* ---------- Village festival (bunting, a canopy, the crowd) ---------- */
function FestivalBack({ time, tone }: { time: TimeOfDay; tone: Tone }) {
  const n = night(time);
  const flags = ['#C0392B', '#E8B23A', '#1F6B4F', '#2E6FB0', '#B5475F'];
  return (
    <g>
      <path d={`M0 ${HORIZON - 10} L ${W} ${HORIZON - 10} L ${W} ${H} L 0 ${H} Z`} fill={n ? '#3D3550' : '#D3A272'} />
      {/* the canopy where the musicians play */}
      <path d={`M240 ${HORIZON - 150} L 560 ${HORIZON - 150} L 600 ${HORIZON - 110} L 200 ${HORIZON - 110} Z`} fill={n ? '#6E1630' : '#C0392B'} />
      {Array.from({ length: 8 }, (_, k) => <path key={k} d={`M${200 + k * 50} ${HORIZON - 110} q 25 18 50 0`} fill={n ? '#8A2A44' : '#E8B23A'} />)}
      <rect x="214" y={HORIZON - 110} width="8" height="130" fill="#5B4636" /><rect x="578" y={HORIZON - 110} width="8" height="130" fill="#5B4636" />
      {/* bunting */}
      {[0, 1].map((r) => (
        <g key={r}>
          <path d={`M-10 ${40 + r * 40} Q 400 ${110 + r * 40} 810 ${40 + r * 40}`} stroke={INK} strokeWidth="1.6" fill="none" />
          {Array.from({ length: 16 }, (_, k) => {
            const x = k * 52 + (r ? 26 : 0);
            const t = x / 800;
            const y = 40 + r * 40 + 4 * 70 * t * (1 - t) * (1 + 0);
            return <path key={k} d={`M${x - 12} ${y} L ${x + 12} ${y} L ${x} ${y + 24} Z`} fill={flags[(k + r) % flags.length]} />;
          })}
        </g>
      ))}
      {n && [140, 400, 660].map((x) => <g key={x} className="sc-twinkle"><circle cx={x} cy={150} r="26" fill="#FFD27A" opacity="0.25" className="sc-noink" /><circle cx={x} cy={150} r="9" fill="#FFD27A" /></g>)}
      {/* the crowd */}
      {Array.from({ length: 22 }, (_, k) => {
        const x = k * 38 + 6;
        const y = HORIZON + 6 + (k % 3) * 6;
        return <g key={k}><rect x={x - 12} y={y} width="24" height="34" rx="10" fill={flags[k % flags.length]} opacity="0.85" /><circle cx={x} cy={y - 8} r="11" fill={['#6B3F26', '#4E2F1F', '#8A5634'][k % 3]} /></g>;
      })}
      <path d={`M0 ${HORIZON + 40} L ${W} ${HORIZON + 40} L ${W} ${H} L 0 ${H} Z`} fill={n ? '#3D3550' : tone.mid} />
    </g>
  );
}
function Djembe({ x, y, s = 1, c = '#8A5A34' }: { x: number; y: number; s?: number; c?: string }) {
  return <G x={x} y={y} s={s}><path d="M-26 -90 L 26 -90 L 14 -40 L 22 0 L -22 0 L -14 -40 Z" fill={c} /><ellipse cx="0" cy="-90" rx="26" ry="7" fill="#E9D5B2" /><path d="M-24 -84 L -12 -42 M 24 -84 L 12 -42 M-8 -88 L -4 -44 M 8 -88 L 4 -44" stroke="#F6E7C8" strokeWidth="1.4" /></G>;
}

/* ---------- Shared bits ---------- */
function NearGrass({ colour }: { colour: string }) {
  return <path d={`M0 ${H - 40} C 140 ${H - 58}, 300 ${H - 36}, 440 ${H - 50} S 700 ${H - 60}, ${W} ${H - 42} L ${W} ${H} L 0 ${H} Z`} fill={colour} />;
}
function Ball({ x, y }: { x: number; y: number }) {
  return <G x={x} y={y}><circle r="18" fill="#FFFFFF" /><path d="M0 -7 l 7 5 l -3 8 h -8 l -3 -8 z" fill={INK} /><path d="M0 -7 V -18 M7 -2 L 17 -6 M4 6 L 10 15 M-4 6 L -10 15 M-7 -2 L -17 -6" stroke={INK} strokeWidth="1.4" /></G>;
}

/* ======================= Everyday details (change from page to page) ======================= */

const POOLS: Partial<Record<SceneKind, string[]>> = {
  compound: ['chickens', 'laundry', 'bike', 'pots', 'cat', 'bench'],
  savanna: ['termites', 'zebu', 'bush', 'chickens'],
  coast: ['palm', 'gulls', 'shells', 'crab'],
  market: ['baskets', 'bananas', 'cat'],
  street: ['taxi', 'moto', 'kiosk', 'chickens'],
  pitch: ['bike', 'zebu'],
  garden: ['chickens', 'basket'],
  festival: ['chickens'],
};

export function Details({ kind, time, seed, tone }: { kind: SceneKind; time: TimeOfDay; seed: number; tone: Tone }) {
  const pool = POOLS[kind];
  if (!pool) return null;
  const a = pool[seed % pool.length];
  const b = pool[(seed >> 3) % pool.length];
  const picks = a === b ? [a] : [a, b];
  const n = night(time);
  return <g>{picks.map((p, i) => <Detail key={`${p}-${i}`} name={p} side={i === 0 ? 'left' : 'right'} night={n} tone={tone} />)}</g>;
}

function Detail({ name, side, night: n, tone }: { name: string; side: 'left' | 'right'; night: boolean; tone: Tone }) {
  const x = side === 'left' ? 90 : 712;
  switch (name) {
    case 'chickens':
      return <g>{[0, 1].map((k) => <G key={k} x={x - 20 + k * 42} y={H - 66 + k * 8} s={0.9 - k * 0.15} className="sc-nibble"><ellipse cx="0" cy="0" rx="20" ry="15" fill={k ? '#C0392B' : '#F3EBDD'} /><circle cx="16" cy="-14" r="9" fill={k ? '#C0392B' : '#F3EBDD'} /><path d="M24 -14 l 7 2 l -7 3 z" fill="#E8B23A" /><path d="M14 -24 q 3 -6 6 0" fill="#D9452B" /><path d="M-4 14 v 10 M 4 14 v 10" stroke="#E8B23A" strokeWidth="2.4" /><path d="M-18 -4 q -10 -10 -4 -18" fill={k ? '#8E2F2A' : '#E0D2B8'} /></G>)}</g>;
    case 'laundry':
      return <g><path d={`M${x - 80} 190 L ${x - 80} 330 M ${x + 90} 186 L ${x + 90} 330`} stroke="#6B4A2E" strokeWidth="6" /><path d={`M${x - 80} 196 Q ${x} 214 ${x + 90} 192`} stroke={INK} strokeWidth="1.6" fill="none" />{[['#E8B23A', -60], ['#2E6FB0', -16], ['#C0392B', 30]].map(([c, dx], k) => <rect key={k} x={x + (dx as number)} y={202 + k * 2} width="38" height={46 - k * 6} rx="3" fill={c as string} className="sc-sway-slow" />)}</g>;
    case 'bike':
      return <G x={x} y={H - 76} s={0.9}><circle cx="-34" cy="20" r="22" fill="none" stroke={INK} strokeWidth="4" /><circle cx="34" cy="20" r="22" fill="none" stroke={INK} strokeWidth="4" /><path d="M-34 20 L -6 -12 L 26 -12 L 34 20 M -6 -12 L 0 20 L -34 20 M 26 -12 L 22 -26 h 10 M -10 -18 h 12" stroke="#C0392B" strokeWidth="4" fill="none" strokeLinejoin="round" /></G>;
    case 'pots':
      return <g>{[0, 1, 2].map((k) => <G key={k} x={x - 30 + k * 34} y={H - 120 + (k % 2) * 6} s={0.7 + (k % 2) * 0.2}><path d="M-22 0 C -30 -30, 30 -30, 22 0 C 20 14, -20 14, -22 0 Z" fill={k === 1 ? '#8E4A2A' : '#A0582E'} /></G>)}</g>;
    case 'cat':
      return <G x={x} y={H - 70} s={0.8}><ellipse cx="0" cy="0" rx="26" ry="14" fill="#8E8A86" /><circle cx="24" cy="-12" r="12" fill="#8E8A86" /><path d="M16 -22 l 3 -10 l 6 8 M 28 -22 l 4 -10 l 4 10" fill="#8E8A86" /><path d="M-24 -2 q -20 -10 -14 -30" stroke="#8E8A86" strokeWidth="6" fill="none" strokeLinecap="round" /><circle cx="22" cy="-13" r="1.6" fill={INK} /><circle cx="29" cy="-13" r="1.6" fill={INK} /></G>;
    case 'bench':
      return <G x={x} y={H - 90}><rect x="-60" y="0" width="120" height="12" rx="3" fill="#8A5A34" /><path d="M-50 12 v 30 M 50 12 v 30" stroke="#6B4A2E" strokeWidth="7" /></G>;
    case 'termites':
      return <G x={x} y={HORIZON + 50}><path d="M-40 0 C -36 -50, -16 -110, 0 -118 C 14 -100, 30 -50, 38 0 Z" fill={n ? '#4A3A44' : '#B0703E'} /><path d="M-10 -90 c 6 0 6 10 0 10" stroke={INK} strokeWidth="1.4" fill="none" /></G>;
    case 'zebu':
      return <G x={x} y={HORIZON + 40} s={0.8}><ellipse cx="0" cy="0" rx="50" ry="24" fill={n ? '#6A6680' : '#E9E2D6'} /><path d="M-10 -22 q 10 -18 22 -2" fill={n ? '#6A6680' : '#E9E2D6'} />{[-34, -16, 18, 34].map((lx) => <rect key={lx} x={lx} y="14" width="7" height="30" fill={n ? '#5A566E' : '#D8D0C2'} />)}<ellipse cx="54" cy="-10" rx="16" ry="12" fill={n ? '#6A6680' : '#E9E2D6'} /><path d="M48 -20 q -6 -16 -16 -16 M 62 -20 q 6 -16 16 -16" stroke="#8A7A62" strokeWidth="3" fill="none" /></G>;
    case 'bush':
      return <G x={x} y={HORIZON + 40}>{[-30, 0, 30].map((dx, k) => <ellipse key={k} cx={dx} cy={-20 - (k % 2) * 10} rx="30" ry="22" fill={n ? '#26402F' : tone.near} />)}</G>;
    case 'palm':
      return <G x={side === 'left' ? 50 : 760} y={HORIZON + 80}><path d="M0 0 Q -10 -120 14 -230" stroke="#7A5A35" strokeWidth="12" fill="none" />{[-70, -30, 10, 50, 90].map((a) => <path key={a} d={`M14 -230 q ${a * 0.8} -30 ${a * 1.4} 20`} stroke={n ? '#1E3326' : '#3E7A3A'} strokeWidth="10" fill="none" strokeLinecap="round" className="sc-sway-slow" />)}</G>;
    case 'gulls':
      return <g className="sc-fly">{[[x, 120], [x + 34, 104], [x - 30, 140]].map(([gx, gy], k) => <path key={k} d={`M${gx - 14} ${gy} q 7 -9 14 0 q 7 -9 14 0`} fill="none" stroke={n ? '#C9CFE6' : INK} strokeWidth="2.2" />)}</g>;
    case 'shells':
      return <g>{[[x - 20, H - 40], [x + 20, H - 30]].map(([sx, sy], k) => <path key={k} d={`M${sx - 10} ${sy} q 10 -22 20 0 z`} fill={k ? '#F4A6A6' : '#F3EBDD'} />)}</g>;
    case 'crab':
      return <G x={x} y={H - 40} s={0.8}><ellipse cx="0" cy="0" rx="18" ry="11" fill="#D9452B" /><path d="M-16 -4 l -14 -12 M 16 -4 l 14 -12 M-12 8 l -12 8 M 12 8 l 12 8" stroke="#D9452B" strokeWidth="4" strokeLinecap="round" /><circle cx="-6" cy="-12" r="3" fill={INK} /><circle cx="6" cy="-12" r="3" fill={INK} /></G>;
    case 'baskets':
      return <g>{[0, 1].map((k) => <G key={k} x={x - 24 + k * 50} y={H - 60}><path d="M-26 0 L 26 0 L 20 30 L -20 30 Z" fill="#C49A5A" /><path d="M-24 8 h 48 M-22 18 h 44" stroke="#8A6A3A" strokeWidth="2" />{[-12, 0, 12].map((dx) => <circle key={dx} cx={dx} cy={-4} r="8" fill={k ? '#E67E22' : '#C0392B'} />)}</G>)}</g>;
    case 'bananas':
      return <G x={x} y={150}><path d="M0 0 v 20" stroke={INK} strokeWidth="2" />{[-14, -4, 6, 16].map((dx, k) => <path key={k} d={`M${dx} 20 q -6 30 ${4 + k} 46`} stroke="#E8C53A" strokeWidth="9" fill="none" strokeLinecap="round" />)}</G>;
    case 'taxi':
      return <G x={x} y={HORIZON + 50} s={0.8}><path d="M-70 0 L -70 -26 L -40 -30 L -22 -56 L 34 -56 L 52 -30 L 76 -26 L 76 0 Z" fill="#E8B23A" /><rect x="-16" y="-50" width="20" height="18" fill="#BFE3F5" /><rect x="10" y="-50" width="20" height="18" fill="#BFE3F5" /><path d="M-70 -12 h 146" stroke="#2E7A4A" strokeWidth="5" /><circle cx="-40" cy="2" r="13" fill="#2A2A2A" /><circle cx="46" cy="2" r="13" fill="#2A2A2A" /></G>;
    case 'moto':
      return <G x={x} y={H - 86} s={0.9}><circle cx="-36" cy="22" r="20" fill="none" stroke={INK} strokeWidth="6" /><circle cx="40" cy="22" r="20" fill="none" stroke={INK} strokeWidth="6" /><path d="M-36 22 L -6 -6 L 30 -6 L 40 22 M -14 -8 Q 0 -22 22 -14 L 30 -6 M 30 -6 L 24 -30 h 12" stroke="#1F6B4F" strokeWidth="7" fill="none" strokeLinejoin="round" /><rect x="-20" y="-20" width="30" height="10" rx="5" fill="#2A2A2A" /></G>;
    case 'kiosk':
      return <G x={x} y={H - 150}><rect x="-50" y="0" width="100" height="80" fill="#2E6FB0" /><rect x="-44" y="10" width="88" height="34" fill="#F6E7C8" /><path d="M-56 0 h 112 l -10 -16 h -92 z" fill="#C0392B" />{[-30, -10, 10, 30].map((dx) => <rect key={dx} x={dx - 6} y={20} width="12" height="18" fill={['#E8B23A', '#1F6B4F', '#C0392B', '#E67E22'][(dx + 30) / 20]} />)}</G>;
    case 'basket':
      return <G x={x} y={H - 70}><path d="M-30 0 L 30 0 L 22 34 L -22 34 Z" fill="#C49A5A" />{[-16, -2, 12].map((dx) => <circle key={dx} cx={dx} cy={-4} r="10" fill="#D9452B" />)}</G>;
    default:
      return null;
  }
}
