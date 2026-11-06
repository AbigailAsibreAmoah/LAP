import { buildReceipt, ISSUER, type Learner, type Payment, type Receipt } from '@laporte/shared';
import { useState } from 'react';
import { LogoMark } from '../../components/layout/Brand';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatDate, formatGhs } from '../../utils/format';

const methodLabel = (m: Payment['method'], fr: boolean) => (m === 'mobile-money' ? 'Mobile Money' : fr ? 'Carte bancaire' : 'Card');

/** The receipt as it appears in the app (and when printed). */
export function ReceiptSheet({ receipt }: { receipt: Receipt }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  return (
    <article className="receipt" aria-label={`${fr ? 'Reçu' : 'Receipt'} ${receipt.number}`}>
      <header className="receipt-head">
        <span className="receipt-logo"><LogoMark size={22} light /></span>
        <div>
          <strong>{ISSUER.name}</strong>
          <span>{ISSUER.address} · {ISSUER.email}</span>
        </div>
        <span className="receipt-kind">{fr ? 'REÇU' : 'RECEIPT'}</span>
      </header>
      <dl className="receipt-meta">
        <div><dt>{fr ? 'N° de reçu' : 'Receipt no.'}</dt><dd className="num">{receipt.number}</dd></div>
        <div><dt>{fr ? 'Date' : 'Date'}</dt><dd>{formatDate(receipt.issuedAt, lang, { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
        <div><dt>{fr ? 'Facturé à' : 'Billed to'}</dt><dd>{receipt.billedTo.name}<br /><span className="muted">{receipt.billedTo.email ?? ''}{receipt.billedTo.email ? ' · ' : ''}{receipt.billedTo.city}</span></dd></div>
      </dl>
      <table className="receipt-lines">
        <thead><tr><th>{fr ? 'Description' : 'Description'}</th><th className="num">{fr ? 'Montant' : 'Amount'}</th></tr></thead>
        <tbody>
          {receipt.lines.map((ln) => <tr key={ln.label.en}><td>{l(ln.label)}</td><td className="num">{formatGhs(ln.amountGhs, lang)}</td></tr>)}
          {receipt.discount && <tr><td>{fr ? `Remise fidélité (${receipt.discount.percent} %)` : `Reward discount (${receipt.discount.percent}%)`}</td><td className="num">−{formatGhs(receipt.discount.amountGhs, lang)}</td></tr>}
        </tbody>
        <tfoot><tr><th>{fr ? 'Total payé' : 'Total paid'}</th><th className="num">{formatGhs(receipt.totalGhs, lang)}</th></tr></tfoot>
      </table>
      <p className="receipt-paid"><Icon name="checkCircle" size={16} /> {fr ? 'Payé par' : 'Paid by'} {methodLabel(receipt.method, fr)} · {receipt.provider}</p>
      {receipt.simulated && <p className="receipt-note">{fr ? 'Paiement simulé (démonstration) : aucun montant n’a été débité.' : 'Simulated payment (demo): no money was charged.'}</p>}
      <p className="receipt-note">{fr ? 'Merci d’apprendre avec La Porte. Conservez ce reçu pour vos dossiers.' : 'Thank you for learning with La Porte. Keep this receipt for your records.'}</p>
    </article>
  );
}

/** Downloads the receipt as a PDF (the library loads only when needed). */
export async function downloadReceiptPdf(r: Receipt, lang: 'en' | 'fr', productLabel: string, discountLabel?: string) {
  const { jsPDF } = await import('jspdf');
  const fr = lang === 'fr';
  // Built-in PDF fonts have no cedi sign, so amounts read "GHS".
  const money = (n: number) => `GHS ${n.toLocaleString(fr ? 'fr-FR' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ | /g, ' ')}`;
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();
  const burgundy: [number, number, number] = [110, 22, 48];
  const navy: [number, number, number] = [20, 27, 52];
  doc.setFillColor(...burgundy);
  doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold').setFontSize(13).text(ISSUER.name, 10, 12);
  doc.setFont('helvetica', 'normal').setFontSize(8).text(`${ISSUER.address} · ${ISSUER.email}`, 10, 18);
  doc.setFont('helvetica', 'bold').setFontSize(14).text(fr ? 'REÇU' : 'RECEIPT', W - 10, 15, { align: 'right' });
  doc.setTextColor(...navy);
  let y = 38;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120, 110, 100).text(label, 10, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(10).setTextColor(...navy).text(value, 46, y);
    y += 7;
  };
  row(fr ? 'N° de reçu' : 'Receipt no.', r.number, true);
  row(fr ? 'Date' : 'Date', new Date(r.issuedAt).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
  row(fr ? 'Facturé à' : 'Billed to', r.billedTo.name);
  if (r.billedTo.email) row('', r.billedTo.email);
  y += 4;
  doc.setDrawColor(226, 211, 182).line(10, y, W - 10, y);
  y += 7;
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(120, 110, 100).text(fr ? 'DESCRIPTION' : 'DESCRIPTION', 10, y).text(fr ? 'MONTANT' : 'AMOUNT', W - 10, y, { align: 'right' });
  y += 7;
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...navy);
  doc.text(productLabel, 10, y).text(money(r.subtotalGhs), W - 10, y, { align: 'right' });
  y += 7;
  if (r.discount && discountLabel) { doc.text(discountLabel, 10, y).text(`-${money(r.discount.amountGhs)}`, W - 10, y, { align: 'right' }); y += 7; }
  doc.line(10, y, W - 10, y);
  y += 8;
  doc.setFont('helvetica', 'bold').setFontSize(12).text(fr ? 'Total payé' : 'Total paid', 10, y).text(money(r.totalGhs), W - 10, y, { align: 'right' });
  y += 10;
  doc.setFont('helvetica', 'normal').setFontSize(9).text(`${fr ? 'Payé par' : 'Paid by'} ${methodLabel(r.method, fr)} · ${r.provider}`, 10, y);
  y += 12;
  doc.setFontSize(8).setTextColor(120, 110, 100);
  if (r.simulated) { doc.text(fr ? 'Paiement simulé (démonstration) : aucun montant n’a été débité.' : 'Simulated payment (demo): no money was charged.', 10, y); y += 5; }
  doc.text(fr ? 'Merci d’apprendre avec La Porte. Conservez ce reçu pour vos dossiers.' : 'Thank you for learning with La Porte. Keep this receipt for your records.', 10, y);
  doc.save(`La-Porte-${fr ? 'recu' : 'receipt'}-${r.number}.pdf`);
}

/** Opens a payment's receipt with Download PDF, Print and Email actions. */
export function ReceiptModal({ payment, learner, onClose }: { payment: Payment | null; learner?: Learner; onClose: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { actions } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState<'pdf' | 'mail' | null>(null);
  const receipt = payment && learner ? buildReceipt(payment, learner) : null;
  const download = async () => {
    if (!receipt) return;
    setBusy('pdf');
    try {
      await downloadReceiptPdf(receipt, lang, l(receipt.lines[0].label), receipt.discount ? (fr ? `Remise fidélité (${receipt.discount.percent} %)` : `Reward discount (${receipt.discount.percent}%)`) : undefined);
    } catch {
      toast(fr ? 'Téléchargement impossible. Utilisez « Imprimer » puis « Enregistrer en PDF ».' : 'Could not download. Use “Print” then “Save as PDF”.');
    } finally {
      setBusy(null);
    }
  };
  const email = () => {
    if (!receipt) return;
    setBusy('mail');
    actions.receipts.email(receipt.number)
      .then((r) => toast(fr ? `Reçu envoyé à ${r.to}${r.simulated ? ' (simulé)' : ''}` : `Receipt sent to ${r.to}${r.simulated ? ' (simulated)' : ''}`, 'mail'))
      .catch((e) => toast(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(null));
  };
  return (
    <Modal open={!!receipt} onClose={onClose} title={fr ? 'Reçu de paiement' : 'Payment receipt'} width={560}>
      {receipt && (
        <div className="stack" style={{ ['--gap' as string]: '14px' }}>
          <ReceiptSheet receipt={receipt} />
          <div className="row receipt-actions" style={{ ['--gap' as string]: '8px' }}>
            <button className="btn btn-primary" onClick={() => void download()} disabled={busy === 'pdf'}><Icon name="download" size={16} /> {busy === 'pdf' ? '…' : fr ? 'Télécharger (PDF)' : 'Download PDF'}</button>
            <button className="btn btn-secondary" onClick={() => window.print()}><Icon name="file" size={16} /> {fr ? 'Imprimer' : 'Print'}</button>
            <button className="btn btn-secondary" onClick={email} disabled={busy === 'mail'}><Icon name="mail" size={16} /> {busy === 'mail' ? '…' : fr ? 'M’envoyer par e-mail' : 'Email me a copy'}</button>
          </div>
          <p className="tiny muted">{fr ? `L’e-mail part à ${learner?.email ?? 'votre adresse'}. Envoi simulé tant que le service d’e-mail n’est pas connecté.` : `The email goes to ${learner?.email ?? 'your address'}. Sending is simulated until the email service is connected.`}</p>
        </div>
      )}
    </Modal>
  );
}
