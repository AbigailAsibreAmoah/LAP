import { COHORT_CAPACITY, COURSES, LEARNERS, leaderboard, levelFor, missedSessions, REWARD_LEVELS, TUTORS, weekOf, nowIso, type Cohort, type CefrLevel } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/3d/Portrait';
import { spring } from '../../components/animations/motion';
import { EmptyState, Tabs } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { TypedOnlyTextarea } from '../../components/ui/TypedOnly';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatDate, formatTime } from '../../utils/format';
import { PageHead } from '../learner/LearnerPages';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const person = (id: string) => LEARNERS.find((l) => l.id === id)!;

/* ======================= Community: leaderboard + classmates ======================= */

export function CommunityPage() {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [tab, setTab] = useState<'leaderboard' | 'classmates'>('leaderboard');
  return (
    <>
      <PageHead title={fr ? 'Communauté' : 'Community'} sub={fr ? 'Progressez ensemble : suivez vos camarades, échangez en français et grimpez au classement.' : 'Progress together: follow classmates, chat in French and climb the leaderboard.'} />
      <Tabs label={fr ? 'Communauté' : 'Community'} value={tab} onChange={setTab} options={[{ value: 'leaderboard', label: fr ? 'Classement' : 'Leaderboard' }, { value: 'classmates', label: fr ? 'Camarades' : 'Classmates' }]} />
      <div style={{ marginTop: 20 }}>{tab === 'leaderboard' ? <LeaderboardTab /> : <ClassmatesTab />}</div>
    </>
  );
}

function RewardsStrip() {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { points, content, learner, actions } = useStore();
  const toast = useToast();
  const { current, next, toNext } = levelFor(points);
  const pct = next ? Math.round(((points - current.min) / (next.min - current.min)) * 100) : 100;
  const tokens = content.tokens.filter((t) => t.learnerId === learner.id);
  return (
    <section className="card rewards-strip">
      <div className="rewards-level">
        <span className="level-badge" data-level={current.id}><Icon name="award" size={22} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row between">
            <strong>{fr ? 'Niveau' : 'Level'} {l(current.name)}</strong>
            <span className="num small" style={{ fontWeight: 700, color: 'var(--burgundy)' }}>{points} pts</span>
          </div>
          <div className="quest-track" aria-hidden><span style={{ width: `${pct}%` }} /></div>
          <span className="tiny muted">{next ? (fr ? `Encore ${toNext} points pour ${l(next.name)} : ${l(next.unlock!.label)}` : `${toNext} points to ${l(next.name)}: ${l(next.unlock!.label)}`) : fr ? 'Niveau maximal atteint' : 'Top level reached'}</span>
        </div>
      </div>
      <div className="rewards-ladder" aria-label={fr ? 'Récompenses par niveau' : 'Rewards by level'}>
        {REWARD_LEVELS.filter((x) => x.unlock).map((lv) => {
          const token = tokens.find((t) => t.levelId === lv.id);
          return (
            <div key={lv.id} className="reward-tile" data-state={token ? (token.redeemedAt ? 'used' : 'ready') : 'locked'}>
              <span className="tiny" style={{ fontWeight: 700 }}>{l(lv.name)} · {lv.min} pts</span>
              <span className="small">{l(lv.unlock!.label)}</span>
              {token && !token.redeemedAt && (token.kind === 'session-credit' ? (
                <button className="btn btn-brand btn-sm" onClick={() => actions.community.redeem(token.id).then(() => toast(fr ? 'Crédit ajouté à votre compte' : 'Credit added to your account')).catch((e) => toast(errorText(e)))}><span>{fr ? 'Utiliser' : 'Redeem'}</span></button>
              ) : (
                <Link to="/app/billing" className="btn btn-secondary btn-sm">{fr ? 'Au renouvellement' : 'Use at renewal'}</Link>
              ))}
              {token?.redeemedAt && <span className="tiny" style={{ color: 'var(--green)', fontWeight: 700 }}><Icon name="check" size={12} /> {fr ? 'Utilisé' : 'Used'}</span>}
              {!token && <span className="tiny muted"><Icon name="lock" size={12} /> {fr ? 'Verrouillé' : 'Locked'}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FollowButton({ id }: { id: string }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { content, learner, actions } = useStore();
  const toast = useToast();
  const on = content.follows.some((f) => f.followerId === learner.id && f.followeeId === id);
  if (id === learner.id) return null;
  return (
    <button type="button" className={`btn btn-sm ${on ? 'btn-secondary' : 'btn-ghost'}`} aria-pressed={on} onClick={() => actions.community.follow(id, !on).catch((e) => toast(errorText(e)))}>
      <Icon name={on ? 'check' : 'plus'} size={13} /> {on ? (fr ? 'Suivi' : 'Following') : fr ? 'Suivre' : 'Follow'}
    </button>
  );
}

function LeaderboardTab() {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { content, learner, actions } = useStore();
  const [period, setPeriod] = useState<'week' | 'all'>('week');
  const [scope, setScope] = useState<'everyone' | 'following' | 'group'>('everyone');
  const following = content.follows.filter((f) => f.followerId === learner.id).map((f) => f.followeeId);
  const group = content.cohorts.find((c) => c.memberIds.includes(learner.id));
  const ids = scope === 'following' ? [learner.id, ...following] : scope === 'group' ? group?.memberIds ?? [learner.id] : undefined;
  // "This week" = the previous four weeks of claims, so a fresh week still shows a meaningful race.
  const since = period === 'week' ? new Date(new Date(weekOf(nowIso())).getTime() - 21 * 86_400_000).toISOString() : undefined;
  const rows = leaderboard(content, { since, ids, viewerId: learner.id });
  const visible = !content.leaderboardOptOut.includes(learner.id);
  return (
    <div className="community-grid">
      <div className="stack" style={{ ['--gap' as string]: '16px', minWidth: 0 }}>
        <RewardsStrip />
        <section className="card" style={{ ['--pad' as string]: '18px 18px 8px' }}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <div className="status-filter" role="group" aria-label={fr ? 'Période' : 'Period'}>
              <button type="button" aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>{fr ? 'Ce mois-ci' : 'This month'}</button>
              <button type="button" aria-pressed={period === 'all'} onClick={() => setPeriod('all')}>{fr ? 'Depuis le début' : 'All time'}</button>
            </div>
            <div className="status-filter" role="group" aria-label={fr ? 'Qui' : 'Who'}>
              {([['everyone', fr ? 'Tout le monde' : 'Everyone'], ['following', fr ? 'Suivis' : 'Following'], ['group', fr ? 'Mon groupe' : 'My group']] as const).map(([v, label]) => (
                <button key={v} type="button" aria-pressed={scope === v} onClick={() => setScope(v)}>{label}</button>
              ))}
            </div>
          </div>
          <ol className="board">
            <AnimatePresence initial={false}>
              {rows.map((r) => {
                const p = person(r.learnerId);
                const me = r.learnerId === learner.id;
                return (
                  <motion.li key={r.learnerId} layout transition={spring.settle} data-me={me || undefined} data-top={r.rank <= 3 ? r.rank : undefined}>
                    <span className="board-rank num">{r.rank}</span>
                    <Avatar spec={p.portrait} size={36} />
                    <span className="board-name">
                      <strong>{me ? (fr ? 'Vous' : 'You') : p.name}</strong>
                      <span className="tiny muted">{p.city} · {p.level}</span>
                    </span>
                    <span className="board-points num">{r.points} <span className="tiny muted">pts</span></span>
                    <span className="board-action">{!me && <FollowButton id={r.learnerId} />}</span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
          {!rows.length && <EmptyState icon="users" title={fr ? 'Personne ici pour l’instant' : 'Nobody here yet'} />}
        </section>
      </div>
      <aside className="stack" style={{ ['--gap' as string]: '16px' }}>
        <section className="card">
          <h2 className="h4" style={{ marginBottom: 8 }}>{fr ? 'Comment gagner des points' : 'How to earn points'}</h2>
          <p className="small muted">{fr ? 'Les points récompensent les vraies actions d’apprentissage : régularité, quiz réussis, leçons terminées et exercices de votre tuteur. Récupérez-les sur votre tableau de bord.' : 'Points reward real learning: consistency, quizzes aced, lessons finished and practice from your tutor. Claim them from your dashboard.'}</p>
          <Link to="/app" className="link small" style={{ marginTop: 10 }}>{fr ? 'Objectifs de la semaine' : 'Weekly goals'} <Icon name="arrowRight" size={13} /></Link>
        </section>
        <section className="card">
          <h2 className="h4" style={{ marginBottom: 8 }}>{fr ? 'Confidentialité' : 'Privacy'}</h2>
          <label className="row small" style={{ ['--gap' as string]: '10px', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <input type="checkbox" checked={visible} onChange={(e) => void actions.community.setVisible(e.target.checked)} style={{ marginTop: 3 }} />
            <span>{fr ? 'Apparaître dans le classement des autres apprenants' : 'Show me on other learners’ leaderboard'}</span>
          </label>
          <p className="tiny muted" style={{ marginTop: 8 }}>{fr ? 'Seuls votre prénom, votre ville, votre niveau et vos points sont visibles.' : 'Only your name, city, level and points are shown.'}</p>
        </section>
      </aside>
    </div>
  );
}

function ClassmatesTab() {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content, learner, actions } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [writing, setWriting] = useState<string | null>(null);
  const group = content.cohorts.find((c) => c.memberIds.includes(learner.id));
  const others = LEARNERS.filter((x) => x.id !== learner.id)
    .filter((x) => !q.trim() || `${x.name} ${x.city}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(actions.community.isClassmate(b.id)) - Number(actions.community.isClassmate(a.id)) || Number(group?.memberIds.includes(b.id)) - Number(group?.memberIds.includes(a.id)));
  const followers = content.follows.filter((f) => f.followeeId === learner.id).length;
  const followingCount = content.follows.filter((f) => f.followerId === learner.id).length;
  return (
    <div className="stack" style={{ ['--gap' as string]: '16px' }}>
      <div className="row between">
        <label className="search-field" style={{ maxWidth: 360 }}><Icon name="search" size={16} /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={fr ? 'Rechercher un camarade' : 'Search classmates'} aria-label={fr ? 'Rechercher' : 'Search'} /></label>
        <span className="small muted"><strong className="num" style={{ color: 'var(--navy)' }}>{followingCount}</strong> {fr ? 'suivis' : 'following'} · <strong className="num" style={{ color: 'var(--navy)' }}>{followers}</strong> {fr ? 'abonnés' : 'followers'}</span>
      </div>
      <div className="media-grid">
        {others.map((x) => {
          const inGroup = group?.memberIds.includes(x.id);
          const canMessage = actions.community.canMessage(x.id);
          const followsYou = content.follows.some((f) => f.followerId === x.id && f.followeeId === learner.id);
          return (
            <article key={x.id} className="card classmate-card">
              <div className="row" style={{ ['--gap' as string]: '12px', flexWrap: 'nowrap' }}>
                <Avatar spec={x.portrait} size={46} />
                <div style={{ minWidth: 0 }}>
                  <strong className="clamp-1">{x.name}</strong>
                  <span className="tiny muted">{x.city} · {x.level}</span>
                </div>
              </div>
              <p className="small muted clamp-2" style={{ marginTop: 10 }}>{l(x.goal)}</p>
              <div className="row" style={{ ['--gap' as string]: '6px', marginTop: 8 }}>
                {inGroup ? <span className="chip chip-burgundy">{fr ? 'Votre groupe' : 'Your group'}</span> : actions.community.isClassmate(x.id) && <span className="chip chip-gold">{fr ? 'Camarade · même niveau' : 'Classmate · same level'}</span>}
                {followsYou && <span className="chip">{fr ? 'Vous suit' : 'Follows you'}</span>}
              </div>
              <div className="row" style={{ ['--gap' as string]: '6px', marginTop: 'auto', paddingTop: 12 }}>
                <FollowButton id={x.id} />
                <button type="button" className="btn btn-secondary btn-sm" disabled={!canMessage} title={canMessage ? undefined : fr ? 'Suivez cette personne pour lui écrire' : 'Follow to send a message'} onClick={() => setWriting(x.id)}>
                  <Icon name="message" size={13} /> {fr ? 'Écrire' : 'Message'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {writing && <MessageModal to={writing} onClose={() => setWriting(null)} onSent={(id) => navigate(`/app/messages?thread=${id}`)} />}
    </div>
  );
}

function MessageModal({ to, onClose, onSent }: { to: string; onClose: () => void; onSent: (threadId: string) => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { actions } = useStore();
  const [body, setBody] = useState('Bonjour ! ');
  const [error, setError] = useState<string | null>(null);
  const p = person(to);
  return (
    <Modal open onClose={onClose} title={`${fr ? 'Écrire à' : 'Message'} ${p.firstName}`} width={480}>
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        <p className="tiny muted">{fr ? 'Écrivez en français autant que possible. Les coordonnées (téléphone, e-mail, réseaux) ne peuvent pas être partagées.' : 'Write in French as much as you can. Contact details (phone, email, social) cannot be shared.'}</p>
        <textarea className="textarea" rows={4} lang="fr" value={body} onChange={(e) => setBody(e.target.value)} />
        {error && <p className="field-error" role="alert">{error === 'contact_details_blocked' ? l({ en: 'Contact details can’t be shared in messages.', fr: 'Les coordonnées ne peuvent pas être partagées.' }) : error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button>
          <button className="btn btn-brand" disabled={!body.trim()} onClick={() => actions.community.message(to, body.trim()).then(onSent).catch((e) => setError(e?.code ?? errorText(e)))}><span>{fr ? 'Envoyer' : 'Send'}</span></button>
        </div>
      </div>
    </Modal>
  );
}

/* ======================= Learner: My group ======================= */

export function MyGroupPage() {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content, learner, actions } = useStore();
  const toast = useToast();
  const group = content.cohorts.find((c) => c.memberIds.includes(learner.id));
  if (!group) {
    const open = content.cohorts.filter((c) => c.memberIds.length < COHORT_CAPACITY);
    return (
      <>
        <PageHead title={fr ? 'Mon groupe' : 'My group'} sub={fr ? `Petits groupes de ${COHORT_CAPACITY} apprenants maximum, avec un tuteur, en direct sur Google Meet.` : `Small groups of up to ${COHORT_CAPACITY} learners with one tutor, live on Google Meet.`} />
        <div className="media-grid">
          {open.map((c) => (
            <article key={c.id} className="card classmate-card">
              <strong>{l(c.name)}</strong>
              <span className="tiny muted">{l(c.schedule)}</span>
              <SeatMeter cohort={c} />
              <button className="btn btn-brand btn-sm" style={{ marginTop: 'auto' }} onClick={() => actions.community.join(c.id).then(() => toast(fr ? 'Bienvenue dans le groupe !' : 'Welcome to the group!')).catch((e) => toast(errorText(e)))}><span>{fr ? 'Rejoindre' : 'Join'}</span></button>
            </article>
          ))}
        </div>
      </>
    );
  }
  const tutor = TUTORS.find((t) => t.id === group.tutorId)!;
  const missed = missedSessions(group, learner.id, nowIso());
  const upcoming = group.sessions.filter((s) => s.start >= nowIso());
  return (
    <>
      <PageHead title={l(group.name)} sub={l(group.schedule)} />
      <div className="group-layout">
        <div className="stack" style={{ ['--gap' as string]: '16px', minWidth: 0 }}>
          {missed.length > 0 && (
            <div className="policy-note policy-note-warn">
              <Icon name="clock" size={18} />
              <span>
                {fr ? `Vous avez manqué « ${missed[missed.length - 1].topic} ». Les classes ne sont pas enregistrées : réservez un rattrapage individuel avant la prochaine séance.` : `You missed “${missed[missed.length - 1].topic}”. Group classes aren’t recorded: book a private catch-up before the next class.`}{' '}
                <Link className="link small" to={`/app/book?purpose=catch-up&session=${missed[missed.length - 1].id}&tutor=${group.tutorId}`}>{fr ? 'Réserver un rattrapage' : 'Book a catch-up'}</Link>
              </span>
            </div>
          )}
          <section className="card">
            <h2 className="h4" style={{ marginBottom: 4 }}>{fr ? 'Séances du groupe' : 'Group sessions'}</h2>
            <p className="tiny muted" style={{ marginBottom: 12 }}>{fr ? 'Les séances ne sont pas enregistrées. Absent ? Réservez un rattrapage individuel.' : 'Sessions are not recorded. Missed one? Book a one-to-one catch-up.'}</p>
            <ul className="session-list">
              {group.sessions.map((s) => {
                const past = s.start < nowIso();
                const was = s.attended?.includes(learner.id);
                return (
                  <li key={s.id}>
                    <span className="session-date"><strong className="num">{formatDate(s.start, lang, { day: 'numeric' })}</strong><span className="tiny">{formatDate(s.start, lang, { month: 'short' })}</span></span>
                    <span style={{ flex: 1, minWidth: 0 }}><strong lang="fr">{s.topic}</strong><span className="tiny muted">{formatTime(s.start, lang)} · {s.durationMin} min · Google Meet</span></span>
                    {!past ? <span className="content-status" data-status="draft">{fr ? 'À venir' : 'Upcoming'}</span>
                      : s.attended === null ? <span className="tiny muted">{fr ? 'Présence à confirmer' : 'Attendance pending'}</span>
                      : was ? <span className="content-status" data-status="published">{fr ? 'Présent' : 'Attended'}</span>
                      : <Link className="btn btn-secondary btn-sm" to={`/app/book?purpose=catch-up&session=${s.id}&tutor=${group.tutorId}`}>{fr ? 'Rattraper' : 'Catch up'}</Link>}
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="card">
            <h2 className="h4" style={{ marginBottom: 4 }}>{fr ? 'Devoirs de groupe' : 'Group assignments'}</h2>
            <p className="tiny muted" style={{ marginBottom: 12 }}>{fr ? 'Tout le groupe reçoit le même devoir ; votre tuteur lit toutes les réponses.' : 'The whole group gets the same task; your tutor reads every answer.'}</p>
            {group.assignments.length ? group.assignments.map((a) => <GroupAnswer key={a.id} cohort={group} id={a.id} />) : <p className="small muted">{fr ? 'Aucun devoir pour le moment.' : 'No assignments yet.'}</p>}
          </section>
        </div>
        <aside className="stack" style={{ ['--gap' as string]: '16px' }}>
          <section className="card">
            <div className="row" style={{ ['--gap' as string]: '12px', flexWrap: 'nowrap' }}>
              <Avatar spec={tutor.portrait} size={44} />
              <div><span className="tiny muted">{fr ? 'Votre tuteur' : 'Your tutor'}</span><strong style={{ display: 'block', color: 'var(--navy)' }}>{tutor.name}</strong></div>
            </div>
            {upcoming[0] && <p className="small" style={{ marginTop: 12 }}><Icon name="meet" size={14} /> {fr ? 'Prochaine séance' : 'Next class'}: <strong>{formatDate(upcoming[0].start, lang, { weekday: 'long', day: 'numeric', month: 'short' })} · {formatTime(upcoming[0].start, lang)}</strong></p>}
          </section>
          <section className="card">
            <div className="row between" style={{ marginBottom: 10 }}><h2 className="h4">{fr ? 'Membres' : 'Members'}</h2><SeatMeter cohort={group} compact /></div>
            <ul className="member-list">
              {group.memberIds.map((id) => {
                const p = person(id);
                return (
                  <li key={id}>
                    <Avatar spec={p.portrait} size={32} />
                    <span style={{ flex: 1, minWidth: 0 }}><strong className="clamp-1">{id === learner.id ? (fr ? 'Vous' : 'You') : p.name}</strong><span className="tiny muted">{p.city}</span></span>
                    {id !== learner.id && <FollowButton id={id} />}
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

function SeatMeter({ cohort, compact }: { cohort: Cohort; compact?: boolean }) {
  const { lang } = useI18n();
  const left = COHORT_CAPACITY - cohort.memberIds.length;
  return (
    <span className="seat-meter" aria-label={`${cohort.memberIds.length}/${COHORT_CAPACITY}`}>
      {Array.from({ length: COHORT_CAPACITY }, (_, i) => <span key={i} data-on={i < cohort.memberIds.length || undefined} />)}
      {!compact && <span className="tiny muted">{left ? (lang === 'fr' ? `${left} place(s) libre(s)` : `${left} seat(s) left`) : lang === 'fr' ? 'Complet' : 'Full'}</span>}
    </span>
  );
}

function GroupAnswer({ cohort, id }: { cohort: Cohort; id: string }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { learner, actions } = useStore();
  const toast = useToast();
  const a = cohort.assignments.find((x) => x.id === id)!;
  const mine = a.responses.find((r) => r.learnerId === learner.id);
  const [text, setText] = useState(mine?.text ?? '');
  return (
    <div className="group-task">
      <div className="row between"><strong lang="fr">{a.title}</strong>{a.dueOn && <span className="tiny muted">{fr ? 'Pour le' : 'Due'} {formatDate(a.dueOn, lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>}</div>
      <p className="small" style={{ color: 'var(--ink-2)', margin: '6px 0 10px' }}>{l(a.prompt)}</p>
      <TypedOnlyTextarea className="textarea" rows={3} lang="fr" value={text} onChange={(e) => setText(e.target.value)} aria-label={a.title} />
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-brand btn-sm" disabled={text.trim().split(/\s+/).length < 5 || text === mine?.text} onClick={() => actions.community.respond(cohort.id, a.id, text).then(() => toast(fr ? 'Réponse envoyée' : 'Answer sent')).catch((e) => toast(errorText(e)))}>
          <span>{mine ? (fr ? 'Mettre à jour' : 'Update') : fr ? 'Envoyer' : 'Send'}</span>
        </button>
      </div>
      {a.shareAnswers && (
        mine ? (
          a.responses.filter((r) => r.learnerId !== learner.id).length > 0 && (
            <div className="stack" style={{ ['--gap' as string]: '6px', marginTop: 10 }}>
              <span className="label">{fr ? 'Réponses du groupe' : 'Your group’s answers'}</span>
              {a.responses.filter((r) => r.learnerId !== learner.id).map((r) => {
                const who = LEARNERS.find((x) => x.id === r.learnerId);
                return (
                  <div key={r.learnerId} className="answer-row">
                    {who && <Avatar spec={who.portrait} size={26} />}
                    <div style={{ minWidth: 0, flex: 1 }}><span className="tiny" style={{ fontWeight: 700 }}>{who?.name}</span><p className="small" lang="fr">{r.text}</p></div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <p className="tiny muted" style={{ marginTop: 8 }}>{fr ? 'Envoyez votre réponse pour voir celles du groupe.' : 'Send your answer to see your group’s answers.'}</p>
        )
      )}
    </div>
  );
}

/* ======================= Staff: Groups ======================= */

export function GroupsPage() {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content, user } = useStore();
  const mine = user.role === 'admin' ? content.cohorts : content.cohorts.filter((c) => c.tutorId === user.id);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(mine[0]?.id ?? null);
  return (
    <>
      <PageHead title={fr ? 'Groupes' : 'Groups'} sub={fr ? `Petits groupes de ${COHORT_CAPACITY} apprenants maximum : présences, séances et devoirs de groupe.` : `Small groups of up to ${COHORT_CAPACITY}: attendance, sessions and group assignments.`}>
        {user.role === 'admin' && <button className="btn btn-brand btn-sm" onClick={() => setCreating(true)}><Icon name="plus" size={15} /> <span>{fr ? 'Nouveau groupe' : 'New group'}</span></button>}
      </PageHead>
      <div className="stack" style={{ ['--gap' as string]: '12px', maxWidth: 980 }}>
        {mine.map((c) => (
          <article key={c.id} className="card block-card" data-open={openId === c.id || undefined}>
            <button type="button" className="practice-head" style={{ padding: '16px 18px' }} onClick={() => setOpenId(openId === c.id ? null : c.id)} aria-expanded={openId === c.id}>
              <span style={{ minWidth: 0 }}><strong>{l(c.name)}</strong><span className="tiny muted">{l(c.schedule)} · {TUTORS.find((t) => t.id === c.tutorId)?.name}</span></span>
              <span className="row" style={{ ['--gap' as string]: '10px', flexWrap: 'nowrap' }}><SeatMeter cohort={c} compact /><Icon name="chevronDown" size={16} className={openId === c.id ? 'rot-180' : undefined} /></span>
            </button>
            <AnimatePresence initial={false}>
              {openId === c.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="block-body"><GroupManager cohort={c} /></div>
                </motion.div>
              )}
            </AnimatePresence>
          </article>
        ))}
        {!mine.length && <div className="card"><EmptyState icon="users" title={fr ? 'Aucun groupe' : 'No groups yet'} /></div>}
      </div>
      {creating && <NewGroupModal onClose={() => setCreating(false)} />}
    </>
  );
}

function GroupManager({ cohort }: { cohort: Cohort }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { actions } = useStore();
  const toast = useToast();
  const [start, setStart] = useState(() => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 11) + '18:00');
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState({ en: '', fr: '' });
  const run = (p: Promise<unknown>, ok: string) => p.then(() => toast(ok)).catch((e) => toast(errorText(e)));
  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <div>
        <h3 className="label" style={{ marginBottom: 8 }}>{fr ? 'Séances et présences' : 'Sessions and attendance'}</h3>
        <ul className="session-list">
          {cohort.sessions.map((s) => {
            const past = s.start < nowIso();
            return (
              <li key={s.id} style={{ flexWrap: 'wrap' }}>
                <span className="session-date"><strong className="num">{formatDate(s.start, lang, { day: 'numeric' })}</strong><span className="tiny">{formatDate(s.start, lang, { month: 'short' })}</span></span>
                <span style={{ flex: '1 1 180px', minWidth: 0 }}><strong lang="fr">{s.topic}</strong><span className="tiny muted">{formatTime(s.start, lang)} · {s.durationMin} min</span></span>
                {past ? (
                  <span className="row" style={{ ['--gap' as string]: '6px' }}>
                    {cohort.memberIds.map((id) => {
                      const on = s.attended?.includes(id) ?? false;
                      return (
                        <button key={id} type="button" className={`chip ${on ? 'chip-burgundy' : 'chip-outline'}`} style={{ cursor: 'pointer', minHeight: 30 }} aria-pressed={on}
                          onClick={() => run(actions.community.takeAttendance(cohort.id, s.id, on ? (s.attended ?? []).filter((x) => x !== id) : [...(s.attended ?? []), id]), fr ? 'Présence enregistrée' : 'Attendance saved')}>
                          {on && <Icon name="check" size={12} />} {person(id).firstName}
                        </button>
                      );
                    })}
                  </span>
                ) : (
                  <span className="content-status" data-status="draft">{fr ? 'À venir' : 'Upcoming'}</span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="row" style={{ ['--gap' as string]: '8px', marginTop: 10 }}>
          <input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={{ width: 'auto' }} aria-label={fr ? 'Date et heure (GMT)' : 'Date and time (GMT)'} />
          <input className="input" lang="fr" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={fr ? 'Thème de la séance' : 'Session topic'} style={{ flex: '1 1 200px' }} />
          <button className="btn btn-secondary btn-sm" disabled={topic.trim().length < 2} onClick={() => run(actions.community.scheduleSession(cohort.id, { start: `${start}:00Z`, durationMin: 60, topic }), fr ? 'Séance planifiée' : 'Session scheduled').then(() => setTopic(''))}>{fr ? 'Planifier' : 'Schedule'}</button>
        </div>
      </div>
      <div>
        <h3 className="label" style={{ marginBottom: 8 }}>{fr ? 'Devoirs de groupe et réponses' : 'Group assignments and answers'}</h3>
        {cohort.assignments.map((a) => (
          <div key={a.id} className="group-task">
            <div className="row between" style={{ flexWrap: 'nowrap', ['--gap' as string]: '10px' }}>
              <strong lang="fr">{a.title}</strong>
              <label className="row tiny" style={{ ['--gap' as string]: '6px', flexWrap: 'nowrap', cursor: 'pointer' }} title={fr ? 'Les membres voient les réponses des autres après avoir envoyé la leur.' : 'Members see each other’s answers after sending their own.'}>
                <input type="checkbox" checked={!!a.shareAnswers} onChange={(e) => void run(actions.community.shareAnswers(cohort.id, a.id, e.target.checked), e.target.checked ? (fr ? 'Réponses partagées avec le groupe' : 'Answers shared with the group') : fr ? 'Réponses visibles par vous seul' : 'Answers visible to you only')} />
                <span>{fr ? 'Partager les réponses avec le groupe' : 'Share answers with the group'}</span>
              </label>
            </div>
            <p className="small muted" style={{ margin: '4px 0 10px' }}>{l(a.prompt)}</p>
            {cohort.memberIds.map((id) => {
              const r = a.responses.find((x) => x.learnerId === id);
              return (
                <div key={id} className="answer-row">
                  <Avatar spec={person(id).portrait} size={26} />
                  <div style={{ minWidth: 0, flex: 1 }}><span className="tiny" style={{ fontWeight: 700 }}>{person(id).name}</span>{r ? <p className="small" lang="fr">{r.text}</p> : <p className="tiny muted">{fr ? 'Pas encore répondu' : 'No answer yet'}</p>}</div>
                </div>
              );
            })}
          </div>
        ))}
        <div className="stack" style={{ ['--gap' as string]: '8px', marginTop: 10 }}>
          <input className="input" lang="fr" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={fr ? 'Titre du devoir (FR)' : 'Assignment title (FR)'} />
          <div className="form-grid">
            <textarea className="textarea" rows={2} value={prompt.en} onChange={(e) => setPrompt({ ...prompt, en: e.target.value })} placeholder="Instructions (EN)" />
            <textarea className="textarea" rows={2} lang="fr" value={prompt.fr} onChange={(e) => setPrompt({ ...prompt, fr: e.target.value })} placeholder="Consigne (FR)" />
          </div>
          <button className="btn btn-brand btn-sm" style={{ alignSelf: 'flex-end' }} disabled={!title.trim() || !prompt.en.trim()} onClick={() => run(actions.community.postAssignment(cohort.id, { title, prompt }), fr ? 'Devoir publié pour le groupe' : 'Assignment posted to the group').then(() => { setTitle(''); setPrompt({ en: '', fr: '' }); })}>
            <span>{fr ? 'Publier pour le groupe' : 'Post to the group'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function NewGroupModal({ onClose }: { onClose: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { actions } = useStore();
  const toast = useToast();
  const [courseId, setCourseId] = useState(COURSES[0].id);
  const [tutorId, setTutorId] = useState(COURSES[0].tutorId);
  const [level, setLevel] = useState<CefrLevel>('A2');
  const [name, setName] = useState({ en: '', fr: '' });
  const [schedule, setSchedule] = useState({ en: '', fr: '' });
  return (
    <Modal open onClose={onClose} title={fr ? 'Nouveau groupe' : 'New group'} width={560}>
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        <div className="form-grid form-grid-3">
          <label className="field"><span className="label">{fr ? 'Cours' : 'Course'}</span><select className="select" value={courseId} onChange={(e) => { setCourseId(e.target.value); setTutorId(COURSES.find((c) => c.id === e.target.value)!.tutorId); }}>{COURSES.map((c) => <option key={c.id} value={c.id}>{l(c.title)}</option>)}</select></label>
          <label className="field"><span className="label">{fr ? 'Tuteur' : 'Tutor'}</span><select className="select" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>{TUTORS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className="field"><span className="label">{fr ? 'Niveau' : 'Level'}</span><select className="select" value={level} onChange={(e) => setLevel(e.target.value as CefrLevel)}>{(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((v) => <option key={v}>{v}</option>)}</select></label>
        </div>
        <div className="form-grid">
          <input className="input" value={name.en} onChange={(e) => setName({ ...name, en: e.target.value })} placeholder="Name (EN)" />
          <input className="input" lang="fr" value={name.fr} onChange={(e) => setName({ ...name, fr: e.target.value })} placeholder="Nom (FR)" />
          <input className="input" value={schedule.en} onChange={(e) => setSchedule({ ...schedule, en: e.target.value })} placeholder="Schedule (EN), e.g. Mondays 18:00 GMT" />
          <input className="input" lang="fr" value={schedule.fr} onChange={(e) => setSchedule({ ...schedule, fr: e.target.value })} placeholder="Horaire (FR)" />
        </div>
        <p className="tiny muted">{fr ? `Les apprenants rejoignent eux-mêmes, jusqu’à ${COHORT_CAPACITY} par groupe.` : `Learners join themselves, up to ${COHORT_CAPACITY} per group.`}</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button>
          <button className="btn btn-brand" disabled={!name.en.trim() || !schedule.en.trim()} onClick={() => actions.community.createCohort({ name: { en: name.en, fr: name.fr || name.en }, courseId, tutorId, level, schedule: { en: schedule.en, fr: schedule.fr || schedule.en } }).then(() => { toast(fr ? 'Groupe créé' : 'Group created'); onClose(); }).catch((e) => toast(errorText(e)))}>
            <span>{fr ? 'Créer' : 'Create'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
