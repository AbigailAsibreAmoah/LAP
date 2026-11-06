import { MEMBERSHIP_PLANS, type Payment, type PaymentMethod, levelProduct, type MembershipPlan, productName } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Token } from '../../components/3d/Depth';
import { spring } from '../../components/animations/motion';
import { DemoTag, EmptyState, FocusTitle, Notice, Segmented, StatusBadge } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { LevelAccessBanner } from '../../features/access/LevelAccess';
import { ReceiptModal } from '../../features/billing/Receipt';
import { useToast } from '../../components/ui/Toasts';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatDate, formatGhs } from '../../utils/format';
import { PricingPage } from '../public/PublicPages';
import { PageHead } from './LearnerPages';

export function BillingPage() {
  const { t, l, lang } = useI18n();
  const { learner, payments, milestones, actions } = useStore();
  const toast = useToast();
  const [receiptOf, setReceiptOf] = useState<Payment | null>(null);
  const plan = MEMBERSHIP_PLANS.find((p) => p.id === learner.planId)!;
  const mine = payments.filter((p) => p.learnerId === learner.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [showPlans, setShowPlans] = useState(false);
  const allowance = Math.max(plan.credits, learner.credits);

  return (
    <div className="stack" style={{ ['--gap' as string]: '24px' }}>
      <PageHead title={t('billing.title')} />
      <LevelAccessBanner />
      <div className="dash-grid">
        <div className="card card-navy span-7" style={{ ['--pad' as string]: '26px' }}>
          <span className="eyebrow" style={{ color: '#E7C78F' }}>{t('billing.current')}</span>
          <h2 style={{ fontSize: '1.8rem', marginTop: 8 }}>{l(plan.name)}</h2>
          <p className="muted" style={{ marginTop: 6 }}>{l(plan.tagline)}</p>
          <div className="row" style={{ marginTop: 18, ['--gap' as string]: '24px' }}>
            <div className="stat"><span className="stat-value" style={{ color: '#fff' }}>{learner.credits}</span><span className="stat-label muted">{t('dash.credits')}</span></div>
            <div className="stat"><span className="stat-value" style={{ color: '#fff' }}>{plan.demoPriceGhs ? formatGhs(plan.demoPriceGhs, lang) : '—'}</span><span className="stat-label muted">{t('pricing.month')} · {t('demo.label')}</span></div>
          </div>
          {allowance > 0 && (
            <div style={{ marginTop: 18, maxWidth: 360 }}>
              <div className="row between tiny" style={{ marginBottom: 6, color: 'rgba(243,238,230,.75)' }}>
                <span>{lang === 'fr' ? 'Crédits restants' : 'Credits remaining'}</span>
                <span className="num">{learner.credits} / {allowance}</span>
              </div>
              <div className="bar bar-gold bar-on-dark" role="img" aria-label={`${learner.credits} / ${allowance}`}><span style={{ width: `${(learner.credits / allowance) * 100}%` }} /></div>
              {learner.credits <= 1 && <p className="tiny" style={{ marginTop: 8, color: '#E7C78F' }}>{lang === 'fr' ? 'Bientôt épuisés — changez de formule pour réserver d’autres séances.' : 'Running low — change membership to book more sessions.'}</p>}
            </div>
          )}
          <button className="btn btn-gold" style={{ marginTop: 20 }} onClick={() => setShowPlans((s) => !s)} aria-expanded={showPlans} aria-controls="plan-options">{t('billing.change')} <Icon name="chevronDown" size={16} /></button>
        </div>
        <div className="card span-5">
          <h2 className="h4" style={{ marginBottom: 10 }}>{t('billing.records')}</h2>
          {milestones.filter((m) => m.status === 'completed').map((m) => (
            <div key={m.id} className="list-row">
              <Token size={32} state="earned"><Icon name="award" size={15} /></Token>
              <div style={{ flex: 1 }}>
                <div className="small" style={{ fontWeight: 600 }}>{l(m.title)} · {m.level}</div>
                <div className="tiny muted">{m.completedOn && formatDate(m.completedOn, lang, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          ))}
          <p className="tiny muted" style={{ marginTop: 10 }}>{t('passport.disclaimer')}</p>
        </div>
      </div>

      <AnimatePresence>
        {showPlans && (
          <motion.div id="plan-options" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <PricingPage inApp />
          </motion.div>
        )}
      </AnimatePresence>

      <section>
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2 className="h3">{t('billing.history')}</h2>
          <label className="kid-toggle receipt-pref">
            <span><Icon name="mail" size={15} /> {lang === 'fr' ? 'M’envoyer un reçu par e-mail après chaque paiement' : 'Email me a receipt after each payment'}</span>
            <input type="checkbox" checked={learner.receiptEmails !== false} onChange={(e) => { const on = e.target.checked; actions.receipts.setAutoEmail(on).then(() => toast(on ? (lang === 'fr' ? 'Les reçus vous seront envoyés par e-mail' : 'Receipts will be emailed to you') : lang === 'fr' ? 'Plus de reçus par e-mail (toujours disponibles ici)' : 'No more receipt emails (still available here)')).catch((err: unknown) => toast(err instanceof Error ? err.message : String(err))); }} />
          </label>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>{t('billing.date')}</th><th>{t('billing.reference')}</th><th>{lang === 'fr' ? 'Formule' : 'Plan'}</th><th>{t('billing.method')}</th><th>{t('billing.amount')}</th><th>{t('billing.status')}</th><th><span className="sr-only">{lang === 'fr' ? 'Reçu' : 'Receipt'}</span></th></tr>
            </thead>
            <tbody>
              {mine.map((p) => (
                <tr key={p.id}>
                  <td className="num">{formatDate(p.createdAt, lang, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="num tiny">{p.reference}</td>
                  <td>{l(productName(p.planId))}</td>
                  <td>{p.provider}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{formatGhs(p.amountGhs, lang)}</td>
                  <td><PaymentStatus p={p} /></td>
                  <td>{p.status === 'success' && <button className="btn btn-ghost btn-sm" onClick={() => setReceiptOf(p)}><Icon name="file" size={14} /> {lang === 'fr' ? 'Reçu' : 'Receipt'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!mine.length && <EmptyState icon="card" title={lang === 'fr' ? 'Aucun paiement pour l’instant' : 'No payments yet'} />}
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>{t('checkout.noCharge')}</p>
        <ReceiptModal payment={receiptOf} learner={learner} onClose={() => setReceiptOf(null)} />
      </section>
    </div>
  );
}

function PaymentStatus({ p }: { p: Payment }) {
  const { lang } = useI18n();
  const label = { success: lang === 'fr' ? 'Réussi' : 'Successful', pending: lang === 'fr' ? 'En attente' : 'Pending', failed: lang === 'fr' ? 'Échoué' : 'Failed' }[p.status];
  return <StatusBadge status={p.status}>{label}</StatusBadge>;
}

type Stage = 'form' | 'processing' | 'success' | 'failed';
const NETWORKS = ['MTN MoMo', 'Telecel Cash', 'AT Money'];

export function CheckoutPage() {
  const [showReceipt, setShowReceipt] = useState(false);
  const { planId } = useParams();
  const { t, l, lang } = useI18n();
  const { actions, learner, content } = useStore();
  // A membership plan, or the next level's courses ("level-B1").
  const level = levelProduct(planId ?? '');
  const plan: MembershipPlan | undefined =
    MEMBERSHIP_PLANS.find((p) => p.id === planId) ??
    (level
      ? {
          ...MEMBERSHIP_PLANS[0],
          id: level.id,
          name: level.name,
          tagline: { en: `Unlock every ${level.level} course and lesson.`, fr: `Débloquez tous les cours et leçons ${level.level}.` },
          features: [
            { en: `All ${level.level} lessons in your courses`, fr: `Toutes les leçons ${level.level} de vos cours` },
            { en: `${level.level} courses on your pathway`, fr: `Les cours ${level.level} de votre parcours` },
            { en: 'The levels you have reached stay open', fr: 'Les niveaux atteints restent ouverts' },
          ],
          demoPriceGhs: level.demoPriceGhs,
          credits: 0,
        }
      : undefined);
  const discounts = content.tokens.filter((tk) => tk.learnerId === learner.id && tk.kind === 'discount' && !tk.redeemedAt);
  const [tokenId, setTokenId] = useState<string>('');
  const percent = discounts.find((tk) => tk.id === tokenId)?.value ?? 0;
  const [method, setMethod] = useState<PaymentMethod>('mobile-money');
  const [network, setNetwork] = useState(NETWORKS[0]);
  const [phone, setPhone] = useState('024 000 0000');
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [simFail, setSimFail] = useState(false);
  const [stage, setStage] = useState<Stage>('form');
  const [step, setStep] = useState(0);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!plan || plan.demoPriceGhs === null) return <EmptyState title={t('pricing.quote')}><Link to="/organisations" className="link">{t('pricing.contact')}</Link></EmptyState>;

  const steps = lang === 'fr'
    ? ['Création de la transaction', method === 'mobile-money' ? 'Validation sur le téléphone (simulée)' : 'Autorisation de la carte (simulée)', 'Vérification côté serveur']
    : ['Creating transaction', method === 'mobile-money' ? 'Approval on phone (simulated)' : 'Card authorisation (simulated)', 'Server-side verification'];

  const pay = async () => {
    setError(null);
    setStage('processing');
    setStep(0);
    try {
      const p = await actions.startPayment({ planId: plan.id, method, provider: method === 'mobile-money' ? network : `Card •••• ${card.replace(/\s/g, '').slice(-4)}`, simulateFailure: simFail, discountTokenId: tokenId || undefined });
      setPayment(p);
      await new Promise((r) => setTimeout(r, 900));
      setStep(1);
      await new Promise((r) => setTimeout(r, 1300));
      setStep(2);
      const verified = await actions.verifyPayment(p.reference);
      await new Promise((r) => setTimeout(r, 700));
      setPayment(verified);
      // Completion is only shown once verification explicitly confirms success.
      setStage(verified.status === 'success' ? 'success' : 'failed');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage('failed');
    }
  };

  return (
    <div style={{ maxWidth: 980 }}>
      <Link to="/app/billing" className="link small" style={{ marginBottom: 14 }}><Icon name="arrowLeft" size={15} /> {t('billing.title')}</Link>
      <PageHead title={t('checkout.title')}><DemoTag>{t('demo.simulated')}</DemoTag></PageHead>
      <div className="detail-grid">
        <div className="card" style={{ ['--pad' as string]: '26px', minHeight: 380 }}>
          <AnimatePresence mode="wait">
            {stage === 'form' && (
              <motion.form key="form" className="stack" style={{ ['--gap' as string]: '16px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={(e) => { e.preventDefault(); void pay(); }}>
                <h2 className="h4">{t('checkout.method')}</h2>
                <Segmented label={t('checkout.method')} value={method} onChange={setMethod} options={[{ value: 'mobile-money', label: <><Icon name="phone" size={14} /> {t('checkout.momo')}</> }, { value: 'card', label: <><Icon name="card" size={14} /> {t('checkout.card')}</> }]} />
                {method === 'mobile-money' ? (
                  <>
                    <div className="field">
                      <span className="label">{t('checkout.network')}</span>
                      <div className="row" style={{ ['--gap' as string]: '8px' }}>
                        {NETWORKS.map((n) => (
                          <button type="button" key={n} className={`chip ${network === n ? 'chip-navy' : 'chip-outline'}`} style={{ cursor: 'pointer', minHeight: 38, padding: '0 14px' }} onClick={() => setNetwork(n)} aria-pressed={network === n}>{n}</button>
                        ))}
                      </div>
                    </div>
                    <label className="field"><span className="label">{t('checkout.phone')}</span><input className="input" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required pattern="[0-9 +]{9,16}" aria-describedby="phone-help" /><span id="phone-help" className="tiny muted">{lang === 'fr' ? '9 à 16 chiffres, ex. 024 000 0000. Aucun débit réel.' : '9–16 digits, e.g. 024 000 0000. Nothing is charged.'}</span></label>
                  </>
                ) : (
                  <label className="field"><span className="label">{t('checkout.cardNumber')}</span><input className="input" inputMode="numeric" autoComplete="off" value={card} onChange={(e) => setCard(e.target.value)} required pattern="[0-9 ]{12,23}" aria-describedby="card-help" /><span id="card-help" className="tiny muted">{lang === 'fr' ? 'Utilisez le numéro de test prérempli. N’entrez pas une vraie carte.' : 'Use the prefilled test number. Do not enter a real card.'}</span></label>
                )}
                <label className="row small" style={{ ['--gap' as string]: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={simFail} onChange={(e) => setSimFail(e.target.checked)} /> {t('checkout.simFail')}
                </label>
                {discounts.length > 0 && (
                  <label className="field">
                    <span className="label">{lang === 'fr' ? 'Récompense de fidélité' : 'Loyalty reward'}</span>
                    <select className="select" value={tokenId} onChange={(e) => setTokenId(e.target.value)}>
                      <option value="">{lang === 'fr' ? 'Ne pas utiliser' : 'Don’t use'}</option>
                      {discounts.map((tk) => <option key={tk.id} value={tk.id}>{l(tk.label)}</option>)}
                    </select>
                  </label>
                )}
                <Notice>{t('checkout.noCharge')}</Notice>
                <button className="btn btn-primary btn-lg">
                  {t('checkout.pay')} {formatGhs(Math.round(plan.demoPriceGhs! * (100 - percent)) / 100, lang)}
                  {percent > 0 && <span style={{ textDecoration: 'line-through', opacity: 0.6, marginLeft: 8, fontWeight: 500 }}>{formatGhs(plan.demoPriceGhs!, lang)}</span>}
                </button>
              </motion.form>
            )}
            {stage === 'processing' && (
              <motion.div key="proc" className="stack" style={{ ['--gap' as string]: '18px', paddingTop: 20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" aria-live="polite">
                <h2 className="h4">{t('checkout.processing')}</h2>
                {steps.map((s, i) => (
                  <div key={s} className="row" style={{ opacity: i <= step ? 1 : 0.4, flexWrap: 'nowrap' }}>
                    <span style={{ width: 28, height: 28, borderRadius: 28, display: 'grid', placeItems: 'center', background: i < step ? 'var(--green-100)' : 'var(--ivory)', color: i < step ? 'var(--green)' : 'var(--navy)' }}>
                      {i < step ? <Icon name="check" size={15} /> : i === step ? <motion.span style={{ width: 12, height: 12, borderRadius: 12, border: '2px solid var(--burgundy)', borderTopColor: 'transparent' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} /> : i + 1}
                    </span>
                    <span>{s}</span>
                  </div>
                ))}
                {payment && <p className="tiny muted num">{t('billing.reference')}: {payment.reference}</p>}
              </motion.div>
            )}
            {(stage === 'success' || stage === 'failed') && (
              <motion.div key="done" className="stack center" style={{ textAlign: 'center', ['--gap' as string]: '14px', paddingTop: 20 }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring.settle}>
                <Token size={68} state={stage === 'success' ? 'earned' : 'locked'}><Icon name={stage === 'success' ? 'check' : 'x'} size={30} stroke={2.4} /></Token>
                <FocusTitle className="h3">{stage === 'success' ? t('checkout.success') : t('checkout.failed')}</FocusTitle>
                {stage === 'failed' && !error && <p className="small muted">{lang === 'fr' ? 'Aucun crédit n’a été ajouté. Vous pouvez réessayer.' : 'No credits were added. You can try again.'}</p>}
                {payment && <p className="small muted num">{t('billing.reference')}: {payment.reference}</p>}
                {stage === 'success' && (level ? <p className="small">{lang === 'fr' ? `Niveau ${level.level} débloqué : vos cours ${level.level} sont ouverts.` : `${level.level} unlocked: your ${level.level} courses are open.`} <Link to="/app/courses" className="link">{lang === 'fr' ? 'Voir mes cours' : 'See my courses'}</Link></p> : <p className="small">{l(plan.name)} · {learner.credits} {t('dash.credits').toLowerCase()}</p>)}
                {error && <p className="field-error">{error}</p>}
                <div className="row" style={{ justifyContent: 'center' }}>
                  {stage === 'success' ? (
                    <>
                      {payment && <button type="button" className="btn btn-secondary" onClick={() => setShowReceipt(true)}><Icon name="file" size={15} /> {lang === 'fr' ? 'Voir le reçu' : 'View receipt'}</button>}
                      <Link to="/app" className="btn btn-primary">{t('checkout.done')}</Link>
                      <Link to="/app/book" className="btn btn-secondary">{t('app.book')}</Link>
                    </>
                  ) : (
                    <button className="btn btn-primary" onClick={() => { setStage('form'); setSimFail(false); }}>{t('checkout.retry')}</button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <aside className="card card-ivory stack" style={{ ['--gap' as string]: '12px' }}>
          <span className="eyebrow">{lang === 'fr' ? 'Récapitulatif' : 'Order summary'}</span>
          <h2 className="h3">{l(plan.name)}</h2>
          <p className="small muted">{l(plan.tagline)}</p>
          <ul className="small stack" style={{ listStyle: 'none', padding: 0, margin: 0, ['--gap' as string]: '6px' }}>
            {plan.features.map((f) => <li key={f.en} className="row" style={{ flexWrap: 'nowrap', ['--gap' as string]: '6px' }}><Icon name="check" size={14} /> {l(f)}</li>)}
          </ul>
          <hr className="divider" />
          <div className="row between"><span>{t('common.total')}</span><strong className="num">{formatGhs(plan.demoPriceGhs!, lang)}</strong></div>
          <p className="tiny muted">{t('demo.pricing')}</p>
        </aside>
      </div>
      <ReceiptModal payment={showReceipt ? payment ?? null : null} learner={learner} onClose={() => setShowReceipt(false)} />
    </div>
  );
}
