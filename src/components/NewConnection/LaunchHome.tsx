import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DthConnection, DthOperator, DthOperatorId, Language, UserProfile } from '../../types';
import { CreditCard, Tv, Wrench, ArrowRight, ChevronDown } from '../../lib/icons';
import { WhatsappLogo } from '@phosphor-icons/react';
import { clientRechargeEnabled } from '../../lib/rechargeFeature';
import { auth } from '../../lib/firebase';
import { paymentAuthHeaders } from '../../lib/paymentAuth';
import { ticketApi } from '../../lib/ticketApi';
import { loadPublicCatalog } from '../../lib/newConnectionPublicCatalog';
import { visibleCatalog } from '../../lib/newConnectionBrowse';
import { packPackageType, type CatalogData } from '../../lib/newConnectionCatalog';
import { validityLabel } from '../../lib/newConnectionDisplay';
import { BUSINESS_DETAILS } from '../../lib/trustContent';

import { HomeDetails, serviceAreaText } from './HomeDetails';

const operators: { id: DthOperatorId; name: string; logo: string; match: string }[] = [
  { id: 'airtel_dth', name: 'Airtel DTH', logo: '/airtel_logo.png', match: 'airtel' },
  { id: 'tata_play', name: 'Tata Play', logo: '/tata_logo.png', match: 'tataplay' },
  { id: 'sun_direct', name: 'Sun Direct', logo: '/sun_logo.png', match: 'sundirect' },
  { id: 'dish_tv', name: 'Dish TV', logo: '/dishtv_logo.png', match: 'dishtv' },
  { id: 'd2h', name: 'd2h', logo: '/d2h_logo.png', match: 'd2h' },
];
export type HomeStatus = { id: string; status: string };
interface HomeProps {
  currentLang: Language; user?: UserProfile | null; isSignedIn?: boolean; recharge?: boolean;
  connections?: DthConnection[]; onOpenAuth?: () => void; onRechargeConnection?: (connection: DthConnection) => void;
}
interface ContentProps extends HomeProps {
  catalog: CatalogData | null; rechargeOperators?: DthOperator[];
  openBooking?: HomeStatus | null; openService?: HomeStatus | null; now?: number;
}
export function homeConnection(connections: DthConnection[], uid?: string, _now = Date.now()) {
  return connections.filter(c => uid && c.user_id === uid)
    .sort((a, b) => (Date.parse(b.lastRechargeDate || b.createdAt) || 0) - (Date.parse(a.lastRechargeDate || a.createdAt) || 0))[0];
}
export function LaunchHomeContent({ currentLang: lang, catalog, user, isSignedIn = !!user, recharge = false, connections = [], onOpenAuth, onRechargeConnection, openBooking, openService, now = Date.now() }: ContentProps) {
  const ta = lang === 'ta';
  const say = (en: string, tamil: string) => ta ? tamil : en;
  const items = catalog ? visibleCatalog(catalog) : [];
  const cheapest = items.flatMap(item => item.pack.pricingOptions.filter(option => option.price > 0).map(option => ({ item, option }))).sort((a, b) => a.option.price - b.option.price)[0];
  const online = catalog && catalog.settings.advanceMode !== 'none' && catalog.settings.defaultProvider !== 'none' && catalog.settings.enabledProviders.includes(catalog.settings.defaultProvider);
  const connection = isSignedIn ? homeConnection(connections, user?.uid, now) : undefined;
  const firstName = user?.displayName?.trim().split(/\s+/)[0]?.toLocaleLowerCase(lang === 'ta' ? 'ta-IN' : 'en-IN').replace(/(^|[-’'])[\p{L}]/gu, letter => letter.toLocaleUpperCase()) || '';
  const greeting = isSignedIn ? say('Welcome back', 'Vanakkam') + (firstName ? ', ' + firstName : '') : say("Vanakkam! Let's get your TV sorted.", 'வணக்கம்! உங்கள் TV-க்கு உதவுகிறோம்.');
  const lastRecharge = connection?.lastRechargeDate && Number.isFinite(Date.parse(connection.lastRechargeDate)) ? new Date(connection.lastRechargeDate).toLocaleDateString(ta ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const operatorName = connection?.operatorName || operators.find(op => op.id === connection?.operator)?.name || '';
  const daysLeft = connection?.expiryDate ? (Date.parse(connection.expiryDate) - now) / 86400000 : NaN;
  const bookingCopy: Record<string, [string, string]> = {
    received: ["We've received your booking and will be in touch about installation.", 'உங்கள் பதிவு கிடைத்தது. நிறுவல் குறித்து விரைவில் தொடர்புகொள்வோம்.'],
    contacted: ["We're helping arrange your new connection.", 'உங்கள் புதிய இணைப்பை ஏற்பாடு செய்து வருகிறோம்.'],
    booked: ['Your connection is booked. We’ll keep you updated about installation.', 'உங்கள் இணைப்பு பதிவாகிவிட்டது. நிறுவல் விவரங்களைத் தெரிவிப்போம்.'],
    scheduled: ['Your installation is scheduled. View your booking for the details.', 'உங்கள் நிறுவல் திட்டமிடப்பட்டுள்ளது. விவரங்களைப் பதிவில் பார்க்கவும்.'],
  };
  const serviceCopy: Record<string, [string, string]> = {
    open: ["We've received your service request. Our team will help you.", 'உங்கள் சேவைக் கோரிக்கை கிடைத்தது. எங்கள் குழு உதவும்.'],
    in_progress: ['Our team is working on your service request.', 'உங்கள் சேவைக் கோரிக்கையை எங்கள் குழு கவனித்து வருகிறது.'],
    pending_payment: ['Your service request is waiting for payment.', 'உங்கள் சேவைக் கோரிக்கைக்கான கட்டணம் நிலுவையில் உள்ளது.'],
    paid: ['Your service payment is received. Our team will be in touch.', 'சேவைக் கட்டணம் கிடைத்தது. எங்கள் குழு தொடர்புகொள்ளும்.'],
    placed_with_company: ['Your service request has been sent to the operator.', 'உங்கள் சேவைக் கோரிக்கை நிறுவனத்திற்கு அனுப்பப்பட்டுள்ளது.'],
  };
  const rechargeAction = connection && onRechargeConnection ? <button className="home-task-action is-primary" type="button" disabled={!recharge} onClick={() => onRechargeConnection(connection)}>{say('Recharge now', 'ரீசார்ஜ் செய்யவும்')}<ArrowRight size={16} aria-hidden="true" /></button> : <Link className="home-task-action is-primary" to="/recharge">{say('Recharge now', 'ரீசார்ஜ் செய்யவும்')}<ArrowRight size={16} aria-hidden="true" /></Link>;
  return <>
    <section className="launch-hero home-services-hero home-welcome-hero" aria-labelledby="launch-hero-title">
      <img className="launch-hero-image" src="/images/dth-family-hero.webp" width="1536" height="1024" fetchPriority="high" decoding="async" alt="" aria-hidden="true" />
      <div className="home-services-content">
        <header className="home-hero-heading"><h1 id="launch-hero-title">{greeting}</h1><p>{say('A little help for uninterrupted TV time.', 'தடையில்லா TV நேரத்திற்கு எங்கள் உதவி.')}</p>{!isSignedIn && <button className="home-hero-signin home-task-action" type="button" onClick={onOpenAuth}>{say('Sign in', 'உள்நுழையவும்')}<ArrowRight size={15} aria-hidden="true" /></button>}</header>
        <section className="home-today" aria-labelledby="home-today-title">
          <h2 id="home-today-title">{say('What would you like to do today?', 'இன்று உங்களுக்கு என்ன உதவி வேண்டும்?')}</h2>
          <div className="home-task-cards">
            <article className="home-task-card"><CreditCard size={26} aria-hidden="true" /><h3>{say('Recharge', 'ரீசார்ஜ்')}</h3><p>{say('Keep your favourite shows coming.', 'உங்கள் விருப்பமான நிகழ்ச்சிகளைத் தொடர்ந்து பாருங்கள்.')}</p>
              <div className="home-task-detail">{connection ? <p className="home-saved-connection">{say('Your', 'உங்கள்')}{operatorName && <> {operatorName}</>}{connection.smartCardNumber?.trim() && <> <span className="home-masked-id">•••• {connection.smartCardNumber.slice(-4)}</span></>}{lastRecharge && <> · {say('last recharged on', 'கடைசியாக ரீசார்ஜ் செய்த நாள்')} {lastRecharge}</>}</p> : <p>{say('Choose your operator and enter your customer ID to get started.', 'உங்கள் நிறுவனத்தைத் தேர்ந்தெடுத்து வாடிக்கையாளர் எண்ணை உள்ளிடவும்.')}</p>}
              {connection && recharge && daysLeft >= 0 && daysLeft <= 7 && <p className="home-expiry-notice">{say(Math.ceil(daysLeft) === 0 ? 'Your pack expires today.' : `Your pack expires in ${Math.ceil(daysLeft)} days.`, `உங்கள் பேக் ${Math.ceil(daysLeft)} நாட்களில் முடிவடைகிறது.`)}</p>}</div>
              <div className="home-task-bottom">{rechargeAction}</div>
            </article>
            <article className="home-task-card"><Tv size={26} aria-hidden="true" /><h3>{say('New connection', 'புதிய இணைப்பு')}</h3><p>{say('Bring great TV home.', 'சிறந்த TV அனுபவத்தை வீட்டிற்குக் கொண்டுவாருங்கள்.')}</p>
              <div className="home-new-connection-info">{cheapest ? <p className="home-pack-price">{say('Packs from', 'பேக்குகள்')} <strong>{new Intl.NumberFormat(ta ? 'ta-IN' : 'en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cheapest.option.price)}</strong><span>{validityLabel(cheapest.option.validityDays, lang, cheapest.option.validityMonths)}{packPackageType(cheapest.item.pack) && <> · {say('Free installation', 'இலவச நிறுவல்')}</>}{online && <> · {say('Pay online', 'ஆன்லைனில் செலுத்தலாம்')}</>}</span></p> : <p>{say('View current packs and prices', 'பேக்குகள் மற்றும் விலைகளைப் பார்க்கவும்')}</p>}<p className="home-installation-area">{serviceAreaText(catalog, lang) || say('Installation across Tamil Nadu.', 'தமிழ்நாடு முழுவதும் நிறுவல் சேவை.')}</p></div>
              <div className="home-task-bottom"><Link className="home-task-action" to="/new-connection">{say('Explore connections', 'இணைப்புகளைப் பார்க்கவும்')}<ArrowRight size={16} aria-hidden="true" /></Link></div>
            </article>
            <article className="home-task-card"><Wrench size={26} aria-hidden="true" /><h3>{say('Need help', 'உதவி வேண்டுமா?')}</h3><p>{say('Let’s get it sorted together.', 'ஒன்றாகச் சரிசெய்வோம்.')}</p><div className="home-task-detail"><p>{say('Report a problem, move your connection or get help with a booking.', 'சிக்கல், இணைப்பு இடமாற்றம் அல்லது பதிவு தொடர்பான உதவி பெறவும்.')}</p></div><div className="home-task-bottom"><Link className="home-task-action" to="/service-request">{say('Get help', 'உதவி பெறவும்')}<ArrowRight size={16} aria-hidden="true" /></Link></div></article>
          </div>
        </section>
        {isSignedIn && user && (openBooking || openService) && <div className="home-friendly-updates" aria-label={say('Your updates', 'உங்கள் தகவல்கள்')}>
          {openBooking && <p>{say(...(bookingCopy[openBooking.status] || ['Your booking has an update.', 'உங்கள் பதிவில் புதிய தகவல் உள்ளது.']))} <Link to={`/account/bookings?order=${encodeURIComponent(openBooking.id)}`}>{say('View', 'பார்க்கவும்')}<span className="sr-only"> {say('booking', 'பதிவு')}</span><ArrowRight size={14} aria-hidden="true" /></Link></p>}
          {openService && <p>{say(...(serviceCopy[openService.status] || ['Your service request has an update.', 'உங்கள் சேவைக் கோரிக்கையில் புதிய தகவல் உள்ளது.']))} <Link to={`/my-tickets?ticket=${encodeURIComponent(openService.id)}`}>{say('View', 'பார்க்கவும்')}<span className="sr-only"> {say('service request', 'சேவைக் கோரிக்கை')}</span><ArrowRight size={14} aria-hidden="true" /></Link></p>}
        </div>}
        <div className="home-reassurance"><p>{say('Not sure where to start? Our team is here to help.', 'எங்கு தொடங்குவது என்று தெரியவில்லையா? உதவ நாங்கள் இருக்கிறோம்.')}</p><a href={`https://wa.me/${BUSINESS_DETAILS.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={19} aria-hidden="true" />{say('Talk to us on WhatsApp', 'WhatsApp மூலம் பேசுங்கள்')}<ArrowRight size={15} aria-hidden="true" /></a></div>
      </div>
      <button className="home-scroll-down" type="button" aria-controls="home-details" onClick={() => {
        const details = document.getElementById('home-details');
        if (!details) return;
        details.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
        details.focus({ preventScroll: true });
      }}>{say('Scroll to explore', '\u0bae\u0bc7\u0bb2\u0bc1\u0bae\u0bcd \u0baa\u0bbe\u0bb0\u0bcd\u0b95\u0bcd\u0b95')}<ChevronDown size={20} aria-hidden="true" /></button>
    </section>
    <HomeDetails currentLang={lang} catalog={catalog} recharge={recharge} />
  </>;
}
export function LaunchHome({ currentLang, user, isSignedIn = !!user, recharge = clientRechargeEnabled(), connections, onOpenAuth, onRechargeConnection }: HomeProps) {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [updates, setUpdates] = useState<{ uid: string; booking?: HomeStatus; service?: HomeStatus } | null>(null);
  useEffect(() => { let active = true; loadPublicCatalog().then(data => { if (active) setCatalog(data); }).catch(() => {});
    return () => { active = false; };
  }, [recharge]);
  useEffect(() => {
    let active = true; setUpdates(null);
    if (user) void (async () => {
      const uid = user.uid;
      const findOpenUpdate = async (kind: 'booking' | 'service'): Promise<HomeStatus | undefined> => {
        let cursor = ''; const seen = new Set<string>();
        while (active && auth?.currentUser?.uid === uid && !seen.has(cursor)) {
          seen.add(cursor);
          let data;
          if (kind === 'booking') {
            const response = await fetch('/api/new-connection/orders' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''), { headers: await paymentAuthHeaders(), cache: 'no-store' });
            if (!response.ok) return;
            data = await response.json();
          } else data = await ticketApi('?limit=25' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
          const rows = kind === 'booking' ? data.orders : data.tickets;
          const row = Array.isArray(rows) ? rows.find((item: { uid: string; id: string; status: string; cancelledAt?: string }) => item.uid === uid && (kind === 'booking' ? ['received', 'contacted', 'booked', 'scheduled'].includes(item.status) : !item.cancelledAt && !['resolved', 'closed', 'auto_refunded', 'expired'].includes(item.status))) : undefined;
          if (row && typeof row.id === 'string' && typeof row.status === 'string') return { id: row.id, status: row.status };
          if (typeof data.nextCursor !== 'string' || !data.nextCursor) return;
          cursor = data.nextCursor;
        }
      };
      const results = await Promise.allSettled([findOpenUpdate('booking'), findOpenUpdate('service')]);
      if (!active || auth?.currentUser?.uid !== uid) return;
      setUpdates({ uid, booking: results[0].status === 'fulfilled' ? results[0].value : undefined, service: results[1].status === 'fulfilled' ? results[1].value : undefined });
    })();
    return () => { active = false; };
  }, [user?.uid]);
  const ownedUpdates = updates?.uid === user?.uid ? updates : null;
  return <LaunchHomeContent currentLang={currentLang} catalog={catalog} user={user} isSignedIn={isSignedIn} recharge={recharge} connections={connections} onOpenAuth={onOpenAuth} onRechargeConnection={onRechargeConnection} openBooking={ownedUpdates?.booking} openService={ownedUpdates?.service} />;
}
