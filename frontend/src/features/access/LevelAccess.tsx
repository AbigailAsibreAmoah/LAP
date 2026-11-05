import { accessLevel, LEVEL_UNLOCK_PRICE_GHS, levelProductId, nextLevel, type CefrLevel } from '@laporte/shared';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatGhs } from '../../utils/format';

/** What the current learner can study, and where that level came from. */
export function useLevelAccess() {
  const { learner, content } = useStore();
  const placement = content.placements.find((p) => p.learnerId === learner.id);
  const skipped = !!placement && Object.keys(placement.answers).length === 0;
  const level = accessLevel(learner);
  const next = nextLevel(level);
  const source: 'skipped' | 'placement' | 'purchase' | 'tutor' = learner.unlockedLevel && learner.unlockedLevel === level && learner.unlockedLevel !== learner.level ? 'purchase' : skipped ? 'skipped' : placement ? 'placement' : 'tutor';
  return { level, next, source, placement, skipped, unlockHref: next ? `/app/checkout/${levelProductId(next)}` : null };
}

/** "You study at A2 · Unlock B1" — shown on My Courses and Billing. */
export function LevelAccessBanner({ compact }: { compact?: boolean }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { level, next, source, unlockHref, placement } = useLevelAccess();
  const { content, learner } = useStore();
  // Progress through the current level: when it's complete, it's time to move up.
  const atLevel = content.lessons.filter((x) => x.status === 'published' && x.level === level);
  const doneAtLevel = atLevel.filter((x) => content.completions.some((cp) => cp.learnerId === learner.id && cp.lessonId === x.id)).length;
  const complete = atLevel.length > 0 && doneAtLevel === atLevel.length;
  const why = {
    skipped: fr ? 'Test passé : vous commencez au niveau A1.' : 'You skipped the test, so you start at A1.',
    placement: fr ? 'Votre niveau, d’après votre test de positionnement.' : 'Your level, from your placement test.',
    purchase: fr ? 'Niveau débloqué par achat.' : 'Level unlocked by purchase.',
    tutor: fr ? 'Niveau confirmé par votre tuteur.' : 'Level confirmed by your tutor.',
  }[source];
  return (
    <div className="level-banner" data-compact={compact || undefined}>
      <span className="placement-level level-banner-badge">{level}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <strong>{complete && next ? (fr ? `Niveau ${level} terminé : prêt pour ${next} !` : `${level} complete: ready for ${next}!`) : fr ? `Vos cours : niveau ${level}` : `Your courses: level ${level}`}</strong>
        <span className="tiny muted" style={{ display: 'block' }}>
          {why} {fr ? `Seul le contenu ${level} est ouvert.` : `Only ${level} content is open.`} {atLevel.length > 0 && (fr ? `${doneAtLevel}/${atLevel.length} leçons ${level} terminées.` : `${doneAtLevel}/${atLevel.length} ${level} lessons done.`)}
          {(source === 'skipped' || !placement) && <> <Link to="/app/placement" className="link">{fr ? 'Passer le test' : 'Take the test'}</Link></>}
        </span>
      </div>
      {next && unlockHref && (
        <Link to={unlockHref} className={`btn btn-sm ${complete ? 'btn-brand' : 'btn-secondary'}`}>
          <Icon name="lock" size={14} /> {fr ? `Débloquer ${next}` : `Unlock ${next}`} · {formatGhs(LEVEL_UNLOCK_PRICE_GHS, lang)}
        </Link>
      )}
    </div>
  );
}

/** Small "B1 · locked" marker for lessons and courses above the learner's level. */
export function LockedLevel({ level }: { level: CefrLevel }) {
  const { lang } = useI18n();
  return (
    <span className="chip level-lock" title={lang === 'fr' ? `Débloquez ${level} pour y accéder` : `Unlock ${level} to open`}>
      <Icon name="lock" size={12} /> {level}
    </span>
  );
}
