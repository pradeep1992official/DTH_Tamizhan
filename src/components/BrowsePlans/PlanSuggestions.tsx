import { useEffect, useRef, useState } from 'react';
import type { Language, UserProfile } from '../../types';
import { paymentAuthHeaders } from '../../lib/paymentAuth';

interface Suggestion { id: string; name: string; operator: string; quality: string; amount: number; duration: number; monthlyRate: number }
const operators: Record<string, string> = { airtel_dth: 'Airtel Digital TV', sun_direct: 'Sun Direct', tata_play: 'Tata Play', dish_tv: 'Dish TV', d2h: 'D2H' };
export function PlanSuggestions({ user, currentLang, onOpenAuth, onSelect }: {
  user: UserProfile | null; currentLang: Language; onOpenAuth: () => void; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false); const [budget, setBudget] = useState('300');
  const [operator, setOperator] = useState('any'); const [quality, setQuality] = useState('all');
  const [duration, setDuration] = useState('0'); const [preferences, setPreferences] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [result, setResult] = useState<{ source: string; notice: string; plans: Suggestion[]; monthlyBudget?: number } | null>(null);
  const request = useRef<AbortController | null>(null); const locked = useRef(false);
  const ta = currentLang === 'ta'; const text = (en: string, tamil: string) => ta ? tamil : en;
  useEffect(() => {
    const old = request.current; request.current = null; old?.abort();
    locked.current = false; setBusy(false); setResult(null); setError('');
    return () => { const active = request.current; request.current = null; active?.abort(); };
  }, [user?.uid, currentLang]);
  async function suggest(event: React.FormEvent) {
    event.preventDefault(); if (!user) { onOpenAuth(); return; } if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setResult(null);
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const headers = await paymentAuthHeaders(); if (controller.signal.aborted) return;
      const response = await fetch('/api/ai/recommend-plans', { method: 'POST', headers, signal: controller.signal,
        body: JSON.stringify({ operator, monthlyBudget: Number(budget), quality, duration: Number(duration), preferences, preferredLanguage: currentLang }) });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || !data.success || !Array.isArray(data.plans)) throw new Error('Unavailable');
      setResult(data);
    } catch {
      if (request.current === controller) setError(text('Could not load suggestions. Try again or use the plan filters below.', 'பரிந்துரைகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது கீழே உள்ள வடிகட்டிகளைப் பயன்படுத்தவும்.'));
    } finally { clearTimeout(timeout); if (request.current === controller) { locked.current = false; setBusy(false); } }
  }
  const inputClass = 'w-full mt-1 rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink';
  return <section className="rounded-xl border border-rule bg-paper p-4 sm:p-5 space-y-4" aria-label={text('Plan suggestions', 'திட்டப் பரிந்துரைகள்')}>
    <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h2 className="font-semibold text-lg">{text('Need help choosing a pack?', 'பேக்கைத் தேர்ந்தெடுக்க உதவி வேண்டுமா?')}</h2><p className="text-sm text-muted mt-1">{text('Get up to 3 suggestions based on your budget and preferences.', 'உங்கள் பட்ஜெட் மற்றும் விருப்பங்களின் அடிப்படையில் 3 பரிந்துரைகள் வரை பெறுங்கள்.')}</p></div>
      <button type="button" className="w-full shrink-0 rounded-lg bg-accent text-accent-ink px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto" aria-expanded={open} aria-controls="plan-suggestions-form" onClick={() => setOpen(value => !value)}>{open ? text('Hide suggestions', 'மறைக்கவும்') : text('Help me choose', 'தேர்வு செய்ய உதவுங்கள்')}</button>
    </div>
    {open && <div id="plan-suggestions-form" className="space-y-4">
      <form onSubmit={event => void suggest(event)} className="space-y-4">
        <fieldset disabled={busy} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-sm font-medium">{text('Monthly budget (Rs.)', 'மாத பட்ஜெட் (ரூ.)')}<input className={inputClass} type="number" min={100} max={10000} step={1} value={budget} onChange={event => setBudget(event.target.value)} required /></label>
          <label className="text-sm font-medium">{text('Operator', 'ஆபரேட்டர்')}<select className={inputClass} value={operator} onChange={event => setOperator(event.target.value)}><option value="any">{text('Any operator', 'அனைத்து ஆபரேட்டர்கள்')}</option>{Object.entries(operators).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="text-sm font-medium">{text('Picture quality', 'படத் தரம்')}<select className={inputClass} value={quality} onChange={event => setQuality(event.target.value)}><option value="all">HD / SD</option><option>HD</option><option>SD</option></select></label>
          <label className="text-sm font-medium">{text('Duration', 'கால அளவு')}<select className={inputClass} value={duration} onChange={event => setDuration(event.target.value)}><option value="0">{text('Any duration', 'அனைத்து கால அளவுகள்')}</option>{[1, 3, 6, 12].map(months => <option key={months} value={months}>{months} {text(months === 1 ? 'month' : 'months', 'மாதங்கள்')}</option>)}</select></label>
          <label className="text-sm font-medium sm:col-span-2 lg:col-span-4">{text('What do you enjoy watching? (optional)', 'எதைப் பார்க்க விரும்புகிறீர்கள்? (விருப்பத்தேர்வு)')}<input className={inputClass} maxLength={200} value={preferences} onChange={event => setPreferences(event.target.value)} placeholder={text('Tamil movies, news, sports…', 'தமிழ் திரைப்படங்கள், செய்திகள், விளையாட்டு…')} /></label>
        </fieldset>
        <p className="text-xs text-muted">{text('AI may send your preferences and plan names to Google. Do not include personal information.', 'AI உங்கள் விருப்பங்களையும் திட்டப் பெயர்களையும் Google க்கு அனுப்பலாம். தனிப்பட்ட தகவல்களைச் சேர்க்க வேண்டாம்.')}</p>
        <button type="submit" disabled={busy} aria-busy={busy} className="rounded-lg bg-accent text-accent-ink px-4 py-2.5 font-semibold text-sm disabled:opacity-50">{busy ? text('Finding matching plans…', 'பொருத்தமான திட்டங்களைத் தேடுகிறது…') : user ? text('Find my plans', 'எனது திட்டங்களைக் கண்டறியுங்கள்') : text('Sign in for suggestions', 'பரிந்துரைகளுக்கு உள்நுழையுங்கள்')}</button>
      </form>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {result && <div aria-live="polite" className="space-y-3">
        {!result.plans.length && <p className="text-sm text-muted">{text('No packs match this budget and selection. Try a higher budget or another duration.', 'இந்த பட்ஜெட் மற்றும் தேர்வுக்குப் பொருத்தமான திட்டங்கள் இல்லை. பட்ஜெட் அல்லது கால அளவை மாற்றவும்.')}</p>}
        {result.plans.length > 0 && <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${result.source === 'ai' ? 'border-accent bg-accent text-accent-ink' : 'border-rule bg-paper-2 text-ink'}`}>
          {result.source === 'ai' ? text('AI recommendations', 'AI பரிந்துரைகள்') : text('Catalog suggestions', 'பட்டியல் பரிந்துரைகள்')}
        </span>}
        {result.notice === 'over_budget' && <p className="text-sm text-muted">{text(`These packs match your language preference but exceed your Rs. ${result.monthlyBudget} monthly budget.`, `இந்த திட்டங்கள் உங்கள் மொழி விருப்பத்திற்குப் பொருந்துகின்றன; ஆனால் மாத பட்ஜெட் ரூ. ${result.monthlyBudget} ஐ விட அதிகம்.`)}</p>}
        {result.plans.length > 0 && result.source !== 'ai' && ['daily_limit', 'customer_daily_limit', 'minute_limit'].includes(result.notice) && <p className="text-xs text-muted">{result.notice === 'minute_limit'
          ? text('AI request limit reached. Try again in a minute.', 'AI கோரிக்கை வரம்பு எட்டப்பட்டது. ஒரு நிமிடத்தில் மீண்டும் முயற்சிக்கவும்.')
          : text('Daily AI allowance reached.', 'இன்றைய AI பயன்பாட்டு வரம்பு எட்டப்பட்டது.')}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{result.plans.map(plan => <article key={plan.id} className="rounded-xl border border-rule bg-paper-2 p-4 flex flex-col gap-3">
          {result.notice === 'over_budget' && <span className="self-start rounded-full border border-rule bg-paper px-2 py-1 text-xs font-semibold">{text('Above budget', 'பட்ஜெட்டை விட அதிகம்')}</span>}
          <p className="text-xs text-muted">{operators[plan.operator] || plan.operator} · {plan.quality} · {plan.duration} {text('months', 'மாதங்கள்')}</p><h3 className="font-semibold">{plan.name}</h3>
          <p className="text-xl font-bold">Rs. {plan.amount.toLocaleString('en-IN')}<span className="block text-xs text-muted font-normal mt-1">{text('Total for the pack duration', 'முழு கால அளவிற்கான மொத்தம்')}</span></p>
          <p className="text-xs text-muted">≈ Rs. {plan.monthlyRate.toLocaleString('en-IN')} / {text('month', 'மாதம்')}</p>
          <button type="button" className="rounded-lg border border-rule px-3 py-2 text-sm font-semibold mt-auto" onClick={() => onSelect(plan.id)}>{text('Choose this pack', 'இந்த திட்டத்தைத் தேர்ந்தெடுக்கவும்')}</button>
        </article>)}</div>
      </div>}
    </div>}
  </section>;
}
