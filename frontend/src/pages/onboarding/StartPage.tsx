import { useEffect } from 'react';
import { Brand } from '../../components/layout/Brand';
import { LanguageSwitch } from '../../components/ui/Controls';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { PlacementPage } from '../content/PracticePages';

/** Set at sign-up; cleared once the learner has a starting level (test taken or skipped). */
export const START_PENDING_KEY = 'laporte-start-pending';

/**
 * The screen new learners see right after signing up: take the entry assessment, or skip and start
 * at A1. It sits outside the app so nothing competes with this first decision.
 */
export function StartPage() {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { learner, actions, user } = useStore();
  useEffect(() => {
    if (user.role !== 'learner') actions.setRole('learner');
    document.title = fr ? 'Votre niveau de départ · La Porte' : 'Your starting level · La Porte';
  }, [user.role, actions, fr]);

  return (
    <div className="start-screen">
      <header className="start-top">
        <Brand />
        <LanguageSwitch />
      </header>
      <main className="start-main">
        <span className="eyebrow">{fr ? 'Étape 2 sur 2' : 'Step 2 of 2'}</span>
        <h1 className="start-title">{fr ? `Bienvenue, ${learner.firstName} !` : `Welcome, ${learner.firstName}!`}</h1>
        <p className="lede">{fr ? 'Choisissez votre point de départ. Vos cours s’ouvriront à ce niveau, puis vous passerez au suivant quand vous serez prêt.' : 'Choose where you start. Your courses open at that level; you move up to the next one when you’re ready.'}</p>
        <PlacementPage onboarding />
      </main>
    </div>
  );
}
