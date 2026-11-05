import { LEARNERS } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/3d/Portrait';
import { Icon } from '../../components/ui/Icon';
import { Drawer } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';

export type CallKind = 'voice' | 'video';

/**
 * A classmate's quick profile: message them (opens the in-app Messages area) or call.
 * Classmates (same group or level) are connected by default; anyone else needs a follow.
 * Calls run on Google Meet in the live portal; contact details are never shared.
 */
export function ClassmateChat({ classmateId, onClose }: { classmateId: string | null; onClose: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { learner, actions, content } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [call, setCall] = useState<CallKind | null>(null);
  const mate = LEARNERS.find((x) => x.id === classmateId);
  const connected = classmateId ? actions.community.canMessage(classmateId) : false;
  const sameGroup = content.cohorts.some((g) => g.memberIds.includes(learner.id) && classmateId !== null && g.memberIds.includes(classmateId));

  const openMessages = () => {
    if (!mate) return;
    onClose();
    navigate(`/app/messages?with=${mate.id}`);
  };

  return (
    <>
      <Drawer open={!!mate && !call} onClose={onClose} title={mate?.name ?? ''}>
        {mate && (
          <div className="mate-chat">
            <div className="mate-head">
              <Avatar spec={mate.portrait} size={48} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <span className="tiny muted">{mate.city} · {mate.level}{sameGroup ? ` · ${fr ? 'votre groupe' : 'your group'}` : ''}</span>
                <p className="small clamp-2" style={{ color: 'var(--ink-2)' }}>{l(mate.goal)}</p>
              </div>
            </div>

            {connected ? (
              <div className="stack" style={{ ['--gap' as string]: '10px' }}>
                <button type="button" className="btn btn-brand" onClick={openMessages}><Icon name="message" size={16} /> {fr ? 'Envoyer un message' : 'Message'}</button>
                <div className="mate-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCall('voice')}><Icon name="phone" size={15} /> {fr ? 'Appel vocal' : 'Voice call'}</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCall('video')}><Icon name="video" size={15} /> {fr ? 'Appel vidéo' : 'Video call'}</button>
                </div>
              </div>
            ) : (
              <div className="policy-note" style={{ marginTop: 8 }}>
                <Icon name="users" size={16} />
                <span>
                  {fr ? `${mate.firstName} n’est ni dans votre groupe ni à votre niveau : suivez-le ou suivez-la pour discuter et vous appeler.` : `${mate.firstName} isn’t in your group or at your level: follow them to chat and call.`}{' '}
                  <button type="button" className="link small" onClick={() => void actions.community.follow(mate.id, true).then(() => toast(fr ? 'Vous suivez ce camarade' : 'You’re now following'))}>{fr ? 'Suivre' : 'Follow'}</button>
                </span>
              </div>
            )}
          </div>
        )}
      </Drawer>
      {mate && call && <CallScreen kind={call} name={mate.name} portrait={mate.portrait} onEnd={() => setCall(null)} onSwitch={setCall} />}
    </>
  );
}

export function CallScreen({ kind, name, portrait, onEnd, onSwitch }: { kind: CallKind; name: string; portrait: (typeof LEARNERS)[number]['portrait']; onEnd: () => void; onSwitch: (k: CallKind) => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const toast = useToast();
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [camError, setCamError] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  // Simulated ringing, then a running timer (no real connection in the demo).
  useEffect(() => {
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const ringing = seconds < 3;

  // Video: show the learner's own camera preview only after they chose a video call.
  useEffect(() => {
    if (kind !== 'video') return;
    let live = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((s) => {
        if (!live) return s.getTracks().forEach((tr) => tr.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setCamError(true));
    return () => {
      live = false;
      stream.current?.getTracks().forEach((tr) => tr.stop());
      stream.current = null;
    };
  }, [kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onEnd();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onEnd]);

  const clock = `${Math.floor((seconds - 3) / 60)}:${String(Math.max(0, seconds - 3) % 60).padStart(2, '0')}`;
  // Portalled to <body> so it covers the whole app, not just the sidebar it was opened from.
  return createPortal(
    <AnimatePresence>
      <motion.div className="call-screen" role="dialog" aria-modal="true" aria-label={`${kind === 'video' ? (fr ? 'Appel vidéo' : 'Video call') : fr ? 'Appel vocal' : 'Voice call'} · ${name}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="call-stage">
          <span className="call-demo">{fr ? 'Appel de démonstration' : 'Demo call'}</span>
          <div className="call-peer" data-ringing={ringing || undefined}>
            <Avatar spec={portrait} size={120} />
          </div>
          <strong className="call-name">{name}</strong>
          <span className="call-status">{ringing ? (fr ? 'Appel en cours…' : 'Calling…') : `${clock} · ${fr ? 'simulé' : 'simulated'}`} · Google Meet</span>
          {kind === 'video' && (
            <div className="call-self">
              {camError ? <span className="tiny">{fr ? 'Caméra indisponible' : 'Camera unavailable'}</span> : <video ref={video} autoPlay playsInline muted />}
            </div>
          )}
          <button type="button" className="btn btn-secondary btn-sm call-meet" onClick={() => toast(fr ? 'Démo : le lien Google Meet est créé une fois l’intégration configurée.' : 'Demo: the Google Meet link is created once the integration is configured.')}><Icon name="video" size={15} /> {fr ? 'Ouvrir dans Google Meet' : 'Open in Google Meet'}</button>
          <p className="call-note">{fr ? 'Démo : dans le portail, l’appel s’ouvre sur Google Meet. Les numéros et coordonnées ne sont jamais partagés.' : 'Demo: in the live portal this opens a Google Meet call. Phone numbers and contact details are never shared.'}</p>
        </div>
        <div className="call-controls">
          <button type="button" className="call-btn" aria-pressed={muted} onClick={() => setMuted((m) => !m)} aria-label={muted ? (fr ? 'Réactiver le micro' : 'Unmute') : fr ? 'Couper le micro' : 'Mute'}>
            <Icon name="mic" size={20} />{muted && <span className="call-slash" aria-hidden />}
          </button>
          <button type="button" className="call-btn" aria-pressed={kind === 'video'} onClick={() => onSwitch(kind === 'video' ? 'voice' : 'video')} aria-label={kind === 'video' ? (fr ? 'Couper la caméra' : 'Turn camera off') : fr ? 'Activer la caméra' : 'Turn camera on'}>
            <Icon name="video" size={20} />{kind !== 'video' && <span className="call-slash" aria-hidden />}
          </button>
          <button type="button" className="call-btn call-end" onClick={onEnd} autoFocus aria-label={fr ? 'Raccrocher' : 'Hang up'}><Icon name="phone" size={20} /></button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
