import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Language, UserProfile } from '../types';
import type { customerHistory } from '../../server/models/customerHistory';
import { auth } from '../lib/firebase';
import { paymentAuthHeaders } from '../lib/paymentAuth';
import { formatPrice } from '../lib/catalog';
import { paymentMethodLabel } from '../lib/customerMessages';
import { Clock, Download, RefreshCw } from '../lib/icons';
import './CustomerHistoryPage.css';

type History = ReturnType<typeof customerHistory>;
const operatorNames: Record<string, string> = { airtel_dth: 'Airtel Digital TV', sun_direct: 'Sun Direct', tata_play: 'Tata Play', dish_tv: 'Dish TV', d2h: 'D2H' };
export function CustomerHistoryPage({ user, currentLang, onOpenAuth }: { user: UserProfile | null; currentLang: Language; onOpenAuth: () => void }) {
  const [state, setState] = useState<{ uid: string; data: History } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [box, setBox] = useState('all');
  const [filter, setFilter] = useState('all');
  const [downloading, setDownloading] = useState('');
  const text = (en: string, ta: string) => currentLang === 'ta' ? ta : en;
  useEffect(() => {
    setState(null); setError(''); setBox('all'); setFilter('all'); setDownloading('');
    if (!user) { setLoading(false); return; }
    let active = true;
    const controller = new AbortController(); setLoading(true);
    (async () => {
      try {
        await auth?.authStateReady?.();
        if (auth?.currentUser?.uid !== user.uid) throw new Error('Please sign in again.');
        const response = await fetch('/api/my/history', { headers: await paymentAuthHeaders(), signal: controller.signal, cache: 'no-store' });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load your history.');
        if (active && auth?.currentUser?.uid === user.uid) setState({ uid: user.uid, data: result });
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Unable to load your history.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; controller.abort(); };
  }, [user?.uid, refresh]);
  const data = user && state?.uid === user.uid ? state.data : null;
  const date = (value: string) => new Date(value).toLocaleString(currentLang === 'ta' ? 'ta-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  const status = (value: string) => ({ completed: text('Completed', 'முடிந்தது'), pending: text('Awaiting recharge', 'ரீசார்ஜ் நிலுவை'), processing: text('Awaiting recharge', 'ரீசார்ஜ் நிலுவை'), failed: text('Failed', 'தோல்வி'), paid: text('Paid', 'செலுத்தப்பட்டது'), initiated: text('Pending payment', 'கட்டணம் நிலுவை'), refunded: text('Refunded', 'திருப்பிச் செலுத்தப்பட்டது') }[value] || value);
  const boxKey = (item: { operator: string; smartCardNumber: string }) => `${item.operator}:${item.smartCardNumber}`;
  const boxes = Array.from(new Map((data?.orders || []).map(order => [boxKey(order), order])).values());
  const orders = (data?.orders || []).filter(order => (box === 'all' || boxKey(order) === box) && (filter === 'all' || (filter === 'pending' ? ['pending', 'processing'].includes(order.rechargeStatus) : order.rechargeStatus === filter)));
  const payments = (data?.payments || []).filter(payment => box === 'all' || boxKey(payment) === box);
  async function download(paymentId: string) {
    if (downloading || !user) return;
    const uid = user.uid; setDownloading(paymentId); setError('');
    try {
      if (auth?.currentUser?.uid !== uid) throw new Error('Please sign in again.');
      const response = await fetch(`/api/my/payments/${encodeURIComponent(paymentId)}/receipt`, { headers: await paymentAuthHeaders() });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Could not download receipt.'); }
      const blob = await response.blob(); if (auth?.currentUser?.uid !== uid) return;
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `DTH-Tamizhan-${paymentId.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { if (auth?.currentUser?.uid === uid) setError(e instanceof Error ? e.message : 'Could not download receipt.'); }
    finally { setDownloading(''); }
  }
  return <section className="customer-history-page">
    <header className="customer-history-heading"><div><h1>{text('Your recharge history', 'உங்கள் ரீசார்ஜ் வரலாறு')}</h1><p>{text('Track recharges and payments across all your boxes.', 'உங்கள் அனைத்து பாக்ஸ்களின் ரீசார்ஜ் மற்றும் கட்டண விவரங்களைப் பார்க்கவும்.')}</p></div>{user && <button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} />{text('Refresh', 'புதுப்பிக்கவும்')}</button>}</header>
    {!user ? <div className="customer-history-empty"><Clock size={30} /><h2>{text('Sign in to view your history', 'வரலாற்றைப் பார்க்க உள்நுழையவும்')}</h2><p>{text('Use the same account you used for payment.', 'கட்டணம் செலுத்திய அதே கணக்கில் உள்நுழையவும்.')}</p><button className="account-primary" type="button" onClick={onOpenAuth}>{text('Sign in', 'உள்நுழையவும்')}</button></div> : <>
      {error && <div role="alert" className="customer-history-error"><p>{error}</p><button type="button" onClick={() => setRefresh(value => value + 1)}>{text('Try again', 'மீண்டும் முயற்சிக்கவும்')}</button></div>}
      {loading && <p role="status">{text('Loading your history…', 'வரலாறு ஏற்றப்படுகிறது…')}</p>}
      {data && <>
        <div className="customer-history-filters"><label>{text('Connection', 'இணைப்பு')}<select value={box} onChange={event => setBox(event.target.value)}><option value="all">{text('All boxes', 'அனைத்து பாக்ஸ்கள்')}</option>{boxes.map(item => <option key={boxKey(item)} value={boxKey(item)}>{item.operatorName} / {item.smartCardNumber}</option>)}</select></label><label>{text('Recharge status', 'ரீசார்ஜ் நிலை')}<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">{text('All statuses', 'அனைத்து நிலைகள்')}</option><option value="pending">{status('pending')}</option><option value="completed">{status('completed')}</option><option value="failed">{status('failed')}</option></select></label></div>
        <section aria-label={text('Recharge orders', 'ரீசார்ஜ் ஆர்டர்கள்')} className="customer-history-orders">
          {orders.map(order => <details key={order.orderId} className="customer-history-order"><summary><span><strong>{order.operatorName}</strong><small>{text('Subscriber ID', 'சந்தாதாரர் எண்')}: {order.smartCardNumber}</small><span>{order.packName}</span></span><span className="customer-history-order-total"><strong>{formatPrice(order.amount, currentLang)}</strong><span className={`customer-history-status is-${order.rechargeStatus}`}>{status(order.rechargeStatus)}</span></span></summary><dl>
            <div><dt>{text('Date (IST)', 'தேதி (IST)')}</dt><dd>{date(order.createdAt)}</dd></div><div><dt>{text('Validity', 'காலம்')}</dt><dd>{order.packValidity}</dd></div><div><dt>{text('Order ID', 'ஆர்டர் எண்')}</dt><dd>{order.orderId}</dd></div><div><dt>{text('Payment ID', 'கட்டண எண்')}</dt><dd>{order.paymentId || text('Not recorded', 'பதிவு செய்யப்படவில்லை')}</dd></div><div><dt>{text('Payment', 'கட்டணம்')}</dt><dd>{status(order.paymentStatus)} / {paymentMethodLabel(order.paymentMethod, currentLang)}</dd></div><div><dt>{text('Operator reference', 'நிறுவன குறிப்பு எண்')}</dt><dd>{order.operatorRefId || text('Not provided', 'வழங்கப்படவில்லை')}</dd></div>
          </dl></details>)}
          {!orders.length && <div className="customer-history-empty"><h2>{text('No recharges to show', 'ரீசார்ஜ் பதிவுகள் இல்லை')}</h2><p>{data.orders.length ? text('Try a different filter.', 'வேறு வடிப்பானைத் தேர்ந்தெடுக்கவும்.') : text('Your recharge requests will appear here after payment is confirmed.', 'கட்டணம் உறுதியானதும் ரீசார்ஜ் கோரிக்கைகள் இங்கே காட்டப்படும்.')}</p><Link className="account-primary" to="/recharge">{text('Recharge a box', 'ரீசார்ஜ் செய்யவும்')}</Link></div>}
        </section>
        <section className="customer-history-payment-section"><h2>{text('Your payments', 'உங்கள் கட்டணங்கள்')}</h2>{payments.length ? <div className="customer-history-table"><table><thead><tr><th>{text('Date (IST)', 'தேதி (IST)')}</th><th>{text('Connection', 'இணைப்பு')}</th><th>{text('Payment ID', 'கட்டண எண்')}</th><th>{text('Amount', 'தொகை')}</th><th>{text('Status', 'நிலை')}</th><th>{text('Receipt', 'ரசீது')}</th></tr></thead><tbody>{payments.map(payment => <tr key={payment.id}><td>{date(payment.createdAt)}</td><td>{operatorNames[payment.operator] || text('Payment', 'கட்டணம்')}<small>{payment.smartCardNumber}</small></td><td>{payment.id}<small>{paymentMethodLabel(payment.paymentMethod, currentLang)}</small></td><td>{payment.currency === 'INR' ? formatPrice(payment.amount, currentLang) : `${payment.currency} ${payment.amount}`}</td><td>{status(payment.status)}</td><td>{payment.status === 'paid' ? <button type="button" disabled={!!downloading} onClick={() => void download(payment.id)} aria-label={`${text('Download PDF receipt', 'PDF ரசீதைப் பதிவிறக்கவும்')} ${payment.id}`}><Download size={16} />{downloading === payment.id ? text('Preparing…', 'தயாராகிறது…') : 'PDF'}</button> : '—'}</td></tr>)}</tbody></table></div> : <p>{text('No payments to show.', 'கட்டண பதிவுகள் இல்லை.')}</p>}</section>
      </>}
    </>}
  </section>;
}
