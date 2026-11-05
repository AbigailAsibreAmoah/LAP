import { BLOCK_LABEL, COURSES, accessLevel, canStudy, levelProductId, nextLevel, levelIndex } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { spring } from '../../components/animations/motion';
import { DemoTag, EmptyState, Segmented, Tabs } from '../../components/ui/Controls';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { PerformancePassport } from '../../features/performance-passport/PerformancePassport';
import { SpeakingStudio } from '../../features/speaking-studio/SpeakingStudio';
import { ReviewSession, useReviewToday } from '../../features/review/ReviewSession';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatClip, formatDate } from '../../utils/format';
import { FaqList } from '../public/PublicPages';
import { BLOCK_ICON, LessonBlock } from '../../features/content/LessonBlocks';

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted" style={{ marginTop: 4 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/* ---------- Lesson player ---------- */

export function LessonPage() {
  const { lessonId } = useParams();
  const [params] = useSearchParams();
  const { t, l, lang } = useI18n();
  const fr = lang === 'fr';
  const store = useStore();
  const { plan, submissions, actions, content, quizRetried } = store;
  const toast = useToast();
  const lesson = content.lessons.find((x) => x.id === lessonId);
  const course = COURSES.find((c) => c.id === (lesson?.courseId ?? params.get('course'))) ?? COURSES.find((c) => c.modules.some((m) => m.lessons.some((x) => x.id === lessonId)));
  const ref = course?.modules.flatMap((m) => m.lessons).find((x) => x.id === lessonId);
  const preview = params.get('preview') === '1';
  const locked = course?.premium && plan === 'plan-essentials' && !preview;
  const levelLocked = !!lesson && !canStudy(store.learner, lesson.level);
  const [quizzes, setQuizzes] = useState<Record<string, { correct: number; total: number }>>({});
  const { hash } = useLocation();
  const completed = content.completions.some((c) => c.lessonId === lessonId && c.learnerId === store.learner.id);

  // Deep links (e.g. from the dashboard plan) land on the right part of the lesson.
  useEffect(() => {
    if (!hash) return;
    const id = window.setTimeout(() => document.getElementById(`${hash.slice(1)}-section`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => window.clearTimeout(id);
  }, [hash]);

  if (!course || (!ref && !lesson)) return <EmptyState title={fr ? 'Leçon introuvable' : 'Lesson not found'} />;
  const title = lesson?.title ?? ref!.title;
  const back = <Link to={`/app/courses/${course.id}`} className="link small"><Icon name="arrowLeft" size={15} /> {t('lesson.back')}</Link>;

  if (levelLocked && lesson)
    return (
      <div className="stack" style={{ ['--gap' as string]: '20px', maxWidth: 640 }}>
        {back}
        <div className="card stack center" style={{ textAlign: 'center', ['--pad' as string]: '40px' }}>
          <Icon name="lock" size={32} />
          <h2 style={{ fontSize: '1.6rem' }} lang="fr">{title}</h2>
          <p className="muted">{levelIndex(lesson.level) < levelIndex(store.learner.level) ? (fr ? `Cette leçon est au niveau ${lesson.level}, en dessous du vôtre (${store.learner.level}). Vos cours affichent uniquement le contenu de votre niveau.` : `This lesson is at ${lesson.level}, below your level (${store.learner.level}). Your courses show only your level’s content.`) : fr ? `Cette leçon est au niveau ${lesson.level}. Votre niveau actuel est ${accessLevel(store.learner)}.` : `This lesson is at ${lesson.level}. Your current level is ${accessLevel(store.learner)}.`}</p>
          {nextLevel(accessLevel(store.learner)) ? (
            <Link to={`/app/checkout/${levelProductId(nextLevel(accessLevel(store.learner))!)}`} className="btn btn-primary"><Icon name="lock" size={15} /> {fr ? `Débloquer ${nextLevel(accessLevel(store.learner))}` : `Unlock ${nextLevel(accessLevel(store.learner))}`}</Link>
          ) : null}
          <Link to="/app/placement" className="link small">{fr ? 'Ou repasser le test de positionnement' : 'Or retake the placement test'}</Link>
        </div>
      </div>
    );

  if (locked)
    return (
      <div className="stack" style={{ ['--gap' as string]: '20px', maxWidth: 640 }}>
        {back}
        <div className="card stack center" style={{ textAlign: 'center', ['--pad' as string]: '40px' }}>
          <Icon name="lock" size={32} />
          <h2 style={{ fontSize: '1.6rem' }} lang="fr">{title}</h2>
          <p className="muted">{t('lesson.locked')}</p>
          <Link to="/app/billing" className="btn btn-primary">{t('book.getCredits')}</Link>
        </div>
      </div>
    );

  // Progressive release: unpublished lessons are announced, not shown.
  if (!lesson)
    return (
      <div className="stack" style={{ ['--gap' as string]: '20px', maxWidth: 640 }}>
        {back}
        <div className="card stack center" style={{ textAlign: 'center', ['--pad' as string]: '40px' }}>
          <span className="tone-icon" data-tone="gold" style={{ width: 52, height: 52 }}><Icon name="clock" size={24} /></span>
          <h2 style={{ fontSize: '1.5rem' }} lang="fr">{title}</h2>
          <p className="muted" style={{ maxWidth: '44ch' }}>{fr ? 'Cette leçon est en préparation par notre équipe pédagogique. Vous serez prévenu dès sa publication.' : 'Our teaching team is preparing this lesson. You’ll be notified as soon as it’s published.'}</p>
          <Link to={`/app/courses/${course.id}`} className="btn btn-secondary btn-sm">{fr ? 'Voir les leçons disponibles' : 'See available lessons'}</Link>
        </div>
      </div>
    );

  const opening = lesson.blocks[0]?.type === 'video' ? content.media.find((m) => m.id === (lesson.blocks[0] as { assetId: string }).assetId) : undefined;
  const quizBlocks = lesson.blocks.filter((b) => b.type === 'quiz' || b.type === 'listening');
  const hasAssignment = lesson.blocks.some((b) => b.type === 'assignment');
  const quizzesDone = quizBlocks.every((b) => quizzes[b.id]);
  const assignmentDone = !hasAssignment || Boolean(submissions[lesson.id]);
  const ready = quizzesDone && assignmentDone;
  const retried = quizRetried.includes(lesson.id);
  const total = Object.values(quizzes).reduce((n, q) => n + q.total, 0);
  const correct = Object.values(quizzes).reduce((n, q) => n + q.correct, 0);

  const steps = lesson.blocks.map((b) => ({
    id: b.id,
    label: l(BLOCK_LABEL[b.type]),
    icon: BLOCK_ICON[b.type],
    done: b.type === 'quiz' || b.type === 'listening' ? Boolean(quizzes[b.id]) : b.type === 'assignment' ? Boolean(submissions[lesson.id]) : completed,
  }));

  const finish = async () => {
    try {
      // Only a first-attempt quiz counts towards the "ace" quest.
      await actions.content.completeLesson(lesson.id, total && !retried ? { correct, total } : undefined);
      toast(fr ? 'Leçon terminée. Bravo !' : 'Lesson complete. Well done!');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="lesson-layout">
      <div className="lesson-side">
        {back}
        <ol className="lesson-rail" aria-label={fr ? 'Étapes de la leçon' : 'Lesson steps'}>
          {steps.map((st, i) => (
            <li key={st.id} data-done={st.done}>
              <a href={`#${st.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`${st.id}-section`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                <span className="rail-dot">{st.done ? <Icon name="check" size={12} stroke={2.6} /> : i + 1}</span>
                <span className="rail-label">{st.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>

      <div className="lesson-main">
        <header className="lesson-head">
          <div className="row" style={{ ['--gap' as string]: '8px' }}>
            <span className="chip chip-burgundy">{lesson.level}</span>
            <span className="small muted">{l(course.title)}</span>
            {opening && <span className="small muted inline-meta"><Icon name="video" size={14} /> {formatClip(opening.durationSec)} {fr ? 'de vidéo' : 'video'} · {lesson.minutes} {t('common.min')}</span>}
            {preview && <span className="demo-tag">{t('courses.preview')}</span>}
          </div>
          <h1 lang="fr">{lesson.title}</h1>
          {l(lesson.objective) && <p className="muted">{l(lesson.objective)}</p>}
        </header>

        {lesson.blocks.map((b, i) => (
          <motion.section key={b.id} id={`${b.id}-section`} className={`lesson-section${b.type === 'video' && i === 0 ? ' lesson-section-hero' : ' card'}`} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={spring.settle}>
            {!(b.type === 'video' && i === 0) && (
              <div className="lesson-section-head">
                <span className="tone-icon" data-tone={b.type === 'assignment' ? 'gold' : b.type === 'listening' || b.type === 'pronunciation' ? 'navy' : 'burgundy'}><Icon name={BLOCK_ICON[b.type]} size={17} /></span>
                <h2 className="h4">{l(BLOCK_LABEL[b.type])}</h2>
              </div>
            )}
            <LessonBlock
              block={b}
              lesson={lesson}
              media={content.media}
              onQuiz={(id, c, n) => setQuizzes((q) => ({ ...q, [id]: { correct: c, total: n } }))}
              onRetry={() => actions.markQuizRetried(lesson.id)}
            />
          </motion.section>
        ))}

        <section className="lesson-finish">
          {completed ? (
            <>
              <span className="tone-icon" data-tone="green"><Icon name="checkCircle" size={18} /></span>
              <div style={{ flex: 1 }}>
                <strong>{fr ? 'Leçon terminée' : 'Lesson complete'}</strong>
                <div className="tiny muted">{fr ? 'Vous pouvez la revoir à tout moment.' : 'You can come back to it any time.'}</div>
              </div>
              <Link to={`/app/courses/${course.id}`} className="btn btn-secondary btn-sm">{fr ? 'Leçon suivante' : 'Next lesson'}</Link>
            </>
          ) : (
            <>
              <div style={{ flex: 1 }}>
                <strong>{fr ? 'Terminer la leçon' : 'Finish the lesson'}</strong>
                <div className="tiny muted">
                  {ready ? (fr ? 'Tout est fait : enregistrez votre progression.' : 'All done: save your progress.') : fr ? 'Faites les quiz et rendez le devoir pour terminer.' : 'Complete the quizzes and submit the assignment to finish.'}
                </div>
              </div>
              <button type="button" className="btn btn-brand" disabled={!ready} onClick={() => void finish()}><span>{fr ? 'Terminer' : 'Complete lesson'}</span> <Icon name="check" size={15} /></button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------- Studio & passport pages ---------- */

export function StudioPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  return (
    <>
      <PageHead title={t('studio.title')} sub={t('studio.sub')}><DemoTag>{t('demo.simulated')}</DemoTag></PageHead>
      <SpeakingStudio initialId={params.get('scenario')} />
    </>
  );
}

export function PassportPage() {
  const { t, l, lang } = useI18n();
  const { milestones } = useStore();
  const verified = milestones.filter((m) => m.status === 'completed');
  const practising = milestones.filter((m) => m.status === 'in-progress');
  const history = milestones
    .flatMap((m) => m.evidence.map((ev) => ({ ...ev, milestone: m })))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHead title={t('app.passport')} sub={t('passport.sub')} />
      <PerformancePassport />

      <div className="dash-grid" style={{ marginTop: 20 }}>
        <section className="card span-5" aria-labelledby="skills-h">
          <h2 id="skills-h" className="h4" style={{ marginBottom: 4 }}>{lang === 'fr' ? 'Compétences démontrées' : 'Demonstrated skills'}</h2>
          <p className="tiny muted" style={{ marginBottom: 14 }}>{lang === 'fr' ? 'Issues des jalons validés par un tuteur.' : 'From milestones a tutor has signed off.'}</p>
          {verified.length ? (
            <ul className="skill-list">
              {verified.flatMap((m) => m.skills.map((s) => (
                <li key={m.id + s.en}>
                  <Icon name="checkCircle" size={16} />
                  <span>{l(s)}</span>
                  <span className="tiny muted">{m.level}</span>
                </li>
              )))}
            </ul>
          ) : (
            <p className="small muted">{t('passport.noEvidence')}</p>
          )}
          {practising.length > 0 && (
            <>
              <h3 className="kicker" style={{ margin: '18px 0 8px' }}>{lang === 'fr' ? 'En cours d’acquisition' : 'Still practising'}</h3>
              <ul className="skill-list" data-tone="practising">
                {practising.flatMap((m) => m.skills.map((s) => (
                  <li key={m.id + s.en}>
                    <Icon name="clock" size={16} />
                    <span>{l(s)}</span>
                    <span className="tiny muted">{m.progress}%</span>
                  </li>
                )))}
              </ul>
            </>
          )}
        </section>

        <section className="card span-7" aria-labelledby="history-h">
          <h2 id="history-h" className="h4" style={{ marginBottom: 4 }}>{lang === 'fr' ? 'Historique d’apprentissage' : 'Learning history'}</h2>
          <p className="tiny muted" style={{ marginBottom: 14 }}>{lang === 'fr' ? 'Chaque preuve enregistrée, la plus récente en premier.' : 'Every piece of recorded evidence, most recent first.'}</p>
          {history.length ? (
            <ol className="history">
              {history.map((h, i) => (
                <li key={i}>
                  <time dateTime={h.date} className="tiny num">{formatDate(h.date, lang, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                  <div>
                    <div className="small" style={{ fontWeight: 600, color: 'var(--navy)' }}>{l(h.label)}</div>
                    <div className="tiny muted">{l(h.milestone.title)} · {h.milestone.level} · {h.by}</div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="small muted">{t('passport.noEvidence')}</p>
          )}
        </section>
      </div>
    </>
  );
}

/* ---------- Vocabulary ---------- */

export function VocabularyPage() {
  const { t, lang } = useI18n();
  const { vocabulary, actions } = useStore();
  const [vparams] = useSearchParams();
  const reviewToday = useReviewToday();
  // Opens on today's review when words are due (spaced repetition), otherwise on the list.
  const [mode, setMode] = useState<'review' | 'list' | 'cards'>(vparams.get('mode') === 'review' || reviewToday.deck.length ? 'review' : 'list');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ fr: '', en: '', example: '' });
  const [card, setCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const list = useMemo(() => vocabulary.filter((v) => `${v.fr} ${v.en}`.toLowerCase().includes(q.toLowerCase())), [vocabulary, q]);
  const current = vocabulary[card % Math.max(1, vocabulary.length)];

  return (
    <>
      <PageHead title={t('vocab.title')} sub={t('vocab.sub')}>
        <div className="row">
          <Segmented label={t('vocab.title')} value={mode} onChange={setMode} options={[{ value: 'review', label: lang === 'fr' ? `Révision du jour (${reviewToday.deck.length})` : `Today’s review (${reviewToday.deck.length})` }, { value: 'list', label: t('common.viewAll') }, { value: 'cards', label: t('vocab.practice') }]} />
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={15} /> {t('vocab.add')}</button>
        </div>
      </PageHead>

      {mode === 'review' ? (
        <ReviewSession onDone={() => setMode('list')} />
      ) : mode === 'list' ? (
        <div className="stack" style={{ ['--gap' as string]: '16px' }}>
          <label className="row" style={{ maxWidth: 360, position: 'relative' }}>
            <span className="sr-only">{t('vocab.search')}</span>
            <input className="input" placeholder={t('vocab.search')} value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 40 }} />
            <span style={{ position: 'absolute', left: 14, color: 'var(--muted)' }}><Icon name="search" size={17} /></span>
          </label>
          <div className="grid grid-2" style={{ ['--gap' as string]: '12px' }}>
            <AnimatePresence>
              {list.map((v) => (
                <motion.div key={v.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="card" style={{ ['--pad' as string]: '16px 18px' }}>
                  <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                    <div>
                      <div className="fr" lang="fr" style={{ fontSize: '1.15rem' }}>{v.fr}</div>
                      <div className="small">{v.en}</div>
                    </div>
                    <button className={`chip ${v.mastered ? 'chip-gold' : 'chip-outline'}`} style={{ cursor: 'pointer' }} onClick={() => actions.toggleMastered(v.id)} aria-pressed={v.mastered}>
                      {v.mastered ? <><Icon name="check" size={13} /> {t('vocab.mastered')}</> : t('vocab.learning')}
                    </button>
                  </div>
                  <p className="small muted" lang="fr" style={{ marginTop: 8, fontStyle: 'italic' }}>{v.example}</p>
                  <div className="tiny muted" style={{ marginTop: 8 }}>{v.source} · {formatDate(v.addedOn, lang, { day: 'numeric', month: 'short' })}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {!list.length && <EmptyState icon="words" title={lang === 'fr' ? 'Aucune expression' : 'No phrases found'} />}
        </div>
      ) : current ? (
        <div className="stack center" style={{ ['--gap' as string]: '20px' }}>
          <button onClick={() => setFlipped((f) => !f)} aria-label={t('vocab.flip')} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', perspective: 1200, width: 'min(460px, 100%)', height: 260 }}>
            <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={spring.settle} style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }}>
              <div className="card" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', backfaceVisibility: 'hidden', boxShadow: 'var(--shadow-3)' }}>
                <div className="stack center">
                  <span className="fr" lang="fr" style={{ fontSize: '1.8rem', textAlign: 'center' }}>{current.fr}</span>
                  <span className="tiny muted">{t('vocab.flip')}</span>
                </div>
              </div>
              <div className="card card-navy" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <div className="stack center" style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '1.5rem', color: '#fff' }}>{current.en}</span>
                  <span className="small" lang="fr" style={{ color: '#E7C78F', fontStyle: 'italic' }}>{current.example}</span>
                </div>
              </div>
            </motion.div>
          </button>
          <div className="row">
            <button className="btn btn-secondary btn-sm" onClick={() => { setFlipped(false); setCard((c) => (c - 1 + vocabulary.length) % vocabulary.length); }}><Icon name="chevronLeft" size={15} /> {t('common.back')}</button>
            <span className="small muted num">{(card % vocabulary.length) + 1}/{vocabulary.length}</span>
            <button className="btn btn-primary btn-sm" onClick={() => { setFlipped(false); setCard((c) => (c + 1) % vocabulary.length); }}>{t('common.next')} <Icon name="chevronRight" size={15} /></button>
          </div>
        </div>
      ) : null}

      <Modal open={adding} onClose={() => setAdding(false)} title={t('vocab.add')} width={480}>
        <form
          className="stack"
          style={{ ['--gap' as string]: '14px' }}
          onSubmit={(e) => {
            e.preventDefault();
            actions.addVocab({ ...form, example: form.example || form.fr, source: lang === 'fr' ? 'Ajout manuel' : 'Added manually' });
            setForm({ fr: '', en: '', example: '' });
            setAdding(false);
          }}
        >
          <label className="field"><span className="label">{t('vocab.french')}</span><input className="input" lang="fr" required value={form.fr} onChange={(e) => setForm({ ...form, fr: e.target.value })} /></label>
          <label className="field"><span className="label">{t('vocab.english')}</span><input className="input" required value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} /></label>
          <label className="field"><span className="label">{lang === 'fr' ? 'Exemple' : 'Example'}</span><input className="input" lang="fr" value={form.example} onChange={(e) => setForm({ ...form, example: e.target.value })} /></label>
          <button className="btn btn-primary">{t('common.save')}</button>
        </form>
      </Modal>
    </>
  );
}

/* ---------- Notifications ---------- */

const CHANNEL_ICON: Record<string, IconName> = { 'in-app': 'bell', email: 'mail', whatsapp: 'whatsapp' };

export function NotificationsPage() {
  const { t, l, lang } = useI18n();
  const { notifications, actions } = useStore();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const list = tab === 'all' ? notifications : notifications.filter((n) => !n.read);
  return (
    <>
      <PageHead title={t('notif.title')}>
        <button className="btn btn-secondary btn-sm" onClick={actions.markAllRead}><Icon name="check" size={15} /> {t('notif.markAll')}</button>
      </PageHead>
      <Tabs label={t('notif.title')} value={tab} onChange={setTab} options={[{ value: 'all', label: t('common.all') }, { value: 'unread', label: lang === 'fr' ? 'Non lues' : 'Unread' }]} />
      <div className="card" style={{ marginTop: 16, ['--pad' as string]: '6px 20px' }}>
        <AnimatePresence initial={false}>
          {list.map((n) => (
            <motion.div key={n.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="list-row" style={{ alignItems: 'flex-start' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, background: n.read ? 'var(--ivory)' : 'var(--burgundy-100)', color: n.read ? 'var(--muted)' : 'var(--burgundy)', flex: 'none' }}>
                <Icon name={CHANNEL_ICON[n.channel]} size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ ['--gap' as string]: '8px' }}>
                  <strong style={{ fontSize: 14 }}>{l(n.title)}</strong>
                  <span className="chip" style={{ minHeight: 20, fontSize: 11 }}>{n.channel === 'in-app' ? 'Portal' : n.channel === 'email' ? 'Email' : 'WhatsApp'}</span>
                  {n.simulated && <DemoTag>{t('demo.simulated')}</DemoTag>}
                </div>
                <p className="small" style={{ color: 'var(--ink-2)', marginTop: 2 }}>{l(n.body)}</p>
                <span className="tiny muted">{formatDate(n.createdAt, lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {!n.read && <button className="btn btn-ghost btn-sm" onClick={() => actions.markNotificationRead(n.id)} aria-label={`${lang === 'fr' ? 'Marquer comme lu' : 'Mark as read'}: ${l(n.title)}`} title={lang === 'fr' ? 'Marquer comme lu' : 'Mark as read'}><Icon name="check" size={15} /></button>}
            </motion.div>
          ))}
        </AnimatePresence>
        {!list.length && <EmptyState icon="bell" title={lang === 'fr' ? 'Tout est lu' : 'You’re all caught up'} />}
      </div>
      <p className="tiny muted" style={{ marginTop: 12 }}>{t('demo.notifications')}</p>
    </>
  );
}

export function LearnerHelpPage() {
  const { t } = useI18n();
  return (
    <div style={{ maxWidth: 860 }}>
      <PageHead title={t('app.help')} />
      <FaqList />
      <Link to="/app/messages" className="btn btn-secondary" style={{ marginTop: 20 }}><Icon name="message" size={16} /> {t('help.contact')}</Link>
    </div>
  );
}
