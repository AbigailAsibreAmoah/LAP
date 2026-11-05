import { emojiCount, URL_RE, type CafeReaction } from '@laporte/shared';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { emojiName, FAVOURITES, recentEmoji, rememberEmoji, searchEmoji } from './emoji';

/** Post text with links made clickable (new tab, no referrer credit) and big emoji-only replies. */
export function RichText({ text }: { text: string }) {
  const onlyEmoji = emojiCount(text) > 0 && emojiCount(text) <= 6 && !/[\p{L}\p{N}]/u.test(text.replace(/\p{Extended_Pictographic}|️|‍|[\u{1F1E6}-\u{1F1FF}]|\s/gu, ''));
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i));
    parts.push(
      <a key={i} href={m[0]} target="_blank" rel="noopener noreferrer nofollow ugc" className="cafe-link">
        {m[0].replace(/^https?:\/\//, '').slice(0, 60)}{m[0].length > 68 ? '…' : ''}
      </a>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <p className="cafe-text" data-emoji-only={onlyEmoji || undefined}>{parts}</p>;
}

/** Small cards under a post showing the site each link goes to. */
export function LinkCards({ text }: { text: string }) {
  const links = [...new Set([...text.matchAll(URL_RE)].map((m) => m[0]))].slice(0, 3);
  if (!links.length) return null;
  return (
    <div className="cafe-linkcards">
      {links.map((u) => {
        let host = u;
        try {
          host = new URL(u).hostname.replace(/^www\./, '');
        } catch {
          /* keep raw */
        }
        return (
          <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow ugc" className="cafe-linkcard">
            <span className="cafe-linkcard-icon" aria-hidden>🔗</span>
            <span><strong>{host}</strong><span className="tiny muted">{u.replace(/^https?:\/\//, '').slice(0, 70)}</span></span>
          </a>
        );
      })}
    </div>
  );
}

/** Searchable emoji picker: recent first, then La Porte favourites, then everything. */
export function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);
  const pick = (e: string) => {
    rememberEmoji(e);
    onPick(e);
  };
  const recent = recentEmoji();
  const list = searchEmoji(q);
  return (
    <div ref={ref} className="emoji-picker" role="dialog" aria-label={fr ? 'Choisir un emoji' : 'Choose an emoji'}>
      <input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={fr ? 'Rechercher (ex. merci, fête)' : 'Search (e.g. thanks, party)'} aria-label={fr ? 'Rechercher un emoji' : 'Search emoji'} />
      {!q && recent.length > 0 && <Row label={fr ? 'Récents' : 'Recent'} items={recent} onPick={pick} />}
      {!q && <Row label="La Porte" items={FAVOURITES} onPick={pick} />}
      <div className="emoji-grid" role="listbox" aria-label={fr ? 'Emoji' : 'Emoji'}>
        {list.map((x) => (
          <button key={x.e} type="button" role="option" aria-selected={false} className="emoji-btn" title={x.k.split(' ')[0]} aria-label={x.k.split(' ')[0]} onClick={() => pick(x.e)}>{x.e}</button>
        ))}
        {!list.length && <span className="tiny muted">{fr ? 'Aucun résultat' : 'No match'}</span>}
      </div>
    </div>
  );
}

function Row({ label, items, onPick }: { label: string; items: string[]; onPick: (e: string) => void }) {
  return (
    <div>
      <span className="tiny muted">{label}</span>
      <div className="emoji-row">{items.map((e) => <button key={e} type="button" className="emoji-btn" aria-label={emojiName(e)} onClick={() => onPick(e)}>{e}</button>)}</div>
    </div>
  );
}

/** Reaction chips: counts, your own highlighted, hover to see who; quick six plus "+". */
export function Reactions({ targetId, reactions, me, nameOf, onToggle, quick }: { targetId: string; reactions: CafeReaction[]; me: string; nameOf: (id: string) => string; onToggle: (emoji: string) => void; quick: readonly string[] }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [picker, setPicker] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const mine = reactions.filter((r) => r.targetId === targetId);
  const groups = [...new Set(mine.map((r) => r.emoji))].map((e) => ({ e, who: mine.filter((r) => r.emoji === e).map((r) => r.userId) }));
  const label = (who: string[]) => {
    const names = who.map((id) => (id === me ? (fr ? 'Vous' : 'You') : nameOf(id)));
    return names.length <= 3 ? names.join(', ') : `${names.slice(0, 2).join(', ')} ${fr ? `et ${names.length - 2} autres` : `and ${names.length - 2} others`}`;
  };
  return (
    <div className="cafe-reactions">
      {groups.map((g) => (
        <button key={g.e} type="button" className="reaction-chip" data-mine={g.who.includes(me) || undefined} title={label(g.who)} aria-pressed={g.who.includes(me)} aria-label={`${g.who.length} ${fr ? 'réaction(s)' : g.who.length === 1 ? 'reaction' : 'reactions'} ${emojiName(g.e)}`} onClick={() => onToggle(g.e)}>
          <span aria-hidden>{g.e}</span> <span className="num">{g.who.length}</span>
        </button>
      ))}
      <span className="reaction-add-wrap">
        <button type="button" className="reaction-chip reaction-add" aria-label={fr ? 'Réagir' : 'React'} aria-expanded={quickOpen} onClick={() => setQuickOpen((o) => !o)}>☺︎+</button>
        {quickOpen && (
          <span className="reaction-quick" role="menu">
            {quick.map((e) => <button key={e} type="button" role="menuitem" className="emoji-btn" aria-label={emojiName(e)} onClick={() => { onToggle(e); setQuickOpen(false); }}>{e}</button>)}
            <button type="button" role="menuitem" className="emoji-btn" aria-label={fr ? 'Plus d’emoji' : 'More emoji'} onClick={() => { setQuickOpen(false); setPicker(true); }}>＋</button>
          </span>
        )}
        {picker && <EmojiPicker onPick={(e) => { onToggle(e); setPicker(false); }} onClose={() => setPicker(false)} />}
      </span>
    </div>
  );
}
