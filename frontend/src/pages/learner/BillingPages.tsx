import { MEMBERSHIP_PLANS, type Payment, levelProduct, type MembershipPlan, productName } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Token } from '../../components/3d/Depth';
import { spring } from '../../components/animations/motion';
import { DemoTag, EmptyState, FocusTitle, Notice, StatusBadge } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { LevelAccessBanner } from '../../features/access/LevelAccess';
import { ReceiptModal } from '../../features/billing/Receipt';
import { PaystackSim } from '../../features/billing/PaystackSim';
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

type Stage = 'form' | 'success' | 'failed';

export function CheckoutPage() {
  const [showReceipt, setShowReceipt] = useState(false);
  const { planId } = useParams();
  const { t, l, lang } = useI18n();
  const { learner, content } = useStore();
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
  const [stage, setStage] = useState<Stage>('form');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [paying, setPaying] = useState(false);
  const [params] = useSearchParams();
  // Came from "Start my B1 courses" after the placement test.
  const fromStart = params.get('start') === '1';
  const error: string | null = null;

  if (!plan || plan.demoPriceGhs === null) return <EmptyState title={t('pricing.quote')}><Link to="/organisations" className="link">{t('pricing.contact')}</Link></EmptyState>;
  const total = Math.round(plan.demoPriceGhs * (100 - percent)) / 100;

  return (
    <div style={{ maxWidth: 980 }}>
      <Link to="/app/billing" className="link small" style={{ marginBottom: 14 }}><Icon name="arrowLeft" size={15} /> {t('billing.title')}</Link>
      <PageHead title={t('checkout.title')}><DemoTag>{t('demo.simulated')}</DemoTag></PageHead>
      <div className="detail-grid">
        <div className="card" style={{ ['--pad' as string]: '26px', minHeight: 380 }}>
          <AnimatePresence mode="wait">
            {stage === 'form' && (
              <motion.div key="form" className="stack" style={{ ['--gap' as string]: '16px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {fromStart && level && (
                  <div className="pay-start">
                    <span className="tone-icon" data-tone="burgundy"><Icon name="book" size={17} /></span>
                    <div>
                      <strong>{lang === 'fr' ? `Dernière étape : vos cours ${level.level}` : `Last step: your ${level.level} courses`}</strong>
                      <div className="tiny muted">{lang === 'fr' ? `Le test vous a placé au niveau ${level.level}. Réglez le niveau pour ouvrir ses cours et son évaluation finale.` : `The test placed you at ${level.level}. Pay for the level to open its courses and its end-of-level assessment.`}</div>
                    </div>
                  </div>
                )}
                <h2 className="h4">{lang === 'fr' ? 'Paiement' : 'Payment'}</h2>
                <p className="small muted" style={{ margin: 0 }}>{lang === 'fr' ? 'Payez par Mobile Money (MTN, Telecel, AT) ou par carte, dans la fenêtre sécurisée de Paystack.' : 'Pay by Mobile Money (MTN, Telecel, AT) or card, in Paystack’s secure window.'}</p>
                <div className="pay-methods" aria-hidden>
                  <span>MTN MoMo</span><span>Telecel Cash</span><span>AT Money</span><span>Visa</span><span>Mastercard</span>
                </div>
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
                <button type="button" className="btn btn-primary btn-lg pay-btn" onClick={() => setPaying(true)}>
                  <Icon name="lock" size={16} /> {lang === 'fr' ? 'Payer' : 'Pay'} {formatGhs(total, lang)} {lang === 'fr' ? 'avec Paystack' : 'with Paystack'}
                  {percent > 0 && <span style={{ textDecoration: 'line-through', opacity: 0.6, marginLeft: 8, fontWeight: 500 }}>{formatGhs(plan.demoPriceGhs!, lang)}</span>}
                </button>
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
                      {level ? <Link to="/app/courses" className="btn btn-primary">{lang === 'fr' ? `Commencer mes cours ${level.level}` : `Start my ${level.level} courses`}</Link> : <Link to="/app" className="btn btn-primary">{t('checkout.done')}</Link>}
                      <Link to="/app/book" className="btn btn-secondary">{t('app.book')}</Link>
                    </>
                  ) : (
                    <button className="btn btn-primary" onClick={() => { setStage('form'); }}>{t('checkout.retry')}</button>
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
      <PaystackSim open={paying} planId={plan.id} title={l(plan.name)} amountGhs={total} discountTokenId={tokenId || undefined} onClose={() => setPaying(false)} onPaid={(p) => { setPayment(p); setPaying(false); setStage('success'); }} />
    </div>
  );
}
