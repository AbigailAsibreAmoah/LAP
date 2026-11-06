import type { PortraitSpec } from '@laporte/shared';
import type { Expression } from '../../../components/3d/Portrait';

/*
 * Picture-book characters, drawn full length in the style of a hand-illustrated children's book:
 * a big round head, a small body, ink outlines, rosy cheeks and a pose that says what is happening.
 * Feet stand at (0, 0); everything is drawn upwards from there. Moving poses (walking, running,
 * dancing) have two drawn frames swapped on a beat, the way hand-made animation does.
 */

export type Pose = 'stand' | 'wave' | 'cheer' | 'walk' | 'jump' | 'run' | 'sit' | 'crouch' | 'point' | 'think' | 'carry' | 'dance' | 'read' | 'sad' | 'sleep';

const INK = '#3a2618';
const ADULTS = new Set(['maman', 'papa', 'mamie', 'grandpere', 'prof']);
const ELDERS = new Set(['mamie', 'grandpere']);
const DRESSES = new Set(['maman', 'mamie', 'afi', 'awa', 'fatou', 'prof', 'aminata', 'sena']);
const SHOES = ['#E8B23A', '#C0392B', '#2E6FB0', '#1F6B4F'];

export const isAdult = (who: string) => ADULTS.has(who);
export const isElder = (who: string) => ELDERS.has(who);

interface Body {
  r: number; headY: number; neck: number; hip: number; sy: number; sx: number; bw: number; arm: number; leg: number;
}
const CHILD: Body = { r: 46, headY: -150, neck: -104, hip: -44, sy: -98, sx: 18, bw: 27, arm: 44, leg: 40 };
const ADULT: Body = { r: 34, headY: -224, neck: -190, hip: -88, sy: -182, sx: 24, bw: 34, arm: 74, leg: 82 };

const line = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

type Pt = [number, number];
interface Frame { feet: [Pt, Pt]; hands: [Pt, Pt]; knees?: [Pt, Pt] }
type Extra = 'stool' | 'basket' | 'bucket' | 'book' | 'zzz' | 'lines';
interface PoseSpec { frames: Frame[]; drop: number; tilt: number; headTilt: number; lift: number; extra?: Extra }

/** Where hands and feet go for each pose (hands in upper-body coordinates, feet on the ground). */
function poseSpec(pose: Pose, b: Body, adult: boolean): PoseSpec {
  const w = adult ? 12 : 10;
  const { arm: A, leg: L, sx, sy, r, headY } = b;
  const down = sy + A;
  const out = sx + 8;
  const base = { drop: 0, tilt: 0, headTilt: 0, lift: 0 };
  const still = (hands: [Pt, Pt], extra?: Extra): PoseSpec => ({ ...base, extra, frames: [{ feet: [[-w, 0], [w, 0]], hands }] });
  switch (pose) {
    case 'wave': return still([[-out, down], [sx + 26, sy - A * 0.7]]);
    case 'cheer': return still([[-(sx + 22), sy - A * 0.75], [sx + 22, sy - A * 0.75]]);
    case 'point': return { ...still([[-out, down], [sx + A * 0.98, sy + 2]]), tilt: 3 };
    case 'think': return { ...still([[-out + 4, down], [r * 0.26, headY + r * 0.9]]), headTilt: 6 };
    case 'sad': return { ...still([[-r * 0.4, headY + r * 0.6], [r * 0.4, headY + r * 0.6]]), headTilt: 8 };
    case 'sleep': return { ...still([[-out, down], [out, down]], 'zzz'), headTilt: -14 };
    case 'read': return { ...still([[-12, sy + A * 0.55], [12, sy + A * 0.55]], 'book'), headTilt: 5 };
    case 'carry':
      return adult
        ? still([[-r * 0.78, headY - r * 0.92], [r * 0.78, headY - r * 0.92]], 'basket')
        : { ...still([[-out, down], [out + 4, down + 2]], 'bucket'), tilt: -4 };
    case 'walk':
      return { ...base, frames: [
        { feet: [[-w - 12, 0], [w + 8, -3]], hands: [[-out + 12, down - 4], [out - 2, down - 8]] },
        { feet: [[-w + 6, -3], [w + 14, 0]], hands: [[-out - 4, down - 8], [out - 12, down - 4]] },
      ] };
    case 'run':
      return { ...base, tilt: 9, frames: [
        { feet: [[-w - 24, -2], [w + 16, -L * 0.5]], hands: [[-sx - 16, sy + A * 0.55], [sx + 20, sy + A * 0.15]], knees: [[-w - 8, b.hip * 0.5], [w + 22, b.hip * 0.75]] },
        { feet: [[-w + 4, -L * 0.5], [w + 26, -2]], hands: [[-sx - 4, sy + A * 0.15], [sx + 22, sy + A * 0.6]], knees: [[-w + 14, b.hip * 0.75], [w + 14, b.hip * 0.5]] },
      ] };
    case 'jump':
      return { ...base, lift: adult ? 14 : 22, extra: 'lines', frames: [{ feet: [[-w - 10, -10], [w + 14, -16]], hands: [[-(sx + 30), sy - 14], [sx + 28, sy - A * 0.6]], knees: [[-w - 18, b.hip * 0.45], [w + 22, b.hip * 0.55]] }] };
    case 'dance':
      return { ...base, frames: [
        { feet: [[-w - 8, 0], [w + 16, -L * 0.45]], hands: [[-(sx + 24), sy - A * 0.6], [sx + 22, sy + A * 0.15]], knees: [[-w - 6, b.hip * 0.5], [w + 24, b.hip * 0.7]] },
        { feet: [[-w - 16, -L * 0.45], [w + 8, 0]], hands: [[-(sx + 22), sy + A * 0.15], [sx + 24, sy - A * 0.6]], knees: [[-w - 24, b.hip * 0.7], [w + 6, b.hip * 0.5]] },
      ] };
    case 'sit': {
      const drop = L * 0.62;
      const seat = b.hip + drop;
      return { ...base, drop, extra: 'stool', frames: [{ feet: [[-w + 20, 0], [w + 24, 0]], knees: [[-w + 22, seat - 2], [w + 26, seat - 2]], hands: [[-sx + 16, sy + A * 0.8], [sx + 18, sy + A * 0.8]] }] };
    }
    case 'crouch': {
      const drop = L * 0.5;
      return { ...base, drop, tilt: 7, frames: [{ feet: [[-w - 8, 0], [w + 10, 0]], knees: [[-w - 20, b.hip * 0.35], [w + 24, b.hip * 0.35]], hands: [[-sx + 6, -18 - drop], [sx + 18, -16 - drop]] }] };
    }
    default: return still([[-out, down], [out, down]]);
  }
}

export function Figure({ who, spec, expression = 'smile', pose = 'stand', uid }: { who: string; spec: PortraitSpec; expression?: Expression; pose?: Pose; uid: string }) {
  const adult = isAdult(who);
  const b = adult ? ADULT : CHILD;
  const dress = DRESSES.has(who);
  const shoe = adult ? '#4a3324' : SHOES[[...who].reduce((a, c) => a + c.charCodeAt(0), 0) % SHOES.length];
  const ps = poseSpec(pose, b, adult);
  const clip = `fgc-${uid}-${who}`;
  const hip = b.hip + ps.drop;
  const upper = `translate(0 ${ps.drop}) rotate(${ps.tilt} 0 ${b.hip})`;
  const headRot = `rotate(${ps.headTilt} 0 ${b.neck})`;
  const legW = adult ? 13 : 12;
  const mood = pose === 'sad' ? 'sad' : pose === 'sleep' ? 'sleep' : undefined;

  const frame = (fr: Frame) => (
    <>
      {/* legs: hip → knee → foot */}
      {fr.feet.map(([fx, fy], i) => {
        const hx = (i ? 1 : -1) * (adult ? 10 : 8);
        const [kx, ky] = fr.knees?.[i] ?? [(hx + fx) / 2, (hip + fy) / 2];
        const d = `M${hx} ${hip} L ${kx} ${ky} L ${fx} ${fy - 6}`;
        return (
          <g key={i}>
            <path d={d} stroke={INK} strokeWidth={legW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d={d} stroke={dress || adult ? spec.skin : '#2b3a55'} strokeWidth={legW - 4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d={`M${fx - 9} ${fy - 1} q 0 -12 10 -11 q 10 0 12 8 q 1 4 -3 4 z`} fill={shoe} {...line} transform={i ? `translate(${2 * fx}) scale(-1 1)` : undefined} />
          </g>
        );
      })}
      <g transform={upper}>
        <Torso b={b} dress={dress} spec={spec} clip={clip} />
        {fr.hands.map(([hx, hy], i) => {
          const s = i ? 1 : -1;
          const sx = s * b.sx;
          const ex = (sx + hx) / 2 + s * 8;
          const ey = (b.sy + hy) / 2 + 4;
          return (
            <g key={i}>
              <path d={`M${sx} ${b.sy + 4} Q ${ex} ${ey} ${hx} ${hy}`} stroke={INK} strokeWidth={legW} strokeLinecap="round" fill="none" />
              <path d={`M${sx} ${b.sy + 4} Q ${ex} ${ey} ${hx} ${hy}`} stroke={spec.outfit} strokeWidth={legW - 4} strokeLinecap="round" fill="none" />
              <circle cx={hx} cy={hy} r={adult ? 6 : 5.5} fill={spec.skin} {...line} strokeWidth={2} />
            </g>
          );
        })}
        {ps.extra === 'book' && <g><path d={`M-20 ${fr.hands[0][1] - 18} l 20 4 l 20 -4 l 0 22 l -20 4 l -20 -4 z`} fill="#F6E7C8" {...line} strokeWidth={2} /><path d={`M0 ${fr.hands[0][1] - 14} v 22`} stroke={INK} strokeWidth="1.6" /></g>}
        {ps.extra === 'bucket' && <g transform={`translate(${fr.hands[1][0]} ${fr.hands[1][1]})`}><path d="M-12 6 L 12 6 L 9 30 L -9 30 Z" fill="#7FA3B8" {...line} strokeWidth={2} /><path d="M-11 7 Q 0 -10 11 7" fill="none" stroke={INK} strokeWidth="2" /></g>}
        {who === 'grandpere' && (pose === 'stand' || pose === 'walk' || pose === 'point' || pose === 'think') && <path d={`M${fr.hands[0][0]} ${fr.hands[0][1]} L ${fr.hands[0][0] - 6} ${-ps.drop}`} stroke="#6B4A2E" strokeWidth="5" strokeLinecap="round" />}
      </g>
    </>
  );

  return (
    <g className={`fg fg-${pose}`}>
      <ellipse cx="0" cy="2" rx={adult ? 40 : 34} ry="7" fill="rgba(58,38,24,.16)" />
      {ps.extra === 'lines' && <path d="M-30 -4 q 30 10 60 0 M-22 6 q 22 8 44 0 M-14 15 q 14 5 28 0" stroke={INK} strokeWidth="2" fill="none" opacity="0.55" strokeLinecap="round" />}
      {pose === 'run' && <path d="M-60 -60 h -30 M-56 -40 h -40 M-62 -20 h -24" stroke={INK} strokeWidth="2" opacity="0.45" strokeLinecap="round" />}
      {ps.extra === 'stool' && <g><rect x={-30} y={hip + 2} width="56" height="10" rx="3" fill="#8A5A34" {...line} strokeWidth={2} /><path d={`M-24 ${hip + 12} L -28 0 M 20 ${hip + 12} L 24 0`} stroke={INK} strokeWidth="5" strokeLinecap="round" /></g>}
      <g className="fg-body">
        <g transform={`translate(0 ${-ps.lift})`}>
          <defs>
            <clipPath id={clip}><path d={torsoPath(b, dress)} /></clipPath>
          </defs>
          <g transform={upper}><g transform={headRot}><HairBack spec={spec} b={b} /></g></g>
          {ps.frames.length > 1 ? ps.frames.map((fr, k) => <g key={k} className={`fg-f${k + 1}`}>{frame(fr)}</g>) : frame(ps.frames[0])}
          <g transform={upper}>
            <g transform={headRot}>
              <Head spec={spec} b={b} expression={expression} mood={mood} />
              {ps.extra === 'basket' && <g><ellipse cx="0" cy={b.headY - b.r - 4} rx={b.r * 1.05} ry="9" fill="#C49A5A" {...line} strokeWidth={2} /><path d={`M${-b.r} ${b.headY - b.r - 6} Q 0 ${b.headY - b.r - 34} ${b.r} ${b.headY - b.r - 6} Z`} fill="#E8B23A" {...line} strokeWidth={2} /><circle cx={-b.r * 0.4} cy={b.headY - b.r - 16} r="7" fill="#E67E22" {...line} strokeWidth={1.6} /><circle cx={b.r * 0.2} cy={b.headY - b.r - 20} r="7" fill="#C0392B" {...line} strokeWidth={1.6} /></g>}
            </g>
            {ps.extra === 'zzz' && <g fill={INK} fontFamily="Andika, sans-serif" fontWeight="700"><text x={b.r * 0.9} y={b.headY - b.r * 0.9} fontSize="22">z</text><text x={b.r * 1.3} y={b.headY - b.r * 1.35} fontSize="16" opacity="0.7">z</text></g>}
          </g>
        </g>
      </g>
    </g>
  );
}

function torsoPath(b: Body, dress: boolean) {
  const hem = dress ? b.hip + b.leg * 0.5 : b.hip + 4;
  const flare = dress ? b.bw + 10 : b.bw;
  return `M${-b.bw * 0.62} ${b.neck} Q 0 ${b.neck - 6} ${b.bw * 0.62} ${b.neck} Q ${b.bw + 2} ${b.neck + 10} ${b.bw * 0.85} ${(b.neck + b.hip) / 2} L ${flare} ${hem} Q 0 ${hem + 8} ${-flare} ${hem} L ${-b.bw * 0.85} ${(b.neck + b.hip) / 2} Q ${-b.bw - 2} ${b.neck + 10} ${-b.bw * 0.62} ${b.neck} Z`;
}

function Torso({ b, dress, spec, clip }: { b: Body; dress: boolean; spec: PortraitSpec; clip: string }) {
  const d = torsoPath(b, dress);
  const top = b.neck;
  const bottom = dress ? b.hip + b.leg * 0.5 : b.hip + 4;
  // A simple wax-print motif in the accent colour: dots and short strokes, clipped to the clothes.
  const motif = [];
  for (let y = top + 10; y < bottom; y += 14) {
    for (let x = -b.bw - 10; x <= b.bw + 10; x += 14) {
      const odd = Math.round((y - top) / 14) % 2;
      motif.push(odd ? <circle key={`${x}${y}`} cx={x + 7} cy={y} r="2.6" fill={spec.accent} opacity="0.85" /> : <path key={`${x}${y}`} d={`M${x} ${y} q 4 -4 8 0`} stroke={spec.accent} strokeWidth="2" fill="none" opacity="0.8" />);
    }
  }
  return (
    <g>
      <rect x="-6" y={b.neck - 10} width="12" height="14" fill={spec.skin} />
      <path d={d} fill={spec.outfit} />
      <g clipPath={`url(#${clip})`}>{motif}</g>
      <path d={d} fill="none" {...line} />
    </g>
  );
}

function HairBack({ spec, b }: { spec: PortraitSpec; b: Body }) {
  const { r, headY: y } = b;
  const c = spec.hairColor;
  switch (spec.hair) {
    case 'puff': return <circle cx="0" cy={y - r * 0.75} r={r * 0.86} fill={c} {...line} />;
    case 'bob': return <path d={`M${-r * 1.08} ${y + r * 0.55} C ${-r * 1.3} ${y - r * 1.2}, ${r * 1.3} ${y - r * 1.2}, ${r * 1.08} ${y + r * 0.55} Q ${r * 0.9} ${y + r * 0.72} ${r * 0.7} ${y + r * 0.6} L ${-r * 0.7} ${y + r * 0.6} Q ${-r * 0.9} ${y + r * 0.72} ${-r * 1.08} ${y + r * 0.55} Z`} fill={c} {...line} />;
    case 'locs':
      return (
        <g>
          {[-0.95, -0.7, -0.45, 0.45, 0.7, 0.95].map((k) => <path key={k} d={`M${k * r} ${y - r * 0.2} q ${k * 6} ${r * 0.7} ${k * 4} ${r * 1.25}`} stroke={INK} strokeWidth="10" strokeLinecap="round" fill="none" />)}
          {[-0.95, -0.7, -0.45, 0.45, 0.7, 0.95].map((k) => <path key={`i${k}`} d={`M${k * r} ${y - r * 0.2} q ${k * 6} ${r * 0.7} ${k * 4} ${r * 1.25}`} stroke={c} strokeWidth="6.5" strokeLinecap="round" fill="none" />)}
        </g>
      );
    default: return null;
  }
}

function Head({ spec, b, expression: given, mood }: { spec: PortraitSpec; b: Body; expression: Expression; mood?: 'sad' | 'sleep' }) {
  const { r, headY: y } = b;
  const ey = y + r * 0.08;
  const ex = r * 0.36;
  const expression: Expression = mood ? 'calm' : given;
  const closed = expression === 'joy' || expression === 'calm';
  return (
    <g>
      <circle cx={-r * 0.98} cy={y + r * 0.1} r={r * 0.17} fill={spec.skin} {...line} strokeWidth={2} />
      <circle cx={r * 0.98} cy={y + r * 0.1} r={r * 0.17} fill={spec.skin} {...line} strokeWidth={2} />
      <ellipse cx="0" cy={y} rx={r} ry={r * 0.96} fill={spec.skin} {...line} />
      {/* soft shading on the far side of the face, like a brush stroke */}
      <path d={`M${r * 0.55} ${y - r * 0.75} Q ${r * 1.05} ${y} ${r * 0.5} ${y + r * 0.85} Q ${r * 0.8} ${y} ${r * 0.55} ${y - r * 0.75} Z`} fill="#000" opacity="0.08" />
      <HairFront spec={spec} b={b} />
      {/* cheeks */}
      <circle cx={-r * 0.56} cy={ey + r * 0.3} r={r * 0.15} fill="#E86A6A" opacity="0.45" />
      <circle cx={r * 0.56} cy={ey + r * 0.3} r={r * 0.15} fill="#E86A6A" opacity="0.45" />
      {/* eyes */}
      {closed ? (
        <>
          <path d={`M${-ex - 6} ${ey} q 6 ${expression === 'joy' ? 6 : 4} 12 0`} fill="none" {...line} strokeWidth={2.6} />
          <path d={`M${ex - 6} ${ey} q 6 ${expression === 'joy' ? 6 : 4} 12 0`} fill="none" {...line} strokeWidth={2.6} />
        </>
      ) : (
        <>
          <ellipse cx={-ex} cy={ey} rx="3.4" ry="4.2" fill={INK} />
          <ellipse cx={ex} cy={ey} rx="3.4" ry="4.2" fill={INK} />
          <circle cx={-ex + 1.2} cy={ey - 1.5} r="1.1" fill="#fff" />
          <circle cx={ex + 1.2} cy={ey - 1.5} r="1.1" fill="#fff" />
          {expression === 'focus' && <><path d={`M${-ex - 6} ${ey - 10} q 6 -4 12 -1`} fill="none" {...line} strokeWidth={2} /><path d={`M${ex - 6} ${ey - 11} q 6 -3 12 1`} fill="none" {...line} strokeWidth={2} /></>}
        </>
      )}
      {spec.glasses && <g fill="none" stroke={INK} strokeWidth="2"><circle cx={-ex} cy={ey} r={r * 0.22} /><circle cx={ex} cy={ey} r={r * 0.22} /><path d={`M${-ex + r * 0.22} ${ey} h ${2 * ex - r * 0.44}`} /></g>}
      {/* nose and mouth */}
      <path d={`M-2 ${ey + r * 0.24} q 3 3 6 0`} fill="none" {...line} strokeWidth={1.8} />
      {expression === 'joy' ? (
        <path d={`M${-r * 0.3} ${ey + r * 0.4} Q 0 ${ey + r * 0.78} ${r * 0.3} ${ey + r * 0.4} Z`} fill="#8E2F2A" {...line} strokeWidth={2} />
      ) : expression === 'focus' ? (
        <ellipse cx="2" cy={ey + r * 0.5} rx="3.2" ry="2.6" fill="#8E2F2A" />
      ) : mood === 'sad' ? (
        <path d={`M${-r * 0.2} ${ey + r * 0.56} q ${r * 0.2} ${-r * 0.16} ${r * 0.4} 0`} fill="none" {...line} strokeWidth={2.2} />
      ) : (
        <path d={`M${-r * 0.22} ${ey + r * 0.44} q ${r * 0.22} ${r * (expression === 'calm' ? 0.12 : 0.2)} ${r * 0.44} 0`} fill="none" {...line} strokeWidth={2.2} />
      )}
      {spec.beard && <path d={`M${-r * 0.6} ${y + r * 0.5} Q 0 ${y + r * 1.25} ${r * 0.6} ${y + r * 0.5} Q 0 ${y + r * 0.95} ${-r * 0.6} ${y + r * 0.5} Z`} fill={spec.hairColor} {...line} strokeWidth={1.8} />}
    </g>
  );
}

function HairFront({ spec, b }: { spec: PortraitSpec; b: Body }) {
  const { r, headY: y } = b;
  const c = spec.hairColor;
  const cap = `M${-r * 0.98} ${y - r * 0.05} C ${-r * 1.02} ${y - r * 1.2}, ${r * 1.02} ${y - r * 1.2}, ${r * 0.98} ${y - r * 0.05} Q ${r * 0.7} ${y - r * 0.5} ${r * 0.2} ${y - r * 0.55} Q ${-r * 0.1} ${y - r * 0.42} ${-r * 0.4} ${y - r * 0.56} Q ${-r * 0.8} ${y - r * 0.45} ${-r * 0.98} ${y - r * 0.05} Z`;
  switch (spec.hair) {
    case 'short':
    case 'puff':
    case 'locs':
      return <path d={cap} fill={c} {...line} />;
    case 'waves':
      return <g><path d={cap} fill={c} {...line} /><path d={`M${-r * 0.6} ${y - r * 0.7} q ${r * 0.3} -${r * 0.15} ${r * 0.6} 0 M${-r * 0.1} ${y - r * 0.85} q ${r * 0.3} -${r * 0.15} ${r * 0.6} 0`} stroke="#fff" strokeWidth="1.6" opacity="0.35" fill="none" /></g>;
    case 'curls':
      return <g>{[[-0.85, -0.25], [-0.65, -0.7], [-0.25, -0.95], [0.2, -0.98], [0.62, -0.75], [0.88, -0.3], [-0.4, -0.55], [0.35, -0.6], [0, -0.7]].map(([cx, cy], i) => <circle key={i} cx={cx * r} cy={y + cy * r} r={r * 0.3} fill={c} {...line} strokeWidth={1.8} />)}</g>;
    case 'bob':
      // a heavy fringe, like the reference picture books
      return <path d={`M${-r * 1.02} ${y - r * 0.1} C ${-r * 1.05} ${y - r * 1.15}, ${r * 1.05} ${y - r * 1.15}, ${r * 1.02} ${y - r * 0.1} Q ${r * 0.55} ${y - r * 0.32} ${r * 0.3} ${y - r * 0.22} Q ${0} ${y - r * 0.36} ${-r * 0.3} ${y - r * 0.22} Q ${-r * 0.55} ${y - r * 0.32} ${-r * 1.02} ${y - r * 0.1} Z`} fill={c} {...line} />;
    case 'bald':
      return <g>{spec.hairColor.toLowerCase() === '#ffffff' && <><path d={`M${-r * 0.98} ${y - r * 0.05} q ${r * 0.05} -${r * 0.45} ${r * 0.3} -${r * 0.5}`} stroke="#E9E4DA" strokeWidth="7" strokeLinecap="round" fill="none" /><path d={`M${r * 0.98} ${y - r * 0.05} q -${r * 0.05} -${r * 0.45} -${r * 0.3} -${r * 0.5}`} stroke="#E9E4DA" strokeWidth="7" strokeLinecap="round" fill="none" /></>}<path d={`M${-r * 0.3} ${y - r * 0.7} q ${r * 0.15} -${r * 0.1} ${r * 0.3} 0`} stroke="#fff" strokeWidth="3" opacity="0.3" fill="none" /></g>;
    case 'headwrap':
      return (
        <g>
          <path d={`M${-r * 1.02} ${y - r * 0.2} C ${-r * 1.2} ${y - r * 1.5}, ${r * 1.2} ${y - r * 1.6}, ${r * 1.02} ${y - r * 0.2} Q 0 ${y - r * 0.5} ${-r * 1.02} ${y - r * 0.2} Z`} fill={c} {...line} />
          <path d={`M${-r * 0.8} ${y - r * 0.6} Q 0 ${y - r * 0.9} ${r * 0.8} ${y - r * 0.6} M${-r * 0.7} ${y - r * 0.95} Q 0 ${y - r * 1.2} ${r * 0.7} ${y - r * 0.95}`} stroke={spec.accent} strokeWidth="3" fill="none" opacity="0.8" />
          <path d={`M${r * 0.35} ${y - r * 1.3} q ${r * 0.45} -${r * 0.35} ${r * 0.55} ${r * 0.05} q -${r * 0.3} ${r * 0.15} -${r * 0.55} -${r * 0.05} Z`} fill={c} {...line} strokeWidth={2} />
        </g>
      );
    default:
      return null;
  }
}
