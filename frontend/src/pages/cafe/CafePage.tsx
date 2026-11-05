import { CAFE_SPACES, FRENCH_POST_MIN_WORDS, LEARNERS, QUICK_REACTIONS, REPORT_REASONS, STUDY_GROUP_MAX, TUTORS, cafeTextIssue, nowIso, wordCount, type CafeOp, type CafePost, type CafeSpace, type CefrLevel, type ReportReason, type StudyGroup } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import { Avatar } from '../../components/3d/Portrait';
import { spring } from '../../components/animations/motion';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { EmojiPicker, LinkCards, Reactions, RichText } from '../../features/cafe/CafeBits';
import { applyShortcodes, finalizeShortcodes } from '../../features/cafe/emoji';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatDate, formatTime } from '../../utils/format';
import { PageHead } from '../learner/LearnerPages';

/*
 * Le Café La Porte: a calm, members-only community. Three tabs (Feed, Spaces, Study groups),
 * text posts with clickable links, comments, emoji reactions, saved posts, a weekly challenge
 * from tutors, and study groups of up to 8. People appear by name and level, never anonymously.
 */

type Tab = 'feed' | 'spaces' | 'groups';
const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

function useCafe() {
  const { content, user, learners, actions, lang } = { ...useStore(), lang: useI18n().lang };
  const toast = useToast();
  const cafe = content.cafe ?? { posts: [], comments: [], reactions: [], saves: [], follows: [], groups: [] };
  const people = useMemo(() => new Map<string, { name: string; sub: string; portrait?: (typeof LEARNERS)[number]['portrait']; tutor?: boolean }>([
    ...[...LEARNERS, ...learners].map((l) => [l.id, { name: l.name, sub: l.level, portrait: l.portrait }] as const),
    ...TUTORS.map((t) => [t.id, { name: t.name, sub: lang === 'fr' ? 'Tuteur·rice' : 'Tutor', portrait: t.portrait, tutor: true }] as const),
  ]), [learners, lang]);
  const person = (id: string) => people.get(id) ?? { name: 'La Porte', sub: lang === 'fr' ? 'Équipe' : 'Team', tutor: true };
  const act = <A,>(op: CafeOp, args: A, ok?: string) =>
    actions.cafe(op, args).then((r) => { if (ok) toast(ok); return r; }).catch((e: unknown) => { toast(errText(e)); throw e; });
  return { cafe, me: user.id, staff: user.role !== 'learner', act, person };
}

const ago = (iso: string, lang: 'en' | 'fr') => {
  const mins = Math.max(0, Math.round((Date.parse(nowIso()) - Date.parse(iso)) / 60_000));
  if (mins < 1) return lang === 'fr' ? 'à l’instant' : 'just now';
  if (mins < 60) return `${mins} min`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h`;
  if (mins < 60 * 24 * 7) return lang === 'fr' ? `${Math.round(mins / 1440)} j` : `${Math.round(mins / 1440)}d`;
  return formatDate(iso, lang, { day: 'numeric', month: 'short' });
};

export function CafePage() {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [tab, setTab] = useState<Tab>('feed');
  const [space, setSpace] = useState<CafeSpace | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  return (
    <>
      <PageHead title="Le Café La Porte" sub={fr ? 'Posez vos questions, partagez des liens utiles et pratiquez à l’écrit avec d’autres apprenants.' : 'Ask questions, share useful links and practise writing with other learners.'} />
      <div className="cafe-tabs" role="tablist">
        {([['feed', fr ? 'Fil' : 'Feed', 'home'], ['spaces', fr ? 'Espaces' : 'Spaces', 'layers'], ['groups', fr ? 'Groupes d’étude' : 'Study groups', 'users']] as const).map(([id, label, icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} className="cafe-tab" onClick={() => { setTab(id); setSpace(null); setGroupId(null); }}><Icon name={icon} size={15} /> {label}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab + (space?.id ?? '') + (groupId ?? '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.settle}>
          {tab === 'feed' && <Feed />}
          {tab === 'spaces' && (space ? <SpaceView space={space} onBack={() => setSpace(null)} /> : <SpacesList onOpen={setSpace} />)}
          {tab === 'groups' && (groupId ? <GroupView id={groupId} onBack={() => setGroupId(null)} /> : <GroupsList onOpen={setGroupId} />)}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

/* ---------------- Feed ---------------- */

function Feed() {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { cafe, me } = useCafe();
  const [filter, setFilter] = useState<'following' | 'all' | 'questions' | 'saved'>('following');
  const [sort, setSort] = useState<'new' | 'helpful'>('new');
  const followed = new Set(cafe.follows.filter((f) => f.userId === me).map((f) => f.spaceId));
  const saved = new Set(cafe.saves.filter((s) => s.userId === me).map((s) => s.postId));
  const score = (p: CafePost) => cafe.reactions.filter((r) => r.targetId === p.id).length + cafe.comments.filter((c) => c.postId === p.id).length * 2;
  const posts = cafe.posts
    .filter((p) => CAFE_SPACES.some((s) => s.id === p.spaceId))
    .filter((p) => (filter === 'following' ? !followed.size || followed.has(p.spaceId) : filter === 'questions' ? p.kind === 'question' : filter === 'saved' ? saved.has(p.id) : true))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (sort === 'helpful' ? score(b) - score(a) : b.createdAt.localeCompare(a.createdAt)));
  return (
    <div className="cafe-col">
      <Composer />
      <div className="row between cafe-filters">
        <div className="row" style={{ ['--gap' as string]: '6px' }}>
          {([['following', fr ? 'Mes espaces' : 'Following'], ['all', fr ? 'Tout' : 'All'], ['questions', fr ? 'Questions' : 'Questions'], ['saved', fr ? 'Enregistrés' : 'Saved']] as const).map(([id, label]) => (
            <button key={id} className={`chip ${filter === id ? 'chip-navy' : 'chip-outline'}`} style={{ cursor: 'pointer' }} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <select className="select cafe-sort" value={sort} onChange={(e) => setSort(e.target.value as 'new' | 'helpful')} aria-label={fr ? 'Trier' : 'Sort'}>
          <option value="new">{fr ? 'Plus récents' : 'Newest'}</option>
          <option value="helpful">{fr ? 'Plus utiles' : 'Most helpful'}</option>
        </select>
      </div>
      {filter === 'following' && !followed.size && <p className="tiny muted">{fr ? 'Vous ne suivez aucun espace : voici tout le café. Suivez des espaces dans l’onglet Espaces.' : 'You don’t follow any space yet, so here’s the whole café. Follow spaces in the Spaces tab.'}</p>}
      <PostList posts={posts} showSpace empty={filter === 'saved' ? (fr ? 'Aucun message enregistré.' : 'No saved posts yet.') : fr ? 'Rien pour l’instant : lancez la conversation !' : 'Nothing here yet: start the conversation!'} />
    </div>
  );
}

function PostList({ posts, showSpace, empty }: { posts: CafePost[]; showSpace?: boolean; empty: string }) {
  if (!posts.length) return <div className="card cafe-empty"><span aria-hidden>☕</span><p className="small muted">{empty}</p></div>;
  return <div className="stack" style={{ ['--gap' as string]: '12px' }}>{posts.map((p) => <PostCard key={p.id} post={p} showSpace={showSpace} />)}</div>;
}

/* ---------------- Composer ---------------- */

function Composer({ spaceId, groupMode }: { spaceId?: string; groupMode?: boolean }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { act, staff } = useCafe();
  const [body, setBody] = useState('');
  const [target, setTarget] = useState(spaceId ?? 'sp-grammar');
  const [kind, setKind] = useState<'post' | 'question' | 'challenge'>('post');
  const [french, setFrench] = useState(false);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const issue = body.trim() ? cafeTextIssue(body) : null;
  const words = wordCount(body);

  const insert = (e: string) => {
    const el = ta.current;
    const at = el?.selectionStart ?? body.length;
    const next = body.slice(0, at) + e + body.slice(el?.selectionEnd ?? at);
    setBody(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + e.length, at + e.length);
    });
  };
  const submit = () => {
    const text = finalizeShortcodes(body);
    if (!text.trim() || cafeTextIssue(text)) return;
    setBusy(true);
    act('post', { spaceId: spaceId ?? target, body: text, kind, french }, fr ? 'Publié' : 'Posted')
      .then(() => { setBody(''); setKind('post'); setFrench(false); })
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  return (
    <div className="card cafe-composer">
      <textarea ref={ta} className="textarea" rows={3} value={body} maxLength={3000} lang={french ? 'fr' : undefined}
        placeholder={groupMode ? (fr ? 'Écrivez au groupe…' : 'Write to your group…') : fr ? 'Partagez une question, une astuce ou un lien utile… (essayez en français !)' : 'Share a question, a tip or a useful link… (try it in French!)'}
        onChange={(e) => setBody(applyShortcodes(e.target.value))}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit(); }}
        aria-label={fr ? 'Votre message' : 'Your post'} aria-invalid={!!issue || undefined} />
      {issue && <p className="field-error" role="alert"><Icon name="lock" size={13} /> {issue}</p>}
      <div className="cafe-composer-bar">
        <span className="emoji-anchor">
          <button type="button" className="icon-btn" aria-label={fr ? 'Ajouter un emoji' : 'Add emoji'} onClick={() => setPicker((p) => !p)}>🙂</button>
          {picker && <EmojiPicker onPick={(e) => { insert(e); setPicker(false); }} onClose={() => setPicker(false)} />}
        </span>
        {!spaceId && (
          <select className="select cafe-space-select" value={target} onChange={(e) => setTarget(e.target.value)} aria-label={fr ? 'Espace' : 'Space'}>
            {CAFE_SPACES.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name[lang]}</option>)}
          </select>
        )}
        {!groupMode && (
          <label className="cafe-toggle"><input type="checkbox" checked={kind === 'question'} onChange={(e) => setKind(e.target.checked ? 'question' : 'post')} /> {fr ? 'Question' : 'Question'}</label>
        )}
        {staff && !groupMode && <label className="cafe-toggle"><input type="checkbox" checked={kind === 'challenge'} onChange={(e) => setKind(e.target.checked ? 'challenge' : 'post')} /> {fr ? 'Défi de la semaine' : 'Weekly challenge'}</label>}
        <label className="cafe-toggle" title={fr ? `Les messages en français de ${FRENCH_POST_MIN_WORDS} mots ou plus comptent pour la quête du Café.` : `French posts of ${FRENCH_POST_MIN_WORDS}+ words count towards the Café quest.`}>
          <input type="checkbox" checked={french} onChange={(e) => setFrench(e.target.checked)} /> 🇫🇷 {fr ? 'Écrit en français' : 'Written in French'}
        </label>
        <span style={{ marginLeft: 'auto' }} className="tiny muted">{french && words > 0 && words < FRENCH_POST_MIN_WORDS ? (fr ? `${words}/${FRENCH_POST_MIN_WORDS} mots pour la quête` : `${words}/${FRENCH_POST_MIN_WORDS} words for the quest`) : `${body.length}/3000`}</span>
        <button className="btn btn-brand btn-sm" disabled={!body.trim() || !!issue || busy} onClick={submit}>{fr ? 'Publier' : 'Post'}</button>
      </div>
      <p className="tiny muted cafe-hint">{fr ? 'Les liens deviennent cliquables. Pas de numéros, e-mails ni réseaux sociaux. Astuce : :) devient 🙂, :fr: devient 🇫🇷.' : 'Links become clickable. No phone numbers, emails or social handles. Tip: :) becomes 🙂, :fr: becomes 🇫🇷.'}</p>
    </div>
  );
}

/* ---------------- A post ---------------- */

function PostCard({ post, showSpace }: { post: CafePost; showSpace?: boolean }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { cafe, me, staff, act, person } = useCafe();
  const [open, setOpen] = useState(post.kind === 'question' || post.kind === 'challenge');
  const [reply, setReply] = useState('');
  const [reporting, setReporting] = useState<{ postId?: string; commentId?: string } | null>(null);
  const [menu, setMenu] = useState(false);
  const author = person(post.authorId);
  const space = CAFE_SPACES.find((s) => s.id === post.spaceId);
  const comments = cafe.comments.filter((c) => c.postId === post.id).sort((a, b) => Number(b.id === post.acceptedCommentId) - Number(a.id === post.acceptedCommentId) || a.createdAt.localeCompare(b.createdAt));
  const saved = cafe.saves.some((s) => s.userId === me && s.postId === post.id);
  const replyIssue = reply.trim() ? cafeTextIssue(reply) : null;
  const sendReply = () => {
    const text = finalizeShortcodes(reply);
    if (!text.trim() || cafeTextIssue(text)) return;
    void act('comment', { postId: post.id, body: text }).then(() => setReply('')).catch(() => undefined);
  };

  return (
    <article className="card cafe-post" data-kind={post.kind} data-hidden={post.hidden || undefined}>
      {post.pinned && <span className="cafe-pin">📌 {post.kind === 'challenge' ? (fr ? 'Défi de la semaine' : 'Weekly challenge') : fr ? 'Épinglé' : 'Pinned'}</span>}
      <header className="cafe-post-head">
        {author.portrait ? <Avatar spec={author.portrait} size={38} /> : <span className="cafe-avatar-lp">LP</span>}
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong className="small">{author.name}</strong>{' '}
          <span className={`chip ${author.tutor ? 'chip-gold' : ''} cafe-sub`}>{author.sub}</span>
          <div className="tiny muted">
            {ago(post.createdAt, lang)}{post.editedAt ? ` · ${fr ? 'modifié' : 'edited'}` : ''}
            {showSpace && space && <> · {space.emoji} {space.name[lang]}</>}
            {post.kind === 'question' && <> · <span className="cafe-kind">❓ {fr ? 'Question' : 'Question'}</span></>}
            {post.french && <> · 🇫🇷</>}
            {post.hidden && <> · <strong>{fr ? 'Masqué' : 'Hidden'}</strong></>}
          </div>
        </div>
        <span className="cafe-menu-wrap">
          <button className="icon-btn" aria-label={fr ? 'Plus d’actions' : 'More actions'} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>⋯</button>
          {menu && (
            <span className="cafe-menu" role="menu" onMouseLeave={() => setMenu(false)}>
              {post.authorId !== me && <button role="menuitem" onClick={() => { setMenu(false); setReporting({ postId: post.id }); }}>🚩 {fr ? 'Signaler' : 'Report'}</button>}
              {(post.authorId === me || staff) && <button role="menuitem" onClick={() => { setMenu(false); if (window.confirm(fr ? 'Supprimer ce message ?' : 'Delete this post?')) void act('deletePost', { postId: post.id }, fr ? 'Supprimé' : 'Deleted').catch(() => undefined); }}>🗑 {fr ? 'Supprimer' : 'Delete'}</button>}
              {staff && (
                <>
                  <button role="menuitem" onClick={() => { setMenu(false); void act('moderate', { postId: post.id, action: post.pinned ? 'unpin' : 'pin' }).catch(() => undefined); }}>📌 {post.pinned ? (fr ? 'Désépingler' : 'Unpin') : fr ? 'Épingler' : 'Pin'}</button>
                  <button role="menuitem" onClick={() => { setMenu(false); void act('moderate', { postId: post.id, action: post.hidden ? 'show' : 'hide' }).catch(() => undefined); }}>{post.hidden ? '👁' : '🙈'} {post.hidden ? (fr ? 'Afficher' : 'Show') : fr ? 'Masquer' : 'Hide'}</button>
                  <button role="menuitem" onClick={() => { setMenu(false); void act('moderate', { postId: post.id, action: post.locked ? 'unlock' : 'lock' }).catch(() => undefined); }}>🔒 {post.locked ? (fr ? 'Rouvrir' : 'Unlock') : fr ? 'Fermer les réponses' : 'Lock replies'}</button>
                </>
              )}
            </span>
          )}
        </span>
      </header>
      <RichText text={post.body} />
      <LinkCards text={post.body} />
      <footer className="cafe-post-foot">
        <Reactions targetId={post.id} reactions={cafe.reactions} me={me} nameOf={(id) => person(id).name} quick={QUICK_REACTIONS} onToggle={(e) => void act('react', { targetId: post.id, emoji: e }).catch(() => undefined)} />
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}><Icon name="message" size={14} /> {comments.length} {fr ? 'réponse(s)' : comments.length === 1 ? 'reply' : 'replies'}</button>
        <button className="btn btn-ghost btn-sm" aria-pressed={saved} onClick={() => void act('save', { postId: post.id, on: !saved }, saved ? undefined : fr ? 'Enregistré' : 'Saved').catch(() => undefined)}>{saved ? '★' : '☆'} {fr ? 'Enregistrer' : 'Save'}</button>
      </footer>

      {open && (
        <div className="cafe-comments">
          {comments.map((c) => {
            const who = person(c.authorId);
            const accepted = c.id === post.acceptedCommentId;
            return (
              <div key={c.id} className="cafe-comment" data-accepted={accepted || undefined} data-hidden={c.hidden || undefined}>
                {who.portrait ? <Avatar spec={who.portrait} size={28} /> : <span className="cafe-avatar-lp" style={{ width: 28, height: 28 }}>LP</span>}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="tiny"><strong>{who.name}</strong> <span className="muted">· {who.sub} · {ago(c.createdAt, lang)}</span>{accepted && <span className="cafe-verified">✓ {fr ? 'Réponse validée par un tuteur' : 'Tutor-verified answer'}</span>}</div>
                  <RichText text={c.body} />
                  <div className="row" style={{ ['--gap' as string]: '6px' }}>
                    <Reactions targetId={c.id} reactions={cafe.reactions} me={me} nameOf={(id) => person(id).name} quick={QUICK_REACTIONS} onToggle={(e) => void act('react', { targetId: c.id, emoji: e }).catch(() => undefined)} />
                    {staff && post.kind === 'question' && <button className="link tiny" onClick={() => void act('acceptAnswer', { postId: post.id, commentId: accepted ? null : c.id }).catch(() => undefined)}>{accepted ? (fr ? 'Retirer la validation' : 'Remove verification') : fr ? '✓ Valider cette réponse' : '✓ Mark as the answer'}</button>}
                    {c.authorId !== me && <button className="link tiny muted" onClick={() => setReporting({ commentId: c.id })}>{fr ? 'Signaler' : 'Report'}</button>}
                    {(c.authorId === me || staff) && <button className="link tiny muted" onClick={() => void act('deleteComment', { commentId: c.id }).catch(() => undefined)}>{fr ? 'Supprimer' : 'Delete'}</button>}
                  </div>
                </div>
              </div>
            );
          })}
          {post.locked ? (
            <p className="tiny muted">🔒 {fr ? 'Les réponses sont fermées.' : 'Replies are closed.'}</p>
          ) : (
            <form className="cafe-reply" onSubmit={(e) => { e.preventDefault(); sendReply(); }}>
              <input className="input" value={reply} onChange={(e) => setReply(applyShortcodes(e.target.value))} placeholder={fr ? 'Répondre… (en français si possible)' : 'Reply… (in French if you can)'} maxLength={3000} aria-label={fr ? 'Répondre' : 'Reply'} aria-invalid={!!replyIssue || undefined} />
              <button className="btn btn-brand btn-sm" disabled={!reply.trim() || !!replyIssue}>{fr ? 'Répondre' : 'Reply'}</button>
            </form>
          )}
          {replyIssue && <p className="field-error" role="alert">{replyIssue}</p>}
        </div>
      )}
      <ReportModal target={reporting} onClose={() => setReporting(null)} />
    </article>
  );
}

function ReportModal({ target, onClose }: { target: { postId?: string; commentId?: string } | null; onClose: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { act } = useCafe();
  const [reason, setReason] = useState<ReportReason>('inappropriate');
  return (
    <Modal open={!!target} onClose={onClose} title={fr ? 'Signaler' : 'Report'} width={420}>
      <form className="stack" style={{ ['--gap' as string]: '10px' }} onSubmit={(e) => { e.preventDefault(); void act('report', { ...target, reason }, fr ? 'Merci : l’équipe La Porte va vérifier.' : 'Thanks: the La Porte team will review it.').then(onClose).catch(() => undefined); }}>
        {(Object.keys(REPORT_REASONS) as ReportReason[]).map((k) => (
          <label key={k} className="row small" style={{ ['--gap' as string]: '8px', cursor: 'pointer' }}><input type="radio" name="cafe-reason" checked={reason === k} onChange={() => setReason(k)} /> {l(REPORT_REASONS[k])}</label>
        ))}
        <p className="tiny muted">{fr ? 'L’auteur n’est pas informé de qui a signalé.' : 'The author isn’t told who reported it.'}</p>
        <button className="btn btn-brand btn-sm" style={{ alignSelf: 'flex-end' }}>{fr ? 'Envoyer' : 'Send report'}</button>
      </form>
    </Modal>
  );
}

/* ---------------- Spaces ---------------- */

function SpacesList({ onOpen }: { onOpen: (s: CafeSpace) => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { cafe, me, act } = useCafe();
  const groups: [CafeSpace['group'], string][] = [['level', fr ? 'Par niveau' : 'By level'], ['goal', fr ? 'Par objectif' : 'By goal'], ['open', fr ? 'Pour tous' : 'For everyone']];
  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      {groups.map(([g, label]) => (
        <section key={g}>
          <h2 className="label" style={{ marginBottom: 8 }}>{label}</h2>
          <div className="cafe-spaces">
            {CAFE_SPACES.filter((s) => s.group === g).map((s) => {
              const following = cafe.follows.some((f) => f.userId === me && f.spaceId === s.id);
              const count = cafe.posts.filter((p) => p.spaceId === s.id).length;
              return (
                <div key={s.id} className="card cafe-space">
                  <button className="cafe-space-main" onClick={() => onOpen(s)}>
                    <span className="cafe-space-emoji" aria-hidden>{s.emoji}</span>
                    <strong>{s.name[lang]}</strong>
                    <span className="tiny muted">{s.about[lang]}</span>
                    <span className="tiny muted">{count} {fr ? 'message(s)' : count === 1 ? 'post' : 'posts'}</span>
                  </button>
                  <button className={`btn btn-sm ${following ? 'btn-secondary' : 'btn-ghost'}`} aria-pressed={following} onClick={() => void act('follow', { spaceId: s.id, on: !following }).catch(() => undefined)}>{following ? (fr ? '✓ Suivi' : '✓ Following') : fr ? '+ Suivre' : '+ Follow'}</button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function SpaceView({ space, onBack }: { space: CafeSpace; onBack: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { cafe } = useCafe();
  const posts = cafe.posts.filter((p) => p.spaceId === space.id).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="cafe-col">
      <button className="link small" onClick={onBack}>← {fr ? 'Tous les espaces' : 'All spaces'}</button>
      <div className="cafe-space-head"><span aria-hidden>{space.emoji}</span><div><h2 className="h3">{space.name[lang]}</h2><p className="small muted">{space.about[lang]}</p></div></div>
      <Composer spaceId={space.id} />
      <PostList posts={posts} empty={fr ? 'Soyez le premier à écrire ici !' : 'Be the first to post here!'} />
    </div>
  );
}

/* ---------------- Study groups ---------------- */

function GroupsList({ onOpen }: { onOpen: (id: string) => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { cafe, me, staff, act, person } = useCafe();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', level: 'A2' as CefrLevel, goal: '', usualTime: '' });
  const mine = cafe.groups.filter((g) => g.memberIds.includes(me));
  const others = cafe.groups.filter((g) => !g.memberIds.includes(me));
  const card = (g: StudyGroup) => {
    const member = g.memberIds.includes(me);
    const full = g.memberIds.length >= STUDY_GROUP_MAX;
    return (
      <div key={g.id} className="card cafe-group">
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>{g.name}</strong> <span className="chip">{g.level}</span>
          <div className="tiny muted">{g.goal} · {g.usualTime}</div>
          <div className="cafe-group-members" aria-label={fr ? 'Membres' : 'Members'}>
            {g.memberIds.slice(0, 8).map((id) => { const p = person(id); return p.portrait ? <Avatar key={id} spec={p.portrait} size={26} /> : null; })}
            <span className="tiny muted">{g.memberIds.length}/{STUDY_GROUP_MAX}</span>
          </div>
        </div>
        <div className="row" style={{ ['--gap' as string]: '6px' }}>
          {(member || staff) && <button className="btn btn-secondary btn-sm" onClick={() => onOpen(g.id)}>{fr ? 'Ouvrir' : 'Open'}</button>}
          {!staff && !member && <button className="btn btn-brand btn-sm" disabled={full} onClick={() => void act('joinGroup', { groupId: g.id, on: true }, fr ? 'Bienvenue dans le groupe !' : 'Welcome to the group!').then(() => onOpen(g.id)).catch(() => undefined)}>{full ? (fr ? 'Complet' : 'Full') : fr ? 'Rejoindre' : 'Join'}</button>}
        </div>
      </div>
    );
  };
  return (
    <div className="cafe-col">
      <div className="row between">
        <p className="small muted" style={{ margin: 0 }}>{fr ? `Des petits groupes de ${STUDY_GROUP_MAX} maximum pour pratiquer ensemble, entre deux cours.` : `Small groups of up to ${STUDY_GROUP_MAX} to practise together between classes.`}</p>
        {!staff && !creating && <button className="btn btn-brand btn-sm" onClick={() => setCreating(true)}><Icon name="plus" size={14} /> {fr ? 'Créer un groupe' : 'Start a group'}</button>}
      </div>
      {creating && (
        <form className="card stack" style={{ ['--gap' as string]: '10px' }} onSubmit={(e) => { e.preventDefault(); void act('createGroup', form, fr ? 'Groupe créé' : 'Group created').then((r) => { setCreating(false); onOpen((r as unknown as { group: StudyGroup }).group.id); }).catch(() => undefined); }}>
          <div className="form-grid">
            <label className="field"><span className="label">{fr ? 'Nom' : 'Name'}</span><input className="input" required minLength={3} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Les Lève-tôt d’Accra" /></label>
            <label className="field"><span className="label">{fr ? 'Niveau' : 'Level'}</span><select className="select" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as CefrLevel })}>{LEVELS.map((v) => <option key={v}>{v}</option>)}</select></label>
            <label className="field"><span className="label">{fr ? 'Objectif' : 'Goal'}</span><input className="input" maxLength={80} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder={fr ? 'Conversation avant le travail' : 'Conversation before work'} /></label>
            <label className="field"><span className="label">{fr ? 'Horaire habituel' : 'Usual time'}</span><input className="input" maxLength={60} value={form.usualTime} onChange={(e) => setForm({ ...form, usualTime: e.target.value })} placeholder={fr ? 'Mardi 19 h GMT' : 'Tuesdays 19:00 GMT'} /></label>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>{fr ? 'Annuler' : 'Cancel'}</button>
            <button className="btn btn-brand btn-sm">{fr ? 'Créer' : 'Create'}</button>
          </div>
        </form>
      )}
      {mine.length > 0 && <><h2 className="label">{fr ? 'Mes groupes' : 'My groups'}</h2><div className="stack" style={{ ['--gap' as string]: '10px' }}>{mine.map(card)}</div></>}
      <h2 className="label">{fr ? 'Groupes ouverts' : 'Open groups'}</h2>
      {others.length ? <div className="stack" style={{ ['--gap' as string]: '10px' }}>{others.map(card)}</div> : <p className="small muted">{fr ? 'Aucun autre groupe pour l’instant.' : 'No other groups yet.'}</p>}
    </div>
  );
}

function GroupView({ id, onBack }: { id: string; onBack: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { cafe, me, staff, act, person } = useCafe();
  const toast = useToast();
  const g = cafe.groups.find((x) => x.id === id);
  const [start, setStart] = useState(() => new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 11) + '18:00');
  const [topic, setTopic] = useState('');
  if (!g) return <div className="cafe-col"><button className="link small" onClick={onBack}>← {fr ? 'Groupes' : 'Groups'}</button><p className="small muted">{fr ? 'Ce groupe n’existe plus.' : 'This group no longer exists.'}</p></div>;
  const member = g.memberIds.includes(me);
  const posts = cafe.posts.filter((p) => p.spaceId === g.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const upcoming = g.sessions.filter((s) => s.start >= nowIso());
  return (
    <div className="cafe-col">
      <button className="link small" onClick={onBack}>← {fr ? 'Tous les groupes' : 'All groups'}</button>
      <div className="card cafe-group-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 className="h3">{g.name} <span className="chip">{g.level}</span></h2>
          <p className="small muted">{g.goal} · {g.usualTime}</p>
          <div className="cafe-group-members">{g.memberIds.map((m) => { const p = person(m); return <span key={m} className="cafe-member" title={p.name}>{p.portrait && <Avatar spec={p.portrait} size={30} />}<span className="tiny">{p.name.split(' ')[0]}{m === g.ownerId ? ' ★' : ''}</span></span>; })}</div>
        </div>
        {member && <button className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm(fr ? 'Quitter ce groupe ?' : 'Leave this group?')) void act('joinGroup', { groupId: g.id, on: false }, fr ? 'Vous avez quitté le groupe' : 'You left the group').then(onBack).catch(() => undefined); }}>{fr ? 'Quitter' : 'Leave'}</button>}
      </div>

      <section className="card">
        <h3 className="h4">📅 {fr ? 'Séances de pratique' : 'Practice sessions'}</h3>
        {upcoming.length ? (
          <ul className="cafe-sessions">
            {upcoming.map((s) => (
              <li key={s.id}>
                <strong>{formatDate(s.start, lang, { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(s.start, lang)}</strong> <span lang="fr">{s.topic}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => toast(fr ? 'Démo : le lien Google Meet est créé une fois l’intégration configurée.' : 'Demo: the Google Meet link is created once the integration is configured.')}><Icon name="meet" size={14} /> Google Meet</button>
              </li>
            ))}
          </ul>
        ) : <p className="small muted">{fr ? 'Aucune séance prévue.' : 'No session planned yet.'}</p>}
        {member && (
          <form className="row" style={{ ['--gap' as string]: '8px', marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); void act('scheduleGroupSession', { groupId: g.id, start: `${start}:00Z`, topic }, fr ? 'Séance planifiée' : 'Session planned').then(() => setTopic('')).catch(() => undefined); }}>
            <input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={{ width: 'auto' }} aria-label={fr ? 'Date et heure (GMT)' : 'Date and time (GMT)'} />
            <input className="input" lang="fr" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={fr ? 'Thème (ex. Parler de son métier)' : 'Topic (e.g. Talking about your job)'} style={{ flex: '1 1 200px' }} maxLength={80} />
            <button className="btn btn-brand btn-sm" disabled={topic.trim().length < 2}>{fr ? 'Planifier' : 'Plan it'}</button>
          </form>
        )}
        <p className="tiny muted" style={{ marginTop: 8 }}>{fr ? 'Séances entre apprenants, sans tuteur. Pour une séance guidée, réservez un tuteur.' : 'Peer sessions without a tutor. For a guided session, book a tutor.'}</p>
      </section>

      {(member || staff) && <Composer spaceId={g.id} groupMode />}
      <PostList posts={posts} empty={fr ? 'Dites bonjour au groupe !' : 'Say hello to the group!'} />
    </div>
  );
}
