import { useRef, useState } from 'react';
import type { Language } from '../types';

export function SignalLostPage({ currentLang = 'en', path }: { currentLang?: Language; path?: string }) {
  const ta = currentLang === 'ta'; const text = (en: string, tamil: string) => ta ? tamil : en;
  const [reportState, setReportState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle'); const locked = useRef(false);
  const missingPath = (path || (typeof window !== 'undefined' ? window.location.pathname : '/')).split(/[?#]/)[0].slice(0, 500);
  async function report(event: React.FormEvent) {
    event.preventDefault(); if (locked.current || reportState === 'sent') return;
    locked.current = true; setReportState('sending');
    try {
      const response = await fetch('/api/broken-links', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ path: missingPath }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(); setReportState('sent');
    } catch { setReportState('error'); } finally { locked.current = false; }
  }
  return <>
    <link rel="stylesheet" href="/assets/channel-not-found.css" />
    <section className="signal-page" aria-labelledby="signal-page-title">
      <div className="signal-eyebrow"><span className="signal-brand-mark" aria-hidden="true">DTH</span><span>DTH TAMIZHAN <span aria-hidden="true">/</span> {text('SIGNAL CHECK', 'சிக்னல் சோதனை')}</span></div>
      <div className="signal-layout">
        <div className="signal-tv" aria-hidden="true">
          <div className="signal-screen">
            <div className="signal-screen-top"><span>AV 01</span><span className="signal-led">{text('NO SIGNAL', 'சிக்னல் இல்லை')}</span></div>
            <div className="signal-frequency"><span className="signal-orbit signal-orbit-one" /><span className="signal-orbit signal-orbit-two" /><span className="signal-channel-number">404</span><span className="signal-frequency-label">{text('FREQUENCY NOT FOUND', 'அலைவரிசை கிடைக்கவில்லை')}</span></div>
            <div className="signal-osd"><span className="signal-osd-number">404</span><div><strong>{text('Channel unavailable', 'சேனல் கிடைக்கவில்லை')}</strong><span>{text('Please return to the main menu', 'முதன்மைப் பக்கத்திற்குத் திரும்பவும்')}</span></div><span className="signal-osd-bars"><i /><i /><i /><i /></span></div>
          </div>
          <div className="signal-tv-base"><span>DTH TAMIZHAN</span><span className="signal-power" /></div>
          <div className="signal-tv-stand" />
        </div>
        <div className="signal-copy">
          <p className="signal-error-code">{text('ERROR 404 · SIGNAL LOST', 'பிழை 404 · சிக்னல் இல்லை')}</p>
          <h1 id="signal-page-title">{text('Channel Unavailable', 'சேனல் கிடைக்கவில்லை')}<span>{text('Let’s tune you back in.', 'சரியான பக்கத்திற்குத் திரும்புவோம்.')}</span></h1>
          <p className="signal-description">{text('This channel has gone off-air—or the address was mistyped. Let’s get you back to your favourite pack.', 'இந்தச் சேனல் ஒளிபரப்பில் இல்லை—அல்லது முகவரி தவறாக உள்ளிடப்பட்டது. உங்களுக்குப் பிடித்த பேக்கிற்குத் திரும்புவோம்.')}</p>
          <div className="signal-actions"><a className="signal-button signal-button-primary" href="/">{text('Go to Homepage', 'முகப்புப் பக்கத்திற்குச் செல்லவும்')}<span aria-hidden="true">→</span></a><a className="signal-button signal-button-secondary" href="/plans">{text('Check Popular Packs', 'பிரபலமான பேக்குகளைப் பார்க்கவும்')}</a></div>
          <details className="signal-report"><summary>{text('Report Broken Link', 'செயல்படாத இணைப்பைப் புகாரளிக்கவும்')}</summary>
            {reportState === 'sent' ? <p role="status">{text('Thanks! The broken link has been reported to our team.', 'நன்றி! செயல்படாத இணைப்பு எங்கள் குழுவிற்குத் தெரிவிக்கப்பட்டது.')}</p> : <form method="post" action="/api/broken-links" onSubmit={event => void report(event)}>
              <p>{text('Send this page address to our team. No account or personal details needed.', 'இந்தப் பக்க முகவரியை எங்கள் குழுவிற்கு அனுப்பவும். கணக்கு அல்லது தனிப்பட்ட விவரங்கள் தேவையில்லை.')}</p>
              <input type="hidden" name="path" value={missingPath} /><code>{missingPath}</code>
              <button type="submit" className="signal-button signal-button-secondary" disabled={reportState === 'sending'}>{reportState === 'sending' ? text('Reporting…', 'அனுப்புகிறது…') : text('Send report', 'புகாரை அனுப்பவும்')}</button>
              {reportState === 'error' && <p role="alert">{text('Could not send the report. Please try again later.', 'புகாரை அனுப்ப முடியவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.')}</p>}
            </form>}
          </details>
        </div>
      </div>
      <nav className="signal-pack-links" aria-label={text('Browse packs by operator', 'ஆபரேட்டர் வாரியாக பேக்குகள்')}><span>{text('Back to your favourites', 'உங்களுக்குப் பிடித்த பேக்குகள்')}</span><div>{[['sun_direct', 'Sun Direct'], ['tata_play', 'Tata Play'], ['airtel_dth', 'Airtel Digital TV'], ['dish_tv', 'Dish TV & D2H']].map(([id, name]) => <a key={id} href={`/plans?operator=${id}`}>{name}<span aria-hidden="true">→</span></a>)}</div></nav>
    </section>
  </>;
}
