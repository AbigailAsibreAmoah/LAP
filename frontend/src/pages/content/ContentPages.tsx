import {
  ACCENTS,
  BLOCK_LABEL,
  canEditCourse,
  canEditLesson,
  canPublish,
  COURSES,
  courseEditors,
  lessonIssues,
  newBlock,
  OPENING_VIDEO_MAX_SECONDS,
  OPENING_VIDEO_MIN_SECONDS,
  TUTORS,
  type AccentId,
  type Block,
  type BlockType,
  type CefrLevel,
  type ContentStatus,
  type LessonDoc,
  type LessonKind,
  type Localized,
  type MediaAsset,
  type QuizQuestion,
} from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { spring } from '../../components/animations/motion';
import { EmptyState, Tabs } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { AccentChip, BLOCK_ICON, LessonBlock, MediaPlayer } from '../../features/content/LessonBlocks';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatClip, formatDate } from '../../utils/format';
import { PageHead } from '../learner/LearnerPages';

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const KINDS: LessonKind[] = ['video', 'reading', 'speaking', 'quiz', 'assignment', 'live'];
const STATUS_LABEL: Record<ContentStatus, Localized> = {
  draft: { en: 'Draft', fr: 'Brouillon' },
  'in-review': { en: 'In review', fr: 'En relecture' },
  published: { en: 'Published', fr: 'Publiée' },
  archived: { en: 'Archived', fr: 'Archivée' },
};
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const personName = (id: string) => TUTORS.find((t) => t.id === id)?.name ?? (id.startsWith('adm') ? 'La Porte admin' : id);

export function StatusPill({ status }: { status: ContentStatus }) {
  const { l } = useI18n();
  return <span className="content-status" data-status={status}>{l(STATUS_LABEL[status])}</span>;
}

/** Workspace base path for the current role (/admin or /instructor). */
function useBase() {
  const { role } = useStore();
  return role === 'admin' ? '/admin/content' : '/instructor/content';
}

/* ======================= Library ======================= */

export function ContentLibraryPage() {
  const { t, lang } = useI18n();
  const fr = lang === 'fr';
  const { role } = useStore();
  const [tab, setTab] = useState<'lessons' | 'media' | 'access'>('lessons');
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHead title={t('app.library')} sub={fr ? 'Créez, relisez et publiez les leçons. Les apprenants ne voient que les leçons publiées.' : 'Create, review and publish lessons. Learners only see published lessons.'}>
        <button className="btn btn-brand btn-sm" onClick={() => setCreating(true)}><Icon name="plus" size={15} /> <span>{fr ? 'Nouvelle leçon' : 'New lesson'}</span></button>
      </PageHead>
      <Tabs
        label={t('app.library')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'lessons', label: fr ? 'Leçons' : 'Lessons' },
          { value: 'media', label: fr ? 'Médiathèque' : 'Media library' },
          ...(role === 'admin' ? [{ value: 'access' as const, label: fr ? 'Droits d’édition' : 'Editing rights' }] : []),
        ]}
      />
      <div style={{ marginTop: 20 }}>
        {tab === 'lessons' && <LessonList />}
        {tab === 'media' && <MediaLibrary />}
        {tab === 'access' && <EditorAccess />}
      </div>
      <NewLessonModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function LessonList() {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content, user } = useStore();
  const base = useBase();
  const [status, setStatus] = useState<ContentStatus | 'all'>(user.role === 'admin' ? 'in-review' : 'all');
  const [course, setCourse] = useState('all');
  const [level, setLevel] = useState('all');
  const [q, setQ] = useState('');
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, draft: 0, 'in-review': 0, published: 0, archived: 0 };
    content.lessons.forEach((x) => { c[x.status]++; if (x.status !== 'archived') c.all++; });
    return c;
  }, [content.lessons]);
  const rows = content.lessons
    .filter((x) => (status === 'all' ? x.status !== 'archived' : x.status === status))
    .filter((x) => course === 'all' || x.courseId === course)
    .filter((x) => level === 'all' || x.level === level)
    .filter((x) => !q.trim() || x.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="stack" style={{ ['--gap' as string]: '16px' }}>
      <div className="status-filter" role="group" aria-label={fr ? 'Filtrer par statut' : 'Filter by status'}>
        {(['all', 'in-review', 'draft', 'published', 'archived'] as const).map((s) => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s === 'all' ? (fr ? 'Toutes' : 'All') : l(STATUS_LABEL[s])} <span className="num">{counts[s]}</span>
          </button>
        ))}
      </div>
      <div className="filter-row">
        <label className="search-field"><Icon name="search" size={16} /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={fr ? 'Rechercher une leçon' : 'Search lessons'} aria-label={fr ? 'Rechercher' : 'Search'} /></label>
        <select className="select" value={course} onChange={(e) => setCourse(e.target.value)} aria-label={fr ? 'Cours' : 'Course'}>
          <option value="all">{fr ? 'Tous les cours' : 'All courses'}</option>
          {COURSES.map((c) => <option key={c.id} value={c.id}>{l(c.title)}</option>)}
        </select>
        <select className="select" value={level} onChange={(e) => setLevel(e.target.value)} aria-label={fr ? 'Niveau' : 'Level'}>
          <option value="all">{fr ? 'Tous niveaux' : 'All levels'}</option>
          {LEVELS.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      {rows.length ? (
        <div className="card" style={{ ['--pad' as string]: '6px' }}>
          <ul className="lesson-rows">
            {rows.map((x) => {
              const c = COURSES.find((cc) => cc.id === x.courseId)!;
              const first = x.blocks[0];
              const video = first?.type === 'video' ? content.media.find((m) => m.id === first.assetId) : undefined;
              const errors = lessonIssues(x, content.media).filter((i) => i.severity === 'error').length;
              return (
                <li key={x.id}>
                  <Link to={`${base}/lessons/${x.id}`} className="lesson-row">
                    <span className="lesson-row-main">
                      <strong lang="fr">{x.title}</strong>
                      <span className="tiny muted">{l(c.title)} · {l(c.modules[x.moduleIndex].title)}</span>
                    </span>
                    <span className="chip">{x.level}</span>
                    <span className="tiny muted lesson-row-video" title={fr ? 'Vidéo d’ouverture' : 'Opening video'}>
                      <Icon name="video" size={13} /> {video ? formatClip(video.durationSec) : '—'}{video && !video.url ? (fr ? ' · à filmer' : ' · to film') : ''}
                    </span>
                    <span className="lesson-row-status">
                      <StatusPill status={x.status} />
                      {errors > 0 && x.status === 'draft' && <span className="tiny muted">{errors} {fr ? 'à compléter' : 'to complete'}</span>}
                    </span>
                    <Icon name="chevronRight" size={16} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="card"><EmptyState icon="layers" title={fr ? 'Aucune leçon ici' : 'No lessons here'}>{fr ? 'Changez de filtre ou créez une leçon.' : 'Try another filter, or create a lesson.'}</EmptyState></div>
      )}
    </div>
  );
}

function NewLessonModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content, user, actions } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const base = useBase();
  const courses = COURSES.filter((c) => canEditCourse(content, user, c.id));
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [moduleIndex, setModuleIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<CefrLevel>('A2');
  const [kind, setKind] = useState<LessonKind>('video');
  const [minutes, setMinutes] = useState(25);
  const [objective, setObjective] = useState<Localized>({ en: '', fr: '' });
  const [template, setTemplate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const course = COURSES.find((c) => c.id === courseId);

  const create = async () => {
    setError(null);
    try {
      const { lesson } = await actions.content.createLesson({ courseId, moduleIndex, title, level, kind, minutes, objective, useTemplate: template });
      toast(fr ? 'Brouillon créé' : 'Draft created');
      onClose();
      navigate(`${base}/lessons/${lesson.id}`);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={fr ? 'Nouvelle leçon' : 'New lesson'} width={560}>
      {!courses.length ? (
        <p className="muted">{fr ? 'Vous n’avez pas encore de droits d’édition. Demandez à un administrateur.' : 'You don’t have editing rights on any course yet. Ask an administrator.'}</p>
      ) : (
        <form className="stack" style={{ ['--gap' as string]: '14px' }} onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <div className="form-grid">
            <label className="field"><span className="label">{fr ? 'Cours' : 'Course'}</span>
              <select className="select" value={courseId} onChange={(e) => { setCourseId(e.target.value); setModuleIndex(0); }}>{courses.map((c) => <option key={c.id} value={c.id}>{l(c.title)}</option>)}</select>
            </label>
            <label className="field"><span className="label">Module</span>
              <select className="select" value={moduleIndex} onChange={(e) => setModuleIndex(Number(e.target.value))}>{course?.modules.map((m, i) => <option key={i} value={i}>{i + 1}. {l(m.title)}</option>)}</select>
            </label>
          </div>
          <label className="field"><span className="label">{fr ? 'Titre (en français)' : 'Title (in French)'}</span><input className="input" lang="fr" required minLength={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Négocier un délai" /></label>
          <div className="form-grid form-grid-3">
            <label className="field"><span className="label">{fr ? 'Niveau' : 'Level'}</span><select className="select" value={level} onChange={(e) => setLevel(e.target.value as CefrLevel)}>{LEVELS.map((v) => <option key={v}>{v}</option>)}</select></label>
            <label className="field"><span className="label">{fr ? 'Type' : 'Type'}</span><select className="select" value={kind} onChange={(e) => setKind(e.target.value as LessonKind)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label className="field"><span className="label">{fr ? 'Durée (min)' : 'Study time (min)'}</span><input className="input" type="number" min={5} max={240} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
          </div>
          <LocalizedInput label={fr ? 'Objectif' : 'Learning objective'} value={objective} onChange={setObjective} />
          <label className="row small" style={{ ['--gap' as string]: '8px', flexWrap: 'nowrap' }}>
            <input type="checkbox" checked={template} onChange={(e) => setTemplate(e.target.checked)} />
            <span>{fr ? 'Partir du modèle La Porte (vidéo d’ouverture, notes, expressions, écoute, prononciation, quiz, devoir)' : 'Start from the La Porte template (opening video, notes, phrases, listening, pronunciation, quiz, assignment)'}</span>
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button>
            <button className="btn btn-brand" disabled={title.trim().length < 2}><span>{fr ? 'Créer le brouillon' : 'Create draft'}</span></button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ======================= Editor ======================= */

export function LessonEditorPage() {
  const { lessonId } = useParams();
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content, user, actions } = useStore();
  const toast = useToast();
  const base = useBase();
  const saved = content.lessons.find((x) => x.id === lessonId);
  const [doc, setDoc] = useState<LessonDoc | undefined>(saved);
  const [open, setOpen] = useState<string | null>(saved?.blocks[0]?.id ?? null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Pick up the saved version after each save or workflow action.
  const savedVersion = saved?.version;
  useEffect(() => { if (saved) setDoc(saved); }, [savedVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!saved || !doc) return <EmptyState title={fr ? 'Leçon introuvable' : 'Lesson not found'} />;
  const course = COURSES.find((c) => c.id === doc.courseId)!;
  const editable = canEditLesson(content, user, saved);
  const dirty = JSON.stringify(doc) !== JSON.stringify(saved);
  const issues = lessonIssues(doc, content.media);
  const errors = issues.filter((i) => i.severity === 'error');

  const patch = (p: Partial<LessonDoc>) => setDoc((d) => (d ? { ...d, ...p } : d));
  const setBlock = (id: string, b: Block) => patch({ blocks: doc.blocks.map((x) => (x.id === id ? b : x)) });
  const move = (i: number, dir: -1 | 1) => {
    const blocks = [...doc.blocks];
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    patch({ blocks });
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      toast(ok);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const save = () => run(() => actions.content.updateLesson(doc.id, { title: doc.title, level: doc.level, kind: doc.kind, minutes: doc.minutes, moduleIndex: doc.moduleIndex, objective: doc.objective, blocks: doc.blocks }, saved.version), fr ? 'Enregistré' : 'Saved');
  const act = (action: 'submit' | 'publish' | 'request-changes' | 'archive' | 'restore', ok: string) =>
    run(async () => {
      if (dirty && editable) await actions.content.updateLesson(doc.id, { title: doc.title, level: doc.level, kind: doc.kind, minutes: doc.minutes, moduleIndex: doc.moduleIndex, objective: doc.objective, blocks: doc.blocks }, saved.version);
      await actions.content.transition(doc.id, action, note || undefined);
      setNote('');
    }, ok);

  return (
    <div className="editor-layout">
      <div className="editor-head">
        <Link to={base} className="link small"><Icon name="arrowLeft" size={15} /> {fr ? 'Bibliothèque' : 'Library'}</Link>
        <div className="row between" style={{ marginTop: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ ['--gap' as string]: '8px' }}>
              <StatusPill status={saved.status} />
              <span className="tiny muted">v{saved.version} · {l(course.title)}</span>
              {dirty && <span className="tiny" style={{ color: 'var(--gold-700)', fontWeight: 700 }}>{fr ? 'Modifications non enregistrées' : 'Unsaved changes'}</span>}
            </div>
            <h1 className="editor-title" lang="fr">{doc.title || (fr ? 'Sans titre' : 'Untitled')}</h1>
          </div>
          <div className="row" style={{ ['--gap' as string]: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreview(true)}><Icon name="play" size={14} /> {fr ? 'Aperçu apprenant' : 'Learner preview'}</button>
            {editable && <button className="btn btn-secondary btn-sm" disabled={!dirty || busy} onClick={() => void save()}>{fr ? 'Enregistrer' : 'Save'}</button>}
            {editable && saved.status === 'draft' && user.role === 'instructor' && (
              <button className="btn btn-brand btn-sm" disabled={busy || errors.length > 0} onClick={() => void act('submit', fr ? 'Envoyée en relecture' : 'Sent for review')}><span>{fr ? 'Envoyer en relecture' : 'Submit for review'}</span></button>
            )}
            {canPublish(user) && (saved.status === 'draft' || saved.status === 'in-review') && (
              <button className="btn btn-brand btn-sm" disabled={busy || errors.length > 0} onClick={() => void act('publish', fr ? 'Publiée' : 'Published')}><span>{fr ? 'Publier' : 'Publish'}</span></button>
            )}
          </div>
        </div>
        {error && <p className="field-error" role="alert" style={{ marginTop: 10 }}>{error}</p>}
      </div>

      <div className="editor-main">
        {!editable && (
          <div className="policy-note" style={{ marginBottom: 16 }}>
            <Icon name="lock" size={16} />
            <span>{saved.status === 'archived' ? (fr ? 'Leçon archivée : restaurez-la pour la modifier.' : 'Archived: restore it to edit.') : saved.status !== 'draft' && user.role === 'instructor' ? (fr ? 'En relecture ou publiée : seul un administrateur peut la modifier.' : 'In review or published: only an administrator can edit it now.') : fr ? 'Vous n’avez pas les droits d’édition sur ce cours.' : 'You don’t have editing rights on this course.'}</span>
          </div>
        )}
        <fieldset disabled={!editable} className="editor-fieldset">
          <section className="card">
            <h2 className="h4" style={{ marginBottom: 14 }}>{fr ? 'Informations' : 'Details'}</h2>
            <div className="stack" style={{ ['--gap' as string]: '14px' }}>
              <label className="field"><span className="label">{fr ? 'Titre (en français)' : 'Title (in French)'}</span><input className="input" lang="fr" value={doc.title} onChange={(e) => patch({ title: e.target.value })} /></label>
              <div className="form-grid form-grid-4">
                <label className="field"><span className="label">Module</span><select className="select" value={doc.moduleIndex} onChange={(e) => patch({ moduleIndex: Number(e.target.value) })}>{course.modules.map((m, i) => <option key={i} value={i}>{i + 1}. {l(m.title)}</option>)}</select></label>
                <label className="field"><span className="label">{fr ? 'Niveau' : 'Level'}</span><select className="select" value={doc.level} onChange={(e) => patch({ level: e.target.value as CefrLevel })}>{LEVELS.map((v) => <option key={v}>{v}</option>)}</select></label>
                <label className="field"><span className="label">Type</span><select className="select" value={doc.kind} onChange={(e) => patch({ kind: e.target.value as LessonKind })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
                <label className="field"><span className="label">{fr ? 'Durée (min)' : 'Study time (min)'}</span><input className="input" type="number" min={5} max={240} value={doc.minutes} onChange={(e) => patch({ minutes: Number(e.target.value) })} /></label>
              </div>
              <LocalizedInput label={fr ? 'Objectif' : 'Learning objective'} value={doc.objective} onChange={(objective) => patch({ objective })} />
            </div>
          </section>

          <div className="block-list">
            {doc.blocks.map((b, i) => {
              const isOpen = open === b.id;
              return (
                <motion.section key={b.id} layout transition={spring.settle} className="card block-card" data-open={isOpen || undefined}>
                  <div className="block-head">
                    <button type="button" className="block-toggle" onClick={() => setOpen(isOpen ? null : b.id)} aria-expanded={isOpen}>
                      <span className="tone-icon" data-tone={i === 0 && b.type === 'video' ? 'gold' : 'burgundy'}><Icon name={BLOCK_ICON[b.type]} size={16} /></span>
                      <span style={{ minWidth: 0 }}>
                        <strong>{i === 0 && b.type === 'video' ? (fr ? 'Vidéo d’ouverture' : 'Opening video') : l(BLOCK_LABEL[b.type])}</strong>
                        <span className="tiny muted">{blockSummary(b, content.media, fr)}</span>
                      </span>
                    </button>
                    <div className="block-tools">
                      <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={fr ? 'Monter' : 'Move up'}><Icon name="chevronDown" size={15} className="rot-180" /></button>
                      <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === doc.blocks.length - 1} aria-label={fr ? 'Descendre' : 'Move down'}><Icon name="chevronDown" size={15} /></button>
                      <button type="button" className="icon-btn" onClick={() => patch({ blocks: doc.blocks.filter((x) => x.id !== b.id) })} aria-label={fr ? 'Supprimer' : 'Remove'}><Icon name="x" size={15} /></button>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                        <div className="block-body"><BlockEditor block={b} opening={i === 0} onChange={(nb) => setBlock(b.id, nb)} /></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>
              );
            })}
          </div>
          {editable && (
            <div style={{ marginTop: 14 }}>
              {adding ? (
                <div className="card add-grid">
                  {(Object.keys(BLOCK_LABEL) as BlockType[]).map((type) => (
                    <button key={type} type="button" onClick={() => { const nb = newBlock(type, (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`); patch({ blocks: [...doc.blocks, nb] }); setOpen(nb.id); setAdding(false); }}>
                      <Icon name={BLOCK_ICON[type]} size={18} /> {l(BLOCK_LABEL[type])}
                    </button>
                  ))}
                </div>
              ) : (
                <button type="button" className="btn btn-secondary btn-block" onClick={() => setAdding(true)}><Icon name="plus" size={15} /> {fr ? 'Ajouter une activité' : 'Add an activity'}</button>
              )}
            </div>
          )}
        </fieldset>
      </div>

      <aside className="editor-side">
        <section className="card">
          <h2 className="h4" style={{ marginBottom: 10 }}>{fr ? 'Prêt à publier ?' : 'Ready to publish?'}</h2>
          {issues.length ? (
            <ul className="checklist">
              {issues.map((i, k) => <li key={k} data-severity={i.severity}><Icon name={i.severity === 'error' ? 'x' : 'clock'} size={14} /> {l(i.message)}</li>)}
            </ul>
          ) : (
            <p className="small" style={{ color: 'var(--green)', fontWeight: 600 }}><Icon name="checkCircle" size={15} /> {fr ? 'Tout est en ordre.' : 'Everything is in place.'}</p>
          )}
          <p className="tiny muted" style={{ marginTop: 10 }}>{fr ? `Chaque leçon commence par une vidéo d’environ 5 minutes (${formatClip(OPENING_VIDEO_MIN_SECONDS)}–${formatClip(OPENING_VIDEO_MAX_SECONDS)}).` : `Every lesson opens with a video of about 5 minutes (${formatClip(OPENING_VIDEO_MIN_SECONDS)}–${formatClip(OPENING_VIDEO_MAX_SECONDS)}).`}</p>
        </section>

        {saved.reviewNote && (
          <section className="card review-note">
            <h2 className="h4">{fr ? 'Retour de relecture' : 'Review feedback'}</h2>
            <p className="small">{saved.reviewNote}</p>
          </section>
        )}

        {canPublish(user) && saved.status !== 'published' && saved.status !== 'archived' && (
          <section className="card">
            <h2 className="h4" style={{ marginBottom: 8 }}>{fr ? 'Relecture' : 'Review'}</h2>
            <textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={fr ? 'Ce qu’il faut changer…' : 'What needs to change…'} />
            <button className="btn btn-secondary btn-sm btn-block" style={{ marginTop: 8 }} disabled={saved.status !== 'in-review' || !note.trim() || busy} onClick={() => void act('request-changes', fr ? 'Renvoyée à l’auteur' : 'Sent back to the author')}>
              {fr ? 'Demander des modifications' : 'Request changes'}
            </button>
          </section>
        )}

        <section className="card">
          <h2 className="h4" style={{ marginBottom: 8 }}>{fr ? 'Historique' : 'History'}</h2>
          <ol className="lesson-history">
            {saved.history.slice(0, 8).map((h, i) => (
              <li key={i}><strong>{historyLabel(h.action, fr)}</strong> <span className="tiny muted">· {personName(h.by)} · {formatDate(h.at, lang, { day: 'numeric', month: 'short' })}</span>{h.note && <div className="tiny muted">“{h.note}”</div>}</li>
            ))}
          </ol>
          {canPublish(user) && (
            <button className="link tiny" style={{ marginTop: 10 }} onClick={() => void act(saved.status === 'archived' ? 'restore' : 'archive', saved.status === 'archived' ? (fr ? 'Restaurée' : 'Restored') : fr ? 'Archivée' : 'Archived')}>
              {saved.status === 'archived' ? (fr ? 'Restaurer la leçon' : 'Restore lesson') : fr ? 'Archiver la leçon' : 'Archive lesson'}
            </button>
          )}
        </section>
      </aside>

      <Modal open={preview} onClose={() => setPreview(false)} title={fr ? 'Aperçu apprenant' : 'Learner preview'} width={760}>
        <div className="stack preview-body" style={{ ['--gap' as string]: '18px' }}>
          <div>
            <span className="chip chip-burgundy">{doc.level}</span>
            <h2 style={{ marginTop: 8 }} lang="fr">{doc.title}</h2>
            <p className="muted small">{l(doc.objective)}</p>
          </div>
          {doc.blocks.map((b) => (
            <section key={b.id}>
              <div className="lesson-section-head"><span className="tone-icon" data-tone="burgundy"><Icon name={BLOCK_ICON[b.type]} size={16} /></span><h3 className="h4">{l(BLOCK_LABEL[b.type])}</h3></div>
              <LessonBlock block={b} lesson={doc} media={content.media} />
            </section>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function historyLabel(a: string, fr: boolean) {
  const m: Record<string, [string, string]> = {
    created: ['Created', 'Créée'],
    edited: ['Edited', 'Modifiée'],
    submitted: ['Submitted for review', 'Envoyée en relecture'],
    published: ['Published', 'Publiée'],
    'changes-requested': ['Changes requested', 'Modifications demandées'],
    archived: ['Archived', 'Archivée'],
    restored: ['Restored', 'Restaurée'],
  };
  return (m[a] ?? [a, a])[fr ? 1 : 0];
}

function blockSummary(b: Block, media: MediaAsset[], fr: boolean) {
  const asset = 'assetId' in b ? media.find((m) => m.id === b.assetId) : undefined;
  switch (b.type) {
    case 'video': return asset ? `${asset.title} · ${formatClip(asset.durationSec)}${asset.url ? '' : fr ? ' · à filmer' : ' · to film'}` : fr ? 'Aucune vidéo choisie' : 'No video chosen';
    case 'notes': return b.heading || (fr ? 'Sans titre' : 'Untitled');
    case 'dialogue': return `${b.lines.length} ${fr ? 'répliques' : 'lines'}`;
    case 'phrases': return `${b.phrases.length} ${fr ? 'expressions' : 'phrases'}`;
    case 'listening': return `${asset ? asset.title : fr ? 'Aucun audio' : 'No audio'} · ${b.questions.length} question(s)`;
    case 'pronunciation': return `${b.items.length} ${fr ? 'éléments' : 'items'}`;
    case 'quiz': return `${b.questions.length} question(s)`;
    case 'assignment': return `${b.minWords} ${fr ? 'mots minimum' : 'words minimum'}`;
    case 'roleplay': return `${b.prompts.length} ${fr ? 'répliques' : 'prompts'}`;
  }
}

/* ---------- Block editors ---------- */

function LocalizedInput({ label, value, onChange, rows }: { label: string; value: Localized; onChange: (v: Localized) => void; rows?: number }) {
  const Tag = rows ? 'textarea' : 'input';
  return (
    <fieldset className="loc-field">
      <legend className="label">{label}</legend>
      <div className="form-grid">
        <label className="loc-input"><span>EN</span><Tag className={rows ? 'textarea' : 'input'} rows={rows} value={value.en} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange({ ...value, en: e.target.value })} /></label>
        <label className="loc-input"><span>FR</span><Tag className={rows ? 'textarea' : 'input'} rows={rows} lang="fr" value={value.fr} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange({ ...value, fr: e.target.value })} /></label>
      </div>
    </fieldset>
  );
}

/** One record per line, fields separated by "|": fast for authors, no nested forms. */
function LinesField<T>({ label, hint, items, toLine, fromLine, onChange, rows = 4 }: { label: string; hint: string; items: T[]; toLine: (t: T) => string; fromLine: (parts: string[]) => T; onChange: (t: T[]) => void; rows?: number }) {
  const [text, setText] = useState(() => items.map(toLine).join('\n'));
  return (
    <label className="field">
      <span className="label">{label}</span>
      <textarea
        className="textarea mono"
        rows={rows}
        lang="fr"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split('\n').map((ln) => ln.trim()).filter(Boolean).map((ln) => fromLine(ln.split('|').map((s) => s.trim()))));
        }}
      />
      <span className="tiny muted">{hint}</span>
    </label>
  );
}

function MediaSelect({ kind, value, onChange }: { kind: 'video' | 'audio'; value: string; onChange: (id: string) => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content } = useStore();
  const options = content.media.filter((m) => m.kind === kind);
  const current = options.find((m) => m.id === value);
  const [uploading, setUploading] = useState(false);
  return (
    <div className="stack" style={{ ['--gap' as string]: '10px' }}>
      <div className="row" style={{ ['--gap' as string]: '8px', flexWrap: 'nowrap' }}>
        <select className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={kind === 'video' ? 'Video' : 'Audio'}>
          <option value="">{fr ? '— Choisir —' : '— Choose —'}</option>
          {options.map((m) => <option key={m.id} value={m.id}>{m.title} · {formatClip(m.durationSec)}{m.accent ? ` · ${l(ACCENTS[m.accent])}` : ''}{m.url ? '' : fr ? ' (à livrer)' : ' (pending file)'}</option>)}
        </select>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setUploading(true)} style={{ flex: 'none' }}><Icon name="plus" size={14} /> {fr ? 'Téléverser' : 'Upload'}</button>
      </div>
      {current && <MediaPlayer asset={current} />}
      <UploadModal open={uploading} kind={kind} onClose={() => setUploading(false)} onUploaded={(id) => { onChange(id); setUploading(false); }} />
    </div>
  );
}

function QuestionsEditor({ questions, onChange }: { questions: QuizQuestion[]; onChange: (q: QuizQuestion[]) => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const set = (i: number, q: Partial<QuizQuestion>) => onChange(questions.map((x, j) => (j === i ? { ...x, ...q } : x)));
  return (
    <div className="stack" style={{ ['--gap' as string]: '14px' }}>
      {questions.map((q, i) => (
        <div key={q.id} className="question-edit">
          <div className="row between"><span className="label">Question {i + 1}</span><button type="button" className="link tiny" onClick={() => onChange(questions.filter((_, j) => j !== i))}>{fr ? 'Supprimer' : 'Remove'}</button></div>
          <input className="input" lang="fr" value={q.prompt} onChange={(e) => set(i, { prompt: e.target.value })} placeholder={fr ? 'Énoncé en français' : 'Prompt in French'} />
          <div className="stack" style={{ ['--gap' as string]: '6px' }}>
            {q.options.map((o, oi) => (
              <label key={oi} className="row" style={{ ['--gap' as string]: '8px', flexWrap: 'nowrap' }}>
                <input type="radio" name={`ans-${q.id}`} checked={q.answer === oi} onChange={() => set(i, { answer: oi })} aria-label={fr ? 'Bonne réponse' : 'Correct answer'} />
                <input className="input" lang="fr" value={o} onChange={(e) => set(i, { options: q.options.map((x, k) => (k === oi ? e.target.value : x)) })} placeholder={`Option ${oi + 1}`} />
              </label>
            ))}
          </div>
          <input className="input" value={q.explanation.en} onChange={(e) => set(i, { explanation: { ...q.explanation, en: e.target.value } })} placeholder={fr ? 'Explication (EN)' : 'Explanation (EN)'} />
          <input className="input" lang="fr" value={q.explanation.fr} onChange={(e) => set(i, { explanation: { ...q.explanation, fr: e.target.value } })} placeholder={fr ? 'Explication (FR)' : 'Explanation (FR)'} />
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...questions, { id: `q-${Date.now().toString(36)}`, prompt: '', options: ['', '', ''], answer: 0, explanation: { en: '', fr: '' } }])}><Icon name="plus" size={14} /> {fr ? 'Ajouter une question' : 'Add question'}</button>
    </div>
  );
}

function BlockEditor({ block: b, opening, onChange }: { block: Block; opening: boolean; onChange: (b: Block) => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  switch (b.type) {
    case 'video':
      return (
        <div className="stack" style={{ ['--gap' as string]: '12px' }}>
          {opening && <p className="tiny muted">{fr ? 'La vidéo d’ouverture doit durer environ 5 minutes (4 à 6 min).' : 'The opening video must be about 5 minutes long (4 to 6 min).'}</p>}
          <MediaSelect kind="video" value={b.assetId} onChange={(assetId) => onChange({ ...b, assetId })} />
          <LocalizedInput label={fr ? 'Légende (facultatif)' : 'Caption (optional)'} value={b.caption ?? { en: '', fr: '' }} onChange={(caption) => onChange({ ...b, caption })} />
        </div>
      );
    case 'notes':
      return (
        <div className="stack" style={{ ['--gap' as string]: '12px' }}>
          <label className="field"><span className="label">{fr ? 'Titre (FR)' : 'Heading (FR)'}</span><input className="input" lang="fr" value={b.heading} onChange={(e) => onChange({ ...b, heading: e.target.value })} /></label>
          <LocalizedInput label={fr ? 'Notes' : 'Notes'} rows={5} value={b.body} onChange={(body) => onChange({ ...b, body })} />
        </div>
      );
    case 'dialogue':
      return <LinesField label={fr ? 'Répliques' : 'Lines'} hint={fr ? 'Une réplique par ligne : Personnage | Français | Anglais' : 'One line each: Speaker | French | English'} items={b.lines} toLine={(x) => `${x.speaker} | ${x.fr} | ${x.en}`} fromLine={([speaker = '', f = '', en = '']) => ({ speaker, fr: f, en })} onChange={(lines) => onChange({ ...b, lines })} rows={6} />;
    case 'phrases':
      return <LinesField label={fr ? 'Expressions' : 'Phrases'} hint={fr ? 'Une par ligne : Français | Anglais' : 'One per line: French | English'} items={b.phrases} toLine={(x) => `${x.fr} | ${x.en}`} fromLine={([f = '', en = '']) => ({ fr: f, en })} onChange={(phrases) => onChange({ ...b, phrases })} />;
    case 'listening':
      return (
        <div className="stack" style={{ ['--gap' as string]: '14px' }}>
          <MediaSelect kind="audio" value={b.assetId} onChange={(assetId) => onChange({ ...b, assetId })} />
          <LocalizedInput label={fr ? 'Consigne' : 'Instructions'} value={b.instructions} onChange={(instructions) => onChange({ ...b, instructions })} />
          <QuestionsEditor questions={b.questions} onChange={(questions) => onChange({ ...b, questions })} />
        </div>
      );
    case 'pronunciation':
      return (
        <div className="stack" style={{ ['--gap' as string]: '12px' }}>
          <LocalizedInput label={fr ? 'Objectif de prononciation' : 'Pronunciation focus'} value={b.focus} onChange={(focus) => onChange({ ...b, focus })} />
          <LinesField label={fr ? 'Éléments' : 'Items'} hint={fr ? 'Un par ligne : Français (marquez les liaisons avec _) | Conseil EN | Conseil FR' : 'One per line: French (mark liaisons with _) | Tip EN | Tip FR'} items={b.items} toLine={(x) => `${x.fr} | ${x.tip.en} | ${x.tip.fr}`} fromLine={([f = '', en = '', tfr = '']) => ({ fr: f, tip: { en, fr: tfr } })} onChange={(items) => onChange({ ...b, items: items.map((it, i) => ({ ...it, assetId: b.items[i]?.assetId })) })} />
        </div>
      );
    case 'quiz':
      return <QuestionsEditor questions={b.questions} onChange={(questions) => onChange({ ...b, questions })} />;
    case 'assignment':
      return (
        <div className="stack" style={{ ['--gap' as string]: '12px' }}>
          <LocalizedInput label={fr ? 'Consigne' : 'Prompt'} rows={3} value={b.prompt} onChange={(prompt) => onChange({ ...b, prompt })} />
          <label className="field" style={{ maxWidth: 200 }}><span className="label">{fr ? 'Mots minimum' : 'Minimum words'}</span><input className="input" type="number" min={1} max={2000} value={b.minWords} onChange={(e) => onChange({ ...b, minWords: Number(e.target.value) })} /></label>
          <p className="tiny muted">{fr ? 'Les apprenants doivent taper leur réponse : le collage est désactivé.' : 'Learners must type their answer: pasting is turned off.'}</p>
        </div>
      );
    case 'roleplay':
      return (
        <div className="stack" style={{ ['--gap' as string]: '12px' }}>
          <LocalizedInput label={fr ? 'Situation' : 'Situation'} rows={2} value={b.situation} onChange={(situation) => onChange({ ...b, situation })} />
          <LocalizedInput label={fr ? 'Rôle de l’apprenant' : 'Learner’s role'} value={b.learnerRole} onChange={(learnerRole) => onChange({ ...b, learnerRole })} />
          <LocalizedInput label={fr ? 'Rôle du partenaire' : 'Partner’s role'} value={b.partnerRole} onChange={(partnerRole) => onChange({ ...b, partnerRole })} />
          <LinesField label={fr ? 'Répliques à produire' : 'Prompts'} hint={fr ? 'Une par ligne, en français' : 'One per line, in French'} items={b.prompts} toLine={(x) => x} fromLine={([x = '']) => x} onChange={(prompts) => onChange({ ...b, prompts })} />
        </div>
      );
  }
}

/* ======================= Media ======================= */

/** Reads a local file's duration in the browser so length rules apply before uploading. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
    el.preload = 'metadata';
    const url = URL.createObjectURL(file);
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(el.duration); };
    el.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this file.')); };
    el.src = url;
  });
}

function UploadModal({ open, kind, onClose, onUploaded, replace }: { open: boolean; kind?: 'video' | 'audio'; onClose: () => void; onUploaded?: (id: string) => void; replace?: MediaAsset }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { actions } = useStore();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [title, setTitle] = useState(replace?.title ?? '');
  const [accent, setAccent] = useState<AccentId | ''>(replace?.accent ?? '');
  const [speaker, setSpeaker] = useState(replace?.speaker ?? '');
  const [transcript, setTranscript] = useState(replace?.transcript ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isVideo = file ? file.type.startsWith('video/') : (replace?.kind ?? kind) === 'video';
  const tooLong = isVideo && duration !== null && duration > OPENING_VIDEO_MAX_SECONDS;
  const input = useRef<HTMLInputElement>(null);

  const pick = async (f: File | undefined) => {
    setError(null);
    setFile(f ?? null);
    setDuration(null);
    if (!f) return;
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    try { setDuration(await readDuration(f)); } catch (e) { setError(errorText(e)); }
  };
  const submit = async () => {
    if (!file || duration === null) return;
    setBusy(true);
    setError(null);
    try {
      const out = await actions.content.uploadMedia(file, { title, accent: accent || undefined, speaker: speaker || undefined, transcript: transcript || undefined, durationSec: Math.round(duration * 10) / 10, replaceId: replace?.id });
      toast(fr ? 'Fichier ajouté' : 'File added');
      onUploaded?.(out.asset.id);
      onClose();
      setFile(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const accept = (replace?.kind ?? kind) === 'video' ? 'video/mp4,video/quicktime,video/webm' : (replace?.kind ?? kind) === 'audio' ? 'audio/*' : 'video/mp4,video/quicktime,video/webm,audio/*';
  return (
    <Modal open={open} onClose={onClose} title={replace ? (fr ? 'Livrer le fichier' : 'Deliver the file') : fr ? 'Téléverser un média' : 'Upload media'} width={560}>
      <div className="stack" style={{ ['--gap' as string]: '14px' }}>
        <button type="button" className="drop-zone" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files[0]); }}>
          <Icon name={isVideo ? 'video' : 'headphones'} size={22} />
          {file ? (
            <span><strong>{file.name}</strong><span className="tiny muted"> · {(file.size / 1024 / 1024).toFixed(1)} MB{duration !== null ? ` · ${formatClip(duration)}` : ''}</span></span>
          ) : (
            <span>{fr ? 'Glissez un fichier ici ou cliquez pour choisir' : 'Drop a file here or click to choose'}<span className="tiny muted" style={{ display: 'block' }}>MP4 · MOV · WebM · MP3 · M4A · WAV</span></span>
          )}
        </button>
        <input ref={input} type="file" accept={accept} hidden onChange={(e) => void pick(e.target.files?.[0])} />
        {isVideo && <p className={`tiny ${tooLong ? '' : 'muted'}`} style={tooLong ? { color: 'var(--burgundy)', fontWeight: 600 } : undefined}>{tooLong ? (fr ? `Trop long (${formatClip(duration!)}) : 6 minutes maximum.` : `Too long (${formatClip(duration!)}): 6 minutes maximum.`) : fr ? 'Les vidéos d’ouverture durent environ 5 minutes ; 6 minutes maximum.' : 'Opening videos run about 5 minutes; 6 minutes maximum.'}</p>}
        <label className="field"><span className="label">{fr ? 'Titre' : 'Title'}</span><input className="input" lang="fr" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        {!isVideo && (
          <div className="form-grid">
            <label className="field"><span className="label">{fr ? 'Accent' : 'Accent'}</span>
              <select className="select" value={accent} onChange={(e) => setAccent(e.target.value as AccentId)}><option value="">—</option>{(Object.keys(ACCENTS) as AccentId[]).map((a) => <option key={a} value={a}>{l(ACCENTS[a])}</option>)}</select>
            </label>
            <label className="field"><span className="label">{fr ? 'Locuteur' : 'Speaker'}</span><input className="input" value={speaker} onChange={(e) => setSpeaker(e.target.value)} /></label>
          </div>
        )}
        <label className="field"><span className="label">{fr ? 'Transcription (sous-titres, faible connexion)' : 'Transcript (captions, low-data mode)'}</span><textarea className="textarea" lang="fr" rows={3} value={transcript} onChange={(e) => setTranscript(e.target.value)} /></label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button>
          <button type="button" className="btn btn-brand" disabled={!file || duration === null || tooLong || !title.trim() || busy} aria-busy={busy} onClick={() => void submit()}><span>{fr ? 'Téléverser' : 'Upload'}</span></button>
        </div>
      </div>
    </Modal>
  );
}

function MediaLibrary() {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { content, actions } = useStore();
  const toast = useToast();
  const [kind, setKind] = useState<'all' | 'video' | 'audio' | 'pending'>('all');
  const [uploading, setUploading] = useState(false);
  const [deliver, setDeliver] = useState<MediaAsset | null>(null);
  const [playing, setPlaying] = useState<MediaAsset | null>(null);
  const usage = (id: string) => content.lessons.filter((x) => x.status !== 'archived' && x.blocks.some((b) => ('assetId' in b && b.assetId === id) || (b.type === 'pronunciation' && b.items.some((i) => i.assetId === id)))).length;
  const list = content.media.filter((m) => (kind === 'all' ? true : kind === 'pending' ? !m.url : m.kind === kind));
  const pending = content.media.filter((m) => !m.url).length;

  return (
    <div className="stack" style={{ ['--gap' as string]: '16px' }}>
      <div className="row between">
        <div className="status-filter" role="group" aria-label={fr ? 'Filtrer' : 'Filter'}>
          {([['all', fr ? 'Tout' : 'All'], ['video', fr ? 'Vidéos' : 'Videos'], ['audio', 'Audio'], ['pending', fr ? 'À livrer' : 'Awaiting file']] as const).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={kind === v} onClick={() => setKind(v)}>{label}{v === 'pending' && <span className="num">{pending}</span>}</button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setUploading(true)}><Icon name="plus" size={14} /> {fr ? 'Téléverser' : 'Upload'}</button>
      </div>
      <div className="media-grid">
        {list.map((m) => {
          const used = usage(m.id);
          return (
            <article key={m.id} className="card media-card">
              <div className="row" style={{ ['--gap' as string]: '10px', flexWrap: 'nowrap' }}>
                <span className="tone-icon" data-tone={m.kind === 'video' ? 'burgundy' : 'navy'}><Icon name={m.kind === 'video' ? 'video' : 'headphones'} size={17} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong className="clamp-1" lang="fr">{m.title}</strong>
                  <span className="tiny muted">{formatClip(m.durationSec)} · {used} {fr ? 'leçon(s)' : 'lesson(s)'}</span>
                </div>
              </div>
              <div className="row" style={{ ['--gap' as string]: '6px', marginTop: 10 }}>
                <AccentChip asset={m} />
                {m.url ? <span className="content-status" data-status="published">{fr ? 'Fichier en ligne' : 'File live'}</span> : <span className="content-status" data-status="draft">{fr ? 'À livrer' : 'Awaiting file'}</span>}
              </div>
              <div className="row" style={{ ['--gap' as string]: '6px', marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setPlaying(m)}><Icon name="play" size={13} /> {fr ? 'Écouter / voir' : 'Preview'}</button>
                {!m.url && <button className="btn btn-secondary btn-sm" onClick={() => setDeliver(m)}>{fr ? 'Livrer le fichier' : 'Deliver file'}</button>}
                {!used && (
                  <button className="btn btn-ghost btn-sm" onClick={() => actions.content.deleteMedia(m.id).then(() => toast(fr ? 'Supprimé' : 'Deleted')).catch((e) => toast(errorText(e)))} aria-label={fr ? 'Supprimer' : 'Delete'}><Icon name="x" size={13} /></button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <UploadModal open={uploading} onClose={() => setUploading(false)} />
      {deliver && <UploadModal open onClose={() => setDeliver(null)} replace={deliver} />}
      <Modal open={!!playing} onClose={() => setPlaying(null)} title={playing?.title ?? ''} width={720}>{playing && <MediaPlayer asset={playing} />}</Modal>
    </div>
  );
}

/* ======================= Editing rights ======================= */

function EditorAccess() {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content, actions } = useStore();
  const toast = useToast();
  return (
    <div className="card" style={{ ['--pad' as string]: '6px 0' }}>
      <p className="small muted" style={{ padding: '12px 20px 4px' }}>{fr ? 'Le tuteur principal peut toujours modifier son cours. Ajoutez d’autres tuteurs autorisés à rédiger des brouillons.' : 'The lead tutor can always edit their course. Add other tutors who may write drafts.'}</p>
      <ul className="access-list">
        {COURSES.map((c) => {
          const lead = c.tutorId;
          const editors = courseEditors(content, c.id);
          return (
            <li key={c.id}>
              <div style={{ minWidth: 0 }}>
                <strong>{l(c.title)}</strong>
                <span className="tiny muted">{fr ? 'Tuteur principal' : 'Lead'}: {personName(lead)}</span>
              </div>
              <div className="row" style={{ ['--gap' as string]: '6px' }}>
                {TUTORS.filter((t) => t.id !== lead).map((t) => {
                  const on = editors.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`chip ${on ? 'chip-burgundy' : 'chip-outline'}`}
                      style={{ cursor: 'pointer', minHeight: 30 }}
                      aria-pressed={on}
                      onClick={() => {
                        const next = on ? (content.editors[c.id] ?? []).filter((x) => x !== t.id) : [...(content.editors[c.id] ?? []), t.id];
                        actions.content.setEditors(c.id, next).then(() => toast(fr ? 'Droits mis à jour' : 'Access updated')).catch((e) => toast(errorText(e)));
                      }}
                    >
                      {on && <Icon name="check" size={12} />} {t.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
