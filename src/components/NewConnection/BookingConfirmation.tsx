import { ProviderBookingDetails } from './ProviderBookingDetails';
import { bookingRefundPolicy } from '../../lib/newConnectionPolicy';
import React from 'react';
import { Link } from 'react-router-dom';
import type { Language } from '../../types';
import type { NewConnectionOrder } from '../../lib/newConnectionOrders';
import { gatewayPaymentRecorded, withConnectionLedger } from '../../lib/newConnectionOrders';
import { packPackageType } from '../../lib/newConnectionCatalog';
import { packDisplayName, packageCardLabel, validityLabel } from '../../lib/newConnectionDisplay';
import { confirmationAddress, reviewDate } from '../../lib/newConnectionReview';
import { connectionStatusLabel } from '../../lib/newConnectionTrackingCopy';
import { translations } from '../../lib/translations';
import { Check, Clock, Copy, Ticket, Printer, ArrowLeft } from '../../lib/icons';
import { PackageImage } from './PackageImage';
import { currency } from './Shared';
import type { VisiblePack } from '../../lib/newConnectionBrowse';
import { PackQualityChip } from './PackChips';

export function BookingConfirmation({ order, item, lang, notice, busy, expanded = false, onToggle, refundPolicy, receipt, onCopy, onCheck, onRetry, onRestart }: {
  expanded?: boolean; onToggle: () => void; order: NewConnectionOrder; item?: VisiblePack; lang: Language; notice: string; busy: boolean; refundPolicy: string;
  receipt: React.ReactNode; onCopy: () => void; onCheck: () => void; onRetry: () => void; onRestart: () => void;
}) {
  const t = translations[lang];
  const ledger = withConnectionLedger(order);
  const paid = gatewayPaymentRecorded(ledger) || order.paymentStatus === 'paid';
  const noPayment = order.amountDueNow === 0;
  const pending = !paid && !noPayment && ['pending', 'awaiting_admin_confirmation'].includes(order.paymentStatus);
  const expired = Date.now() - Date.parse(order.createdAt) >= 24 * 3600000;
  const confirmed = ['booked', 'scheduled', 'installed'].includes(order.status);
  const packageType = packPackageType({ name: order.snapshot.pack });
  const slot = ({ Morning: t.nbMorning, Afternoon: t.nbAfternoon, Evening: t.nbEvening, Any: t.nbAny })[order.customer.preferredSlot];
  const title = ['cancelled', 'refund_initiated', 'refunded'].includes(order.status) ? connectionStatusLabel(order.status, lang) : confirmed || paid ? lang === 'en' ? 'Booking confirmed' : t.nbReceived : t.nbReceived;
  const paymentLabel = order.amountRefunded > 0 ? connectionStatusLabel(order.paymentStatus, lang) : paid ? lang === 'en' ? 'Paid' : t.nbPaid : noPayment ? lang === 'en' ? 'No online payment' : t.nbNoneHint : connectionStatusLabel(order.paymentStatus, lang);
  return <section className="connection-booking-receipt connection-confirmation receipt-print">
    <header className="connection-confirmation-header">
      <div className="connection-confirmation-toolbar connection-no-print">
        <Link className="connection-confirmation-back" to="/new-connection"><ArrowLeft size={18} aria-hidden="true" />{t.ncBack}</Link>
        <nav className="connection-confirmation-tools" aria-label={lang === 'en' ? 'Booking actions' : t.nbReview}>
          <Link to="/account/bookings" aria-label={lang === 'en' ? 'My Bookings' : t.ctTitle} title={lang === 'en' ? 'My Bookings' : t.ctTitle}><Ticket size={20} aria-hidden="true" /></Link>
          <button type="button" onClick={() => window.print()} aria-label={t.nbPrint} title={t.nbPrint}><Printer size={20} aria-hidden="true" /></button>
        </nav>
      </div>
      <span className="connection-confirmation-tick" data-pending={pending} aria-hidden="true">{pending ? <Clock size={52} /> : <Check size={64} />}</span>
      <div className="connection-confirmation-hero-copy"><h1>{title}</h1>{pending && <p className="connection-confirmation-pending-note">{lang === 'en' ? 'Payment confirmation pending' : t.ctVerifying}</p>}{paid && <p className="connection-confirmation-success-note">{lang === 'en' ? 'Payment successful. Our team will confirm your installation appointment.' : t.nbNoTerms}</p>}<p>{t.nbBookingId}</p><div className="connection-confirmation-reference"><strong>{order.bookingId}</strong><button type="button" className="connection-no-print" aria-label={lang === 'en' ? 'Copy booking number' : t.nbBookingId} title={lang === 'en' ? 'Copy booking number' : t.nbBookingId} onClick={onCopy}><Copy size={20} aria-hidden="true" /></button></div></div>
      <button type="button" className="connection-confirmation-toggle connection-no-print" aria-expanded={expanded} aria-controls="connection-confirmation-details" onClick={onToggle}>{lang === 'en' ? expanded ? 'Hide booking details' : 'View booking details' : t.nbReview}</button>
    <nav className="connection-confirmation-actions connection-no-print" aria-label={lang === 'en' ? 'Booking actions' : t.nbReview}>
      {pending && <button type="button" disabled={busy} onClick={onCheck}>{t.nbCheck}</button>}
      {!paid && !noPayment && !expired && order.paymentStatus === 'failed' && !(order.provider === 'youpi' && ['EXPIRED', 'FAILED', 'CANCELLED'].includes(String(order.providerRaw.status))) && <button type="button" disabled={busy} onClick={onRetry}>{t.nbRetry}</button>}
      {expired && !paid && !noPayment && <><p>{t.nbExpired}</p><button type="button" onClick={onRestart}>{t.nbClear}</button></>}
    </nav>
    </header>
    {order.provider === 'razorpay' && order.testMode === true && <div className="connection-confirmation-test" role="status">{t.nbTest}</div>}
    {pending && <p className="connection-feedback" role="status">{t.nbPendingHint}</p>}

    <ProviderBookingDetails order={order} lang={lang} />
    <div id="connection-confirmation-details" className="connection-confirmation-expanded" hidden={!expanded}>
    <div className="connection-confirmation-sections">
      <section className="connection-confirmation-disclosure"><h2>{t.nbPlan}</h2><div className="connection-confirmation-plan"><div className="connection-confirmation-plan-identity"><p>{order.snapshot.brand}</p><h3>{packDisplayName(order.snapshot.pack)}</h3>{item && <p className="connection-confirmation-channel-count">{item.counts.channelCount} {t.ncChannels} &middot; {item.counts.hdChannelCount} HD</p>}</div><div className="connection-confirmation-product"><PackageImage brand={order.snapshot.brand} pack={order.snapshot.pack} packageType={packageType} boxType={order.snapshot.boxType} /></div><div className="connection-pack-chips">{item && <PackQualityChip pack={item.pack} hdCount={item.counts.hdChannelCount} />}{packageType && <span className="connection-pack-chip connection-pack-box">{packageCardLabel(packageType, lang)}</span>}<span className="connection-pack-chip connection-validity-chip">{validityLabel(order.selectedValidityDays, lang, order.selectedValidityMonths)}</span></div></div></section>
      <section className="connection-confirmation-disclosure"><h2>{lang === 'en' ? 'Contact' : t.nbName}</h2><div className="connection-confirmation-detail-body"><dl className="connection-confirmation-facts"><div><dt>{t.nbName}</dt><dd>{order.customer.name}</dd></div><div><dt>{t.nbPhone}</dt><dd><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></dd></div>{order.customer.altPhone && <div><dt>{t.nbAltPhone}</dt><dd><a href={`tel:${order.customer.altPhone}`}>{order.customer.altPhone}</a></dd></div>}{order.customer.email && <div><dt>{lang === 'en' ? 'Email' : t.nbEmail}</dt><dd><a href={`mailto:${order.customer.email}`}>{order.customer.email}</a></dd></div>}</dl></div></section>
      <section className="connection-confirmation-disclosure"><h2>{lang === 'en' ? 'Installation address' : t.nbAddress}</h2><div className="connection-confirmation-detail-body"><address>{confirmationAddress(order.customer).map(line => <div key={line}>{line}</div>)}</address></div></section>
      <section className="connection-confirmation-disclosure"><h2>{lang === 'en' ? 'Preferred visit' : t.nbDate}</h2><div className="connection-confirmation-detail-body"><p>{reviewDate(order.customer.preferredDate, lang)} &middot; {slot} {lang === 'en' ? '(preferred, not confirmed)' : t.nbNoTerms}</p>{order.customer.notes && <p>{t.nbNotes}: {order.customer.notes}</p>}</div></section>
    </div>
    <section className="connection-confirmation-disclosure"><h2>{lang === 'en' ? 'Payment details' : t.nbDue}</h2><dl className="connection-confirmation-totals"><div><dt>{t.nbPaidAmount}</dt><dd className="connection-confirmation-paid-amount"><strong>{currency(ledger.amountPaid, lang)}</strong>{paid && !order.amountRefunded && <span className="connection-confirmation-status" data-paid={true}>{lang === 'en' ? 'Paid' : t.nbPaid}</span>}</dd></div><div className="connection-no-print"><dt>{t.nbBalance}</dt><dd>{currency(ledger.balance, lang)}</dd></div></dl>{!paid && <p className="connection-confirmation-detail-body">{noPayment ? t.nbNoneHint : paymentLabel}</p>}</section>
    <div className="connection-print-only"><h2>{lang === 'en' ? 'Payment receipt' : t.nbPrint}</h2>{receipt}</div>
    <section className="connection-confirmation-disclosure connection-confirmation-next"><h2>{lang === 'en' ? 'What happens next' : t.nbNoTerms}</h2><div className="connection-confirmation-detail-body"><ol><li>{lang === 'en' ? 'Confirmation call within 24 to 48 hours to arrange your installation.' : t.nbNoTerms}</li><li>{lang === 'en' ? 'Technician visit on or near your preferred date, subject to availability and confirmation.' : t.nbDate}</li><li>{lang === 'en' ? 'Activation after installation and operator checks.' : t.nbOffer}</li></ol><p>{t.nbRefund}: {bookingRefundPolicy(refundPolicy, lang).split(/(?<=[.!?])\s|\n/)[0]}</p></div></section>

    </div>
    {notice && notice !== t.nbPendingHint && <p role="status">{notice}</p>}

  </section>;
}
