import { Link } from 'react-router-dom';

export function LogoMark({ size = 34, light }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size * 1.18} viewBox="0 0 34 40" aria-hidden>
      <path d="M3 40V17C3 9 9.3 3 17 3s14 6 14 14v23" fill="none" stroke={light ? '#E7C78F' : '#6E1630'} strokeWidth="2.4" />
      <path d="M8 40V18c0-5 4-9 9-9s9 4 9 9v22" fill="none" stroke={light ? '#E7C78F' : '#141B34'} strokeWidth="1.6" opacity=".7" />
      <path d="M12.5 40V19.5a4.5 4.5 0 0 1 9 0V40z" fill={light ? '#C49A5A' : '#6E1630'} />
    </svg>
  );
}

export function Brand({ light, to = '/' }: { light?: boolean; to?: string }) {
  return (
    <Link to={to} className="brand" aria-label="La Porte French Institute — home">
      <LogoMark light={light} />
      <span>
        <span className="brand-name" style={light ? { color: '#fff' } : undefined}>
          La Porte
        </span>
        <span className="brand-sub">FRENCH INSTITUTE</span>
      </span>
    </Link>
  );
}
