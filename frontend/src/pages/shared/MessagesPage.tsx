import { classmatesOf, CONTACT_BLOCK_MESSAGE, REPORT_REASONS, type ReportReason, findContactDetails, LEARNERS, TUTORS, type MessageThread } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/3d/Portrait';
import { PresenceBadge, TutorAvatar } from '../../features/presence/PresenceUI';
import { spring } from '../../components/animations/motion';
import { EmptyState, Notice } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { CallScreen, type CallKind } from '../../features/community/ClassmateChat';
import { useUnread } from '../../features/messages/unread';
import { useLiveChat, useTypingSignal } from '../../features/messages/liveChat';
import { demoReply, isDemoClassmate, typingTime } from '../../features/messages/demoReplies';
import { useI18n } from '../../i18n/I18nProvider';
import { DEMO_ADMIN_ID, useStore } from '../../state/AppStore';
import { formatDate, formatTime } from '../../utils/format';
import { PageHead } from '../learner/LearnerPages';

function person(id: string) {
  const l = LEARNERS.find((x) => x.id === id);
  if (l) return { name: l.name, spec: l.portrait };
  const t = TUTORS.find((x) => x.id === id);
  if (t) return { name: t.name, spec: t.portrait };
  return { name: 'La Porte Support', spec: null };
}

export function MessagesPage() {
  const { t, l, lang } = useI18n();
  const { threads, userId, actions, content } = useStore();
  const mine = threads.filter((th) => th.participantIds.includes(userId));
  const toast = useToast();
  const isInbox = userId === DEMO_ADMIN_ID; // admins read the shared La Porte Support inbox
  // Inbox: conversations the team has dealt with (kept on this device in the demo).
  // A conversation counts as resolved until someone writes in it again.
  const [resolvedAt, setResolvedAt] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem('laporte-inbox-resolved') ?? '{}'); } catch { return {}; } });
  const isResolved = (th: MessageThread) => !!resolvedAt[th.id] && (th.messages[th.messages.length - 1]?.at ?? '') <= resolvedAt[th.id];
  const toggleResolved = (th: MessageThread) => setResolvedAt((r) => { const next = { ...r }; if (isResolved(th)) delete next[th.id]; else next[th.id] = new Date().toISOString(); try { localStorage.setItem('laporte-inbox-resolved', JSON.stringify(next)); } catch { /* blocked */ } return next; });
  // Learners and tutors who haven't written to support yet see it as a contact.
  const hasSupport = mine.some((th) => th.participantIds.includes(DEMO_ADMIN_ID));
  const [newSupport, setNewSupport] = useState(false);
  const [params, setParams] = useSearchParams();
  const withId = params.get('with');
  const threadWith = (id: string) => mine.find((th) => th.participantIds.length === 2 && th.participantIds.includes(id));
  const [activeId, setActiveId] = useState(params.get('thread') ?? (withId ? threadWith(withId)?.id : undefined));
  // Opening a classmate with no conversation yet shows a fresh "new conversation" pane.
  const [newWith, setNewWith] = useState<string | null>(withId && !threadWith(withId) ? withId : null);
  const [call, setCall] = useState<CallKind | null>(null);
  // On phones the list and the conversation take turns on screen, like a messaging app.
  const [openOnPhone, setOpenOnPhone] = useState(Boolean(params.get('thread') || withId));
  const [reporting, setReporting] = useState<{ messageId: string; body: string; from: string } | null>(null);
  const [reason, setReason] = useState<ReportReason>('contact');
  const [reportNote, setReportNote] = useState('');
  // Every classmate is listed by default, even before the first message.
  const freshMates = userId.startsWith('lrn-') ? classmatesOf(content, userId).filter((m) => !threadWith(m.id)) : [];
  useEffect(() => {
    if (!withId) return;
    setOpenOnPhone(true);
    const existing = threadWith(withId);
    if (existing) {
      setActiveId(existing.id);
      setNewWith(null);
    } else setNewWith(withId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withId]);
  const [draft, setDraft] = useState('');
  // Contact details cannot be exchanged in the portal; the server enforces the same rule.
  const blocked = findContactDetails(draft).length > 0;
  const endRef = useRef<HTMLDivElement>(null);
  // Classmate threads (including ones saved as "Classmates" earlier) read "Classmate".
  const subjectOf = (s: string) => (s === 'Classmates' || s === 'Classmate' ? (lang === 'fr' ? 'Camarade' : 'Classmate') : s);
  const otherOf = (th: { participantIds: string[] }) => th.participantIds.find((p) => p !== userId)!;
  // List order: tutors, then classmates (with or without a conversation yet), then support. Newest first within each.
  const rank = (th: MessageThread) => { const o = otherOf(th); return o.startsWith('tut-') ? 0 : o.startsWith('lrn-') ? 1 : 2; };
  const lastAt = (th: MessageThread) => th.messages[th.messages.length - 1]?.at ?? '';
  const ordered = [...mine].sort((a, b) => (isInbox ? Number(isResolved(a)) - Number(isResolved(b)) : 0) || rank(a) - rank(b) || lastAt(b).localeCompare(lastAt(a)));
  // Row label: who the person is — Tutor, Classmate or Support.
  const labelOf = (th: MessageThread) => {
    const o = otherOf(th);
    if (o.startsWith('tut-')) return lang === 'fr' ? 'Tuteur·rice' : 'Tutor';
    // Learners see other learners as classmates; tutors and admins see them as learners.
    if (o.startsWith('lrn-')) return userId.startsWith('lrn-') ? (lang === 'fr' ? 'Camarade' : 'Classmate') : lang === 'fr' ? 'Apprenant·e' : 'Learner';
    return lang === 'fr' ? 'Assistance' : 'Support';
  };
  const unread = useUnread(threads, userId);
  const found = mine.find((th) => th.id === activeId) ?? ordered[0];
  const newMate = newWith ? LEARNERS.find((x) => x.id === newWith) : undefined;
  const active = newMate
    ? { id: 'new', participantIds: [userId, newMate.id], subject: 'Classmate', messages: [] as MessageThread['messages'] }
    : newSupport
      ? { id: 'new', participantIds: [userId, DEMO_ADMIN_ID], subject: 'Support', messages: [] as MessageThread['messages'] }
      : found;
  const select = (id: string) => {
    setActiveId(id);
    setNewWith(null);
    setNewSupport(false);
    setOpenOnPhone(true);
    if (withId) setParams({}, { replace: true });
  };
  // Classmates (and followed learners) can be called; tutors and support use booked sessions.
  const callMate = active && otherOf(active).startsWith('lrn-') && actions.community.canMessage(otherOf(active)) ? LEARNERS.find((x) => x.id === otherOf(active)) : undefined;

  useEffect(() => {
    if (!newMate) unread.markSeen(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found?.id, found?.messages.length, newMate]);

  // Live: replies arrive on their own, and "…is typing" shows while the other person writes.
  const typingIn = useLiveChat(userId, actions.syncThreads);
  useTypingSignal(userId, active?.id ?? null, draft);
  // Demo classmates answer: a short pause, the typing dots, then a reply (threadId → who is typing).
  const [demoTyping, setDemoTyping] = useState<Record<string, string>>({});
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const answerAsClassmate = (threadId: string, otherId: string, said: string) => {
    if (!isDemoClassmate(otherId, userId)) return;
    const reply = demoReply(said);
    timers.current.push(window.setTimeout(() => {
      setDemoTyping((d) => ({ ...d, [threadId]: otherId }));
      timers.current.push(window.setTimeout(() => {
        setDemoTyping((d) => { const next = { ...d }; delete next[threadId]; return next; });
        actions.demoReply(threadId, otherId, reply);
      }, typingTime(reply)));
    }, 900));
  };
  const typers = active ? [...new Set([...(typingIn[active.id] ?? []), ...(demoTyping[active.id] ? [demoTyping[active.id]] : [])])] : [];
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active?.messages.length, typers.length]);

  return (
    <>
      <PageHead title={isInbox ? t('app.supportInbox') : t('msg.title')} sub={isInbox ? (lang === 'fr' ? 'Messages envoyés à La Porte Support par les apprenants et les tuteurs. Toute l’équipe d’administration y répond.' : 'Messages sent to La Porte Support by learners and tutors. Any admin on the team can answer.') : t('msg.sub')} />
      {!mine.length && !freshMates.length && isInbox ? (
        <div className="card"><EmptyState icon="message" title={lang === 'fr' ? 'Aucune conversation' : 'No conversations yet'} /></div>
      ) : (
        <div className="messages-grid card" data-open={openOnPhone || undefined} style={{ ['--pad' as string]: '0', overflow: 'hidden' }}>
          <ul style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', listStyle: 'none', margin: 0, padding: 0 }} aria-label={t('msg.title')}>
            {ordered.filter((th) => rank(th) < 2).map((th) => {
              const other = person(th.participantIds.find((p) => p !== userId)!);
              const last = th.messages[th.messages.length - 1];
              return (
                <li key={th.id}><button onClick={() => select(th.id)} className="row" style={{ width: '100%', flexWrap: 'nowrap', padding: '14px 16px', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', background: th.id === active?.id ? 'var(--ivory)' : '#fff' }} aria-current={th.id === active?.id}>
                  {other.spec ? (otherOf(th).startsWith('tut-') ? <TutorAvatar tutorId={otherOf(th)} spec={other.spec} size={38} /> : <Avatar spec={other.spec} size={38} />) : <span className="avatar" style={{ ['--size' as string]: '38px', display: 'grid', placeItems: 'center', background: 'var(--navy)', color: '#E7C78F', fontSize: 12, fontWeight: 700 }}>LP</span>}
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="row between" style={{ flexWrap: 'nowrap' }}>
                      <strong style={{ fontSize: 14 }}>{other.name}{unread.unread(th) && <span className="unread-dot" aria-label={lang === 'fr' ? 'non lu' : 'unread'} />}</strong>
                      <span className="tiny muted">{formatDate(last.at, lang, { day: 'numeric', month: 'short' })}</span>
                    </span>
                    <span className="tiny" style={{ display: 'block', fontWeight: 600, color: 'var(--ink-2)' }}>{labelOf(th)}{isInbox && isResolved(th) && <span className="chip" style={{ minHeight: 18, marginLeft: 6, padding: '0 6px' }}>✓ {lang === 'fr' ? 'Résolu' : 'Resolved'}</span>}</span>
                    <span className="tiny muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{typingIn[th.id]?.length || demoTyping[th.id] ? <span className="typing-preview">{lang === 'fr' ? 'écrit…' : 'typing…'}</span> : last.body}</span>
                  </span>
                </button></li>
              );
            })}
            {freshMates.map((m) => (
              <li key={m.id}><button onClick={() => { setNewWith(m.id); setDraft(''); setOpenOnPhone(true); }} className="row" style={{ width: '100%', flexWrap: 'nowrap', padding: '14px 16px', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', background: newWith === m.id ? 'var(--ivory)' : '#fff' }} aria-current={newWith === m.id}>
                <Avatar spec={m.portrait} size={38} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ fontSize: 14, display: 'block' }}>{m.name}</strong>
                  <span className="tiny" style={{ display: 'block', fontWeight: 600, color: 'var(--ink-2)' }}>{subjectOf('Classmate')}</span>
                  <span className="tiny muted" style={{ display: 'block' }}>{lang === 'fr' ? 'Commencer une conversation' : 'Start a conversation'}</span>
                </span>
              </button></li>
            ))}
            {!isInbox && !hasSupport && (
              <li><button onClick={() => { setNewSupport(true); setNewWith(null); setDraft(''); setOpenOnPhone(true); }} className="row" style={{ width: '100%', flexWrap: 'nowrap', padding: '14px 16px', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', background: newSupport ? 'var(--ivory)' : '#fff' }} aria-current={newSupport}>
                <span className="avatar" style={{ ['--size' as string]: '38px', display: 'grid', placeItems: 'center', background: 'var(--navy)', color: '#E7C78F', fontSize: 12, fontWeight: 700 }}>LP</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ fontSize: 14, display: 'block' }}>La Porte Support</strong>
                  <span className="tiny" style={{ display: 'block', fontWeight: 600, color: 'var(--ink-2)' }}>{lang === 'fr' ? 'Assistance' : 'Support'}</span>
                  <span className="tiny muted" style={{ display: 'block' }}>{lang === 'fr' ? 'Une question ? Écrivez à l’équipe' : 'A question? Write to the team'}</span>
                </span>
              </button></li>
            )}
            {ordered.filter((th) => rank(th) === 2).map((th) => {
              const other = person(th.participantIds.find((p) => p !== userId)!);
              const last = th.messages[th.messages.length - 1];
              return (
                <li key={th.id}><button onClick={() => select(th.id)} className="row" style={{ width: '100%', flexWrap: 'nowrap', padding: '14px 16px', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', background: th.id === active?.id ? 'var(--ivory)' : '#fff' }} aria-current={th.id === active?.id}>
                  {other.spec ? (otherOf(th).startsWith('tut-') ? <TutorAvatar tutorId={otherOf(th)} spec={other.spec} size={38} /> : <Avatar spec={other.spec} size={38} />) : <span className="avatar" style={{ ['--size' as string]: '38px', display: 'grid', placeItems: 'center', background: 'var(--navy)', color: '#E7C78F', fontSize: 12, fontWeight: 700 }}>LP</span>}
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="row between" style={{ flexWrap: 'nowrap' }}>
                      <strong style={{ fontSize: 14 }}>{other.name}{unread.unread(th) && <span className="unread-dot" aria-label={lang === 'fr' ? 'non lu' : 'unread'} />}</strong>
                      <span className="tiny muted">{formatDate(last.at, lang, { day: 'numeric', month: 'short' })}</span>
                    </span>
                    <span className="tiny" style={{ display: 'block', fontWeight: 600, color: 'var(--ink-2)' }}>{labelOf(th)}</span>
                    <span className="tiny muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{typingIn[th.id]?.length || demoTyping[th.id] ? <span className="typing-preview">{lang === 'fr' ? 'écrit…' : 'typing…'}</span> : last.body}</span>
                  </span>
                </button></li>
              );
            })}
          </ul>
          {active && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="row" style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap', ['--gap' as string]: '12px' }}>
                <button type="button" className="btn btn-ghost btn-sm msg-back" onClick={() => setOpenOnPhone(false)} aria-label={lang === 'fr' ? 'Toutes les conversations' : 'All conversations'}>←</button>
                {(() => {
                  const otherId = active.participantIds.find((p) => p !== userId)!;
                  const other = person(otherId);
                  const role = otherId.startsWith('tut-') ? (lang === 'fr' ? 'Tuteur·rice' : 'Tutor') : otherId.startsWith('lrn-') ? (lang === 'fr' ? 'Apprenant·e' : 'Learner') : lang === 'fr' ? 'Équipe d’assistance' : 'Support team';
                  return (
                    <>
                      {other.spec ? (otherId.startsWith('tut-') ? <TutorAvatar tutorId={otherId} spec={other.spec} size={34} /> : <Avatar spec={other.spec} size={34} />) : null}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h2 className="h4" style={{ fontSize: 15 }}>{otherId.startsWith('lrn-') ? other.name : subjectOf(active.subject)}</h2>
                        <div className="tiny muted">{otherId.startsWith('lrn-') ? (lang === 'fr' ? 'Camarade · apprenant·e' : 'Classmate · Learner') : `${other.name} · ${role}`}{otherId.startsWith('tut-') && <> · <PresenceBadge tutorId={otherId} /></>}</div>
                      </div>
                      {isInbox && active.id !== 'new' && (
                        <button type="button" className={`btn btn-sm ${isResolved(active) ? 'btn-ghost' : 'btn-secondary'}`} onClick={() => { toggleResolved(active); toast(isResolved(active) ? (lang === 'fr' ? 'Conversation rouverte' : 'Conversation reopened') : lang === 'fr' ? 'Marquée comme résolue' : 'Marked as resolved'); }}>
                          <Icon name={isResolved(active) ? 'replay' : 'check'} size={14} /> {isResolved(active) ? (lang === 'fr' ? 'Rouvrir' : 'Reopen') : lang === 'fr' ? 'Résolu' : 'Resolve'}
                        </button>
                      )}
                      {callMate && (
                        <div className="row" style={{ ['--gap' as string]: '6px', flexWrap: 'nowrap' }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCall('voice')} aria-label={lang === 'fr' ? 'Appel vocal' : 'Voice call'} title={lang === 'fr' ? 'Appel vocal' : 'Voice call'}><Icon name="phone" size={16} /></button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCall('video')} aria-label={lang === 'fr' ? 'Appel vidéo' : 'Video call'} title={lang === 'fr' ? 'Appel vidéo' : 'Video call'}><Icon name="video" size={16} /></button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div role="log" aria-live="polite" aria-label={active.subject} tabIndex={0} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {newSupport && <p className="small muted" style={{ textAlign: 'center', margin: 'auto 0' }}>{lang === 'fr' ? 'Écrivez votre question : l’équipe La Porte vous répond ici, en général sous un jour ouvré.' : 'Write your question: the La Porte team replies here, usually within one working day.'}</p>}
                {newMate && <p className="small muted" style={{ textAlign: 'center', margin: 'auto 0' }}>{lang === 'fr' ? `Dites bonjour à ${newMate.firstName}, en français si possible !` : `Say hello to ${newMate.firstName}, in French if you can!`}</p>}
                <AnimatePresence initial={false}>
                  {active.messages.map((m) => {
                    const me = m.from === userId;
                    const who = person(m.from);
                    return (
                      <motion.div key={m.id} layout initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring.settle} style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                        <div style={{ padding: '10px 14px', borderRadius: 16, borderBottomRightRadius: me ? 4 : 16, borderBottomLeftRadius: me ? 16 : 4, background: me ? 'var(--navy)' : 'var(--ivory)', color: me ? '#fff' : 'var(--ink)' }}>{m.body}</div>
                        <div className="tiny muted" style={{ marginTop: 4, textAlign: me ? 'right' : 'left' }}>
                          {me ? '' : `${who.name} · `}
                          {formatTime(m.at, lang)}
                          {!me && active.id !== 'new' && (content.reports.some((r) => r.messageId === m.id)
                            ? <span> · {lang === 'fr' ? 'Signalé' : 'Reported'}</span>
                            : <> · <button type="button" className="link tiny report-link" onClick={() => { setReporting({ messageId: m.id, body: m.body, from: m.from }); setReason('contact'); setReportNote(''); }}>{lang === 'fr' ? 'Signaler' : 'Report'}</button></>)}
                        </div>
                      </motion.div>
                    );
                  })}
                  {typers.length > 0 && (
                    <motion.div key="typing" className="typing-row" initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.9 }} transition={spring.settle}>
                      <span className="typing-bubble" role="status" aria-label={lang === 'fr' ? `${person(typers[0]).name} écrit…` : `${person(typers[0]).name} is typing…`}>
                        <i /><i /><i />
                      </span>
                      <span className="tiny muted">{person(typers[0]).name.split(' ')[0]} {lang === 'fr' ? 'écrit…' : 'is typing…'}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={endRef} />
              </div>
              <form
                style={{ padding: 14, borderTop: '1px solid var(--line)' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim() || blocked) return;
                  const body = draft.trim();
                  setDraft('');
                  if (newMate) {
                    actions.community
                      .message(newMate.id, body)
                      .then((id) => { select(id); answerAsClassmate(id, newMate.id, body); })
                      .catch((err: unknown) => {
                        setDraft(body);
                        toast(err instanceof Error ? err.message : String(err));
                      });
                  } else if (newSupport) {
                    actions
                      .contactSupport(body)
                      .then((id) => select(id))
                      .catch((err: unknown) => {
                        setDraft(body);
                        toast(err instanceof Error ? err.message : String(err));
                      });
                  } else {
                    actions.sendMessage(active.id, body);
                    answerAsClassmate(active.id, otherOf(active), body);
                  }
                }}
              >
                <div style={{ display: 'flex', gap: 10 }}>
                  <label className="sr-only" htmlFor="msg">{t('msg.placeholder')}</label>
                  <input id="msg" className="input" placeholder={t('msg.placeholder')} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} aria-invalid={blocked || undefined} aria-describedby={blocked ? 'msg-blocked' : undefined} />
                  <button className="btn btn-primary" disabled={!draft.trim() || blocked} aria-label={t('msg.send')}><Icon name="arrowRight" size={17} /></button>
                </div>
                {blocked && (
                  <p id="msg-blocked" className="field-error" role="alert" style={{ marginTop: 8 }}>
                    <Icon name="lock" size={14} /> {l(CONTACT_BLOCK_MESSAGE)}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 14 }}><Notice tone="navy">{t('msg.privacy')}</Notice></div>
      <Modal open={!!reporting} onClose={() => setReporting(null)} title={lang === 'fr' ? 'Signaler ce message' : 'Report this message'} width={460}>
        {reporting && active && (
          <form className="stack" style={{ ['--gap' as string]: '14px' }} onSubmit={(e) => {
            e.preventDefault();
            actions.community
              .report({ threadId: active.id, messageId: reporting.messageId, excerpt: reporting.body, authorId: reporting.from, reason, note: reportNote.trim() || undefined })
              .then(() => { setReporting(null); toast(lang === 'fr' ? 'Merci : l’équipe La Porte va examiner ce message.' : 'Thanks: the La Porte team will review this message.'); })
              .catch((err: unknown) => toast(err instanceof Error ? err.message : String(err)));
          }}>
            <blockquote className="report-quote" lang="fr">{reporting.body}</blockquote>
            <fieldset className="stack" style={{ ['--gap' as string]: '6px', border: 0, padding: 0, margin: 0 }}>
              <legend className="label" style={{ marginBottom: 6 }}>{lang === 'fr' ? 'Pourquoi ?' : 'Why are you reporting it?'}</legend>
              {(Object.keys(REPORT_REASONS) as ReportReason[]).map((k) => (
                <label key={k} className="row small" style={{ ['--gap' as string]: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="report-reason" checked={reason === k} onChange={() => setReason(k)} /> {l(REPORT_REASONS[k])}
                </label>
              ))}
            </fieldset>
            <label className="field"><span className="label">{lang === 'fr' ? 'Détails (facultatif)' : 'Details (optional)'}</span><textarea className="textarea" rows={2} maxLength={500} value={reportNote} onChange={(e) => setReportNote(e.target.value)} /></label>
            <p className="tiny muted">{lang === 'fr' ? 'L’auteur n’est pas informé de qui a signalé le message.' : 'The sender isn’t told who reported it.'}</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReporting(null)}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button className="btn btn-brand btn-sm">{lang === 'fr' ? 'Envoyer le signalement' : 'Send report'}</button>
            </div>
          </form>
        )}
      </Modal>
      {call && callMate && <CallScreen kind={call} name={callMate.name} portrait={callMate.portrait} onEnd={() => setCall(null)} onSwitch={setCall} />}
    </>
  );
}
