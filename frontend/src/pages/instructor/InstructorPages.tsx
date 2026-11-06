import { TimeOffCard } from '../../features/presence/PresenceUI';
import { COURSE_AREAS, DEMO_TUTOR_ID, LEARNERS, TUTORS } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Avatar } from '../../components/3d/Portrait';
import { AnimatedBar } from '../../components/animations/Reveal';
import { fadeUp, spring, stagger } from '../../components/animations/motion';
import { DemoTag, EmptyState, Notice } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Drawer, Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { nowIso, formatDate, formatTime, isUpcoming, relativeDay } from '../../utils/format';
import { PageHead } from '../learner/LearnerPages';

/** A booked session's Meet link when Google Calendar is connected; until then, a new Google Meet opens. */
const meetLink = (b: { meeting?: { joinUrl: string | null } }) => b.meeting?.joinUrl ?? 'https://meet.google.com/new';

const tutor = TUTORS.find((t) => t.id === DEMO_TUTOR_ID)!;

export function InstructorDashboard() {
  const { t, lang } = useI18n();
  const { bookings, submissions, notes, actions } = useStore();
  const toast = useToast();
  const [writing, setWriting] = useState<{ learner: string; lesson: string; text: string } | null>(null);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const mine = bookings.filter((b) => b.tutorId === tutor.id && b.status === 'confirmed' && isUpcoming(b.start)).sort((a, b) => a.start.localeCompare(b.start));
  const learnerIds = [...new Set(bookings.filter((b) => b.tutorId === tutor.id).map((b) => b.learnerId))];
  const pending = [
    { learner: 'lrn-adwoa', lesson: 'Compte rendu de réunion', text: 'Hier, nous avons parlé du nouveau fournisseur. Je pense que le prix est trop élevé…' },
    { learner: 'lrn-grace', lesson: 'Rédiger une note de synthèse', text: 'Le programme vise à améliorer l’accès à l’eau potable dans trois régions…' },
    ...Object.entries(submissions).map(([lesson, text]) => ({ learner: 'lrn-ama', lesson: lesson === 'les-b5' ? 'Exprimer son accord ou son désaccord' : lesson, text })),
  ];
  const [reviewed, setReviewed] = useState<string[]>([]);
  const toReview = pending.filter((p) => !reviewed.includes(p.lesson + p.learner));
  // Sessions in the next 48 hours need preparing before anything else.
  const soon = mine.filter((b) => new Date(b.start).getTime() - new Date(nowIso()).getTime() <= 48 * 3_600_000);
  const next = mine[0];
  const nextLearner = next && LEARNERS.find((x) => x.id === next.learnerId)!;
  const lastNote = nextLearner && notes[nextLearner.id]?.[0];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger(0.07)}>
      <motion.div variants={fadeUp}>
        <PageHead title={t('instr.greeting')} sub={t('instr.sub')}><DemoTag>{t('demo.data')}</DemoTag></PageHead>
      </motion.div>
      <div className="dash-grid">
        {/* Work queue: prepare imminent sessions, then review written work */}
        <motion.section variants={fadeUp} className="card span-8" aria-labelledby="queue-h">
          <div className="row between" style={{ marginBottom: 4 }}>
            <h2 className="h4" id="queue-h">{t('instr.queue')}</h2>
            <span className="tiny muted">{t('instr.queueSub')}</span>
          </div>
          <ol className="plan-list">
            <AnimatePresence initial={false}>
              {soon.map((b, i) => {
                const l = LEARNERS.find((x) => x.id === b.learnerId)!;
                return (
                  <motion.li key={b.id} layout className="plan-item" data-tone={i === 0 ? 'urgent' : undefined} exit={{ opacity: 0, x: 30 }}>
                    <span className="plan-idx num">{i + 1}</span>
                    <span className="plan-icon"><Icon name="calendar" size={18} /></span>
                    <span style={{ minWidth: 0 }}>
                      <span className="plan-title">{t('instr.prepare')} · {l.name} <span className="chip" style={{ minHeight: 20, marginLeft: 4 }}>{l.level}</span></span>
                      <span className="tiny muted"><span lang="fr">{b.topic}</span> · {relativeDay(b.start, lang, t)} {formatTime(b.start, lang)}</span>
                    </span>
                    <a className="btn btn-secondary btn-sm" href={meetLink(b)} target="_blank" rel="noopener noreferrer" title={b.meeting?.joinUrl ? (lang === 'fr' ? 'Rejoindre la séance' : 'Join the session') : t('demo.teams')}><Icon name="meet" size={15} /> {b.meeting?.joinUrl ? (lang === 'fr' ? 'Rejoindre Meet' : 'Join Meet') : lang === 'fr' ? 'Lancer Meet' : 'Start Meet'}</a>
                  </motion.li>
                );
              })}
              {toReview.map((p, i) => {
                const l = LEARNERS.find((x) => x.id === p.learner)!;
                return (
                  <motion.li key={p.lesson + p.learner} layout className="plan-item" exit={{ opacity: 0, x: 30 }} style={{ alignItems: 'start' }}>
                    <span className="plan-idx num">{soon.length + i + 1}</span>
                    <span className="plan-icon"><Icon name="edit" size={18} /></span>
                    <span style={{ minWidth: 0 }}>
                      <span className="plan-title">{t('instr.review')} · {l.name}</span>
                      <span className="tiny muted" lang="fr">{p.lesson}</span>
                      <span className="small" lang="fr" style={{ display: 'block', marginTop: 6, fontStyle: 'italic', color: 'var(--ink-2)', borderLeft: '2px solid var(--ivory-300)', paddingLeft: 10 }}>“{p.text}”</span>
                    </span>
                    <button className="btn btn-primary btn-sm" onClick={() => { setWriting(p); setFeedback(''); }}>
                      {t('instr.sendFeedback')}
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
          {!soon.length && !toReview.length && <EmptyState icon="checkCircle" title={t('instr.queueEmpty')} />}
          <Modal open={!!writing} onClose={() => setWriting(null)} title={writing ? `${t('instr.sendFeedback')} · ${LEARNERS.find((x) => x.id === writing.learner)?.name ?? ''}` : ''} width={560}>
            {writing && (
              <form className="stack" style={{ ['--gap' as string]: '12px' }} onSubmit={(e) => {
                e.preventDefault();
                if (!feedback.trim()) return;
                setSending(true);
                const body = `📝 ${lang === 'fr' ? 'Retour sur' : 'Feedback on'} « ${writing.lesson} »\n\n${feedback.trim()}`;
                actions.staffMessage(writing.learner, lang === 'fr' ? `Retour : ${writing.lesson}` : `Feedback: ${writing.lesson}`, body)
                  .then(() => { setReviewed((r) => [...r, writing.lesson + writing.learner]); setWriting(null); toast(lang === 'fr' ? 'Retour envoyé dans la messagerie de l’apprenant·e' : 'Feedback sent to the learner’s Messages'); })
                  .catch((err) => toast(err instanceof Error ? err.message : String(err)))
                  .finally(() => setSending(false));
              }}>
                <p className="small muted" lang="fr">{writing.lesson}</p>
                <blockquote className="report-quote" lang="fr">{writing.text}</blockquote>
                <label className="field">
                  <span className="label">{lang === 'fr' ? 'Votre retour' : 'Your feedback'}</span>
                  <textarea className="textarea" style={{ minHeight: 130 }} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={lang === 'fr' ? 'Ce qui est réussi, une correction précise, et un conseil pour la suite…' : 'What works, one precise correction, and a tip for next time…'} maxLength={2000} autoFocus />
                </label>
                <div className="row" style={{ ['--gap' as string]: '6px' }}>
                  {(lang === 'fr' ? ['Très bon travail !', 'Attention à l’accord du participe passé.', 'Essayez d’utiliser « cependant ».'] : ['Very good work!', 'Watch the past participle agreement.', 'Try using “cependant”.']).map((s) => (
                    <button key={s} type="button" className="chip chip-outline" style={{ cursor: 'pointer', minHeight: 32 }} onClick={() => setFeedback((f) => (f ? `${f} ${s}` : s))}>+ {s}</button>
                  ))}
                </div>
                <button className="btn btn-primary" disabled={!feedback.trim() || sending}>{sending ? '…' : lang === 'fr' ? 'Envoyer le retour' : 'Send feedback'}</button>
                <p className="tiny muted">{lang === 'fr' ? 'Le retour arrive dans la messagerie de l’apprenant·e. Les coordonnées personnelles sont bloquées.' : 'The feedback arrives in the learner’s Messages. Personal contact details are blocked.'}</p>
              </form>
            )}
          </Modal>
          <p className="tiny muted" style={{ marginTop: 8 }}>{lang === 'fr' ? '« Lancer Meet » ouvre une nouvelle réunion Google Meet. Une fois Google Agenda connecté, chaque séance aura son propre lien.' : '“Start Meet” opens a new Google Meet. Once Google Calendar is connected, each session gets its own link.'}</p>
        </motion.section>

        <motion.div variants={fadeUp} className="span-4 stack" style={{ ['--gap' as string]: '20px' }}>
          <section className="card card-navy">
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <Avatar spec={tutor.portrait} size={48} expression="joy" />
              <div>
                <div style={{ fontWeight: 700, color: '#fff' }}>{tutor.name}</div>
                <div className="tiny muted">{tutor.specialities.join(' · ')}</div>
              </div>
            </div>
            <dl className="grid" style={{ gridTemplateColumns: '1fr 1fr', margin: '20px 0 0', ['--gap' as string]: '14px' }}>
              <div className="stat"><dt className="stat-label muted">{lang === 'fr' ? 'Séances à venir' : 'Upcoming sessions'}</dt><dd className="stat-value" style={{ color: '#fff', margin: 0 }}>{mine.length}</dd></div>
              <div className="stat"><dt className="stat-label muted">{t('instr.pending')}</dt><dd className="stat-value" style={{ color: '#fff', margin: 0 }}>{toReview.length}</dd></div>
              <div className="stat"><dt className="stat-label muted">{t('app.learners')}</dt><dd className="stat-value" style={{ color: '#fff', margin: 0 }}>{learnerIds.length}</dd></div>
              <div className="stat"><dt className="stat-label muted">{lang === 'fr' ? 'Note moyenne (démo)' : 'Avg. rating (demo)'}</dt><dd className="stat-value" style={{ color: '#fff', margin: 0 }}>{tutor.rating}</dd></div>
            </dl>
          </section>

          {next && nextLearner && (
            <section className="card" aria-labelledby="ns-h">
              <h2 className="h4" id="ns-h" style={{ marginBottom: 12 }}>{t('instr.nextSession')}</h2>
              <div className="row" style={{ flexWrap: 'nowrap', ['--gap' as string]: '12px' }}>
                <div className="countdown"><span>{relativeDay(next.start, lang, t)}</span><strong className="num">{formatTime(next.start, lang)}</strong></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{nextLearner.name}</div>
                  <div className="tiny muted" lang="fr">{next.topic}</div>
                </div>
              </div>
              <div className="small" style={{ marginTop: 14, color: 'var(--ink-2)' }}><strong>{t('instr.goal')}:</strong> {nextLearner.goal[lang]}</div>
              {lastNote && (
                <div className="small" style={{ marginTop: 8, color: 'var(--ink-2)' }}>
                  <strong>{t('instr.lastNote')}:</strong> {lastNote.text} <span className="tiny muted">· {formatDate(lastNote.at, lang, { day: 'numeric', month: 'short' })}</span>
                </div>
              )}
            </section>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export function AvailabilityPage() {
  const { t, lang } = useI18n();
  const { availability, actions, bookings } = useStore();
  const hours = availability[tutor.id] ?? tutor.availability;
  const days = lang === 'fr' ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
  const booked = (weekday: number, time: string) =>
    bookings.some((b) => b.tutorId === tutor.id && b.status === 'confirmed' && isUpcoming(b.start) && ((new Date(b.start).getUTCDay() + 6) % 7) + 1 === weekday && b.start.slice(11, 16) === time);
  return (
    <>
      <PageHead title={t('instr.availability')} sub={t('instr.availabilitySub')} />
      <TimeOffCard tutorId={tutor.id} />
      <div style={{ height: 16 }} />
      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `70px repeat(${days.length}, minmax(80px, 1fr))`, gap: 6, minWidth: 560 }}>
          <span />
          {days.map((d) => <span key={d} className="small" style={{ fontWeight: 700, textAlign: 'center' }}>{d}</span>)}
          {times.map((time) => (
            <div key={time} style={{ display: 'contents' }}>
              <span className="small muted num" style={{ alignSelf: 'center' }}>{time}</span>
              {days.map((_, di) => {
                const wd = di + 1;
                const on = (hours[wd] ?? []).includes(time);
                const isBooked = on && booked(wd, time);
                return (
                  <motion.button
                    key={wd}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => !isBooked && actions.toggleAvailability(tutor.id, wd, time)}
                    aria-pressed={on}
                    aria-label={`${days[di]} ${time}`}
                    style={{ height: 44, borderRadius: 10, border: '1px solid', borderColor: on ? 'transparent' : 'var(--line)', cursor: isBooked ? 'not-allowed' : 'pointer', background: isBooked ? 'var(--burgundy)' : on ? 'var(--green-100)' : '#fff', color: isBooked ? '#fff' : 'var(--green)', fontSize: 12, fontWeight: 700 }}
                  >
                    {isBooked ? (lang === 'fr' ? 'Réservé' : 'Booked') : on ? <Icon name="check" size={16} /> : ''}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14 }}><Notice tone="navy">{lang === 'fr' ? 'Les créneaux ouverts apparaissent immédiatement dans la réservation des apprenants (mode démo hors ligne). La synchronisation avec Google Agenda est prévue.' : 'Open slots appear immediately in learner booking (offline demo mode). Google Calendar sync is planned.'}</Notice></div>
    </>
  );
}

export function InstructorLearnersPage() {
  const { t, l, lang } = useI18n();
  const toast = useToast();
  const { bookings, notes, actions, content } = useStore();
  const ids = [...new Set(bookings.filter((b) => b.tutorId === tutor.id).map((b) => b.learnerId))];
  const learners = LEARNERS.filter((x) => ids.includes(x.id));
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const sel = learners.find((x) => x.id === open);

  return (
    <>
      <PageHead title={t('instr.learners')} />
      <motion.div className="grid grid-3" initial="hidden" animate="show" variants={stagger(0.06)}>
        {learners.map((x) => (
          <motion.button key={x.id} variants={fadeUp} className="card card-interactive stack" style={{ textAlign: 'left', cursor: 'pointer', ['--gap' as string]: '12px' }} onClick={() => setOpen(x.id)}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <Avatar spec={x.portrait} size={48} />
              <div>
                <div style={{ fontWeight: 700 }}>{x.name}</div>
                <div className="tiny muted">{x.city} · {l(COURSE_AREAS.find((a) => a.id === x.areaId)!.name)}</div>
              </div>
            </div>
            <div className="small" style={{ color: 'var(--ink-2)' }}><strong>{t('instr.goal')}:</strong> {l(x.goal)}</div>
            <div className="row between tiny"><span className="chip chip-burgundy">{x.level}</span><span className="muted">{x.progressToNext}% →</span></div>
            <AnimatedBar value={x.progressToNext} label={x.name} />
          </motion.button>
        ))}
      </motion.div>
      <Drawer open={!!sel} onClose={() => setOpen(null)} title={sel?.name ?? ''}>
        {sel && (
          <div className="stack" style={{ ['--gap' as string]: '18px' }}>
            <div className="row"><Avatar spec={sel.portrait} size={56} /><div><div className="chip chip-burgundy">{sel.level} · {sel.progressToNext}%</div><div className="small muted" style={{ marginTop: 4 }}>{l(sel.goal)}</div></div></div>
            <section>
              <h2 className="h4" style={{ marginBottom: 8 }}>{t('instr.notes')}</h2>
              <form className="stack" style={{ ['--gap' as string]: '8px' }} onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return; actions.addNote(sel.id, note.trim()); setNote(''); toast(lang === 'fr' ? 'Note enregistrée' : 'Note saved'); }}>
                <textarea className="textarea" style={{ minHeight: 90 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('instr.observation')} />
                <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={!note.trim()}>{t('instr.addNote')}</button>
              </form>
              <AnimatePresence initial={false}>
                {(notes[sel.id] ?? []).map((n) => (
                  <motion.div key={n.at} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={spring.settle} className="card card-flat" style={{ ['--pad' as string]: '12px', marginTop: 8 }}>
                    <p className="small">{n.text}</p>
                    <span className="tiny muted">{formatDate(n.at, lang, { day: 'numeric', month: 'short' })}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </section>
            <section>
              <h2 className="h4" style={{ marginBottom: 4 }}>{t('instr.followUp')}</h2>
              <p className="tiny muted" style={{ marginBottom: 8 }}>{lang === 'fr' ? 'Assignez un pack : il apparaît dans « Ma pratique » de l’apprenant·e.' : 'Assign a pack: it appears in the learner’s “My practice”.'}</p>
              <div className="stack" style={{ ['--gap' as string]: '6px' }}>
                {content.packs.filter((p) => p.level === sel.level || content.packs.length <= 6).slice(0, 6).map((p) => {
                  const given = content.assignments.find((a) => a.packId === p.id && a.learnerId === sel.id);
                  return (
                    <div key={p.id} className="list-row">
                      <span style={{ flex: 1, minWidth: 0 }}><span className="small" style={{ fontWeight: 600 }}>{l(p.title)}</span> <span className="tiny muted">· {p.level}</span></span>
                      {given ? <span className="chip">{given.status === 'reviewed' ? (lang === 'fr' ? 'Corrigé' : 'Reviewed') : given.status === 'submitted' ? (lang === 'fr' ? 'Rendu' : 'Submitted') : lang === 'fr' ? 'Assigné' : 'Assigned'}</span> : (
                        <button className="btn btn-secondary btn-sm" onClick={() => actions.content.assignPack({ packId: p.id, learnerId: sel.id, note: '' }).then(() => toast(lang === 'fr' ? 'Pack assigné' : 'Pack assigned')).catch((err: unknown) => toast(err instanceof Error ? err.message : String(err)))}><Icon name="plus" size={13} /> {lang === 'fr' ? 'Assigner' : 'Assign'}</button>
                      )}
                    </div>
                  );
                })}
                {!content.packs.length && <p className="small muted">{lang === 'fr' ? 'Aucun pack pour l’instant : créez-en dans Immersion.' : 'No packs yet: create them in the Immersion toolkit.'}</p>}
              </div>
            </section>
            <Notice tone="navy">{t('msg.privacy')}</Notice>
          </div>
        )}
      </Drawer>
    </>
  );
}
