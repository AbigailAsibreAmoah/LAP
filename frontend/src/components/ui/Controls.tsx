import { motion } from 'motion/react';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { spring } from '../animations/motion';
import { Icon } from './Icon';

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  const id = useId();
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={spring.snappy} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  const id = useId();
  // WAI-ARIA tabs: one tab stop, arrows/Home/End move and select.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = options.findIndex((o) => o.value === value);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: options.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const n = (next + options.length) % options.length;
    onChange(options[n].value);
    (e.currentTarget.children[n] as HTMLElement | undefined)?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o) => (
        <button key={o.value} role="tab" type="button" aria-selected={value === o.value} tabIndex={value === o.value ? 0 : -1} onClick={() => onChange(o.value)}>
          {o.label}
          {value === o.value && <motion.span layoutId={`tab-${id}`} className="tab-line" transition={spring.snappy} />}
        </button>
      ))}
    </div>
  );
}

export function LanguageSwitch({ dark }: { dark?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <div className="segmented" role="group" aria-label="Language / Langue" style={dark ? { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' } : undefined}>
      {(['en', 'fr'] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          lang={l}
          style={dark && lang !== l ? { color: 'rgba(243,238,230,0.6)' } : undefined}
        >
          {lang === l && <motion.span layoutId={dark ? 'lang-pill-dark' : 'lang-pill'} className="seg-pill" transition={spring.snappy} />}
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

const statusIcon = { completed: 'checkCircle', confirmed: 'checkCircle', success: 'checkCircle', resolved: 'checkCircle', 'in-progress': 'clock', open: 'clock', upcoming: 'clock', pending: 'clock', awaiting: 'clock', cancelled: 'x', failed: 'x', locked: 'lock' } as const;

export function StatusBadge({ status, children }: { status: keyof typeof statusIcon; children: ReactNode }) {
  return (
    <span className={`status status-${status}`}>
      <Icon name={statusIcon[status]} size={13} stroke={2.2} />
      {children}
    </span>
  );
}

export function DemoTag({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  return <span className="demo-tag">{children ?? t('demo.label')}</span>;
}

export function Notice({ children, tone }: { children: ReactNode; tone?: 'navy' }) {
  return (
    <div className={`notice${tone === 'navy' ? ' notice-navy' : ''}`}>
      <span>{children}</span>
    </div>
  );
}

/** A result heading that takes focus once when it appears, so the outcome is announced. */
export function FocusTitle({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <h2 ref={ref} tabIndex={-1} className={className} style={{ outline: 'none', ...style }}>
      {children}
    </h2>
  );
}

/** Small "what is this?" explanation; hover or focus on desktop, tap to toggle on touch. */
export function Hint({ children, label = 'More information' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  // The bubble sits beside the button so screen readers get the label as the name and the text as its description.
  return (
    <span className="hint-wrap">
      <button type="button" className="hint" aria-label={label} aria-describedby={id} aria-expanded={open} onClick={() => setOpen((o) => !o)} onBlur={() => setOpen(false)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
        <Icon name="help" size={16} />
      </button>
      <span className="hint-bubble" role="tooltip" id={id}>{children}</span>
    </span>
  );
}

export function EmptyState({ icon, title, children }: { icon?: Parameters<typeof Icon>[0]['name']; title: string; children?: ReactNode }) {
  return (
    <div className="stack center" style={{ padding: '40px 16px', textAlign: 'center', ['--gap' as string]: '10px' }}>
      {icon && (
        <span style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, borderRadius: 18, background: 'var(--ivory)', color: 'var(--gold-600)' }}>
          <Icon name={icon} size={26} />
        </span>
      )}
      <p className="h4">{title}</p>
      {children && <p className="muted small" style={{ maxWidth: 360 }}>{children}</p>}
    </div>
  );
}
