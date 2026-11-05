// Lightweight SVG charts. Single-series by design (the title names the series, so
// no legend), recessive axes, rounded data-ends, and a hover tooltip on every mark.
import { motion, useInView } from 'motion/react';
import { useRef, useState } from 'react';

type Datum = { label: string; value: number };

function useChartInView() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return { ref, inView };
}

export function BarChart({
  data,
  height = 160,
  format = (v) => String(v),
  highlightLast,
  color = 'var(--burgundy)',
  ariaLabel,
}: {
  data: Datum[];
  height?: number;
  format?: (v: number) => string;
  highlightLast?: boolean;
  color?: string;
  ariaLabel: string;
}) {
  const { ref, inView } = useChartInView();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const w = 100 / data.length;
  const plotH = height - 22;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width="100%" height={height} role="img" aria-label={`${ariaLabel}: ${data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`}>
        {[0.33, 0.66, 1].map((f) => (
          <line key={f} x1="0" x2="100%" y1={plotH - plotH * f} y2={plotH - plotH * f} stroke="var(--line)" strokeDasharray="2 4" />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * plotH;
          const isHi = hover === i || (highlightLast && hover === null && i === data.length - 1);
          return (
            <g key={d.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={`${i * w}%`} y="0" width={`${w}%`} height={plotH} fill="transparent" />
              <motion.rect
                x={`${i * w + w / 2}%`}
                transform="translate(-7 0)"
                width="14"
                rx="4"
                fill={color}
                opacity={isHi ? 1 : 0.55}
                initial={{ height: 0, attrY: plotH }}
                animate={inView ? { height: h, attrY: plotH - h } : {}}
                transition={{ duration: 0.9, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
              <text x={`${i * w + w / 2}%`} y={height - 4} textAnchor="middle" className="chart-axis">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tooltip" style={{ left: `${hover * w + w / 2}%`, top: plotH - (data[hover].value / max) * plotH }}>
          {data[hover].label} · {format(data[hover].value)}
        </div>
      )}
    </div>
  );
}

export function AreaChart({ data, height = 180, format = (v) => String(v), ariaLabel }: { data: Datum[]; height?: number; format?: (v: number) => string; ariaLabel: string }) {
  const { ref, inView } = useChartInView();
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const plotH = height - 24;
  const min = Math.min(...data.map((d) => d.value)) * 0.85;
  const max = Math.max(...data.map((d) => d.value)) * 1.05;
  const x = (i: number) => (i / (data.length - 1)) * (W - 16) + 8;
  const y = (v: number) => plotH - ((v - min) / (max - min)) * (plotH - 10);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${plotH} L${x(0)},${plotH} Z`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${ariaLabel}: ${data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6E1630" stopOpacity=".18" />
            <stop offset="100%" stopColor="#6E1630" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={plotH * f} y2={plotH * f} stroke="var(--line)" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
        ))}
        <motion.path d={area} fill="url(#area-fill)" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 1, delay: 0.6 }} />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--burgundy)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
        />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1="0" y2={plotH} stroke="var(--line-strong)" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
        {data.map((d) => (
          <span key={d.label} className="chart-axis tiny muted">
            {d.label}
          </span>
        ))}
      </div>
      {hover !== null && (
        <>
          <span
            style={{
              position: 'absolute',
              left: `${(x(hover) / W) * 100}%`,
              top: y(data[hover].value),
              width: 10,
              height: 10,
              borderRadius: 99,
              background: 'var(--burgundy)',
              boxShadow: '0 0 0 2px #fff',
              transform: 'translate(-50%,-50%)',
              pointerEvents: 'none',
            }}
          />
          <div className="chart-tooltip" style={{ left: `${(x(hover) / W) * 100}%`, top: y(data[hover].value) }}>
            {data[hover].label} · {format(data[hover].value)}
          </div>
        </>
      )}
    </div>
  );
}

/** Ranked horizontal bars with direct labels — for categorical comparisons. */
export function RankedBars({ data, format = (v) => String(v) }: { data: Datum[]; format?: (v: number) => string }) {
  const { ref, inView } = useChartInView();
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div ref={ref} className="stack" style={{ ['--gap' as string]: '12px' }}>
      {data.map((d, i) => (
        <div key={d.label} title={`${d.label}: ${format(d.value)}`}>
          <div className="row between small" style={{ marginBottom: 6, flexWrap: 'nowrap' }}>
            <span style={{ color: 'var(--ink-2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span className="num" style={{ fontWeight: 700 }}>{format(d.value)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--ivory-200)' }}>
            <motion.div
              style={{ height: '100%', borderRadius: 4, background: 'var(--navy-500)' }}
              initial={{ width: 0 }}
              animate={inView ? { width: `${(d.value / max) * 100}%` } : {}}
              transition={{ duration: 0.9, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
