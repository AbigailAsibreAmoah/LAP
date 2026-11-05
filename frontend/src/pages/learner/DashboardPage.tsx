import { COURSES, leaderboard, LEARNER_WEEKLY_MINUTES, levelFor, missedSessions, phraseOfDay, sessionCost, SPEAKING_SCENARIOS, TUTORS, type CefrLevel, type LessonKind, type QuestId } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/3d/Portrait';
import { ProgressRing } from '../../components/3d/Depth';
import { AnimatedBar, CountUp } from '../../components/animations/Reveal';
import { fadeUp, spring, stagger } from '../../components/animations/motion';
import { BarChart } from '../../components/charts/Charts';
import { DemoTag, Hint } from '../../components/ui/Controls';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toasts';
import { speakFrench } from '../../utils/speech';
import { HeroBuddy } from '../../features/showcase/HeroBuddy';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore, type AppStore } from '../../state/AppStore';
import { nowIso, formatClip, formatDate, formatTime, isUpcoming, relativeDay } from '../../utils/format';

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const RESUME_LESSON = 'les-b5';
const RESUME_COURSE = 'crs-business';

type Tone = 'burgundy' | 'gold' | 'navy' | 'green' | 'sky';
type PlanItem = { id: string; icon: IconName; tone?: 'urgent' | 'done'; title: string; meta: string; to?: string; cta?: string };

const KIND_ICON: Record<LessonKind, IconName> = { video: 'video', reading: 'book', quiz: 'quiz', speaking: 'mic', assignment: 'edit', live: 'meet' };

/**
 * Builds today's ordered plan from what the demo state actually contains:
 * sessions, submissions, milestones, credits, scenarios, vocabulary and unread notices.
 */
function buildPlan(store: AppStore, lang: 'en' | 'fr', t: ReturnType<typeof useI18n>['t']): PlanItem[] {
  const fr = lang === 'fr';
  const { learner, bookings, submissions, completedScenarios, vocabulary, notifications } = store;
  const urgent: PlanItem[] = [];
  const rest: PlanItem[] = [];

  const next = bookings
    .filter((b) => b.learnerId === learner.id && b.status === 'confirmed' && isUpcoming(b.start))
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  if (next) {
    const tutor = TUTORS.find((tu) => tu.id === next.tutorId)!;
    const hours = (new Date(next.start).getTime() - new Date(nowIso()).getTime()) / 3_600_000;
    const item: PlanItem = {
      id: 'session',
      icon: 'calendar',
      title: fr ? `Préparer votre séance avec ${tutor.name}` : `Prepare for your session with ${tutor.name}`,
      meta: `${relativeDay(next.start, lang, t)} · ${formatTime(next.start, lang)} · ${next.topic}`,
      to: '/app/messages',
      cta: fr ? 'Voir les consignes' : 'See the brief',
    };
    (hours <= 30 ? urgent : rest).push(hours <= 30 ? { ...item, tone: 'urgent' } : item);
  } else {
    rest.push({ id: 'book', icon: 'calendar', title: fr ? 'Réserver une séance de conversation' : 'Book a conversation session', meta: `${learner.credits} ${t('dash.credits').toLowerCase()}`, to: '/app/book', cta: t('app.book') });
  }

  if (!submissions[RESUME_LESSON]) {
    urgent.push({ id: 'assignment', icon: 'edit', tone: 'urgent', title: t('dash.assignmentDue'), meta: 'Exprimer son accord ou son désaccord · ≥ 10 ' + t('lesson.words'), to: `/app/learn/${RESUME_LESSON}?course=${RESUME_COURSE}#assignment`, cta: fr ? 'Rédiger' : 'Write it' });
  } else {
    rest.push({ id: 'assignment', icon: 'checkCircle', tone: 'done', title: t('dash.assignmentDone'), meta: 'Exprimer son accord ou son désaccord' });
  }

  if (learner.credits < 1) urgent.push({ id: 'credits', icon: 'card', tone: 'urgent', title: t('dash.noCredits'), meta: fr ? 'Les séances privées nécessitent un crédit.' : 'Private sessions need one credit each.', to: '/app/billing', cta: t('book.getCredits') });
  else if (learner.credits === 1) rest.push({ id: 'credits', icon: 'card', title: t('dash.lowCredits').replace('{n}', '1'), meta: fr ? 'Pensez à recharger avant votre prochaine réservation.' : 'Top up before your next booking.', to: '/app/billing', cta: t('book.getCredits') });

  const scenario = SPEAKING_SCENARIOS.find((s) => s.id === 'sc-meeting' && !completedScenarios.includes(s.id)) ?? SPEAKING_SCENARIOS.find((s) => !completedScenarios.includes(s.id));
  if (scenario) rest.push({ id: 'studio', icon: 'mic', title: `${fr ? 'S’entraîner : ' : 'Practise: '}${scenario.title[lang]}`, meta: `Speaking Studio · ${scenario.level} · 10 ${t('common.min')}`, to: `/app/studio?scenario=${scenario.id}`, cta: fr ? 'Commencer' : 'Start' });

  const learning = vocabulary.filter((v) => !v.mastered).length;
  if (learning > 0) rest.push({ id: 'vocab', icon: 'words', title: fr ? `Réviser ${learning} expressions en cours` : `Review ${learning} phrases you are still learning`, meta: t('app.vocabulary'), to: '/app/vocabulary', cta: fr ? 'Réviser' : 'Review' });

  const assigned = store.content.assignments.filter((a) => a.learnerId === learner.id && a.status === 'assigned');
  for (const a of assigned) {
    const pack = store.content.packs.find((p) => p.id === a.packId);
    const tutor = TUTORS.find((tu) => tu.id === a.tutorId);
    if (!pack) continue;
    const dueSoon = a.dueOn ? (new Date(a.dueOn).getTime() - new Date(nowIso()).getTime()) / 86_400_000 <= 1.5 : false;
    const item: PlanItem = { id: `practice-${a.id}`, icon: 'users', title: `${fr ? 'Préparer : ' : 'Prepare: '}${pack.title[lang]}`, meta: `${fr ? 'De' : 'From'} ${tutor?.name ?? ''}${a.dueOn ? ` · ${relativeDay(a.dueOn + 'T09:00:00Z', lang, t)}` : ''}`, to: '/app/practice', cta: fr ? 'Ouvrir' : 'Open' };
    (dueSoon ? urgent : rest).push(dueSoon ? { ...item, tone: 'urgent' } : item);
  }
  // Group classes are not recorded: a missed class becomes a catch-up to book.
  const group = store.content.cohorts.find((g) => g.memberIds.includes(learner.id));
  const missed = group ? missedSessions(group, learner.id, nowIso()) : [];
  const lastMissed = missed[missed.length - 1];
  if (group && lastMissed)
    urgent.push({ id: 'catch-up', icon: 'clock', tone: 'urgent', title: fr ? 'Rattraper la classe manquée' : 'Catch up on the class you missed', meta: `${lastMissed.topic} · ${fr ? 'pas d’enregistrement, séance individuelle' : 'no recording, private session'}`, to: `/app/book?purpose=catch-up&session=${lastMissed.id}&tutor=${group.tutorId}`, cta: fr ? 'Réserver' : 'Book' });
  if (sessionCost(store.bookings, learner.id, 'conversation').freeIntro)
    rest.unshift({ id: 'free-intro', icon: 'mic', title: fr ? 'Votre conversation individuelle offerte' : 'Your free one-on-one conversation', meta: fr ? 'Avec un tuteur, en français, avec corrections en direct' : 'With a tutor, in French, with live corrections', to: '/app/book?purpose=conversation', cta: fr ? 'Réserver' : 'Book' });
  if (!store.content.placements.some((pl) => pl.learnerId === learner.id))
    rest.unshift({ id: 'placement', icon: 'award', title: fr ? 'Passer le test de positionnement' : 'Take the placement test', meta: fr ? '15 min · votre niveau et un programme personnel' : '15 min · your level and a personal plan', to: '/app/placement', cta: fr ? 'Commencer' : 'Start' });

  const unread = notifications.filter((n) => !n.read).length;
  if (unread > 0) rest.push({ id: 'unread', icon: 'bell', title: `${unread} ${t('dash.unread')}`, meta: notifications.find((n) => !n.read)!.title[lang], to: '/app/notifications', cta: fr ? 'Lire' : 'Read' });

  return [...urgent, ...rest].slice(0, 5);
}

/** Greeting stays in French in both interface languages: a small daily dose of the language. */
function frenchGreeting(hour: number) {
  return hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
}

/** Sunday → Thursday around the demo "today", as in a compact weekly planner. */
function weekDays() {
  const today = new Date(nowIso());
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - today.getUTCDay());
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function DashboardPage() {
  const { t, l, lang } = useI18n();
  const fr = lang === 'fr';
  const store = useStore();
  const { learner, bookings, milestones, submissions, completedScenarios } = store;
  const upcoming = bookings
    .filter((b) => b.learnerId === learner.id && b.status === 'confirmed' && isUpcoming(b.start))
    .sort((a, b) => a.start.localeCompare(b.start));
  const next = upcoming[0];
  const nextTutor = next && TUTORS.find((tu) => tu.id === next.tutorId)!;
  const canDo = milestones.filter((m) => m.status === 'completed');
  const inProgress = milestones.find((m) => m.status === 'in-progress');
  const upNext = milestones.find((m) => m.status === 'upcoming');
  const nextLevel = LEVELS[LEVELS.indexOf(learner.level) + 1] ?? learner.level;
  const remaining = milestones.filter((m) => m.status !== 'completed' && m.level <= nextLevel).length;
  const lessonDoc = store.content.lessons.find((x) => x.id === RESUME_LESSON);
  const lesson = { title: lessonDoc?.title ?? 'Exprimer son accord ou son désaccord', objective: lessonDoc?.objective ?? { en: '', fr: '' }, minutes: lessonDoc?.minutes ?? 25 };
  const published = new Set(store.content.lessons.filter((x) => x.status === 'published').map((x) => x.id));
  const lastFeedback = store.content.assignments.filter((a) => a.learnerId === learner.id && a.status === 'reviewed').sort((a, b) => (b.reviewedAt ?? '').localeCompare(a.reviewedAt ?? ''))[0];
  const feedbackTutor = TUTORS.find((tu) => tu.id === lastFeedback?.tutorId) ?? TUTORS[0];
  const quests = [...store.quests].sort((a, b) => Number(b.done && !b.claimed) - Number(a.done && !a.claimed) || Number(a.claimed) - Number(b.claimed)).slice(0, 3);
  // The hero buddy cheers each time a reward is claimed.
  const [cheer, setCheer] = useState(0);
  const board = leaderboard(store.content, { viewerId: learner.id });
  const myRank = board.find((r) => r.learnerId === learner.id);
  const claim = (id: QuestId) => store.actions.content.claimQuest(id).then(() => { toast(fr ? 'Récompense ajoutée' : 'Reward claimed'); setCheer((n) => n + 1); }).catch((e) => toast(e instanceof Error ? e.message : String(e)));
  const course = COURSES.find((c) => c.id === RESUME_COURSE)!;
  const plan = buildPlan(store, lang, t);

  const toast = useToast();
  const phrase = phraseOfDay(nowIso().slice(0, 10));
  const level = levelFor(store.points);
  const weekTotal = LEARNER_WEEKLY_MINUTES.reduce((n, d) => n + d.value, 0);
  const best = LEARNER_WEEKLY_MINUTES.reduce((a, b) => (b.value > a.value ? b : a));

  // Continue learning: the current lesson and the two that follow it in the course.
  const courseLessons = course.modules.flatMap((m) => m.lessons.map((x) => ({ ...x, module: l(m.title) })));
  const at = courseLessons.findIndex((x) => x.id === RESUME_LESSON);
  const thumbs = ['/images/lesson-tutor-video.jpg', '/images/lesson-tutor-business.jpg', '/images/lesson-tutor-explain.jpg'];
  const tiles = courseLessons.slice(at, at + 3);

  // Week planner, built from real bookings and today's due work.
  const days = weekDays();
  const todayKey = nowIso().slice(0, 10);
  const [day, setDay] = useState(todayKey);
  type Ev = { id: string; icon: IconName; tone: Tone; title: string; meta: string; to: string; fr?: boolean };
  const eventsFor = (key: string): Ev[] => {
    const list: Ev[] = bookings
      .filter((b) => b.learnerId === learner.id && b.status !== 'cancelled' && b.start.slice(0, 10) === key)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((b) => {
        const tu = TUTORS.find((x) => x.id === b.tutorId)!;
        const live = b.kind === 'group';
        return {
          id: b.id,
          icon: live ? 'meet' : 'video',
          tone: b.status === 'completed' ? 'green' : live ? 'navy' : 'burgundy',
          title: b.topic,
          meta: `${formatTime(b.start, lang)} · ${tu.name} · ${b.durationMin} ${t('common.min')}${b.status === 'completed' ? (fr ? ' · terminée' : ' · done') : ''}`,
          to: '/app/lessons',
          fr: true,
        };
      });
    if (key === todayKey) {
      if (!submissions[RESUME_LESSON]) list.push({ id: 'hw', icon: 'edit', tone: 'gold', title: fr ? 'Devoir écrit à rendre' : 'Writing assignment due', meta: fr ? 'Répondre poliment à un collègue · 4–6 phrases' : 'Reply politely to a colleague · 4–6 sentences', to: `/app/learn/${RESUME_LESSON}?course=${RESUME_COURSE}#assignment` });
      if (!completedScenarios.includes('sc-meeting')) list.push({ id: 'studio', icon: 'mic', tone: 'sky', title: 'Speaking Studio', meta: fr ? 'Jeu de rôle : une réunion de travail' : 'Role-play: a business meeting', to: '/app/studio?scenario=sc-meeting' });
      list.push({ id: 'vocab', icon: 'words', tone: 'green', title: fr ? 'Sprint de vocabulaire' : 'Vocabulary sprint', meta: fr ? 'Expressions pour la réunion' : 'Meeting expressions', to: '/app/vocabulary' });
    }
    return list;
  };
  const events = eventsFor(day);

  return (
    <motion.div initial="hidden" animate="show" variants={stagger(0.06)} className="dash-layout">
      <motion.div className="dash-main" variants={stagger(0.06)}>
        {/* Hero: resume the single most useful thing to do */}
        <motion.section variants={fadeUp} className="dash-hero" aria-labelledby="hero-h">
          <div className="dash-hero-copy">
            <div className="row" style={{ ['--gap' as string]: '8px', marginBottom: 14 }}>
              <span className="chip chip-burgundy">{formatDate(nowIso(), lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <DemoTag>{t('demo.data')}</DemoTag>
            </div>
            <p className="small" style={{ fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
              <span lang="fr">{frenchGreeting(new Date().getHours())}, {learner.firstName}</span> · {t('dash.resume').toLowerCase()}
            </p>
            <h1 id="hero-h" lang="fr">
              {lesson.title.split(' ').slice(0, -1).join(' ')} <em>{lesson.title.split(' ').slice(-1)}</em>
            </h1>
            <p className="small muted" style={{ marginTop: 10 }}>
              {l(lesson.objective)} {l(course.title)} · A2 · Module 2.
            </p>
            <div className="row tiny" style={{ ['--gap' as string]: '8px 18px', marginTop: 14, color: 'var(--ink-2)', fontWeight: 600 }}>
              <span className="row" style={{ ['--gap' as string]: '6px' }}><Icon name="clock" size={14} /> {lesson.minutes} {t('common.min')}</span>
              <span className="row" style={{ ['--gap' as string]: '6px' }}><Icon name="book" size={14} /> {t('lesson.dialogue')} · {t('lesson.quiz')} · {t('lesson.assignment')}</span>
            </div>
            <div className="row" style={{ marginTop: 22 }}>
              <Link to={`/app/learn/${RESUME_LESSON}?course=${RESUME_COURSE}`} className="btn btn-brand">
                <span>{t('dash.continue')}</span> <Icon name="arrowRight" size={16} />
              </Link>
              <Link to="/app/studio?scenario=sc-meeting" className="btn btn-secondary">
                <Icon name="mic" size={16} /> {t('app.studio')}
              </Link>
            </div>
          </div>
          <div className="dash-hero-art">
            <motion.span className="hero-arch" aria-hidden initial={{ opacity: 0, scaleY: 0.6 }} animate={{ opacity: 1, scaleY: 1 }} transition={{ ...spring.settle, delay: 0.1 }} />
            <span className="hero-student-float">
              <HeroBuddy firstName={learner.firstName} rank={myRank?.rank ?? board.length} of={board.length} points={store.points} level={l(level.current.name)} cheer={cheer} />
            </span>
          </div>
        </motion.section>

        {/* Headline numbers */}
        <div className="stat-grid">
          <motion.section variants={fadeUp} className="card stat-card" style={{ ['--tint' as string]: 'var(--burgundy-100)', ['--tone' as string]: 'var(--burgundy)' }}>
            <span className="stat-icon"><Icon name="book" size={19} /></span>
            <p className="stat-card-label">{t('dash.lessonsDone')}</p>
            <p className="stat-card-value num">
              <CountUp value={learner.lessonsCompleted} />/{learner.lessonsTotal} <small>{fr ? 'leçons' : 'lessons'}</small>
            </p>
          </motion.section>
          <motion.section variants={fadeUp} className="card stat-card" style={{ ['--tint' as string]: 'var(--gold-100)', ['--tone' as string]: 'var(--gold)' }}>
            <span className="stat-icon"><Icon name="flame" size={19} /></span>
            <p className="stat-card-label">{t('dash.streak')}</p>
            <p className="stat-card-value num">
              <CountUp value={learner.streakDays} /> <small>{t('dash.days')} · {learner.credits} {t('dash.credits').toLowerCase()}</small>
            </p>
          </motion.section>
          <motion.section variants={fadeUp} className="card stat-card stat-ring" aria-label={`${learner.progressToNext}% ${t('dash.toB1')}`}>
            <ProgressRing value={learner.progressToNext} size={112} label={`${learner.progressToNext}%`} sub={`${learner.level} → ${nextLevel}`} />
          </motion.section>
        </div>

        {/* Continue learning */}
        <motion.section variants={fadeUp} className="card" aria-labelledby="cont-h">
          <div className="card-head">
            <h2 id="cont-h">{t('dash.continue')}</h2>
            <Link to={`/app/courses/${RESUME_COURSE}`} className="pill-link">{fr ? 'Tout voir' : 'View all'}</Link>
          </div>
          <div className="lesson-tiles">
            {tiles.map((x, i) => (
              <Link key={x.id} to={`/app/learn/${x.id}?course=${RESUME_COURSE}`} className="lesson-tile">
                <div className="lesson-thumb">
                  <img src={thumbs[i]} alt="" loading="lazy" width={976} height={688} className="lesson-scene" />
                  <span className={`chip lesson-state ${i === 0 ? 'chip-burgundy' : ''}`}>{i === 0 ? (fr ? 'En cours' : 'In progress') : !published.has(x.id) ? (fr ? 'Bientôt' : 'Coming soon') : fr ? 'Ensuite' : 'Up next'}</span>
                  <div className="lesson-play"><span><Icon name="play" size={18} /></span></div>
                  <div className="lesson-meta-bar">
                    <Icon name={KIND_ICON[x.kind]} size={13} />
                    <span>{x.videoSec ? formatClip(x.videoSec) : `${x.minutes} ${t('common.min')}`}</span>
                    <span className="lesson-meta-track"><span style={{ width: i === 0 ? '45%' : 0 }} /></span>
                  </div>
                </div>
                <div className="lesson-tile-body">
                  <p className="tiny muted">{x.module}</p>
                  <p className="lesson-tile-title" lang="fr">{x.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Today's plan, ordered from real state */}
        <motion.section variants={fadeUp} className="card" aria-labelledby="plan-h">
          <div className="card-head" style={{ marginBottom: 4 }}>
            <div className="row" style={{ ['--gap' as string]: '6px' }}>
              <h2 id="plan-h">{t('dash.plan')}</h2>
              <Hint label={fr ? 'Comment ce programme est établi' : 'How this plan is chosen'}>{t('dash.whyHint')}</Hint>
            </div>
            <span className="tiny muted">{t('dash.planSub')}</span>
          </div>
          {plan.length ? (
            <ol className="plan-list">
              <AnimatePresence initial={false}>
                {plan.map((p, i) => (
                  <motion.li key={p.id} layout className="plan-item" data-tone={p.tone} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }} transition={spring.settle}>
                    <span className="plan-idx num">{i + 1}</span>
                    <span className="plan-icon"><Icon name={p.icon} size={18} /></span>
                    <span style={{ minWidth: 0 }}>
                      <span className="plan-title">{p.title}</span>
                      <span className="tiny muted" lang={p.id === 'assignment' ? 'fr' : undefined}>{p.meta}</span>
                    </span>
                    {p.to && p.cta ? (
                      <Link to={p.to} className={`btn btn-sm ${p.tone === 'urgent' ? 'btn-brand' : 'btn-secondary'}`}>{p.cta}</Link>
                    ) : (
                      <span className="status status-completed"><Icon name="check" size={13} /> OK</span>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          ) : (
            <p className="small muted" style={{ padding: '16px 0' }}>{t('dash.allClear')}</p>
          )}
        </motion.section>

        <div className="dash-pair">
          <motion.section variants={fadeUp} className="card" aria-labelledby="wk-h">
            <div className="card-head" style={{ marginBottom: 4 }}>
              <h2 id="wk-h">{t('dash.weekly')}</h2>
              <span className="small num" style={{ fontWeight: 700, color: 'var(--navy)' }}>{weekTotal} {t('common.min')}</span>
            </div>
            <p className="tiny muted" style={{ marginBottom: 10 }}>
              {fr ? `Votre meilleure journée : ${best.label} (${best.value} min).` : `Your strongest day: ${best.label} (${best.value} min).`}
            </p>
            <BarChart data={LEARNER_WEEKLY_MINUTES} ariaLabel={t('dash.weekly')} format={(v) => `${v} ${t('common.min')}`} highlightLast height={140} />
          </motion.section>

          <motion.section variants={fadeUp} className="card" aria-labelledby="fb-h">
            <div className="card-head" style={{ marginBottom: 12 }}>
              <h2 id="fb-h">{t('dash.feedback')}</h2>
              <Link to="/app/practice" className="pill-link">{t('app.practice')}</Link>
            </div>
            <div className="row" style={{ marginBottom: 10, flexWrap: 'nowrap' }}>
              <Avatar spec={feedbackTutor.portrait} size={40} expression="joy" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{feedbackTutor.name}</div>
                <div className="tiny muted">{lastFeedback?.reviewedAt ? formatDate(lastFeedback.reviewedAt, lang, { day: 'numeric', month: 'short' }) : ''}</div>
              </div>
            </div>
            <blockquote className="feedback-quote">
              <p className="small" lang="fr">{lastFeedback?.feedback ?? '« Bonjour Ama, très belle progression cette semaine ! »'}</p>
            </blockquote>
            <Link to="/app/messages" className="link small" style={{ marginTop: 12 }}>{fr ? `Répondre à ${feedbackTutor.name.split(' ')[0]}` : `Reply to ${feedbackTutor.name.split(' ')[0]}`} <Icon name="arrowRight" size={14} /></Link>
          </motion.section>
        </div>
      </motion.div>

      <motion.div className="dash-side" variants={stagger(0.06)}>
        {/* Phrase of the day: one small daily dose of French */}
        <motion.section variants={fadeUp} className="card phrase-card" aria-label={fr ? 'Expression du jour' : 'Phrase of the day'}>
          <span className="tone-icon" data-tone="gold"><Icon name="words" size={18} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span className="tiny muted" lang="fr">Expression du jour</span>
            <strong lang="fr">{phrase.fr}</strong>
            <span className="tiny muted">{phrase.en} · {l(phrase.context)}</span>
          </div>
          <div className="row" style={{ ['--gap' as string]: '4px', flexWrap: 'nowrap' }}>
            <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => speakFrench(phrase.fr, () => undefined)} aria-label={fr ? 'Écouter' : 'Listen'}><Icon name="headphones" size={15} /></button>
            <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} disabled={store.vocabulary.some((v) => v.fr === phrase.fr)} onClick={() => { void store.actions.addVocab({ fr: phrase.fr, en: phrase.en, example: phrase.fr, source: 'Expression du jour' }); toast(fr ? 'Ajoutée à votre carnet' : 'Added to your phrasebook'); }} aria-label={fr ? 'Ajouter au carnet' : 'Save to phrasebook'}><Icon name={store.vocabulary.some((v) => v.fr === phrase.fr) ? 'check' : 'plus'} size={15} /></button>
          </div>
        </motion.section>

        {/* Week planner */}
        <motion.section variants={fadeUp} className="card" aria-labelledby="week-h">
          <div className="card-head">
            <h2 id="week-h">{fr ? 'Votre semaine' : 'Your week'}</h2>
            <Link to="/app/book" className="round-btn round-btn-sm" aria-label={t('app.book')}><Icon name="plus" size={16} /></Link>
          </div>
          <div className="week-strip" role="group" aria-label={fr ? 'Choisir un jour' : 'Choose a day'}>
            {days.map((d) => {
              const date = new Date(`${d}T12:00:00Z`);
              const active = d === day;
              return (
                <button key={d} type="button" className="week-day" aria-pressed={active} onClick={() => setDay(d)}>
                  {active && <motion.span layoutId="week-pill" className="week-pill" transition={spring.snappy} />}
                  <span>{date.toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')}</span>
                  <span className="week-day-num num">{date.getUTCDate()}</span>
                  <span className="week-dot" data-on={eventsFor(d).length > 0 || undefined} />
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.ul key={day} className="event-list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {events.length ? (
                events.map((e) => (
                  <li key={e.id}>
                    <Link to={e.to} className="event">
                      <span className="tone-icon" data-tone={e.tone}><Icon name={e.icon} size={18} /></span>
                      <span style={{ minWidth: 0 }}>
                        <strong lang={e.fr ? 'fr' : undefined}>{e.title}</strong>
                        <span className="tiny muted">{e.meta}</span>
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="small muted" style={{ padding: '6px 4px' }}>
                  {fr ? 'Rien de prévu ce jour-là. ' : 'Nothing planned that day. '}
                  <Link to="/app/book" className="link small">{t('app.book')}</Link>
                </li>
              )}
            </motion.ul>
          </AnimatePresence>
          {next && nextTutor && (
            <div className="next-live">
              <div className="row" style={{ flexWrap: 'nowrap', ['--gap' as string]: '12px' }}>
                <Avatar spec={nextTutor.portrait} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div className="tiny muted">{t('dash.nextLive')}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{relativeDay(next.start, lang, t)} · {formatTime(next.start, lang)}</div>
                  <div className="tiny muted">{t('common.with')} {nextTutor.name} · {next.durationMin} {t('common.min')}</div>
                </div>
              </div>
              <div className="row between" style={{ marginTop: 10 }}>
                <span className="tiny muted" style={{ maxWidth: '22ch' }}>{t('demo.teams')}</span>
                <button className="btn btn-secondary btn-sm" disabled>
                  <Icon name="meet" size={15} /> {t('dash.join')}
                </button>
              </div>
            </div>
          )}
        </motion.section>

        {/* Milestones as goals to work towards */}
        <motion.section variants={fadeUp} className="card" aria-labelledby="ms-h">
          <div className="card-head">
            <h2 id="ms-h">{fr ? 'Objectifs du passeport' : 'Passport goals'}</h2>
            <span className="chip chip-gold">{learner.level} → {nextLevel}</span>
          </div>
          {inProgress && (
            <div className="quest">
              <div className="quest-head">
                <span className="tone-icon" data-tone="burgundy"><Icon name="passport" size={18} /></span>
                <div style={{ minWidth: 0 }}>
                  <strong>{l(inProgress.title)}</strong>
                  <span className="tiny muted">{l(inProgress.canDo)}</span>
                </div>
              </div>
              <div style={{ marginTop: 12 }}><AnimatedBar value={inProgress.progress} label={l(inProgress.title)} /></div>
              <div className="quest-foot">
                <span className="tiny muted num">{inProgress.progress}% {fr ? 'accompli' : 'complete'}</span>
                <Link to="/app/studio?scenario=sc-meeting" className="btn btn-brand btn-sm"><span>{fr ? 'S’entraîner' : 'Practise'}</span></Link>
              </div>
            </div>
          )}
          {upNext && (
            <div className="quest">
              <div className="quest-head">
                <span className="tone-icon" data-tone="gold"><Icon name="award" size={18} /></span>
                <div style={{ minWidth: 0 }}>
                  <strong>{l(upNext.title)}</strong>
                  <span className="tiny muted">{l(upNext.canDo)}</span>
                </div>
              </div>
              <div className="quest-foot">
                <span className="tiny muted">{fr ? 'Prochain jalon' : 'Next milestone'} · {upNext.level}</span>
                <Link to="/app/passport" className="btn btn-secondary btn-sm">{fr ? 'Voir' : 'View'}</Link>
              </div>
            </div>
          )}
          <Link to="/app/passport" className="link tiny" style={{ marginTop: 12 }}><Icon name="checkCircle" size={13} /> {canDo.length} {fr ? 'compétences validées' : 'can-dos achieved'} · {t('app.passport')}</Link>
          <p className="small" style={{ color: 'var(--ink-2)', marginTop: 8 }}>
            {t('dash.encourageDyn').replace('{p}', String(learner.progressToNext)).replace('{next}', nextLevel).replace('{n}', String(Math.max(0, remaining - 1)))}
          </p>
        </motion.section>

        {/* Weekly goals: points reward real learning actions, and stay secondary */}
        <motion.section variants={fadeUp} className="card" aria-labelledby="quest-h">
          <div className="card-head">
            <h2 id="quest-h">{fr ? 'Objectifs de la semaine' : 'Weekly goals'}</h2>
            <span className="chip chip-gold num" title={fr ? 'Points gagnés' : 'Points earned'}><Icon name="star" size={13} /> {store.points}</span>
          </div>
          <Link to="/app/community" className="level-line">
            <span>{fr ? 'Niveau' : 'Level'} <strong>{l(level.current.name)}</strong></span>
            <span className="tiny muted">{level.next ? (fr ? `${level.toNext} pts pour ${l(level.next.name)}${level.next.unlock ? ` : ${l(level.next.unlock.label)}` : ""}` : `${level.toNext} pts to ${l(level.next.name)}${level.next.unlock ? `: ${l(level.next.unlock.label)}` : ""}`) : fr ? 'Niveau maximal' : 'Top level'} · {fr ? 'Classement' : 'Leaderboard'} <Icon name="arrowRight" size={12} /></span>
          </Link>
          <ul className="quest-list">
            {quests.map((q) => (
              <li key={q.id}>
                <div className="quest-row">
                  <span className="quest-icon" data-done={q.done || undefined}><Icon name={q.icon} size={18} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong>{l(q.title)}</strong>
                    <span className="tiny quest-points">+{q.points} {fr ? 'points' : 'points'}</span>
                  </div>
                </div>
                <div className="quest-track" aria-hidden><span style={{ width: `${(q.value / q.target) * 100}%` }} /></div>
                <div className="quest-foot">
                  <span className="tiny muted num">{q.value}/{q.target} {fr ? 'accompli' : 'completed'}</span>
                  {q.claimed ? (
                    <span className="tiny" style={{ color: 'var(--green)', fontWeight: 700 }}><Icon name="check" size={13} /> {fr ? 'Obtenu' : 'Claimed'}</span>
                  ) : (
                    <button type="button" className={`btn btn-sm ${q.done ? 'btn-brand' : 'btn-secondary'}`} disabled={!q.done} onClick={() => void claim(q.id)}>
                      <span>{fr ? 'Récupérer' : 'Claim reward'}</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </motion.section>
      </motion.div>
    </motion.div>
  );
}
