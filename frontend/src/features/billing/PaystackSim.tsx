import type { Payment, PaymentMethod } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatGhs } from '../../utils/format';

/*
 * A simulation of Paystack's checkout window, in TEST MODE. It follows the real flow learners
 * will see once Paystack is connected: choose Mobile Money or card → enter details → approve on
 * the phone (or enter the card OTP) → the server verifies the transaction → done.
 * No money moves: the backend's mock Paystack gateway creates and verifies the transaction.
 * When Paystack is connected, this window is replaced by Paystack's own popup (PaystackPop),
 * and the server-side verification step stays exactly the same.
 */

type Step = 'details' | 'approve' | 'otp' | 'verifying' | 'success' | 'failed';
const NETWORKS = ['MTN MoMo', 'Telecel Cash', 'AT Money'] as const;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function PaystackSim({ open, planId, title, amountGhs, discountTokenId, onClose, onPaid }: {
  open: boolean;
  planId: string;
  title: string;
  amountGhs: number;
  discountTokenId?: string;
  onClose: () => void;
  onPaid: (payment: Payment) => void;
}) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { actions, learner } = useStore();
  const [channel, setChannel] = useState<PaymentMethod>('mobile-money');
  const [network, setNetwork] = useState<(typeof NETWORKS)[number]>('MTN MoMo');
  const [phone, setPhone] = useState('024 000 0000');
  const [card, setCard] = useState('4084 0840 8408 4081');
  const [expiry, setExpiry] = useState('12/30');
  const [cvv, setCvv] = useState('408');
  const [otp, setOtp] = useState('123456');
  const [simFail, setSimFail] = useState(false);
  const [step, setStep] = useState<Step>('details');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  // Fresh window each time it opens.
  useEffect(() => { if (open) { setStep('details'); setPayment(null); setError(null); setSimFail(false); } }, [open]);
  // Escape cancels, but only before the payment is under way.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && (step === 'details' || step === 'failed')) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step, onClose]);

  const verify = async (p: Payment) => {
    setStep('verifying');
    await sleep(1100);
    const v = await actions.verifyPayment(p.reference);
    if (!alive.current) return;
    setPayment(v);
    if (v.status === 'success') {
      setStep('success');
      await sleep(1600);
      if (alive.current) onPaid(v);
    } else setStep('failed');
  };

  const pay = async () => {
    setError(null);
    try {
      const p = await actions.startPayment({ planId, method: channel, provider: channel === 'mobile-money' ? network : `Card •••• ${card.replace(/\s/g, '').slice(-4)}`, simulateFailure: simFail, discountTokenId });
      setPayment(p);
      if (channel === 'card') { setStep('otp'); return; }
      // Mobile Money: the network sends a prompt to the phone; the learner approves it there.
      setStep('approve');
      for (let s = 8; s > 0; s--) { if (!alive.current) return; setCount(s); await sleep(s > 5 ? 450 : 350); }
      await verify(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep('failed');
    }
  };

  if (!open) return null;
  const amount = formatGhs(amountGhs, lang);
  const busy = step === 'approve' || step === 'verifying' || step === 'success';
  const email = learner.email ?? `${learner.firstName.toLowerCase()}@example.com`;

  return createPortal(
    <div className="psk-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <motion.div className="psk" role="dialog" aria-modal="true" aria-labelledby="psk-title" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
        <span className="psk-test">{fr ? 'MODE TEST · simulation' : 'TEST MODE · simulated'}</span>
        {!busy && <button type="button" className="psk-close" onClick={onClose} aria-label={fr ? 'Annuler le paiement' : 'Cancel payment'}><Icon name="x" size={16} /></button>}

        <header className="psk-head">
          <span className="psk-merchant" aria-hidden>LP</span>
          <div className="psk-head-text">
            <span className="psk-email">{email}</span>
            <span id="psk-title" className="psk-amount">{fr ? 'Payer' : 'Pay'} <strong>{amount}</strong></span>
            <span className="psk-for">{title}</span>
          </div>
        </header>

        <div className="psk-body">
          {step === 'details' && (
            <nav className="psk-channels" aria-label={fr ? 'Moyen de paiement' : 'Pay with'}>
              <span className="psk-channels-label">{fr ? 'PAYER AVEC' : 'PAY WITH'}</span>
              <button type="button" className="psk-channel" aria-pressed={channel === 'mobile-money'} onClick={() => setChannel('mobile-money')}><Icon name="phone" size={16} /> Mobile Money</button>
              <button type="button" className="psk-channel" aria-pressed={channel === 'card'} onClick={() => setChannel('card')}><Icon name="card" size={16} /> {fr ? 'Carte' : 'Card'}</button>
            </nav>
          )}

          <div className="psk-panel">
            <AnimatePresence mode="wait">
              <motion.div key={step + channel} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
                {step === 'details' && channel === 'mobile-money' && (
                  <form className="psk-form" onSubmit={(e) => { e.preventDefault(); void pay(); }}>
                    <p className="psk-lead">{fr ? 'Choisissez votre réseau et entrez votre numéro Mobile Money.' : 'Choose your network and enter your Mobile Money number.'}</p>
                    <div className="psk-networks" role="radiogroup" aria-label={fr ? 'Réseau' : 'Network'}>
                      {NETWORKS.map((n) => <button key={n} type="button" role="radio" aria-checked={network === n} className="psk-network" data-net={n.split(' ')[0].toLowerCase()} onClick={() => setNetwork(n)}>{n}</button>)}
                    </div>
                    <label className="psk-field"><span>{fr ? 'Numéro de téléphone' : 'Phone number'}</span><input inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} required pattern="[0-9 +]{9,16}" /></label>
                    <button className="psk-pay">{fr ? 'Payer' : 'Pay'} {amount}</button>
                  </form>
                )}
                {step === 'details' && channel === 'card' && (
                  <form className="psk-form" onSubmit={(e) => { e.preventDefault(); void pay(); }}>
                    <p className="psk-lead">{fr ? 'Entrez les informations de la carte de test.' : 'Enter the test card details.'}</p>
                    <label className="psk-field"><span>{fr ? 'Numéro de carte' : 'Card number'}</span><input inputMode="numeric" autoComplete="off" value={card} onChange={(e) => setCard(e.target.value)} required pattern="[0-9 ]{12,23}" /></label>
                    <div className="psk-row">
                      <label className="psk-field"><span>{fr ? 'Expiration' : 'Expiry'}</span><input autoComplete="off" value={expiry} onChange={(e) => setExpiry(e.target.value)} required pattern="[0-9]{2}/[0-9]{2}" /></label>
                      <label className="psk-field"><span>CVV</span><input inputMode="numeric" autoComplete="off" value={cvv} onChange={(e) => setCvv(e.target.value)} required pattern="[0-9]{3,4}" /></label>
                    </div>
                    <button className="psk-pay">{fr ? 'Payer' : 'Pay'} {amount}</button>
                  </form>
                )}
                {step === 'otp' && (
                  <form className="psk-form psk-center" onSubmit={(e) => { e.preventDefault(); if (payment) void verify(payment); }}>
                    <span className="psk-icon"><Icon name="lock" size={22} /></span>
                    <p className="psk-lead">{fr ? 'Votre banque a envoyé un code à usage unique. Saisissez-le pour autoriser le paiement.' : 'Your bank sent a one-time code. Enter it to authorise the payment.'}</p>
                    <label className="psk-field psk-otp"><span className="sr-only">OTP</span><input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} required pattern="[0-9]{4,8}" /></label>
                    <button className="psk-pay">{fr ? 'Autoriser' : 'Authorise'}</button>
                    <span className="psk-hint">{fr ? 'Code de test prérempli : 123456' : 'Prefilled test code: 123456'}</span>
                  </form>
                )}
                {step === 'approve' && (
                  <div className="psk-form psk-center" role="status" aria-live="polite">
                    <span className="psk-phone" aria-hidden><Icon name="phone" size={26} /><i /></span>
                    <strong className="psk-state">{fr ? 'Validez le paiement sur votre téléphone' : 'Approve the payment on your phone'}</strong>
                    <p className="psk-lead">{fr ? `Une demande ${network} a été envoyée au ${phone}. Composez votre code PIN pour confirmer ${amount}.` : `A ${network} prompt was sent to ${phone}. Enter your PIN to confirm ${amount}.`}</p>
                    <span className="psk-hint">{fr ? `Simulation : validation automatique dans ${count} s` : `Simulated: approving automatically in ${count}s`}</span>
                  </div>
                )}
                {step === 'verifying' && (
                  <div className="psk-form psk-center" role="status" aria-live="polite">
                    <span className="psk-spinner" aria-hidden />
                    <strong className="psk-state">{fr ? 'Vérification du paiement…' : 'Verifying your payment…'}</strong>
                    <p className="psk-lead">{fr ? 'La Porte confirme la transaction auprès de Paystack. Ne fermez pas cette fenêtre.' : 'La Porte is confirming the transaction with Paystack. Please keep this window open.'}</p>
                  </div>
                )}
                {step === 'success' && (
                  <div className="psk-form psk-center" role="status" aria-live="polite">
                    <span className="psk-done" aria-hidden><Icon name="check" size={30} stroke={2.6} /></span>
                    <strong className="psk-state">{fr ? 'Paiement réussi' : 'Payment successful'}</strong>
                    {payment && <span className="psk-hint num">{fr ? 'Référence' : 'Reference'} : {payment.reference}</span>}
                  </div>
                )}
                {step === 'failed' && (
                  <div className="psk-form psk-center" role="alert">
                    <span className="psk-fail" aria-hidden><Icon name="x" size={28} stroke={2.6} /></span>
                    <strong className="psk-state">{fr ? 'Paiement refusé' : 'Payment declined'}</strong>
                    <p className="psk-lead">{error ?? (fr ? 'Le paiement n’a pas été validé. Aucun montant n’a été débité.' : 'The payment was not approved. Nothing was charged.')}</p>
                    <button type="button" className="psk-pay" onClick={() => { setStep('details'); setSimFail(false); }}>{fr ? 'Réessayer' : 'Try again'}</button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <footer className="psk-foot">
          {step === 'details' && (
            <label className="psk-simfail"><input type="checkbox" checked={simFail} onChange={(e) => setSimFail(e.target.checked)} /> {fr ? 'Simuler un refus (test)' : 'Simulate a declined payment (test)'}</label>
          )}
          <span className="psk-secured"><Icon name="lock" size={12} /> {fr ? 'Sécurisé par Paystack · aucun débit réel' : 'Secured by Paystack · nothing is charged'}</span>
        </footer>
      </motion.div>
    </div>,
    document.body,
  );
}
