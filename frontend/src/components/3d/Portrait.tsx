import type { PortraitSpec } from '@laporte/shared';
import { useId } from 'react';

/**
 * Stylised, softly-lit character bust drawn in SVG. Volumetric gradients and a warm
 * rim light give the editorial "3D illustration" feel without a 3D engine.
 * Replace with commissioned renders by passing `src` (see public/images/README.md).
 */
export type Expression = 'smile' | 'calm' | 'joy' | 'focus';

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function Portrait({
  spec,
  expression = 'smile',
  size,
  framed = true,
  src,
  title,
  className,
  accessory,
}: {
  spec: PortraitSpec;
  expression?: Expression;
  accessory?: 'headphones';
  size?: number;
  framed?: boolean;
  src?: string;
  title?: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  if (src) return <img src={src} alt={title ?? ''} width={size} height={size} className={className} style={{ objectFit: 'cover' }} />;

  const skinHi = shade(spec.skin, 0.12);
  const skinLo = shade(spec.skin, -0.12);
  const hairHi = shade(spec.hairColor, 0.12);
  const outfitHi = shade(spec.outfit, 0.14);
  const outfitLo = shade(spec.outfit, -0.1);
  const ink = shade(spec.skin, -0.42);
  const lip = shade(spec.skin, -0.22);

  const back = () => {
    switch (spec.hair) {
      case 'curls':
        return (
          <g fill={`url(#hair-${uid})`}>
            {[
              [70, 70, 20], [88, 52, 22], [112, 52, 22], [130, 70, 20], [62, 96, 17], [138, 96, 17], [64, 118, 14], [136, 118, 14], [100, 46, 20],
            ].map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} />
            ))}
          </g>
        );
      case 'bob':
        return <path d="M60 96c-4-38 16-58 40-58s44 20 40 58c-1 14 2 24 6 30-14 4-28 2-34-4H88c-6 6-20 8-34 4 4-6 7-16 6-30z" fill={`url(#hair-${uid})`} />;
      case 'locs':
        return (
          <g stroke={spec.hairColor} strokeWidth="7" strokeLinecap="round" fill="none">
            {[66, 74, 126, 134, 70, 130].map((x, i) => (
              <path key={i} d={`M${x} ${70 + (i % 2) * 6} q${x < 100 ? -6 : 6} 34 ${x < 100 ? -2 : 2} 62`} />
            ))}
          </g>
        );
      default:
        return null;
    }
  };

  const front = () => {
    switch (spec.hair) {
      case 'short':
        return <path d="M65 90c-4-30 14-46 35-46s39 16 35 46c-4-14-16-24-35-24s-31 10-35 24z" fill={`url(#hair-${uid})`} />;
      case 'waves':
        return <path d="M64 92c-6-34 14-52 37-52 24 0 40 18 35 50-6-12-12-18-20-20-8 6-24 8-34 4-8 2-14 8-18 18z" fill={`url(#hair-${uid})`} />;
      case 'curls':
        return <path d="M68 84c4-22 18-30 32-30s28 8 32 30c-8-10-18-14-32-14s-24 4-32 14z" fill={spec.hairColor} />;
      case 'puff':
        return (
          <g>
            <circle cx="100" cy="38" r="24" fill={`url(#hair-${uid})`} />
            <path d="M67 86c0-24 14-36 33-36s33 12 33 36c-8-10-18-14-33-14s-25 4-33 14z" fill={spec.hairColor} />
            <path d="M80 56c12-5 28-5 40 0" stroke={spec.accent} strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
        );
      case 'headwrap':
        return (
          <g>
            <path d="M62 88c-6-40 14-62 38-62 28 0 46 22 38 62-6-16-20-26-38-26s-32 10-38 26z" fill={`url(#wrap-${uid})`} />
            <path d="M74 50c14-10 40-10 54 4M70 66c18-10 44-10 62 0" stroke={shade(spec.outfit, -0.2)} strokeWidth="2" fill="none" opacity=".55" />
            <ellipse cx="116" cy="28" rx="16" ry="11" fill={`url(#wrap-${uid})`} transform="rotate(-18 116 28)" />
          </g>
        );
      case 'bob':
        return <path d="M68 84c4-20 16-30 32-30s28 10 32 30c-10-8-20-10-30-6-10-4-24-2-34 6z" fill={spec.hairColor} />;
      case 'locs':
        return <path d="M66 88c-2-28 14-42 34-42s36 14 34 42c-8-12-20-18-34-18s-26 6-34 18z" fill={`url(#hair-${uid})`} />;
      case 'bald':
        return <ellipse cx="88" cy="64" rx="12" ry="5" fill="#fff" opacity=".12" transform="rotate(-20 88 64)" />;
      default:
        return null;
    }
  };

  const mouth = {
    smile: <path d="M89 115c6 6 16 6 22 0" stroke={lip} strokeWidth="3" strokeLinecap="round" fill="none" />,
    calm: <path d="M92 116c5 2 11 2 16 0" stroke={lip} strokeWidth="3" strokeLinecap="round" fill="none" />,
    joy: (
      <g>
        <path d="M87 112c4 11 22 11 26 0z" fill={shade(spec.skin, -0.35)} />
        <path d="M89 112.5h22c-1 3-3 4-5 4.5h-12c-2-.5-4-1.5-5-4.5z" fill="#fff" />
      </g>
    ),
    focus: <path d="M92 116h16" stroke={lip} strokeWidth="3" strokeLinecap="round" />,
  }[expression];

  const browY = expression === 'focus' ? 83 : expression === 'joy' ? 79 : 81;
  const eyeRy = expression === 'joy' ? 2.2 : 3.6;

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <radialGradient id={`bg-${uid}`} cx="35%" cy="25%" r="85%">
          <stop offset="0%" stopColor={shade(spec.bg, 0.06)} />
          <stop offset="100%" stopColor={shade(spec.bg, -0.06)} />
        </radialGradient>
        <radialGradient id={`skin-${uid}`} cx="40%" cy="34%" r="70%">
          <stop offset="0%" stopColor={skinHi} />
          <stop offset="65%" stopColor={spec.skin} />
          <stop offset="100%" stopColor={skinLo} />
        </radialGradient>
        <linearGradient id={`hair-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={hairHi} />
          <stop offset="100%" stopColor={spec.hairColor} />
        </linearGradient>
        <linearGradient id={`wrap-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={outfitHi} />
          <stop offset="100%" stopColor={outfitLo} />
        </linearGradient>
        <linearGradient id={`outfit-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={outfitHi} />
          <stop offset="100%" stopColor={outfitLo} />
        </linearGradient>
        <linearGradient id={`rim-${uid}`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#F5D9A8" stopOpacity=".55" />
          <stop offset="40%" stopColor="#F5D9A8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {framed && <rect width="200" height="200" fill={`url(#bg-${uid})`} />}
      {back()}
      {/* torso */}
      <path d="M26 204c2-36 28-54 74-56 46 2 72 20 74 56z" fill={`url(#outfit-${uid})`} />
      <path d="M84 149l16 24 16-24" fill={spec.accent} opacity=".9" />
      <path d="M78 150l22 30 22-30" stroke={outfitLo} strokeWidth="2" fill="none" opacity=".5" />
      {/* neck */}
      <path d="M86 116h28v30c0 8-28 8-28 0z" fill={skinLo} />
      {/* ears */}
      <ellipse cx="66" cy="98" rx="6" ry="9" fill={spec.skin} />
      <ellipse cx="134" cy="98" rx="6" ry="9" fill={skinLo} />
      {spec.earrings && (
        <g fill="#D8B26E">
          <circle cx="66" cy="110" r="3.4" />
          <circle cx="134" cy="110" r="3.4" />
        </g>
      )}
      {/* head */}
      <ellipse cx="100" cy="92" rx="34" ry="40" fill={`url(#skin-${uid})`} />
      <ellipse cx="100" cy="92" rx="34" ry="40" fill={`url(#rim-${uid})`} />
      {spec.beard && <path d="M68 100c2 26 16 36 32 36s30-10 32-36c-6 12-16 16-32 16s-26-4-32-16z" fill={spec.hairColor} opacity=".85" />}
      {front()}
      {/* face */}
      <ellipse cx="84" cy="106" rx="7" ry="4" fill="#E58A7A" opacity=".16" />
      <ellipse cx="116" cy="106" rx="7" ry="4" fill="#E58A7A" opacity=".16" />
      <path d={`M80 ${browY}q7-4 13 0M107 ${browY}q7-4 13 0`} stroke={spec.hairColor} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <ellipse cx="87" cy="94" rx="3.2" ry={eyeRy} fill={ink} />
      <ellipse cx="113" cy="94" rx="3.2" ry={eyeRy} fill={ink} />
      {expression !== 'joy' && (
        <g fill="#fff" opacity=".85">
          <circle cx="88.2" cy="92.6" r="1" />
          <circle cx="114.2" cy="92.6" r="1" />
        </g>
      )}
      <path d="M100 96c-2 5-4 9-1 11" stroke={skinLo} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {mouth}
      {accessory === 'headphones' && (
        <g>
          <path d="M60 98c0-40 18-58 40-58s40 18 40 58" fill="none" stroke="#1B1E33" strokeWidth="6" strokeLinecap="round" />
          <rect x="55" y="86" width="15" height="28" rx="7" fill="#1B1E33" />
          <rect x="130" y="86" width="15" height="28" rx="7" fill="#1B1E33" />
          <rect x="58" y="91" width="5" height="18" rx="2.5" fill="#C49A5A" />
          <rect x="137" y="91" width="5" height="18" rx="2.5" fill="#C49A5A" />
        </g>
      )}
      {spec.glasses && (
        <g stroke="#2A2620" strokeWidth="2.2" fill="rgba(255,255,255,.08)">
          <rect x="76" y="87" width="20" height="15" rx="6" />
          <rect x="104" y="87" width="20" height="15" rx="6" />
          <path d="M96 93h8" fill="none" />
        </g>
      )}
    </svg>
  );
}

export function Avatar({ spec, size = 40, expression, label }: { spec: PortraitSpec; size?: number; expression?: Expression; label?: string }) {
  return (
    <span className="avatar" style={{ ['--size' as string]: `${size}px` }} title={label}>
      <Portrait spec={spec} expression={expression} title={label} />
    </span>
  );
}
