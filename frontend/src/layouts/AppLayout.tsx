import { classmatesOf, COURSES, leaderboard, LEARNERS, TUTORS, type Role } from '@laporte/shared';
import { motion } from 'motion/react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/3d/Portrait';
import { spring } from '../components/animations/motion';
import { LogoMark } from '../components/layout/Brand';
import { LanguageSwitch } from '../components/ui/Controls';
import { Icon, type IconName } from '../components/ui/Icon';
import { useRouteFocus } from '../hooks/useRouteFocus';
import { ClassmateChat } from '../features/community/ClassmateChat';
import { useUnread } from '../features/messages/unread';
import { DesktopNoteHost } from '../features/expressions/DailyNote';
import { readLocal, removeLocal, writeLocal } from '../utils/storage';
import { START_PENDING_KEY } from '../pages/onboarding/StartPage';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/dictionary';
import { useStore } from '../state/AppStore';

type NavItem = { to: string; key: MessageKey; icon: IconName; end?: boolean; mobile?: boolean };
type NavGroup = { key?: MessageKey; items: NavItem[] };

const NAV: Record<Role, NavGroup[]> = {
  learner: [
    { items: [{ to: '/app', key: 'app.dashboard', icon: 'home', end: true, mobile: true }] },
    { key: 'app.learn', items: [
      { to: '/app/courses', key: 'app.courses', icon: 'book', mobile: true },
      { to: '/app/placement', key: 'app.placement', icon: 'award' },
      { to: '/app/passport', key: 'app.passport', icon: 'passport' },
      { to: '/app/vocabulary', key: 'app.vocabulary', icon: 'words' },
    ] },
    { key: 'app.practise', items: [
      { to: '/app/studio', key: 'app.studio', icon: 'mic', mobile: true },
      { to: '/app/practice', key: 'app.practice', icon: 'edit' },
      { to: '/app/group', key: 'app.group', icon: 'users' },
      { to: '/app/book', key: 'app.book', icon: 'calendar', mobile: true },
      { to: '/app/lessons', key: 'app.lessons', icon: 'clock' },
    ] },
    { key: 'app.communityGroup', items: [
      { to: '/app/community', key: 'app.community', icon: 'star' },
      { to: '/app/cafe', key: 'app.cafe', icon: 'message' },
      { to: '/app/kids', key: 'app.kids', icon: 'award' },
    ] },
    { key: 'app.account', items: [
      { to: '/app/messages', key: 'app.messages', icon: 'message', mobile: true },
      { to: '/app/notifications', key: 'app.notifications', icon: 'bell' },
      { to: '/app/billing', key: 'app.billing', icon: 'card' },
      { to: '/app/help', key: 'app.help', icon: 'help' },
    ] },
  ],
  instructor: [
    { items: [{ to: '/instructor', key: 'app.dashboard', icon: 'home', end: true, mobile: true }] },
    { key: 'app.teach', items: [
      { to: '/instructor/availability', key: 'app.availability', icon: 'calendar', mobile: true },
      { to: '/instructor/learners', key: 'app.learners', icon: 'users', mobile: true },
      { to: '/instructor/messages', key: 'app.messages', icon: 'message', mobile: true },
    ] },
    { key: 'app.content', items: [
      { to: '/instructor/content', key: 'app.library', icon: 'layers', mobile: true },
      { to: '/instructor/immersion', key: 'app.immersion', icon: 'mic' },
      { to: '/instructor/groups', key: 'app.groups', icon: 'users' },
      { to: '/instructor/games', key: 'app.kidsGames', icon: 'quiz' },
      { to: '/instructor/cafe', key: 'app.cafe', icon: 'message' },
    ] },
  ],
  admin: [
    { items: [{ to: '/admin', key: 'app.overview', icon: 'chart', end: true, mobile: true }] },
    { key: 'app.operations', items: [
      { to: '/admin/bookings', key: 'app.bookings', icon: 'calendar', mobile: true },
      { to: '/admin/payments', key: 'app.payments', icon: 'card', mobile: true },
      { to: '/admin/messages', key: 'app.supportInbox', icon: 'message', mobile: true },
      { to: '/admin/support', key: 'app.support', icon: 'support' },
    ] },
    { key: 'app.people', items: [
      { to: '/admin/learners', key: 'app.learners', icon: 'users', mobile: true },
      { to: '/admin/instructors', key: 'app.instructors', icon: 'user' },
      { to: '/admin/groups', key: 'app.groups', icon: 'users' },
    ] },
    { key: 'app.learningGroup', items: [
      { to: '/admin/courses', key: 'nav.courses', icon: 'book' },
      { to: '/admin/content', key: 'app.library', icon: 'layers', mobile: true },
      { to: '/admin/immersion', key: 'app.immersion', icon: 'mic' },
      { to: '/admin/games', key: 'app.kidsGames', icon: 'quiz' },
    ] },
    { key: 'app.insights', items: [
      { to: '/admin/cafe', key: 'app.cafe', icon: 'message' },
      { to: '/admin/reports', key: 'app.reports', icon: 'file' },
    ] },
  ],
};

export const ROLE_HOME: Record<Role, string> = { learner: '/app', instructor: '/instructor', admin: '/admin' };

export function AppLayout({ role }: { role: Role }) {
  const { t, lang } = useI18n();
  const store = useStore();

  // Entering a workspace URL directly selects that demo role.
  useEffect(() => {
    if (store.role !== role) store.actions.setRole(role);
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  useRouteFocus('app-main');

  // A learner who signed up but hasn't chosen a starting level goes back to the start screen.
  const hasPlacement = store.content.placements.some((p) => p.learnerId === store.learner.id);
  const startPending = role === 'learner' && readLocal(START_PENDING_KEY) === '1';
  useEffect(() => {
    if (startPending && hasPlacement) removeLocal(START_PENDING_KEY);
  }, [startPending, hasPlacement]);

  const groups = NAV[role];
  const mobileItems = groups.flatMap((g) => g.items).filter((i) => i.mobile);
  const unread = store.notifications.filter((n) => !n.read).length;
  const unreadMessages = useUnread(store.threads, store.userId).count;
  // Collapsible sidebar: an icon rail with tooltips, remembered on this device.
  const [collapsed, setCollapsed] = useState(() => readLocal('laporte-sidebar') === 'collapsed');
  const toggle = () =>
    setCollapsed((v) => {
      writeLocal('laporte-sidebar', v ? 'open' : 'collapsed');
      return !v;
    });

  // Phones: the full menu (every page, not just the five tabs) slides in from the left.
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    // Keep the page behind the open menu from scrolling.
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = before;
    };
  }, [menuOpen]);

  if (startPending && !hasPlacement) return <Navigate to="/start" replace />;
  return (
    <div className="app-shell" data-collapsed={(collapsed && !menuOpen) || undefined} data-menu={menuOpen || undefined}>
      <a href="#app-main" className="skip-link">
        {t('nav.skip')}
      </a>
      {menuOpen && <button type="button" className="menu-scrim" aria-label={t('app.collapseMenu')} onClick={() => setMenuOpen(false)} />}
      <aside className="sidebar" id="app-menu" aria-label="Workspace">
        <div className="side-top">
          <Link to={ROLE_HOME[role]} className="side-brand" aria-label="La Porte French Institute — home">
            <span className="side-logo"><LogoMark size={20} light /></span>
            <span className="side-text">
              <strong>La Porte</strong>
              <small>French Institute</small>
            </span>
          </Link>
          <button type="button" className="side-close" onClick={() => setMenuOpen(false)} aria-label={t('app.collapseMenu')}><Icon name="x" size={18} /></button>
          <button type="button" className="side-toggle" onClick={toggle} aria-expanded={!collapsed} aria-label={collapsed ? t('app.expandMenu') : t('app.collapseMenu')} title={collapsed ? t('app.expandMenu') : t('app.collapseMenu')}>
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
          </button>
        </div>
        <div className="side-prefs" aria-label={lang === 'fr' ? 'Réglages' : 'Settings'}>
          <LanguageSwitch />
          <RoleSwitch />
        </div>
        <nav aria-label={t('app.dashboard')} className="side-nav">
          {groups.map((g, gi) => (
            <div key={gi} role="group" aria-label={g.key ? t(g.key) : undefined}>
              {g.key && <div className="side-group">{t(g.key)}</div>}
              {g.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} title={collapsed ? t(item.key) : undefined} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="side-pill" className="side-pill" transition={spring.snappy} />}
                      <Icon name={item.icon} size={18} stroke={isActive ? 2 : 1.6} />
                      <span className="side-text">{t(item.key)}</span>
                      {(item.key === 'app.messages' || item.key === 'app.supportInbox') && unreadMessages > 0 && (
                        <span className="chip chip-burgundy side-badge" style={{ marginLeft: 'auto', minHeight: 20, padding: '0 7px' }} aria-label={`${unreadMessages} unread`}>
                          {unreadMessages}
                        </span>
                      )}
                      {item.to === '/app/notifications' && unread > 0 && (
                        <span className="chip chip-burgundy side-badge" style={{ marginLeft: 'auto', minHeight: 20, padding: '0 7px' }}>
                          {unread}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        {role === 'learner' && <ClassmateList />}
        <div className="side-foot stack" style={{ ['--gap' as string]: '10px' }}>
          <div className="side-text"><ConnectionBadge /></div>
          <Link to="/" className="side-link" style={{ padding: '8px 0' }} title={collapsed ? t('app.backToSite') : undefined}>
            <Icon name="arrowLeft" size={16} />
            <span className="small side-text">{t('app.backToSite')}</span>
          </Link>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="mobile-only mobile-menu-row">
            <button type="button" className="round-btn menu-btn" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="app-menu" aria-label={lang === 'fr' ? 'Menu : toutes les pages' : 'Menu: all pages'}>
              <Icon name="menu" size={20} />
            </button>
            <MobileBrand role={role} />
          </div>
          {role === 'learner' && <SearchBox />}
          <div className="topbar-actions">
            {/* Settings-type controls: in the bar on larger screens, inside the menu on phones. */}
            <div className="topbar-prefs">
              <RoleSwitch />
              <LanguageSwitch />
            </div>
            {role === 'learner' && (
              <Link to="/app/notifications" className="round-btn" aria-label={`${t('app.notifications')} (${unread})`}>
                <Icon name="bell" size={18} />
                {unread > 0 && <span className="ping-dot" />}
              </Link>
            )}
            <UserAvatar role={role} />
          </div>
        </header>
        <main id="app-main" className="app-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {role === 'learner' && <DesktopNoteHost />}
      <nav className="bottom-nav" aria-label="Workspace (mobile)">
        {mobileItems.slice(0, 5).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            <Icon name={item.icon} size={20} />
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function MobileBrand({ role }: { role: Role }) {
  return (
    <Link to={ROLE_HOME[role]} aria-label="La Porte — home" className="mobile-brand">
      <span className="side-logo"><LogoMark size={18} light /></span>
      <span className="mobile-wordmark">La Porte</span>
    </Link>
  );
}


/** Fellow La Porte learners, ranked by points. */
function ClassmateList() {
  const { lang } = useI18n();
  const { learner, content } = useStore();
  // Classmates = same group or same level; ranked with the leaderboard's points.
  const ranked = leaderboard(content, { viewerId: learner.id, ids: classmatesOf(content, learner.id).map((x) => x.id) }).slice(0, 6);
  const pointsOf = (id: string) => ranked.find((r) => r.learnerId === id)?.points ?? 0;
  const classmates = ranked.map((r) => LEARNERS.find((x) => x.id === r.learnerId)!);
  const [chatWith, setChatWith] = useState<string | null>(null);
  // Your group first (people you actually study with), then others at your level.
  const groupIds = new Set(content.cohorts.filter((g) => g.memberIds.includes(learner.id)).flatMap((g) => g.memberIds));
  const sections = [
    { key: 'group', label: lang === 'fr' ? 'Votre groupe' : 'Your group', people: classmates.filter((c) => groupIds.has(c.id)) },
    { key: 'level', label: lang === 'fr' ? `Même niveau (${learner.level})` : `Same level (${learner.level})`, people: classmates.filter((c) => !groupIds.has(c.id)) },
  ].filter((s) => s.people.length);
  let n = 0;
  return (
    <div className="side-classmates">
      <ClassmateChat classmateId={chatWith} onClose={() => setChatWith(null)} />
      <div className="side-group">{lang === 'fr' ? 'Camarades de classe' : 'Classmates'}</div>
      {sections.map((s) => (
        <div key={s.key}>
          <div className="side-subgroup side-text">{s.label}</div>
          <div className="stack" style={{ ['--gap' as string]: '2px' }}>
            {s.people.map((c) => (
              <motion.div key={c.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.settle, delay: 0.1 + n++ * 0.06 }}>
                <button type="button" className="person" title={c.name} onClick={() => setChatWith(c.id)} aria-label={lang === 'fr' ? `Discuter avec ${c.name}` : `Chat with ${c.name}`}>
                  <span className="person-avatar">
                    <Avatar spec={c.portrait} size={34} />
                    {c.lastActive === learner.lastActive && <span className="online-dot" title={lang === 'fr' ? 'Actif aujourd’hui' : 'Active today'} />}
                  </span>
                  <span className="side-text" style={{ minWidth: 0 }}>
                    <span className="person-name">{c.name}</span>
                    <span className="tiny muted"><span className="num">{pointsOf(c.id)}</span> {lang === 'fr' ? 'points' : 'Points'} · {c.level}</span>
                  </span>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type Hit = { id: string; to: string; icon: IconName; label: string; sub: string };
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Search across La Porte's courses, lessons and tutors. */
function SearchBox() {
  const { l, lang } = useI18n();
  const navigate = useNavigate();
  const listId = useId();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const fr = lang === 'fr';

  const index = useMemo<Hit[]>(() => {
    const out: Hit[] = [];
    for (const c of COURSES) {
      out.push({ id: c.id, to: `/app/courses/${c.id}`, icon: 'book', label: l(c.title), sub: `${fr ? 'Cours' : 'Course'} · ${c.levels}` });
      for (const m of c.modules) for (const x of m.lessons) out.push({ id: x.id, to: `/app/learn/${x.id}?course=${c.id}`, icon: 'play', label: x.title, sub: `${fr ? 'Leçon' : 'Lesson'} · ${l(c.title)}` });
    }
    for (const tu of TUTORS) out.push({ id: tu.id, to: `/app/tutors/${tu.id}`, icon: 'user', label: tu.name, sub: `${fr ? 'Tuteur' : 'Tutor'} · ${tu.specialities.slice(0, 2).join(', ')}` });
    return out;
  }, [l, fr]);

  const term = norm(q.trim());
  // Typing the word "tutor" (tuteur, tutrice…) lists every La Porte tutor, then a link to the full list.
  const wantsTutors = /^(tut|tute|tuto|tutor|tutors|tuteur|tuteurs|tutrice|tutrices)$/.test(term);
  const hits = !term ? [] : wantsTutors
    ? [...index.filter((h) => h.icon === 'user'), { id: 'all-tutors', to: '/app/tutors', icon: 'users' as const, label: fr ? 'Voir tous les tuteurs' : 'See all tutors', sub: fr ? 'Parcours, spécialités et cours' : 'Background, expertise and courses' }]
    : index.filter((h) => norm(`${h.label} ${h.sub}`).includes(term)).slice(0, 6);
  const go = (h: Hit) => {
    navigate(h.to);
    setQ('');
    setOpen(false);
  };

  return (
    <div className="search-pill" role="search">
      <Icon name="search" size={18} />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setCursor(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') return setOpen(false);
          if (!hits.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (c + 1) % hits.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => (c - 1 + hits.length) % hits.length); }
          else if (e.key === 'Enter') { e.preventDefault(); go(hits[cursor]); }
        }}
        placeholder={fr ? 'Rechercher un cours, une leçon ou un tuteur' : 'Search by course, lesson or tutor'}
        aria-label={fr ? 'Rechercher' : 'Search'}
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && hits.length ? `${listId}-${cursor}` : undefined}
      />
      {open && term && (
        <ul className="search-results" id={listId} role="listbox">
          {hits.length ? (
            hits.map((h, i) => (
              <li key={h.id} id={`${listId}-${i}`} role="option" aria-selected={i === cursor} data-active={i === cursor || undefined} onMouseDown={(e) => e.preventDefault()} onClick={() => go(h)} onMouseEnter={() => setCursor(i)}>
                <span className="tone-icon" data-tone={h.icon === 'user' ? 'gold' : h.icon === 'play' ? 'navy' : 'burgundy'}><Icon name={h.icon} size={16} /></span>
                <span style={{ minWidth: 0 }}>
                  <strong>{h.label}</strong>
                  <span className="tiny muted">{h.sub}</span>
                </span>
              </li>
            ))
          ) : (
            <li className="small muted" style={{ padding: '10px 12px' }}>{fr ? 'Aucun résultat' : 'No results'}</li>
          )}
        </ul>
      )}
    </div>
  );
}

function UserAvatar({ role }: { role: Role }) {
  const { learner, actions } = useStore();
  const name = role === 'learner' ? learner.firstName : role === 'instructor' ? TUTORS[0].name.split(' ')[0] : 'Admin';
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const fr = lang === 'fr';
  if (role === 'learner')
    return (
      <div className="profile-menu">
        <button type="button" className="user-pill" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} onBlur={(e) => !e.currentTarget.parentElement?.contains(e.relatedTarget as Node) && setOpen(false)}>
          <Avatar spec={learner.portrait} size={34} label={learner.name} />
          <span className="user-pill-name">{name}</span>
          <Icon name="chevronDown" size={14} />
        </button>
        {open && (
          <div className="profile-pop" role="menu">
            <span className="tiny muted" style={{ padding: '4px 8px' }}>{fr ? 'Profils' : 'Profiles'}</span>
            <button type="button" role="menuitem" className="profile-opt" data-active>
              <Avatar spec={learner.portrait} size={34} />
              <span><strong>{learner.name}</strong><span className="tiny muted">{fr ? 'Adulte · actif' : 'Adult · active'}</span></span>
            </button>
            <button type="button" role="menuitem" className="profile-opt" onClick={() => { setOpen(false); navigate('/app/kids'); }}>
              <span className="kids-tile" aria-hidden>★</span>
              <span><strong>{fr ? 'Profils enfants' : 'Kids profiles'}</strong><span className="tiny muted">{fr ? 'Gérés par vous · sécurisés' : 'Parent-managed · child-safe'}</span></span>
            </button>
            <button type="button" role="menuitem" className="profile-opt" onClick={() => { setOpen(false); actions.useDemoLearner(); navigate('/login'); }}>
              <span className="kids-tile" aria-hidden><Icon name="logout" size={16} /></span>
              <span><strong>{fr ? 'Se déconnecter' : 'Log out'}</strong><span className="tiny muted">{learner.email ?? ''}</span></span>
            </button>
          </div>
        )}
      </div>
    );
  return (
    <span className="user-pill">
      {role === 'instructor' ? (
        <Avatar spec={TUTORS[0].portrait} size={34} label={TUTORS[0].name} />
      ) : (
        <span className="avatar" style={{ ['--size' as string]: '34px', display: 'grid', placeItems: 'center', background: 'var(--navy)', color: '#E7C78F', fontWeight: 700, fontSize: 13 }} title="Admin">
          LP
        </span>
      )}
      <span className="user-pill-name">{name}</span>
    </span>
  );
}

export function RoleSwitch() {
  const { t } = useI18n();
  const store = useStore();
  const navigate = useNavigate();
  return (
    <label className="row" style={{ ['--gap' as string]: '6px' }} title={t('role.notice')}>
      <span className="demo-tag">{t('app.role')}</span>
      <select
        className="select"
        style={{ minHeight: 36, padding: '4px 10px', width: 'auto', borderRadius: 999, fontSize: 13, fontWeight: 600 }}
        value={store.role}
        onChange={(e) => {
          const role = e.target.value as Role;
          store.actions.setRole(role);
          navigate(ROLE_HOME[role]);
        }}
        aria-label={t('app.role')}
      >
        <option value="learner">{t('role.learner')}</option>
        <option value="instructor">{t('role.instructor')}</option>
        <option value="admin">{t('role.admin')}</option>
      </select>
    </label>
  );
}

function ConnectionBadge() {
  const { t } = useI18n();
  const { connection, actions } = useStore();
  return (
    <div className="stack" style={{ ['--gap' as string]: '8px', fontSize: 12 }}>
      <div className="row" style={{ ['--gap' as string]: '8px', color: 'var(--muted)' }}>
        <span style={{ width: 8, height: 8, borderRadius: 8, background: connection === 'api' ? 'var(--green)' : 'var(--gold)' }} />
        <span>
          {t('demo.data')} · {connection === 'api' ? t('demo.apiConnected') : connection === 'offline' ? t('demo.offline') : '…'}
        </span>
      </div>
      <button className="link" style={{ color: 'var(--burgundy)', fontSize: 12 }} onClick={() => void actions.resetDemo()}>
        <Icon name="replay" size={14} /> {t('app.resetDemo')}
      </button>
    </div>
  );
}
