import { DAILY_LIMITS, DEMO_GAME_CODE, EXTERNAL_PROVIDERS, KID_GAME_INFO, KID_GAMES, KID_UNITS, kidProgress, minutesToday, nowIso, type CefrLevel, type KidGame, type KidProfile, type KidUnit, type LiveGameView, type PortraitSpec } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/3d/Portrait';
import { spring } from '../../components/animations/motion';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { BuilderGame, ListenGame, LivePlayerView, MemoryGame, QuizGame, Stars } from '../../features/kids/KidGames';
import { isLocalGame, liveClient } from '../../features/kids/liveClient';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatDate } from '../../utils/format';
import { PageHead } from '../learner/LearnerPages';

/*
 * La Porte Kids (call requirement): parent-managed, child-safe.
 * - Parents create profiles, set a daily time limit and choose which games are on.
 * - Child mode is its own screen: no messages, calls, classmates, leaderboard or payments.
 *   Leaving it, or opening an outside game, needs the parent's PIN.
 * - Live class games are hosted by a La Porte tutor; children appear under a safe nickname.
 */

export const KID_AVATARS: PortraitSpec[] = [
  { skin: '#6B3F26', hair: 'puff', hairColor: '#1A120D', outfit: '#C49A5A', accent: '#F6E7C8', bg: '#F8E3D6' },
  { skin: '#8A5634', hair: 'short', hairColor: '#2A1A10', outfit: '#2E6FB0', accent: '#DCE9F7', bg: '#E3EEF8' },
  { skin: '#4E2F1F', hair: 'curls', hairColor: '#120B07', outfit: '#6E1630', accent: '#F4D9DF', bg: '#F3E1E5' },
  { skin: '#B47A4E', hair: 'bob', hairColor: '#3B2414', outfit: '#1F6B4F', accent: '#DDEFE5', bg: '#E2F0E7' },
];
const avatarOf = (k: KidProfile) => KID_AVATARS[k.avatar] ?? KID_AVATARS[0];
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const SAFETY = [
  { icon: 'message', en: 'No messages or calls with other learners', fr: 'Aucun message ni appel avec d’autres apprenants' },
  { icon: 'users', en: 'Never shown in classmates or the leaderboard', fr: 'N’apparaît jamais parmi les camarades ni dans le classement' },
  { icon: 'star', en: 'Live games show a safe nickname, never the real name', fr: 'Les jeux en direct affichent un surnom, jamais le vrai prénom' },
  { icon: 'lock', en: 'Leaving child mode or opening an outside game needs your PIN', fr: 'Quitter le mode enfant ou ouvrir un jeu externe demande votre code' },
] as const;

/* ======================= Parent dashboard ======================= */

export function KidsProfilesPage() {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { content, user } = useStore();
  const kids = content.kids ?? [];
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(kids[0]?.id ?? null);
  const open = kids.find((k) => k.id === openId) ?? kids[0];

  if (user.role !== 'learner')
    return (
      <>
        <PageHead title={fr ? 'Profils enfants' : 'Kids profiles'} />
        <div className="card"><p className="small">{fr ? 'Les profils enfants sont gérés depuis le compte apprenant d’un parent.' : 'Child profiles are managed from a parent’s learner account.'}</p></div>
      </>
    );

  return (
    <>
      <PageHead title={fr ? 'La Porte Kids' : 'La Porte Kids'} sub={fr ? 'Des profils que vous gérez : jeux en français, temps d’écran maîtrisé, aucun contact avec des inconnus.' : 'Profiles you manage: French games, screen time you control, no contact with strangers.'}>
        {kids.length > 0 && !adding && kids.length < 5 && <button className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={15} /> <span>{fr ? 'Ajouter un enfant' : 'Add a child'}</span></button>}
      </PageHead>

      {kids.length > 1 && (
        <div className="kid-switch" role="tablist" aria-label={fr ? 'Enfants' : 'Children'}>
          {kids.map((k) => (
            <button key={k.id} role="tab" aria-selected={k.id === open?.id} className="kid-switch-btn" onClick={() => setOpenId(k.id)}>
              <Avatar spec={avatarOf(k)} size={28} /> {k.name}
            </button>
          ))}
        </div>
      )}

      <div className="kids-layout">
        <div className="stack" style={{ ['--gap' as string]: '16px' }}>
          {(adding || !kids.length) && <AddKid first={!kids.length} onDone={(id) => { setAdding(false); if (id) setOpenId(id); }} />}
          {open && !adding && <KidOverview kid={open} />}
        </div>
        <aside className="stack" style={{ ['--gap' as string]: '16px' }}>
          {open && !adding && <KidSettingsCard kid={open} />}
          <section className="card stack" style={{ ['--gap' as string]: '12px' }} aria-labelledby="kid-safety">
            <h2 id="kid-safety" className="h4">{fr ? 'Toujours activé' : 'Always on'}</h2>
            <ul className="kid-safety">
              {SAFETY.map((s) => <li key={s.icon}><span className="kid-safety-icon"><Icon name={s.icon} size={15} /></span>{fr ? s.fr : s.en}</li>)}
            </ul>
            <Link to="/app/book" className="link small">{fr ? 'Réserver un cours avec un tuteur pour enfants' : 'Book a lesson with a children’s tutor'} →</Link>
          </section>
        </aside>
      </div>
      {open && <p className="tiny muted" style={{ marginTop: 14 }}>{fr ? 'Démo : le code parent est gardé en clair. Le portail réel le chiffre et le vérifie sur le serveur.' : 'Demo: the parent PIN is stored as typed. The live portal hashes it and checks it on the server.'}</p>}
    </>
  );
}

function AddKid({ first, onDone }: { first: boolean; onDone: (id?: string) => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { actions } = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [age, setAge] = useState(8);
  const [level, setLevel] = useState<CefrLevel>('A1');
  const [avatar, setAvatar] = useState(0);
  const [pin, setPin] = useState('');
  const valid = name.trim().length >= 2 && /^\d{4}$/.test(pin);
  const save = () =>
    actions.kids
      .create({ name: name.trim(), age, level, avatar, pin })
      .then((r) => { toast(fr ? `Profil de ${r.kid.name} créé · surnom de jeu : ${r.kid.nickname}` : `${r.kid.name}’s profile is ready · game nickname: ${r.kid.nickname}`); onDone(r.kid.id); })
      .catch((e) => toast(errText(e)));
  return (
    <section className="card stack" style={{ ['--gap' as string]: '14px' }} aria-labelledby="add-kid">
      <h2 id="add-kid" className="h4">{first ? (fr ? 'Créez le premier profil enfant' : 'Create your first child profile') : fr ? 'Ajouter un enfant' : 'Add a child'}</h2>
      <div className="form-grid">
        <label className="field"><span className="label">{fr ? 'Prénom' : 'First name'}</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="off" /></label>
        <label className="field"><span className="label">{fr ? 'Âge' : 'Age'}</span>
          <select className="select" value={age} onChange={(e) => setAge(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 4).map((a) => <option key={a} value={a}>{a}</option>)}</select>
        </label>
        <label className="field"><span className="label">{fr ? 'Niveau' : 'Level'}</span>
          <select className="select" value={level} onChange={(e) => setLevel(e.target.value as CefrLevel)}><option value="A1">{fr ? 'A1 · débutant' : 'A1 · beginner'}</option><option value="A2">{fr ? 'A2 · élémentaire' : 'A2 · elementary'}</option></select>
        </label>
        <label className="field"><span className="label">{fr ? 'Votre code parent (4 chiffres)' : 'Your parent PIN (4 digits)'}</span><input className="input" inputMode="numeric" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} autoComplete="new-password" /></label>
      </div>
      <div>
        <span className="label">Avatar</span>
        <div className="row" style={{ ['--gap' as string]: '10px', marginTop: 6 }} role="radiogroup" aria-label="Avatar">
          {KID_AVATARS.map((a, i) => <button key={i} type="button" role="radio" aria-checked={avatar === i} className="kid-avatar-opt" data-on={avatar === i || undefined} onClick={() => setAvatar(i)}><Avatar spec={a} size={44} /></button>)}
        </div>
      </div>
      <p className="tiny muted">{fr ? 'Votre enfant recevra un surnom de jeu (par ex. « Panda Malin ») : son prénom n’est jamais montré aux autres.' : 'Your child gets a game nickname (e.g. “Panda Malin”): their name is never shown to others.'}</p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {!first && <button className="btn btn-ghost btn-sm" onClick={() => onDone()}>{fr ? 'Annuler' : 'Cancel'}</button>}
        <button className="btn btn-brand btn-sm" disabled={!valid} onClick={() => void save()}>{fr ? 'Créer le profil' : 'Create profile'}</button>
      </div>
    </section>
  );
}

function KidOverview({ kid }: { kid: KidProfile }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content } = useStore();
  const navigate = useNavigate();
  const p = kidProgress(content, kid.id);
  const today = nowIso().slice(0, 10);
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.parse(`${today}T00:00:00Z`) - (6 - i) * 86_400_000).toISOString().slice(0, 10));
  const week = days.reduce((n, d) => n + (kid.usage[d] ?? 0), 0);
  return (
    <>
      <section className="card kid-overview">
        <Avatar spec={avatarOf(kid)} size={72} expression="joy" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 className="h3">{kid.name}</h2>
          <div className="tiny muted">{fr ? `${kid.age} ans` : `Age ${kid.age}`} · {kid.level} · {fr ? 'surnom' : 'nickname'} <strong lang="fr">{kid.nickname}</strong></div>
          <div className="kid-kpis">
            <span><b>{p.totalStars}</b> ★</span>
            <span><b>{p.badges}</b> {fr ? 'badges' : 'badges'}</span>
            <span><b>{p.played}</b> {fr ? 'parties' : 'games played'}</span>
            <span><b>{minutesToday(kid, today)}</b>/{kid.settings.dailyMinutes} min {fr ? 'aujourd’hui' : 'today'}</span>
          </div>
        </div>
        <button className="btn btn-brand" onClick={() => navigate(`/kids/${kid.id}`)}>{fr ? 'Ouvrir le mode enfant' : 'Open child mode'} <Icon name="arrowRight" size={15} /></button>
      </section>

      <section className="card" aria-labelledby="kid-worlds">
        <div className="row between" style={{ marginBottom: 12 }}><h2 id="kid-worlds" className="h4">{fr ? 'Progression par monde' : 'Progress by world'}</h2><span className="tiny muted">{fr ? 'Badge = 2 ★ dans les 4 jeux' : 'Badge = 2 ★ in all 4 games'}</span></div>
        <div className="kid-world-table">
          {p.units.map((u) => (
            <div key={u.unit.id} className="kid-world-row" data-locked={!u.unlocked || undefined}>
              <span className="kid-world-emoji" style={{ background: u.unit.colour }} aria-hidden>{u.unit.emoji}</span>
              <strong lang="fr">{l(u.unit.title)}</strong>
              <span className="kid-world-games">
                {KID_GAMES.map((g) => <span key={g} title={l(KID_GAME_INFO[g].name)} data-stars={u.games[g]}>{KID_GAME_INFO[g].icon}<Stars n={u.games[g]} size={11} /></span>)}
              </span>
              <span className="tiny">{u.badge ? '🏅' : u.unlocked ? '' : '🔒'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="kid-week">
        <div className="row between" style={{ marginBottom: 10 }}><h2 id="kid-week" className="h4">{fr ? 'Cette semaine' : 'This week'}</h2><span className="tiny muted">{week} min</span></div>
        <div className="kid-week">
          {days.map((d) => {
            const m = kid.usage[d] ?? 0;
            return (
              <div key={d} className="kid-week-day" title={`${m} min`}>
                <span className="kid-week-bar"><span style={{ height: `${Math.min(100, (m / kid.settings.dailyMinutes) * 100)}%` }} data-over={m >= kid.settings.dailyMinutes || undefined} /></span>
                <span className="tiny muted">{formatDate(d, lang, { weekday: 'narrow' })}</span>
              </div>
            );
          })}
        </div>
        {p.recent.length > 0 && (
          <ul className="kid-recent">
            {p.recent.slice(0, 5).map((a) => {
              const u = KID_UNITS.find((x) => x.id === a.unitId)!;
              return <li key={a.id}><span aria-hidden>{a.game === 'live' ? '📡' : KID_GAME_INFO[a.game].icon}</span> <span lang="fr">{a.game === 'live' ? (fr ? 'Jeu en direct' : 'Live game') : l(KID_GAME_INFO[a.game].name)} · {l(u.title)}</span> <Stars n={a.stars} size={12} /> <span className="tiny muted">{formatDate(a.at, lang, { day: 'numeric', month: 'short' })}</span></li>;
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function KidSettingsCard({ kid }: { kid: KidProfile }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { actions } = useStore();
  const toast = useToast();
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const set = (settings: Parameters<typeof actions.kids.update>[1]['settings']) => actions.kids.update(kid.id, { settings }).catch((e) => toast(errText(e)));
  return (
    <section className="card stack" style={{ ['--gap' as string]: '14px' }} aria-labelledby="kid-settings">
      <h2 id="kid-settings" className="h4">{fr ? `Réglages de ${kid.name}` : `${kid.name}’s settings`}</h2>
      <label className="field">
        <span className="label">{fr ? 'Temps de jeu par jour' : 'Daily play time'}</span>
        <div className="seg" role="radiogroup">
          {DAILY_LIMITS.map((m) => <button key={m} type="button" role="radio" aria-checked={kid.settings.dailyMinutes === m} className="seg-btn" data-on={kid.settings.dailyMinutes === m || undefined} onClick={() => void set({ dailyMinutes: m })}>{m} min</button>)}
        </div>
      </label>
      <div>
        <span className="label">{fr ? 'Jeux' : 'Games'}</span>
        <div className="stack" style={{ ['--gap' as string]: '6px', marginTop: 6 }}>
          {KID_GAMES.map((g) => (
            <label key={g} className="kid-toggle"><span>{KID_GAME_INFO[g].icon} {l(KID_GAME_INFO[g].name)}</span><input type="checkbox" role="switch" checked={kid.settings.games[g]} onChange={(e) => void set({ games: { [g]: e.target.checked } as Record<KidGame, boolean> })} /></label>
          ))}
          <label className="kid-toggle"><span>📡 {fr ? 'Jeux en direct avec un tuteur' : 'Live games with a tutor'}</span><input type="checkbox" role="switch" checked={kid.settings.liveGames} onChange={(e) => void set({ liveGames: e.target.checked })} /></label>
          <label className="kid-toggle"><span>🔗 {fr ? 'Jeux externes (Kahoot!, Quizlet, Wordwall, Blooket)' : 'Outside games (Kahoot!, Quizlet, Wordwall, Blooket)'}</span><input type="checkbox" role="switch" checked={kid.settings.externalGames} onChange={(e) => void set({ externalGames: e.target.checked })} /></label>
        </div>
        {kid.settings.externalGames && <p className="tiny muted" style={{ marginTop: 6 }}>{fr ? 'Ces jeux s’ouvrent sur un autre site, uniquement avec votre code. Ils ont leurs propres règles de confidentialité.' : 'These open on another website, only with your PIN. They have their own privacy rules.'}</p>}
      </div>
      <div className="row" style={{ ['--gap' as string]: '8px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => { setPin(''); setPinOpen(true); }}>{fr ? 'Changer le code' : 'Change PIN'}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm(fr ? `Supprimer le profil de ${kid.name} et sa progression ?` : `Remove ${kid.name}’s profile and progress?`)) void actions.kids.remove(kid.id).then(() => toast(fr ? 'Profil supprimé' : 'Profile removed')); }}>{fr ? 'Supprimer le profil' : 'Remove profile'}</button>
      </div>
      <Modal open={pinOpen} onClose={() => setPinOpen(false)} title={fr ? 'Nouveau code parent' : 'New parent PIN'} width={360}>
        <form className="stack" style={{ ['--gap' as string]: '12px' }} onSubmit={(e) => { e.preventDefault(); void actions.kids.update(kid.id, { pin }).then(() => { setPinOpen(false); toast(fr ? 'Code mis à jour' : 'PIN updated'); }).catch((err) => toast(errText(err))); }}>
          <input className="input" inputMode="numeric" type="password" autoFocus value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} aria-label="PIN" />
          <button className="btn btn-brand" disabled={pin.length !== 4}>{fr ? 'Enregistrer' : 'Save'}</button>
        </form>
      </Modal>
    </section>
  );
}

/* ======================= Child mode ======================= */

type Screen = { kind: 'home' } | { kind: 'world'; unit: KidUnit } | { kind: 'play'; unit: KidUnit; game: KidGame } | { kind: 'live'; code: string; playerId: string; unitId: string; practice: boolean };

export function KidModePage() {
  const { id } = useParams();
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const navigate = useNavigate();
  const { content, actions, user } = useStore();
  const toast = useToast();
  const kid = (content.kids ?? []).find((k) => k.id === id);
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const [gate, setGate] = useState<null | { reason: 'exit' } | { reason: 'external'; url: string }>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    document.title = kid ? `${kid.name} · La Porte Kids` : 'La Porte Kids';
  }, [kid]);

  // Screen-time heartbeat: one minute of play is logged each minute the tab is visible.
  const kidRef = useRef(kid);
  kidRef.current = kid;
  useEffect(() => {
    const t = window.setInterval(() => {
      const k = kidRef.current;
      if (k && document.visibilityState === 'visible') void actions.kids.logTime(k.id, 1).catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!kid)
    return (
      <div className="kid-mode"><div className="kid-shell kid-card-big"><p>{user.role !== 'learner' ? (fr ? 'Passez au rôle apprenant (parent) pour ouvrir un profil enfant.' : 'Switch to the learner (parent) role to open a child profile.') : fr ? 'Profil introuvable.' : 'Profile not found.'} <Link to="/app/kids">{fr ? 'Retour' : 'Back'}</Link></p></div></div>
    );

  const today = nowIso().slice(0, 10);
  const used = minutesToday(kid, today);
  const timeUp = used >= kid.settings.dailyMinutes;
  const progress = kidProgress(content, kid.id);
  const finish = (unit: KidUnit, game: KidGame | 'live') => (score: number, total: number) =>
    void actions.kids.record({ kidId: kid.id, unitId: unit.id, game, score, total }).catch((e) => toast(errText(e)));

  return (
    <div className="kid-mode">
      <div className="kid-shell">
        <header className="kid-top">
          {screen.kind !== 'home' ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setScreen(screen.kind === 'play' ? { kind: 'world', unit: screen.unit } : { kind: 'home' })}>← {fr ? 'Retour' : 'Back'}</button>
          ) : (
            <span className="kid-brand">La Porte <strong>Kids</strong></span>
          )}
          <span style={{ marginLeft: 'auto' }} />
          <span className="kid-time" title={fr ? 'Temps de jeu aujourd’hui' : 'Play time today'}>⏱ {Math.max(0, kid.settings.dailyMinutes - used)} min</span>
          <span className="kid-stars" aria-label={`${progress.totalStars} ★`}>★ {progress.totalStars}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setGate({ reason: 'exit' })}><Icon name="lock" size={14} /> {fr ? 'Parent' : 'Parent'}</button>
        </header>

        {timeUp ? (
          <section className="kid-card-big kid-timeup">
            <div className="kg-end-burst" aria-hidden>🌙</div>
            <h2 className="kid-h2" lang="fr">C’est fini pour aujourd’hui !</h2>
            <p>{fr ? `Tu as joué ${used} minutes. À demain, ${kid.name} !` : `You played for ${used} minutes. See you tomorrow, ${kid.name}!`}</p>
            <p className="tiny">{fr ? 'Un parent peut changer la limite dans La Porte Kids.' : 'A parent can change the limit in La Porte Kids.'}</p>
          </section>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={screen.kind + ('unit' in screen ? screen.unit.id : '') + ('game' in screen ? screen.game : '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring.settle} className="kid-screen">
              {screen.kind === 'home' && (
                <>
                  <section className="kid-hero">
                    <Avatar spec={avatarOf(kid)} size={92} expression="joy" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h1 className="kid-hello" lang="fr">Bonjour, {kid.name} !</h1>
                      <p>{fr ? 'Choisis un monde, joue et gagne des étoiles.' : 'Pick a world, play and win stars.'} {progress.badges > 0 && <span>· {'🏅'.repeat(progress.badges)}</span>}</p>
                    </div>
                    {kid.settings.liveGames && <button className="btn btn-brand kid-live-btn" onClick={() => setJoinOpen(true)}>📡 {fr ? 'Jeu en direct' : 'Live game'}</button>}
                  </section>
                  <section aria-label={fr ? 'Mondes' : 'Worlds'} className="kid-worlds">
                    {progress.units.map((u) => (
                      <motion.button key={u.unit.id} type="button" className="kid-world" style={{ background: u.unit.colour }} disabled={!u.unlocked} whileHover={u.unlocked ? { y: -4 } : undefined} whileTap={u.unlocked ? { scale: 0.97 } : undefined} onClick={() => setScreen({ kind: 'world', unit: u.unit })}>
                        <span className="kid-world-big" aria-hidden>{u.unlocked ? u.unit.emoji : '🔒'}</span>
                        <strong lang="fr">{u.unit.title.fr}</strong>
                        {!fr && <span className="tiny muted">{u.unit.title.en}</span>}
                        <span className="tiny">{u.unlocked ? `${u.stars}/12 ★` : fr ? 'Joue au monde d’avant pour l’ouvrir' : 'Play the world before to open it'}</span>
                        {u.badge && <span className="kid-world-badge" aria-label="badge">🏅</span>}
                      </motion.button>
                    ))}
                  </section>
                </>
              )}

              {screen.kind === 'world' && (
                <WorldScreen kid={kid} unit={screen.unit} games={progress.units.find((u) => u.unit.id === screen.unit.id)!.games} onPlay={(game) => setScreen({ kind: 'play', unit: screen.unit, game })}
                  onExternal={(url) => setGate({ reason: 'external', url })}
                  onPractice={() => { const r = liveClient.practice(user, screen.unit.id, kid.id, kid.nickname); setScreen({ kind: 'live', code: r.view.code, playerId: r.playerId, unitId: screen.unit.id, practice: true }); }} />
              )}

              {screen.kind === 'play' && (
                <section className="kid-card-big">
                  <h2 className="kid-h2"><span aria-hidden>{KID_GAME_INFO[screen.game].icon}</span> <span lang="fr">{l(KID_GAME_INFO[screen.game].name)}</span> · <span lang="fr">{screen.unit.title.fr}</span></h2>
                  {screen.game === 'quiz' && <QuizGame unit={screen.unit} onFinish={finish(screen.unit, 'quiz')} onExit={() => setScreen({ kind: 'world', unit: screen.unit })} />}
                  {screen.game === 'memory' && <MemoryGame unit={screen.unit} onFinish={finish(screen.unit, 'memory')} onExit={() => setScreen({ kind: 'world', unit: screen.unit })} />}
                  {screen.game === 'builder' && <BuilderGame unit={screen.unit} onFinish={finish(screen.unit, 'builder')} onExit={() => setScreen({ kind: 'world', unit: screen.unit })} />}
                  {screen.game === 'listen' && <ListenGame unit={screen.unit} onFinish={finish(screen.unit, 'listen')} onExit={() => setScreen({ kind: 'world', unit: screen.unit })} />}
                </section>
              )}

              {screen.kind === 'live' && (
                <LiveScreen code={screen.code} playerId={screen.playerId} practice={screen.practice}
                  onEnd={(score, total) => { const unit = KID_UNITS.find((u) => u.id === screen.unitId)!; finish(unit, 'live')(score, total); setScreen({ kind: 'home' }); }} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        <p className="kid-footnote">{fr ? 'Mode enfant : pas de messages, pas d’appels, pas de classement.' : 'Child mode: no messages, no calls, no leaderboard.'}</p>
      </div>

      <JoinLive open={joinOpen} kid={kid} onClose={() => setJoinOpen(false)} onJoined={(code, playerId, unitId) => { setJoinOpen(false); setScreen({ kind: 'live', code, playerId, unitId, practice: false }); }} />
      <PinGate kid={kid} gate={gate} onClose={() => setGate(null)} onOk={() => {
        if (gate?.reason === 'exit') navigate('/app/kids');
        else if (gate?.reason === 'external') window.open(gate.url, '_blank', 'noopener,noreferrer');
        setGate(null);
      }} />
    </div>
  );
}

function WorldScreen({ kid, unit, games, onPlay, onExternal, onPractice }: { kid: KidProfile; unit: KidUnit; games: Record<KidGame, number>; onPlay: (g: KidGame) => void; onExternal: (url: string) => void; onPractice: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content } = useStore();
  const external = kid.settings.externalGames ? (content.externalGames ?? []).filter((g) => g.unitId === unit.id) : [];
  return (
    <>
      <section className="kid-hero" style={{ background: unit.colour }}>
        <span className="kid-world-big" aria-hidden>{unit.emoji}</span>
        <div>
          <h1 className="kid-hello" lang="fr">{unit.title.fr}</h1>
          {!fr && <p className="tiny muted" style={{ margin: 0 }}>{unit.title.en}</p>}
          <p className="kid-words" lang="fr">{unit.words.map((x) => `${x.emoji} ${x.fr}`).join('  ·  ')}</p>
        </div>
      </section>
      <section className="kid-games" aria-label={fr ? 'Jeux' : 'Games'}>
        {KID_GAMES.filter((g) => kid.settings.games[g]).map((g) => (
          <motion.button key={g} type="button" className="kid-game" whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }} onClick={() => onPlay(g)}>
            <span className="kid-game-icon" aria-hidden>{KID_GAME_INFO[g].icon}</span>
            <strong lang="fr">{l(KID_GAME_INFO[g].name)}</strong>
            <span className="tiny">{l(KID_GAME_INFO[g].blurb)}</span>
            <Stars n={games[g]} size={18} />
          </motion.button>
        ))}
        {kid.settings.liveGames && (
          <motion.button type="button" className="kid-game kid-game-live" whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }} onClick={onPractice}>
            <span className="kid-game-icon" aria-hidden>🏁</span>
            <strong lang="fr">{fr ? 'Course entre amis' : 'Practice race'}</strong>
            <span className="tiny">{fr ? 'Un quiz en direct contre des joueurs d’entraînement.' : 'A live-style quiz against practice players.'}</span>
          </motion.button>
        )}
      </section>
      {external.length > 0 && (
        <section className="kid-card-big" aria-labelledby="ext-h">
          <h2 id="ext-h" className="kid-h2">🔗 {fr ? 'Jeux de ton tuteur' : 'Games from your tutor'}</h2>
          <p className="kid-sub">{fr ? 'Ils s’ouvrent sur un autre site. Demande à un parent !' : 'These open on another website. Ask a grown-up!'}</p>
          <div className="stack" style={{ ['--gap' as string]: '8px' }}>
            {external.map((g) => (
              <button key={g.id} type="button" className="kid-ext" onClick={() => onExternal(g.url)}>
                <span className="chip">{EXTERNAL_PROVIDERS[g.provider].name}</span> <span>{g.title}</span> <Icon name="lock" size={14} />
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function JoinLive({ open, kid, onClose, onJoined }: { open: boolean; kid: KidProfile; onClose: () => void; onJoined: (code: string, playerId: string, unitId: string) => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { user } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={fr ? 'Rejoindre un jeu en direct' : 'Join a live game'} width={380}>
      <form className="stack" style={{ ['--gap' as string]: '12px' }} onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        liveClient.join(user, code, kid.id, kid.nickname).then((r) => onJoined(r.view.code, r.playerId, r.view.unitId)).catch((err) => setError(errText(err))).finally(() => setBusy(false));
      }}>
        <p className="small">{fr ? 'Tape le code que ton tuteur montre à l’écran.' : 'Type the code your tutor shows on screen.'}</p>
        <input className="input kid-code-input" inputMode="numeric" autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" aria-label={fr ? 'Code du jeu' : 'Game code'} />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="button" className="kid-demo-code" onClick={() => { setCode(DEMO_GAME_CODE); setError(null); }}>
          {fr ? 'Démo : utilise le code' : 'Demo: use code'} <strong>{DEMO_GAME_CODE.slice(0, 3)} {DEMO_GAME_CODE.slice(3)}</strong>
        </button>
        <p className="tiny muted">{fr ? `Tu joueras sous le nom « ${kid.nickname} ».` : `You’ll play as “${kid.nickname}”.`}</p>
        <button className="btn btn-brand" disabled={code.length !== 6 || busy}>{fr ? 'Entrer' : 'Join'}</button>
      </form>
    </Modal>
  );
}

function LiveScreen({ code, playerId, practice, onEnd }: { code: string; playerId: string; practice: boolean; onEnd: (score: number, total: number) => void }) {
  const { lang } = useI18n();
  const { user } = useStore();
  const toast = useToast();
  const [view, setView] = useState<LiveGameView | null>(null);
  const poll = useCallback(() => liveClient.view(user, code, playerId).then(setView).catch(() => undefined), [user, code, playerId]);
  useEffect(() => {
    void poll();
    const t = window.setInterval(() => void poll(), 1000);
    return () => window.clearInterval(t);
  }, [poll]);
  if (!view) return <section className="kid-card-big"><p>{lang === 'fr' ? 'Connexion…' : 'Connecting…'}</p></section>;
  const correct = view.me ? Object.values(view.me.answers).filter((a) => a.correct).length : 0;
  return (
    <section className="kid-card-big">
      {(practice || isLocalGame(code)) && <span className="chip" style={{ marginBottom: 10 }}>{lang === 'fr' ? 'Entraînement · joueurs simulés' : 'Practice · simulated players'}</span>}
      <LivePlayerView view={view} onLeave={() => onEnd(correct, view.count)}
        onAnswer={(choice) => void liveClient.answer(user, code, playerId, view.index, choice).then(setView).catch((e) => toast(errText(e)))} />
    </section>
  );
}

function PinGate({ kid, gate, onClose, onOk }: { kid: KidProfile; gate: null | { reason: 'exit' } | { reason: 'external'; url: string }; onClose: () => void; onOk: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    setPin('');
    setError(false);
  }, [gate]);
  return (
    <Modal open={!!gate} onClose={onClose} title={fr ? 'Code parent' : 'Parent PIN'} width={360}>
      <form className="stack" style={{ ['--gap' as string]: '12px' }} onSubmit={(e) => { e.preventDefault(); if (pin === kid.pin) onOk(); else { setError(true); setPin(''); } }}>
        <p className="small">{gate?.reason === 'external' ? (fr ? 'Ce jeu s’ouvre sur un autre site. Entrez votre code pour l’autoriser.' : 'This game opens on another website. Enter your PIN to allow it.') : fr ? 'Entrez votre code pour quitter le mode enfant.' : 'Enter your PIN to leave child mode.'}</p>
        <input className="input" inputMode="numeric" type="password" autoFocus value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(false); }} aria-label={fr ? 'Code parent' : 'Parent PIN'} aria-invalid={error || undefined} />
        {error && <p className="field-error" role="alert">{fr ? 'Code incorrect.' : 'Wrong PIN.'}</p>}
        <button className="btn btn-brand" disabled={pin.length !== 4}>{gate?.reason === 'external' ? (fr ? 'Ouvrir le jeu' : 'Open the game') : fr ? 'Quitter le mode enfant' : 'Leave child mode'}</button>
      </form>
    </Modal>
  );
}
