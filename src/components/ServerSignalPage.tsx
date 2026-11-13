import type { Language } from '../types';

export function safeRetryPath(value?: string): string {
  const path = value?.split(/[?#]/)[0];
  return path && path.startsWith('/') && !path.startsWith('//') && !/[\\\u0000-\u001f]/.test(path) ? path.slice(0, 500) : '/500';
}

export function ServerSignalPage({ currentLang = 'en', retryPath }: { currentLang?: Language; retryPath?: string }) {
  const ta = currentLang === 'ta'; const text = (en: string, tamil: string) => ta ? tamil : en;
  const target = safeRetryPath(retryPath || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('retry') || window.location.pathname : '/500'));
  return <>
    <link rel="stylesheet" href="/assets/server-signal-error.css" />
    <section className="server-error-page" aria-labelledby="server-error-title">
      <div className="server-error-card">
        <header className="server-error-header"><a href="/" aria-label="DTH Tamizhan home"><span className="server-error-brand-mark">DTH</span>DTH TAMIZHAN</a><span className="server-error-badge">ERR 500 <span aria-hidden="true">·</span> {text('SIGNAL LOST', 'சிக்னல் இல்லை')}</span></header>
        <div className="server-error-main">
          <div className="server-error-art" aria-hidden="true">
            <div className="server-error-rain" />
            <div className="server-error-orbit server-error-orbit-one" /><div className="server-error-orbit server-error-orbit-two" />
            <span className="server-error-frequency">500</span>
            <svg className="server-error-dish" viewBox="0 0 200 190" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M97 125 77 170h57l-22-45" fill="#334867" /><path d="M66 172h79" stroke="#7b91ac" strokeWidth="5" strokeLinecap="round" />
              <path d="m101 113 5 32" stroke="#a5b8cf" strokeWidth="8" />
              <path d="M42 57c-6 47 46 83 86 60 14-8 24-20 29-34L42 57Z" fill="#c8d8eb" stroke="#e5effb" strokeWidth="2" />
              <path d="M42 57c19 20 71 39 115 26" stroke="#7893b8" strokeWidth="3" />
              <path d="m101 85 37-47" stroke="#a7bdd8" strokeWidth="5" strokeLinecap="round" /><circle cx="140" cy="35" r="7" fill="#f2c071" />
              <path d="M155 29c7 7 7 17 0 24m14-35c15 14 15 34 0 49" stroke="#f2c071" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 9" />
            </svg>
            <span className="server-error-art-caption">{text('WAITING FOR A CLEAR SIGNAL', 'சிக்னலுக்காகக் காத்திருக்கிறது')}</span>
          </div>
          <div className="server-error-copy">
            <p className="server-error-eyebrow">{text('A LITTLE RAIN ON OUR SIGNAL', 'எங்கள் சிக்னலில் ஒரு சிறிய தடை')}</p>
            <h1 id="server-error-title">{text('Server signal lost', 'சேவையக சிக்னல் கிடைக்கவில்லை')}</h1>
            <p className="server-error-lead">{text('We could not load this page.', 'இந்தப் பக்கத்தை ஏற்ற முடியவில்லை.')}</p>
            <p className="server-error-description">{text('Something on our side interrupted the connection. Give it a moment, then try tuning in again.', 'எங்கள் தரப்பில் ஏற்பட்ட ஒரு சிக்கலால் இணைப்பு தடைப்பட்டது. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.')}</p>
            <div className="server-error-actions"><a className="server-error-button server-error-primary" href={target}><span aria-hidden="true">↻</span>{text('Try again', 'மீண்டும் முயற்சிக்கவும்')}</a><a className="server-error-button server-error-secondary" href="/">{text('Back to Recharge Home', 'ரீசார்ஜ் முகப்பிற்குத் திரும்பவும்')}<span aria-hidden="true">→</span></a></div>
          </div>
        </div>
        <div className="server-error-status" aria-label={text('Service status', 'சேவை நிலை')}>
          <div><span className="server-error-status-dot" /><span>{text('SERVICE STATUS', 'சேவை நிலை')}</span><strong>{text('Temporarily unavailable', 'தற்காலிகமாகக் கிடைக்கவில்லை')}</strong></div>
        </div>
        <aside className="server-error-payment"><div className="server-error-payment-icon" aria-hidden="true">!</div><div><h2>{text('Just made a payment?', 'இப்போது பணம் செலுத்தினீர்களா?')}</h2><p>{text('If money was debited, check your payment history before paying again.', 'பணம் பிடிக்கப்பட்டிருந்தால், மீண்டும் பணம் செலுத்தும் முன் கட்டண வரலாற்றைச் சரிபார்க்கவும்.')}</p><a href="/history">{text('Check payment history', 'கட்டண வரலாற்றைப் பார்க்கவும்')}<span aria-hidden="true"> →</span></a></div></aside>
        <footer className="server-error-footer"><span>{text('No need to adjust your dish. This is a website error.', 'உங்கள் டிஷைச் சரிசெய்ய வேண்டாம். இது இணையதளப் பிழை.')}</span><a href="/contact">{text('Contact support', 'உதவியை அணுகவும்')}<span aria-hidden="true"> →</span></a></footer>
      </div>
    </section>
  </>;
}
