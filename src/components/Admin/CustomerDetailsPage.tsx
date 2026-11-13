import { useEffect, useRef, useState } from 'react';
import type { CustomerRecord, Language, RechargeOrder } from '../../types';
import type { PaymentLedgerEntry } from '../../../server/models/paymentLedger';
import { ArrowLeft, RefreshCw } from '../../lib/icons';
import { formatPrice } from '../../lib/catalog';
import { paymentMethodLabel } from '../../lib/customerMessages';
import { OperatorCardLogo } from '../BrandAssets';
import './CustomerDetailsPage.css';

interface Details { customer: CustomerRecord; connections: CustomerRecord[]; orders: RechargeOrder[]; payments: PaymentLedgerEntry[] }
export function CustomerDetailsPage({ customerId, getAuthHeaders, currentLang, onBack }: {
  customerId: string; getAuthHeaders: () => Promise<Record<string, string>>; currentLang: Language; onBack: () => void;
}) {
  const [data, setData] = useState<Details | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const text = (en: string, ta: string) => currentLang === 'ta' ? ta : en;
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setData(null); setError(''); setLoading(true);
    (async () => {
      try {
        const response = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}`, { headers: await getAuthHeaders(), signal: controller.signal, cache: 'no-store' });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load customer details.');
        if (active) setData(result);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Unable to load customer details.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; controller.abort(); };
  }, [customerId, getAuthHeaders, refresh]);
  useEffect(() => { titleRef.current?.focus(); }, [customerId]);
  const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(currentLang === 'ta' ? 'ta-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : text('Not recorded', 'பதிவு செய்யப்படவில்லை');
  const status = (value: string) => ({ completed: text('Completed', 'முடிந்தது'), pending: text('Pending', 'நிலுவை'), processing: text('Pending', 'நிலுவை'), failed: text('Failed', 'தோல்வி'), paid: text('Paid', 'செலுத்தப்பட்டது'), initiated: text('Initiated', 'தொடங்கப்பட்டது'), refunded: text('Refunded', 'திருப்பிச் செலுத்தப்பட்டது') }[value] || value);
  const customer = data?.customer;
  return <article className="customer-details-page">
    <div className="customer-details-toolbar"><button type="button" onClick={onBack}><ArrowLeft size={16} />{text('Back to customers', 'வாடிக்கையாளர்கள் பட்டியல்')}</button><button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />{text('Refresh', 'புதுப்பிக்கவும்')}</button></div>
    <h2 ref={titleRef} tabIndex={-1}>{text('Customer details', 'வாடிக்கையாளர் விவரங்கள்')}</h2>
    {loading && <p role="status">{text('Loading customer details…', 'வாடிக்கையாளர் விவரங்கள் ஏற்றப்படுகின்றன…')}</p>}
    {error && <div role="alert" className="customer-details-card"><p className="text-error">{error}</p><button type="button" onClick={() => setRefresh(value => value + 1)}>{text('Try again', 'மீண்டும் முயற்சிக்கவும்')}</button></div>}
    {data && customer && <>
      <section className="customer-details-card customer-details-profile" aria-label={text('Customer profile', 'வாடிக்கையாளர் சுயவிவரம்')}>
        <div className="customer-details-identity"><div><h3>{customer.customerName}</h3><p>{customer.operatorName}</p></div>{customer.operator !== 'd2h' && <OperatorCardLogo operatorId={customer.operator} />}</div>
        <dl className="customer-details-fields">
          <div><dt>{text('Phone number', 'மொபைல் எண்')}</dt><dd>{customer.registeredMobile || text('Not provided', 'வழங்கப்படவில்லை')}</dd></div>
          <div><dt>{text('Smart-card / Subscriber ID', 'சந்தாதாரர் எண்')}</dt><dd>{customer.smartCardNumber}</dd></div>
          <div><dt>{text('Latest recharge pack', 'சமீபத்திய ரீசார்ஜ் திட்டம்')}</dt><dd>{customer.activePackName}</dd></div>
          <div><dt>{text('Latest recharge status', 'சமீபத்திய ரீசார்ஜ் நிலை')}</dt><dd>{status(customer.latestRechargeStatus || 'pending')}</dd></div>
          <div><dt>{text('Latest recharge amount', 'சமீபத்திய ரீசார்ஜ் தொகை')}</dt><dd>{formatPrice(customer.lastRechargeAmount || 0, currentLang)}</dd></div>
          <div><dt>{text('Latest recharge update (IST)', 'சமீபத்திய புதுப்பிப்பு (IST)')}</dt><dd>{date(customer.lastRechargeDate)}</dd></div>
        </dl>
      </section>
      <section className="customer-details-card"><h3>{text('All set-top boxes', 'அனைத்து செட்-டாப் பாக்ஸ்கள்')} <span>({data.connections.length})</span></h3>
        <div className="customer-box-grid">{data.connections.map(box => <div className="customer-box-card" key={box.id}>
          <strong>{box.operatorName}</strong><p className="customer-box-id">{text('Subscriber ID', 'சந்தாதாரர் எண்')}: {box.smartCardNumber}</p>
          <p>{box.activePackName}</p><small>{formatPrice(box.lastRechargeAmount || 0, currentLang)} · {status(box.latestRechargeStatus || 'pending')}</small>
          <small>{date(box.lastRechargeDate)}</small>
        </div>)}</div>
      </section>
      <section className="customer-details-card"><h3>{text('Recharge history', 'ரீசார்ஜ் வரலாறு')} <span>({data.orders.length})</span></h3>
        <div className="customer-details-scroll"><table><thead><tr><th>{text('Date (IST)', 'தேதி (IST)')}</th><th>{text('Box / Operator', 'பாக்ஸ் / நிறுவனம்')}</th><th>{text('Plan / Validity', 'திட்டம் / காலம்')}</th><th>{text('Amount', 'தொகை')}</th><th>{text('Status', 'நிலை')}</th><th>{text('References & notes', 'குறிப்புகள்')}</th></tr></thead><tbody>{data.orders.map(order => <tr key={order.orderId}><td>{date(order.createdAt)}</td><td>{order.operatorName}<small>{order.smartCardNumber}</small></td><td>{order.packName}<small>{order.packValidity}</small></td><td>{formatPrice(order.amount, currentLang)}</td><td>{status(order.rechargeStatus)}</td><td><span>{order.orderId}</span>{order.paymentId && <small>{order.paymentId}</small>}{order.operatorRefId && <small>{order.operatorRefId}</small>}{order.workerNotes && <small>{order.workerNotes}</small>}</td></tr>)}</tbody></table></div>
        {!data.orders.length && <p>{text('No recharge history recorded.', 'ரீசார்ஜ் வரலாறு இல்லை.')}</p>}
      </section>
      <section className="customer-details-card"><h3>{text('Payment details', 'கட்டண விவரங்கள்')} <span>({data.payments.length})</span></h3>
        <div className="customer-details-scroll"><table><thead><tr><th>{text('Date (IST)', 'தேதி (IST)')}</th><th>{text('Payment / Order ID', 'கட்டணம் / ஆர்டர் எண்')}</th><th>{text('Box / Operator', 'பாக்ஸ் / நிறுவனம்')}</th><th>{text('Method', 'முறை')}</th><th>{text('Amount', 'தொகை')}</th><th>{text('Status', 'நிலை')}</th></tr></thead><tbody>{data.payments.map(payment => <tr key={payment.id}><td>{date(payment.createdAt)}</td><td>{payment.id}<small>{payment.orderId}</small></td><td>{data.connections.find(box => box.operator === payment.operator)?.operatorName || payment.operator}<small>{payment.smartCardNumber || text('Not recorded', 'பதிவு செய்யப்படவில்லை')}</small></td><td>{paymentMethodLabel(payment.paymentMethod, currentLang)}</td><td>{payment.currency === 'INR' ? formatPrice(payment.amount, currentLang) : `${payment.currency} ${payment.amount}`}</td><td>{status(payment.status)}<small>{payment.providerStatus}</small></td></tr>)}</tbody></table></div>
        {!data.payments.length && <p>{text('No payments recorded.', 'கட்டண பதிவுகள் இல்லை.')}</p>}
      </section>
    </>}
  </article>;
}

