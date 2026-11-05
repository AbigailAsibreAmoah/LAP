import { EXTERNAL_PROVIDERS, KID_UNITS, providerFor, type LiveGameView } from '@laporte/shared';
import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { spring } from '../../components/animations/motion';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toasts';
import { AnswerTiles, Podium, TimerBar } from '../../features/kids/KidGames';
import { isLocalGame, liveClient } from '../../features/kids/liveClient';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatDate } from '../../utils/format';
import { PageHead } from '../learner/LearnerPages';

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Tutors host live class quizzes for children and link approved outside games to each world. */
export function KidsGamesHostPage() {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  return (
    <>
      <PageHead title={fr ? 'Jeux enfants' : 'Kids games'} sub={fr ? 'Lancez un quiz en direct pendant un cours : les enfants rejoignent avec un code, sous un surnom.' : 'Run a live quiz during a class: children join with a code, under a nickname.'} />
      <div className="host-layout">
        <LiveHost />
        <ExternalGames />
      </div>
    </>
  );
}

function LiveHost() {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { user } = useStore();
  const toast = useToast();
  const [unitId, setUnitId] = useState(KID_UNITS[1].id);
  const [view, setView] = useState<LiveGameView | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  const poll = useCallback(() => {
    if (!view) return;
    void liveClient.view(user, view.code).then(setView).catch(() => undefined);
  }, [user, view]);
  useEffect(() => {
    if (!view || view.phase === 'podium') return;
    const t = window.setInterval(() => { poll(); setNowMs(Date.now()); }, 1000);
    return () => window.clearInterval(t);
  }, [view, poll]);

  const create = () => liveClient.create(user, unitId).then(setView).catch((e) => toast(errText(e)));
  const advance = () => view && liveClient.advance(user, view.code).then(setView).catch((e) => toast(errText(e)));

  if (!view)
    return (
      <section className="card stack" style={{ ['--gap' as string]: '14px' }} aria-labelledby="host-h">
        <h2 id="host-h" className="h4">📡 {fr ? 'Nouveau jeu en direct' : 'New live game'}</h2>
        <label className="field"><span className="label">{fr ? 'Monde' : 'World'}</span>
          <select className="select" value={unitId} onChange={(e) => setUnitId(e.target.value)}>{KID_UNITS.map((u) => <option key={u.id} value={u.id}>{u.emoji} {l(u.title)}</option>)}</select>
        </label>
        <p className="tiny muted">{fr ? '6 questions · 20 secondes chacune · points pour la rapidité. Les enfants voient un surnom, jamais un prénom.' : '6 questions · 20 seconds each · points for speed. Children see nicknames, never names.'}</p>
        <button className="btn btn-brand" onClick={() => void create()}>{fr ? 'Créer le jeu' : 'Create game'}</button>
      </section>
    );

  const unit = KID_UNITS.find((u) => u.id === view.unitId)!;
  const q = view.question;
  const total = view.limitSec * 1000;
  const left = view.questionStartedAt ? Math.max(0, total - (nowMs - Date.parse(view.questionStartedAt))) : total;
  return (
    <section className="card host-stage" aria-live="polite">
      <div className="row between">
        <span className="tiny muted">{unit.emoji} <span lang="fr">{l(unit.title)}</span>{isLocalGame(view.code) ? ` · ${fr ? 'démo : joueurs simulés' : 'demo: simulated players'}` : ''}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setView(null)}>{fr ? 'Fermer' : 'Close'}</button>
      </div>

      {view.phase === 'lobby' && (
        <div className="host-lobby">
          <span className="label">{fr ? 'Code du jeu' : 'Game code'}</span>
          <div className="host-code" aria-label={view.code.split('').join(' ')}>{view.code.slice(0, 3)} {view.code.slice(3)}</div>
          <p className="small">{fr ? 'Les enfants ouvrent La Porte Kids → « Jeu en direct » et tapent ce code.' : 'Children open La Porte Kids → “Live game” and type this code.'}</p>
          <span className="chip">{fr ? 'Code de démo : le même pour chaque partie' : 'Demo code: the same for every game'}</span>
          <div className="host-players">
            {view.players.map((p) => <motion.span key={p.id} className="chip" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} lang="fr">{p.nickname}</motion.span>)}
            {!view.players.length && <span className="tiny muted">{fr ? 'En attente des joueurs…' : 'Waiting for players…'}</span>}
          </div>
          <button className="btn btn-brand" disabled={!view.players.length} onClick={() => void advance()}>{fr ? `Commencer (${view.players.length})` : `Start (${view.players.length})`}</button>
        </div>
      )}

      {(view.phase === 'question' || view.phase === 'reveal') && q && (
        <div className="kg-play">
          <div className="kg-hud"><span>{fr ? 'Question' : 'Question'} {view.index + 1}/{view.count}</span><span>{view.answered}/{view.players.length} {fr ? 'réponses' : 'answered'}</span></div>
          {view.phase === 'question' && <TimerBar left={left} total={total} />}
          <div className="kg-question">{q.emoji && <span className="kg-big-emoji">{q.emoji}</span>}<h3 lang="fr">{q.prompt}</h3></div>
          <AnswerTiles q={{ options: q.options, answer: q.answer }} picked={null} reveal={view.phase === 'reveal'} onPick={() => undefined} disabled />
          {view.phase === 'reveal' && (
            <ol className="host-rank">
              {view.ranking.slice(0, 5).map((r) => <li key={r.id}><span>{r.rank}</span> <span lang="fr">{r.nickname}</span> <b>{r.score}</b></li>)}
            </ol>
          )}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-brand" onClick={() => void advance()}>
              {view.phase === 'question' ? (fr ? 'Montrer la réponse' : 'Show answer') : view.index + 1 >= view.count ? (fr ? 'Podium' : 'Podium') : fr ? 'Question suivante' : 'Next question'}
            </button>
          </div>
        </div>
      )}

      {view.phase === 'podium' && (
        <div className="host-lobby">
          <h3 className="h3">🏆 {fr ? 'Podium' : 'Podium'}</h3>
          <Podium ranking={view.ranking} />
          <button className="btn btn-brand" onClick={() => setView(null)}>{fr ? 'Nouveau jeu' : 'New game'}</button>
        </div>
      )}
    </section>
  );
}

function ExternalGames() {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content, actions } = useStore();
  const toast = useToast();
  const [unitId, setUnitId] = useState(KID_UNITS[0].id);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const provider = url ? providerFor(url) : null;
  const games = content.externalGames ?? [];
  return (
    <section className="card stack" style={{ ['--gap' as string]: '14px' }} aria-labelledby="ext-h">
      <h2 id="ext-h" className="h4">🔗 {fr ? 'Jeux externes' : 'Outside games'}</h2>
      <p className="tiny muted">{fr ? 'Ajoutez un lien Kahoot!, Quizlet, Wordwall ou Blooket à un monde. Les enfants le voient seulement si un parent l’autorise, et l’ouvrent avec le code parent.' : 'Attach a Kahoot!, Quizlet, Wordwall or Blooket link to a world. Children only see it if a parent allows outside games, and it opens with the parent PIN.'}</p>
      <div className="stack" style={{ ['--gap' as string]: '8px' }}>
        <select className="select" value={unitId} onChange={(e) => setUnitId(e.target.value)} aria-label={fr ? 'Monde' : 'World'}>{KID_UNITS.map((u) => <option key={u.id} value={u.id}>{u.emoji} {l(u.title)}</option>)}</select>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={fr ? 'Titre (ex. Les couleurs : quiz du samedi)' : 'Title (e.g. Colours: Saturday quiz)'} maxLength={120} />
        <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value.trim())} placeholder="https://" aria-invalid={(!!url && !provider) || undefined} />
        {url && <span className="tiny" style={{ color: provider ? 'var(--green, #1f6b4f)' : 'var(--burgundy, #6e1630)' }}>{provider ? `✓ ${EXTERNAL_PROVIDERS[provider].name}` : fr ? 'Lien non accepté : https et plateformes approuvées uniquement.' : 'Link not accepted: https and approved platforms only.'}</span>}
        <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-end' }} disabled={!provider || title.trim().length < 3} onClick={() => void actions.kids.addExternal({ unitId, url, title }).then(() => { setUrl(''); setTitle(''); toast(fr ? 'Jeu ajouté' : 'Game linked'); }).catch((e) => toast(errText(e)))}>{fr ? 'Ajouter' : 'Add link'}</button>
      </div>
      <ul className="ext-list">
        {games.map((g) => {
          const u = KID_UNITS.find((x) => x.id === g.unitId);
          return (
            <li key={g.id}>
              <span className="chip">{EXTERNAL_PROVIDERS[g.provider].name}</span>
              <div style={{ minWidth: 0, flex: 1 }}><strong className="small">{g.title}</strong><div className="tiny muted">{u?.emoji} {u ? l(u.title) : ''} · {formatDate(g.at, lang, { day: 'numeric', month: 'short' })}</div></div>
              <button className="icon-btn" aria-label={fr ? 'Retirer' : 'Remove'} onClick={() => void actions.kids.removeExternal(g.id).catch((e) => toast(errText(e)))}><Icon name="x" size={15} /></button>
            </li>
          );
        })}
        {!games.length && <li className="tiny muted">{fr ? 'Aucun jeu externe.' : 'No outside games yet.'}</li>}
      </ul>
    </section>
  );
}
