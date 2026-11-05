import {
  COURSES,
  LEARNERS,
  LEARNING_GOALS,
  PLACEMENT_LEVELS,
  PLACEMENT_QUESTIONS,
  TUTORS,
  type CefrLevel,
  type ImmersionPack,
  type LearningGoalId,
  type Localized,
  type PackKind,
  type PackTheme,
  type PlacementResult,
} from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/3d/Portrait';
import { spring } from '../../components/animations/motion';
import { EmptyState, Tabs } from '../../components/ui/Controls';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { TypedOnlyTextarea } from '../../components/ui/TypedOnly';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatDate } from '../../utils/format';
import { PageHead } from '../learner/LearnerPages';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const KIND: Record<PackKind, { icon: IconName; label: Localized }> = {
  roleplay: { icon: 'users', label: { en: 'Role play', fr: 'Jeu de rôle' } },
  prompts: { icon: 'message', label: { en: 'Conversation prompts', fr: 'Pistes de conversation' } },
  vocabulary: { icon: 'words', label: { en: 'Vocabulary bank', fr: 'Banque de vocabulaire' } },
  exercise: { icon: 'edit', label: { en: 'Tailored exercise', fr: 'Exercice sur mesure' } },
};
const THEMES: Record<PackTheme, Localized> = {
  meetings: { en: 'Meetings', fr: 'Réunions' },
  negotiation: { en: 'Negotiation', fr: 'Négociation' },
  presentations: { en: 'Presentations', fr: 'Présentations' },
  interviews: { en: 'Interviews', fr: 'Entretiens' },
  travel: { en: 'Travel', fr: 'Voyage' },
  everyday: { en: 'Everyday', fr: 'Quotidien' },
  diplomacy: { en: 'Diplomacy', fr: 'Diplomatie' },
};

function PackSummary({ pack }: { pack: ImmersionPack }) {
  const { l } = useI18n();
  return (
    <div className="row" style={{ ['--gap' as string]: '10px', flexWrap: 'nowrap' }}>
      <span className="tone-icon" data-tone="burgundy"><Icon name={KIND[pack.kind].icon} size={17} /></span>
      <div style={{ minWidth: 0 }}>
        <strong className="clamp-1">{l(pack.title)}</strong>
        <span className="tiny muted">{l(KIND[pack.kind].label)} · {l(THEMES[pack.theme])} · {pack.level}</span>
      </div>
    </div>
  );
}

function PackContent({ pack }: { pack: ImmersionPack }) {
  const { l, lang } = useI18n();
  const { vocabulary, actions } = useStore();
  const toast = useToast();
  return (
    <div className="stack" style={{ ['--gap' as string]: '12px' }}>
      <p className="small" style={{ color: 'var(--ink-2)' }}>{l(pack.brief)}</p>
      <ol className="prompt-list">{pack.prompts.map((p, i) => <li key={i} lang="fr">{p}</li>)}</ol>
      {pack.vocabulary.length > 0 && (
        <div className="row" style={{ ['--gap' as string]: '6px' }}>
          {pack.vocabulary.map((v) => {
            const saved = vocabulary.some((x) => x.fr === v.fr);
            return (
              <button key={v.fr} type="button" className={`chip ${saved ? 'chip-gold' : 'chip-outline'}`} style={{ cursor: saved ? 'default' : 'pointer' }} disabled={saved} title={v.en}
                onClick={() => { void actions.addVocab({ fr: v.fr, en: v.en, example: v.fr, source: l(pack.title) }); toast(lang === 'fr' ? 'Ajouté au carnet' : 'Added to phrasebook'); }}>
                <Icon name={saved ? 'check' : 'plus'} size={12} /> <span lang="fr">{v.fr}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ======================= Learner: My practice ======================= */

export function MyPracticePage() {
  const { t, lang } = useI18n();
  const fr = lang === 'fr';
  const { content } = useStore();
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const todo = content.assignments.filter((a) => a.status !== 'reviewed');
  const done = content.assignments.filter((a) => a.status === 'reviewed');
  const list = tab === 'todo' ? todo : done;
  return (
    <>
      <PageHead title={t('app.practice')} sub={fr ? 'Exercices préparés par votre tuteur pour vos objectifs, à faire avant vos séances d’immersion.' : 'Practice your tutor prepared for your goals, to do before your immersion sessions.'} />
      <Tabs label={t('app.practice')} value={tab} onChange={setTab} options={[{ value: 'todo', label: `${fr ? 'À faire' : 'To do'} · ${todo.length}` }, { value: 'done', label: `${fr ? 'Corrigés' : 'Reviewed'} · ${done.length}` }]} />
      <div className="stack" style={{ ['--gap' as string]: '14px', marginTop: 18, maxWidth: 820 }}>
        {list.map((a) => <PracticeCard key={a.id} id={a.id} />)}
        {!list.length && <div className="card"><EmptyState icon="users" title={tab === 'todo' ? (fr ? 'Rien à faire pour l’instant' : 'Nothing to do right now') : fr ? 'Pas encore de corrections' : 'No feedback yet'}>{fr ? 'Votre tuteur vous enverra des exercices adaptés à vos objectifs.' : 'Your tutor will send practice matched to your goals.'}</EmptyState></div>}
      </div>
    </>
  );
}

function PracticeCard({ id }: { id: string }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { content, actions } = useStore();
  const toast = useToast();
  const a = content.assignments.find((x) => x.id === id)!;
  const pack = content.packs.find((p) => p.id === a.packId);
  const tutor = TUTORS.find((t) => t.id === a.tutorId);
  const [open, setOpen] = useState(a.status === 'assigned');
  const [draft, setDraft] = useState(a.response ?? '');
  const [error, setError] = useState<string | null>(null);
  if (!pack) return null;
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  return (
    <article className="card practice-card" data-status={a.status}>
      <button type="button" className="practice-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <PackSummary pack={pack} />
        <span className="row" style={{ ['--gap' as string]: '8px', flexWrap: 'nowrap' }}>
          <span className="content-status" data-status={a.status === 'reviewed' ? 'published' : a.status === 'submitted' ? 'in-review' : 'draft'}>
            {a.status === 'reviewed' ? (fr ? 'Corrigé' : 'Reviewed') : a.status === 'submitted' ? (fr ? 'Envoyé' : 'Sent') : fr ? 'À faire' : 'To do'}
          </span>
          <Icon name="chevronDown" size={16} className={open ? 'rot-180' : undefined} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="stack" style={{ ['--gap' as string]: '14px', paddingTop: 14 }}>
              {tutor && a.note && (
                <div className="tutor-note">
                  <Avatar spec={tutor.portrait} size={30} />
                  <div><span className="tiny muted">{tutor.name}{a.dueOn ? ` · ${fr ? 'pour le' : 'due'} ${formatDate(a.dueOn, lang, { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}</span><p className="small">{a.note}</p></div>
                </div>
              )}
              <PackContent pack={pack} />
              {a.status === 'reviewed' ? (
                <>
                  <div className="answer-box"><span className="tiny muted">{fr ? 'Votre réponse' : 'Your answer'}</span><p lang="fr">{a.response}</p></div>
                  <div className="feedback-box"><span className="tiny" style={{ fontWeight: 700, color: 'var(--burgundy)' }}>{fr ? 'Retour de' : 'Feedback from'} {tutor?.name}</span><p>{a.feedback}</p></div>
                </>
              ) : (
                <>
                  <label className="sr-only" htmlFor={`resp-${a.id}`}>{fr ? 'Votre réponse' : 'Your answer'}</label>
                  <TypedOnlyTextarea id={`resp-${a.id}`} className="textarea" rows={4} lang="fr" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={fr ? 'Écrivez vos réponses en français…' : 'Write your answers in French…'} />
                  {error && <p className="field-error" role="alert">{error}</p>}
                  <div className="row between">
                    <span className="tiny muted num">{words} {fr ? 'mots' : 'words'}</span>
                    <button type="button" className="btn btn-brand btn-sm" disabled={words < 5 || draft === a.response}
                      onClick={() => actions.content.submitAssignment(a.id, draft).then(() => toast(fr ? 'Envoyé à votre tuteur' : 'Sent to your tutor')).catch((e) => setError(errorText(e)))}>
                      <span>{a.status === 'submitted' ? (fr ? 'Mettre à jour' : 'Update') : fr ? 'Envoyer' : 'Send'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

/* ======================= Staff: Immersion toolkit ======================= */

export function ImmersionPage() {
  const { t, lang } = useI18n();
  const fr = lang === 'fr';
  const { content } = useStore();
  const toReview = content.assignments.filter((a) => a.status === 'submitted');
  const [tab, setTab] = useState<'review' | 'packs' | 'assigned'>(toReview.length ? 'review' : 'packs');
  const [editing, setEditing] = useState<ImmersionPack | 'new' | null>(null);
  const [assigning, setAssigning] = useState<ImmersionPack | null>(null);
  return (
    <>
      <PageHead title={t('app.immersion')} sub={fr ? 'Jeux de rôle, pistes de conversation, banques de vocabulaire et exercices pour vos séances individuelles.' : 'Role plays, conversation prompts, vocabulary banks and exercises for one-on-one sessions.'}>
        <button className="btn btn-brand btn-sm" onClick={() => setEditing('new')}><Icon name="plus" size={15} /> <span>{fr ? 'Nouveau pack' : 'New pack'}</span></button>
      </PageHead>
      <Tabs label={t('app.immersion')} value={tab} onChange={setTab} options={[
        { value: 'review', label: `${fr ? 'À corriger' : 'To review'} · ${toReview.length}` },
        { value: 'packs', label: `${fr ? 'Packs' : 'Packs'} · ${content.packs.length}` },
        { value: 'assigned', label: fr ? 'Assignés' : 'Assigned' },
      ]} />
      <div style={{ marginTop: 18 }}>
        {tab === 'review' && (
          <div className="stack" style={{ ['--gap' as string]: '14px', maxWidth: 860 }}>
            {toReview.map((a) => <ReviewCard key={a.id} id={a.id} />)}
            {!toReview.length && <div className="card"><EmptyState icon="checkCircle" title={fr ? 'Tout est corrigé' : 'All reviewed'} /></div>}
          </div>
        )}
        {tab === 'packs' && (
          <div className="media-grid">
            {content.packs.map((p) => (
              <article key={p.id} className="card pack-card">
                <PackSummary pack={p} />
                <p className="small muted clamp-2" style={{ marginTop: 10 }}>{lang === 'fr' ? p.brief.fr : p.brief.en}</p>
                <div className="row" style={{ ['--gap' as string]: '6px', marginTop: 'auto', paddingTop: 12 }}>
                  <button className="btn btn-brand btn-sm" onClick={() => setAssigning(p)}><span>{fr ? 'Assigner' : 'Assign'}</span></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>{fr ? 'Modifier' : 'Edit'}</button>
                </div>
              </article>
            ))}
          </div>
        )}
        {tab === 'assigned' && (
          <div className="card" style={{ ['--pad' as string]: '6px' }}>
            <ul className="lesson-rows">
              {content.assignments.map((a) => {
                const p = content.packs.find((x) => x.id === a.packId);
                const learner = LEARNERS.find((x) => x.id === a.learnerId);
                return (
                  <li key={a.id}>
                    <div className="lesson-row" style={{ cursor: 'default' }}>
                      {learner && <Avatar spec={learner.portrait} size={30} />}
                      <span className="lesson-row-main"><strong>{learner?.name}</strong><span className="tiny muted">{p ? (lang === 'fr' ? p.title.fr : p.title.en) : a.packId}</span></span>
                      <span className="tiny muted">{formatDate(a.assignedAt, lang, { day: 'numeric', month: 'short' })}</span>
                      <span className="content-status" data-status={a.status === 'reviewed' ? 'published' : a.status === 'submitted' ? 'in-review' : 'draft'}>{a.status === 'reviewed' ? (fr ? 'Corrigé' : 'Reviewed') : a.status === 'submitted' ? (fr ? 'À corriger' : 'To review') : fr ? 'En attente' : 'Waiting'}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      {editing && <PackEditor pack={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {assigning && <AssignModal pack={assigning} onClose={() => setAssigning(null)} />}
    </>
  );
}

function ReviewCard({ id }: { id: string }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { content, actions } = useStore();
  const toast = useToast();
  const a = content.assignments.find((x) => x.id === id)!;
  const pack = content.packs.find((p) => p.id === a.packId);
  const learner = LEARNERS.find((x) => x.id === a.learnerId);
  const [feedback, setFeedback] = useState('');
  return (
    <article className="card stack" style={{ ['--gap' as string]: '12px' }}>
      <div className="row between">
        <div className="row" style={{ ['--gap' as string]: '10px' }}>
          {learner && <Avatar spec={learner.portrait} size={36} />}
          <div><strong>{learner?.name}</strong><div className="tiny muted">{pack ? (fr ? pack.title.fr : pack.title.en) : ''} · {learner?.level}</div></div>
        </div>
        {a.submittedAt && <span className="tiny muted">{formatDate(a.submittedAt, lang, { day: 'numeric', month: 'short' })}</span>}
      </div>
      <div className="answer-box"><p lang="fr">{a.response}</p></div>
      <label className="sr-only" htmlFor={`fb-${a.id}`}>Feedback</label>
      <textarea id={`fb-${a.id}`} className="textarea" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={fr ? 'Corrections et conseils personnalisés…' : 'Corrections and personal advice…'} />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-brand btn-sm" disabled={!feedback.trim()} onClick={() => actions.content.reviewAssignment(a.id, feedback).then(() => toast(fr ? 'Retour envoyé à l’apprenant' : 'Feedback sent to the learner')).catch((e) => toast(errorText(e)))}>
          <span>{fr ? 'Envoyer le retour' : 'Send feedback'}</span>
        </button>
      </div>
    </article>
  );
}

function AssignModal({ pack, onClose }: { pack: ImmersionPack; onClose: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { actions } = useStore();
  const toast = useToast();
  const [learnerId, setLearnerId] = useState(LEARNERS[0].id);
  const [note, setNote] = useState('');
  const [dueOn, setDueOn] = useState('');
  const learner = LEARNERS.find((x) => x.id === learnerId)!;
  return (
    <Modal open onClose={onClose} title={fr ? 'Assigner à un apprenant' : 'Assign to a learner'} width={520}>
      <div className="stack" style={{ ['--gap' as string]: '14px' }}>
        <div className="card card-ivory" style={{ ['--pad' as string]: '12px 14px' }}><PackSummary pack={pack} /></div>
        <label className="field"><span className="label">{fr ? 'Apprenant' : 'Learner'}</span>
          <select className="select" value={learnerId} onChange={(e) => setLearnerId(e.target.value)}>{LEARNERS.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.level}</option>)}</select>
        </label>
        <p className="tiny muted"><Icon name="award" size={12} /> {fr ? 'Objectif' : 'Goal'}: {l(learner.goal)}</p>
        <label className="field"><span className="label">{fr ? 'Consigne personnelle' : 'Personal note'}</span><textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={fr ? 'Pourquoi cet exercice, pour quelle séance…' : 'Why this practice, for which session…'} /></label>
        <label className="field" style={{ maxWidth: 220 }}><span className="label">{fr ? 'Pour le' : 'Due on'}</span><input className="input" type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} /></label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button>
          <button className="btn btn-brand" onClick={() => actions.content.assignPack({ packId: pack.id, learnerId, note, dueOn: dueOn || undefined }).then(() => { toast(fr ? 'Assigné · l’apprenant est notifié' : 'Assigned · the learner is notified'); onClose(); }).catch((e) => toast(errorText(e)))}>
            <span>{fr ? 'Assigner' : 'Assign'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PackEditor({ pack, onClose }: { pack?: ImmersionPack; onClose: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { actions } = useStore();
  const toast = useToast();
  const [kind, setKind] = useState<PackKind>(pack?.kind ?? 'roleplay');
  const [theme, setTheme] = useState<PackTheme>(pack?.theme ?? 'meetings');
  const [level, setLevel] = useState<CefrLevel>(pack?.level ?? 'A2');
  const [title, setTitle] = useState<Localized>(pack?.title ?? { en: '', fr: '' });
  const [brief, setBrief] = useState<Localized>(pack?.brief ?? { en: '', fr: '' });
  const [prompts, setPrompts] = useState((pack?.prompts ?? []).join('\n'));
  const [vocab, setVocab] = useState((pack?.vocabulary ?? []).map((v) => `${v.fr} | ${v.en}`).join('\n'));
  const [error, setError] = useState<string | null>(null);
  const save = () =>
    actions.content
      .savePack({ kind, theme, level, title, brief, prompts: prompts.split('\n').map((s) => s.trim()).filter(Boolean), vocabulary: vocab.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => { const [f = '', en = ''] = s.split('|').map((x) => x.trim()); return { fr: f, en }; }) }, pack?.id)
      .then(() => { toast(fr ? 'Pack enregistré' : 'Pack saved'); onClose(); })
      .catch((e) => setError(errorText(e)));
  return (
    <Modal open onClose={onClose} title={pack ? (fr ? 'Modifier le pack' : 'Edit pack') : fr ? 'Nouveau pack' : 'New pack'} width={620}>
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        <div className="form-grid form-grid-3">
          <label className="field"><span className="label">Type</span><select className="select" value={kind} onChange={(e) => setKind(e.target.value as PackKind)}>{(Object.keys(KIND) as PackKind[]).map((k) => <option key={k} value={k}>{l(KIND[k].label)}</option>)}</select></label>
          <label className="field"><span className="label">{fr ? 'Thème' : 'Theme'}</span><select className="select" value={theme} onChange={(e) => setTheme(e.target.value as PackTheme)}>{(Object.keys(THEMES) as PackTheme[]).map((k) => <option key={k} value={k}>{l(THEMES[k])}</option>)}</select></label>
          <label className="field"><span className="label">{fr ? 'Niveau' : 'Level'}</span><select className="select" value={level} onChange={(e) => setLevel(e.target.value as CefrLevel)}>{PLACEMENT_LEVELS.map((v) => <option key={v}>{v}</option>)}</select></label>
        </div>
        <div className="form-grid">
          <label className="field"><span className="label">{fr ? 'Titre EN' : 'Title EN'}</span><input className="input" value={title.en} onChange={(e) => setTitle({ ...title, en: e.target.value })} /></label>
          <label className="field"><span className="label">{fr ? 'Titre FR' : 'Title FR'}</span><input className="input" lang="fr" value={title.fr} onChange={(e) => setTitle({ ...title, fr: e.target.value })} /></label>
        </div>
        <div className="form-grid">
          <label className="field"><span className="label">{fr ? 'Consigne EN' : 'Brief EN'}</span><textarea className="textarea" rows={2} value={brief.en} onChange={(e) => setBrief({ ...brief, en: e.target.value })} /></label>
          <label className="field"><span className="label">{fr ? 'Consigne FR' : 'Brief FR'}</span><textarea className="textarea" rows={2} lang="fr" value={brief.fr} onChange={(e) => setBrief({ ...brief, fr: e.target.value })} /></label>
        </div>
        <label className="field"><span className="label">{fr ? 'Pistes / répliques (une par ligne, en français)' : 'Prompts (one per line, in French)'}</span><textarea className="textarea mono" rows={4} lang="fr" value={prompts} onChange={(e) => setPrompts(e.target.value)} /></label>
        <label className="field"><span className="label">{fr ? 'Vocabulaire (Français | Anglais)' : 'Vocabulary (French | English)'}</span><textarea className="textarea mono" rows={3} lang="fr" value={vocab} onChange={(e) => setVocab(e.target.value)} /></label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button>
          <button className="btn btn-brand" onClick={() => void save()}><span>{fr ? 'Enregistrer' : 'Save'}</span></button>
        </div>
      </div>
    </Modal>
  );
}

/* ======================= Placement assessment ======================= */

const TIMES = { morning: { en: 'Mornings', fr: 'Le matin' }, lunch: { en: 'Lunchtime', fr: 'À midi' }, evening: { en: 'Evenings', fr: 'Le soir' }, weekend: { en: 'Weekends', fr: 'Le week-end' } } as const;
type Time = keyof typeof TIMES;

export function PlacementPage() {
  const { t, l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content, learner, actions } = useStore();
  const toast = useToast();
  const existing = content.placements.find((p) => p.learnerId === learner.id);
  const [step, setStep] = useState(existing ? 99 : 0); // 0 intro · 1–N levels · N+1 writing · N+2 goals · 99 result
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [writing, setWriting] = useState('');
  const [goals, setGoals] = useState<LearningGoalId[]>([]);
  const [hours, setHours] = useState(3);
  const [times, setTimes] = useState<Time[]>(['evening']);
  const [result, setResult] = useState<PlacementResult | undefined>(existing);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);

  const level = PLACEMENT_LEVELS[step - 1];
  const levelQs = PLACEMENT_QUESTIONS.filter((q) => q.level === level);
  const words = writing.trim() ? writing.trim().split(/\s+/).length : 0;
  const N = PLACEMENT_LEVELS.length; // A1 → C2
  const WRITING = N + 1;
  const GOALS = N + 2;
  const total = N + 3;
  const progress = step === 99 ? 100 : Math.round((step / total) * 100);

  const finish = async () => {
    setError(null);
    try {
      const r = await actions.content.takePlacement({ answers, writingSample: writing, goals, hoursPerWeek: hours, preferredTimes: times });
      setResult(r);
      setStep(99);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <div className="placement">
      <PageHead title={t('app.placement')} sub={fr ? '15 minutes pour trouver votre niveau (A1 à C2) et recevoir un programme personnel.' : '15 minutes to find your level (A1 to C2) and get a personal learning plan.'} />
      {step !== 99 && <div className="placement-bar" aria-hidden><span style={{ width: `${progress}%` }} /></div>}
      <AnimatePresence mode="wait">
        <motion.section key={step} className="card placement-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring.settle}>
          {step === 0 && (
            <div className="stack" style={{ ['--gap' as string]: '16px' }}>
              <h2 className="h3">{fr ? 'Comment ça marche' : 'How it works'}</h2>
              <ol className="steps-list">
                <li>{fr ? `${PLACEMENT_QUESTIONS.length} questions courtes, du niveau A1 au C2` : `${PLACEMENT_QUESTIONS.length} short questions, from A1 to C2`}</li>
                <li>{fr ? 'Quelques lignes en français, tapées par vous' : 'A few lines of French, typed by you'}</li>
                <li>{fr ? 'Vos objectifs et vos disponibilités' : 'Your goals and availability'}</li>
              </ol>
              <p className="small muted">{fr ? 'Pas de pression : arrêtez-vous dès que les questions deviennent trop difficiles. Votre tuteur confirme ensuite votre niveau.' : 'No pressure: stop when questions get too hard. Your tutor then confirms your level.'}</p>
              <div className="row">
                <button className="btn btn-brand" onClick={() => setStep(1)}><span>{fr ? 'Commencer le test' : 'Start the test'}</span> <Icon name="arrowRight" size={15} /></button>
                <button className="btn btn-ghost" onClick={() => { setSkipped(true); setAnswers({}); setWriting(''); setStep(GOALS); }}>{fr ? 'Passer : commencer au niveau A1' : 'Skip: start at beginner level (A1)'}</button>
              </div>
            </div>
          )}
          {step >= 1 && step <= N && (
            <div className="stack" style={{ ['--gap' as string]: '18px' }}>
              <div className="row between"><h2 className="h3">{fr ? 'Niveau' : 'Level'} {level}</h2><span className="tiny muted">{step}/{N}</span></div>
              {levelQs.map((q, qi) => (
                <fieldset key={q.id} className="quiz-q">
                  <legend lang="fr">{qi + 1}. {q.prompt}</legend>
                  <div className="stack" style={{ ['--gap' as string]: '8px' }}>
                    {q.options.map((o, oi) => (
                      <label key={oi} className="quiz-option" data-state={answers[q.id] === oi ? 'selected' : undefined}>
                        <input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} />
                        <span lang="fr">{o}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="row between">
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(WRITING)}>{fr ? 'Trop difficile : passer à l’écrit' : 'Too hard: go to the writing step'}</button>
                <button className="btn btn-brand" disabled={levelQs.some((q) => answers[q.id] === undefined)} onClick={() => setStep(step + 1)}><span>{fr ? 'Suivant' : 'Next'}</span> <Icon name="arrowRight" size={15} /></button>
              </div>
            </div>
          )}
          {step === WRITING && (
            <div className="stack" style={{ ['--gap' as string]: '14px' }}>
              <h2 className="h3">{fr ? 'Présentez-vous en français' : 'Introduce yourself in French'}</h2>
              <p className="small muted">{fr ? 'Votre métier, votre ville, pourquoi vous apprenez le français (15 mots minimum). Faites de votre mieux, même avec des erreurs.' : 'Your job, your city, why you are learning French (at least 15 words). Do your best, mistakes are fine.'}</p>
              <TypedOnlyTextarea className="textarea" rows={5} lang="fr" value={writing} onChange={(e) => setWriting(e.target.value)} placeholder="Je m’appelle… Je travaille à…" aria-label={fr ? 'Votre présentation' : 'Your introduction'} />
              <div className="row between">
                <span className="tiny num" style={{ color: words >= 15 ? 'var(--green)' : 'var(--muted)', fontWeight: 600 }}>{words}/15 {fr ? 'mots' : 'words'}</span>
                <button className="btn btn-brand" disabled={words < 15} onClick={() => setStep(GOALS)}><span>{fr ? 'Suivant' : 'Next'}</span> <Icon name="arrowRight" size={15} /></button>
              </div>
            </div>
          )}
          {step === GOALS && (
            <div className="stack" style={{ ['--gap' as string]: '18px' }}>
              <h2 className="h3">{fr ? 'Pourquoi avez-vous besoin du français ?' : 'What do you need French for?'}</h2>
              <div className="goal-grid" role="group" aria-label={fr ? 'Objectifs' : 'Goals'}>
                {(Object.keys(LEARNING_GOALS) as LearningGoalId[]).map((g) => {
                  const on = goals.includes(g);
                  return <button key={g} type="button" aria-pressed={on} onClick={() => setGoals((x) => (on ? x.filter((y) => y !== g) : [...x, g]))}>{on && <Icon name="check" size={13} />} {l(LEARNING_GOALS[g])}</button>;
                })}
              </div>
              <label className="field" style={{ maxWidth: 360 }}>
                <span className="label">{fr ? 'Temps disponible par semaine' : 'Time available per week'}: <strong className="num">{hours} h</strong></span>
                <input type="range" min={1} max={12} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
              </label>
              <div>
                <span className="label">{fr ? 'Moments préférés' : 'Preferred times'}</span>
                <div className="goal-grid" style={{ marginTop: 6 }}>
                  {(Object.keys(TIMES) as Time[]).map((tm) => {
                    const on = times.includes(tm);
                    return <button key={tm} type="button" aria-pressed={on} onClick={() => setTimes((x) => (on ? x.filter((y) => y !== tm) : [...x, tm]))}>{l(TIMES[tm])}</button>;
                  })}
                </div>
              </div>
              {error && <p className="field-error" role="alert">{error}</p>}
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-brand" onClick={() => void finish()}><span>{fr ? 'Voir mon programme' : 'See my plan'}</span> <Icon name="arrowRight" size={15} /></button>
              </div>
            </div>
          )}
          {step === 99 && result && (
            <div className="stack" style={{ ['--gap' as string]: '18px' }}>
              <div className="placement-result">
                <span className="placement-level">{result.level}</span>
                <div>
                  <h2 className="h3">{fr ? 'Votre niveau de départ' : 'Your starting level'}</h2>
                  <p className="small muted">{skipped || Object.keys(result.answers).length === 0 ? (fr ? 'Vous commencez au niveau débutant.' : 'You start at beginner level.') : fr ? 'Provisoire : votre tuteur confirmera après avoir lu votre texte.' : 'Provisional: your tutor confirms it after reading your writing.'}</p>
                </div>
              </div>
              <div className="plan-grid">
                <div><span className="tiny muted">{fr ? 'Autonomie / semaine' : 'Self-study / week'}</span><strong className="num">{Math.round(result.plan.weeklySelfPacedMinutes / 6) / 10} h</strong></div>
                <div><span className="tiny muted">{fr ? 'Séances d’immersion / semaine' : 'Immersion sessions / week'}</span><strong className="num">{result.plan.weeklyLiveSessions}</strong></div>
                <div><span className="tiny muted">{fr ? 'Priorités' : 'Focus'}</span><strong>{result.plan.focus.slice(0, 2).map(l).join(', ')}</strong></div>
              </div>
              <div>
                <span className="label">{fr ? 'Cours recommandés' : 'Recommended courses'}</span>
                <div className="stack" style={{ ['--gap' as string]: '8px', marginTop: 8 }}>
                  {result.plan.courseIds.map((cid) => {
                    const c = COURSES.find((x) => x.id === cid)!;
                    return <Link key={cid} to={`/app/courses/${cid}`} className="event"><span className="tone-icon" data-tone="burgundy"><Icon name="book" size={16} /></span><span><strong>{l(c.title)}</strong><span className="tiny muted">{c.levels}</span></span></Link>;
                  })}
                </div>
              </div>
              <ol className="steps-list">{result.plan.firstSteps.map((s, i) => <li key={i}>{l(s)}</li>)}</ol>
              <div className="row">
                <Link to="/app" className="btn btn-brand"><span>{fr ? 'Aller au tableau de bord' : 'Go to my dashboard'}</span></Link>
                <button className="btn btn-ghost btn-sm" onClick={() => { setAnswers({}); setWriting(''); setStep(0); toast(fr ? 'Vous pouvez repasser le test' : 'You can retake the test'); }}>{fr ? 'Repasser le test' : 'Retake the test'}</button>
              </div>
            </div>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
