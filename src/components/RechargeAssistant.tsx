import { rechargeTarget } from '../lib/rechargeTarget';
import { AssistantVoiceControls } from './AssistantVoiceControls';
import { assistantReplyText } from '../lib/assistantReplyText';
import { resolveAssistantLanguage, assistantLanguageTag, type AssistantLanguage, type AssistantLanguageChoice } from '../lib/assistantLanguage';
import { tanglishRechargeNotices, tanglishUiText } from '../lib/assistantReplyCopy';
import { AssistantDraftCard } from './AssistantDraftCard';
import { draftSupportEmail } from '../lib/supportEmail';
import { refundDraftSchema, type SupportDraft } from '../lib/assistantDrafts';
import { useNavigate } from 'react-router-dom';
import { assistantActionSchema, assistantPages, actionNotice, rechargeExplanation, type AssistantAction } from '../lib/assistantActions';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Microphone, X } from '../lib/icons';
import { beginVoiceInput, cancelVoiceInput, type VoiceRecognition } from '../lib/voiceInput';
import '../recharge-assistant.css';
import type { DthConnection, DthOperator, DthOperatorId, DthPlan, Language, PlanCatalogItem } from '../types';
import { paymentAuthHeaders } from '../lib/paymentAuth';
import { formatPrice, formatDuration } from '../lib/catalog';

interface Reply {
  text?: string;
  language?: AssistantLanguage;
  action?: AssistantAction;
  state: string;
  source?: string;
  intent?: { months: number | null; quality: string | null };
  boxes?: { id: string; nickname: string; operatorName: string; lastFour: string }[];
  box?: DthConnection;
  operator?: DthOperator;
  plans?: PlanCatalogItem[];
  operators?: { id: DthOperatorId; name: string }[];
  subscriberLastFour?: string;
  topUpAmount?: number;
}
export function RechargeAssistant({ currentLang, displayName, onCheckout }: {
  currentLang: Language;
  displayName?: string;
  onCheckout: (plan: DthPlan, box: DthConnection, operator: DthOperator) => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [pastReplies, setPastReplies] = useState<Record<number, Reply>>({});
  const confirmedBox = useRef<string | undefined>(undefined);
  const [reply, setReply] = useState<Reply | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [languageChoice, setLanguageChoice] = useState<AssistantLanguageChoice>('auto');
  const replyLanguage = reply?.language || resolveAssistantLanguage(messages, languageChoice, currentLang);
  const inputLanguage = resolveAssistantLanguage(draft ? [...messages, draft] : messages, languageChoice, currentLang);
  const voiceLanguage = inputLanguage === 'en' ? 'en' : 'ta';
  const text = (en: string, ta: string) => replyLanguage === 'ta' ? ta : replyLanguage === 'tanglish' ? tanglishUiText(en) : en;
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const voiceRef = useRef<VoiceRecognition | null>(null);
  useEffect(() => {
    setListening(false);
    setVoiceError('');
    return () => { cancelVoiceInput(voiceRef.current); voiceRef.current = null; };
  }, [open, languageChoice]);
  function toggleVoice() {
    if (voiceRef.current) { try { voiceRef.current.stop(); } catch { cancelVoiceInput(voiceRef.current); voiceRef.current = null; setListening(false); } return; }
    setVoiceError(''); setListening(true);
    const recognition = beginVoiceInput({ language: voiceLanguage, initialText: draft, onText: setDraft,
      onEnd: () => { voiceRef.current = null; setListening(false); document.getElementById('recharge-ai-message')?.focus(); },
      onError: code => {
        setListening(false);
  const notices: Record<string, string> = {
          unsupported: text('Voice input is unavailable in this browser. Please type your request.', 'இந்த உலாவியில் குரல் உள்ளீடு கிடைக்கவில்லை. கோரிக்கையைத் தட்டச்சு செய்யவும்.'),
          'not-allowed': text('Microphone access was denied. Allow it in browser settings and try again.', 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. உலாவி அமைப்புகளில் அனுமதிக்கவும்.'),
          'service-not-allowed': text('Speech recognition is blocked by your browser. Please type your request.', 'உலாவி குரல் அறிதலைத் தடுத்துள்ளது. கோரிக்கையைத் தட்டச்சு செய்யவும்.'),
          'no-speech': text('No speech detected. Tap the microphone and try again.', 'பேச்சு கண்டறியப்படவில்லை. மைக்ரோஃபோனை அழுத்தி மீண்டும் முயற்சிக்கவும்.'),
          'audio-capture': text('No microphone is available. Connect a microphone and try again.', 'மைக்ரோஃபோன் கிடைக்கவில்லை. இணைத்து மீண்டும் முயற்சிக்கவும்.'),
          network: text('Voice recognition could not connect. Check your connection or type your request.', 'குரல் அறிதல் இணைக்க முடியவில்லை. இணைப்பைச் சரிபார்க்கவும் அல்லது தட்டச்சு செய்யவும்.'),
        };
        if (code !== 'aborted') setVoiceError(notices[code] || text('Voice input could not start. Please try again or type your request.', 'குரல் உள்ளீடு தொடங்க முடியவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது தட்டச்சு செய்யவும்.'));
        if (code !== 'aborted') { cancelVoiceInput(voiceRef.current); voiceRef.current = null; }
      } });
    voiceRef.current = recognition;
    if (!recognition) setListening(false);
  }
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const panelRef = useRef<HTMLDialogElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = panelRef.current;
    if (open && panel && !panel.open) panel.showModal();
    if (!open && panel?.open) panel.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [open, messages, reply, busy, selectedPlanId]);
  useEffect(() => () => controller.current?.abort(), []);
  async function send(next: string[], connectionId?: string, operatorId?: DthOperatorId) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(''); setReply(null); setSelectedPlanId('');
    const request = new AbortController(); controller.current = request;
    const target = rechargeTarget(next);
    if (target.newCustomer) confirmedBox.current = undefined;
    else if (connectionId) confirmedBox.current = connectionId;
    try {
      const headers = await paymentAuthHeaders();
      if (request.signal.aborted) return;
      const response = await fetch('/api/ai/recharge', { method: 'POST', headers, signal: request.signal,
        body: JSON.stringify({ messages: next, language: resolveAssistantLanguage(next, languageChoice, currentLang), connectionId: target.newCustomer ? undefined : connectionId || confirmedBox.current, operatorId }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to prepare recharge.');
      if (request.signal.aborted) return;
      if (data.action) {
        data.action = assistantActionSchema.parse(data.action);
        if (data.action.type === 'navigate') navigate(assistantPages[data.action.page as keyof typeof assistantPages]);
      }
      data.language ||= resolveAssistantLanguage(next, languageChoice, currentLang);
      setReply(data);
      setPastReplies(old => ({ ...old, [next.length - 1]: data }));
      if (!target.newCustomer && data.box?.id && !data.box.id.startsWith('new-')) confirmedBox.current = data.box.id;
      if (data.state === 'awaiting_payment' && data.plans?.length === 1) setSelectedPlanId(data.plans[0].id);
    } catch (err) { if (!request.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to prepare recharge.'); }
    finally { inFlight.current = false; if (!request.signal.aborted) setBusy(false); }
  }
  async function submitSupportDraft(draft: SupportDraft) {
    let verified = draft;
    if (draft.type === 'refund_draft') {
      const response = await fetch('/api/ai/refund-draft-check', { method: 'POST', headers: await paymentAuthHeaders(), body: JSON.stringify(draft.draft) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not verify refund eligibility.');
      verified = refundDraftSchema.parse(data.action);
      if (verified.draft.order_id !== draft.draft.order_id) throw new Error('Order verification failed.');
      if (verified.eligibility.status !== 'eligible') return verified;
    }
    window.location.assign(draftSupportEmail(verified));
  }
  const notices: Record<string, string> = {
    history: text('You can view your past recharges, payment status and receipts in My History.', 'என் வரலாறு பக்கத்தில் முந்தைய ரீசார்ஜ்கள், கட்டண நிலை மற்றும் ரசீதுகளைப் பார்க்கலாம்.'),
    price: text('What amount would you like to recharge? Or tell me HD/SD and the duration, and I’ll find the price for this box’s operator.', 'எவ்வளவு தொகைக்கு ரீசார்ஜ் செய்ய வேண்டும்? அல்லது HD/SD மற்றும் காலத்தைக் கூறவும்; இந்த பாக்ஸின் நிறுவனத்திற்கான விலையைக் கண்டறிவேன்.'),
    operator_mismatch: text('That company does not match this box. Choose a box from that company, or tell me to use this box’s operator.', 'அந்த நிறுவனம் இந்த பாக்ஸுடன் பொருந்தவில்லை. அந்த நிறுவனத்தின் பாக்ஸைத் தேர்வு செய்யவும் அல்லது இந்த பாக்ஸின் நிறுவனத்தைக் குறிப்பிடவும்.'),
    invalid_amount: text('Enter an amount from ₹10 to ₹20,000, with up to two decimal places.', '₹10 முதல் ₹20,000 வரை தொகையை உள்ளிடவும். அதிகபட்சம் இரண்டு தசம இடங்கள்.'),
    enter_subscriber: text('Enter the subscriber ID for your new box. I’ll ask for the operator next.', 'புதிய பாக்ஸின் சந்தாதாரர் எண்ணை உள்ளிடவும். அடுத்து நிறுவனத்தைக் கேட்பேன்.'),
    choose_operator: text(`Which operator is this new box with? ID ending ${reply?.subscriberLastFour || ''}.`, `இந்த புதிய பாக்ஸ் எந்த நிறுவனத்தைச் சேர்ந்தது? எண் முடிவு ${reply?.subscriberLastFour || ''}.`),
    invalid_subscriber: text('That ID doesn’t match this operator’s format. Check the subscriber ID or choose a different operator.', 'இந்த எண் நிறுவனத்தின் வடிவத்துடன் பொருந்தவில்லை. எண்ணைச் சரிபார்க்கவும் அல்லது வேறு நிறுவனத்தைக் குறிப்பிடவும்.'),
    no_boxes: text('Add a saved box in Saved Boxes first, then ask me to recharge it.', 'முதலில் சேமித்த பாக்ஸ்களில் உங்கள் பாக்ஸைச் சேர்க்கவும்.'),
    choose_box: text('Which saved box should I recharge?', 'எந்த சேமித்த பாக்ஸை ரீசார்ஜ் செய்ய வேண்டும்?'),
    preferences: !reply?.intent?.quality && !reply?.intent?.months
      ? text('Would you like HD or SD, and how many months: 1, 3, 6 or 12?', 'HD அல்லது SD வேண்டுமா? எத்தனை மாதங்கள்: 1, 3, 6 அல்லது 12?')
      : !reply?.intent?.quality ? text('Would you like HD or SD?', 'HD அல்லது SD வேண்டுமா?')
      : text('How many months: 1, 3, 6 or 12?', 'எத்தனை மாதங்கள்: 1, 3, 6 அல்லது 12?'),
    invalid_box: text('Update this box’s subscriber ID in Saved Boxes before recharging.', 'ரீசார்ஜ் செய்வதற்கு முன் பாக்ஸின் சந்தாதாரர் எண்ணைப் புதுப்பிக்கவும்.'),
    operator_unavailable: text('This operator is currently unavailable. Please try later.', 'இந்த நிறுவனம் தற்போது கிடைக்கவில்லை. பிறகு முயற்சிக்கவும்.'),
    no_plans: text('No catalog pack matches that duration and quality. Try another duration or quality.', 'இந்த காலம் மற்றும் தரத்திற்கு பேக் கிடைக்கவில்லை. வேறு காலம் அல்லது தரத்தை முயற்சிக்கவும்.'),
    awaiting_payment: text('Ready for payment. Review a matching pack below and continue to secure checkout. Recharge is submitted for manual fulfillment only after payment is verified.', 'கட்டணத்திற்குத் தயார். கீழே பேக்கைச் சரிபார்த்து கட்டணத்தைத் தொடரவும். கட்டணம் உறுதியான பிறகு நிர்வாகி ரீசார்ஜ் செய்வார்.'),
  };
  if (replyLanguage === 'tanglish') Object.assign(notices, tanglishRechargeNotices);
  const selectedPlan = reply?.plans?.find(plan => plan.id === selectedPlanId);
  const previousReplyText = (previous: Reply) => {
    if (previous.text) {
      const notice = previous.action ? actionNotice(previous.action, previous.language || replyLanguage) : '';
      return [previous.text, notice].filter((value, index, values) => value && values.indexOf(value) === index).join(' ');
    }
    if (previous.state === 'preferences') return !previous.intent?.quality
      ? text('Would you like HD or SD?', 'HD அல்லது SD வேண்டுமா?')
      : text('How many months: 1, 3, 6 or 12?', 'எத்தனை மாதங்கள்: 1, 3, 6 அல்லது 12?');
    if (previous.state === 'choose_operator') return text('Which operator is this box with?', 'இந்த பாக்ஸ் எந்த நிறுவனத்தைச் சேர்ந்தது?');
    if (previous.state === 'awaiting_topup_payment' && previous.topUpAmount !== undefined)
      return `${previous.box?.nickname || ''} · ₹${previous.topUpAmount}. ${text('Ready for payment.', 'கட்டணத்திற்குத் தயார்.')}`;
    return notices[previous.state] || text('I found the recharge details. Please review the latest summary below.', 'ரீசார்ஜ் விவரங்கள் கிடைத்தன. கீழே உள்ள சமீபத்திய விவரங்களைச் சரிபார்க்கவும்.');
  };
  const paymentPrice = (amount: number) => `₹${new Intl.NumberFormat(currentLang === 'ta' ? 'ta-IN' : 'en-IN', { maximumFractionDigits: 2 }).format(amount)}`;
  return createPortal(<>
    <button type="button" className="recharge-chat-launcher" aria-haspopup="dialog" aria-controls="recharge-chat-panel" aria-expanded={open} onClick={() => setOpen(true)}>
      <span aria-hidden="true">✦</span> {text('Ask AI', 'AI உதவி')}
    </button>
    <dialog ref={panelRef} id="recharge-chat-panel" className="recharge-chat-panel" aria-labelledby="recharge-chat-title"
      onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false);
      } }}>
    {open && <div className="recharge-chat-layout">
      <header className="recharge-chat-header">
        <div><h2 id="recharge-chat-title" className="font-semibold">{text('Recharge assistant', 'ரீசார்ஜ் உதவியாளர்')}</h2><p className="text-sm text-muted">{text('Your saved boxes. A simpler recharge.', 'உங்கள் சேமித்த பாக்ஸ்களுக்கு எளிய ரீசார்ஜ்.')}</p></div>
        <div className="recharge-chat-header-actions">
          <button type="button" className="recharge-chat-new" disabled={busy || listening} onClick={() => { setMessages([]); setPastReplies({}); confirmedBox.current = undefined; setReply(null); setDraft(''); setError(''); setVoiceError(''); setSelectedPlanId(''); }}>{text('New request', 'புதிய கோரிக்கை')}</button>
          <button type="button" className="recharge-chat-close" onClick={() => setOpen(false)} aria-label={text('Close chat', 'உரையாடலை மூடு')}><X size={22} weight="bold" /></button>
        </div>
      </header>
      <div ref={conversationRef} className={`recharge-chat-conversation space-y-3${!messages.length ? ' is-empty' : ''}`}>
      {!messages.length && <div className="recharge-chat-greeting">
        <p>{text('Hi', 'வணக்கம்')}{displayName?.trim() ? `, ${displayName.trim().split(/\s+/)[0]}` : ''}</p>
        <span>{text('How can I help you recharge today?', 'இன்று ரீசார்ஜ் செய்ய எப்படி உதவலாம்?')}</span>
      </div>}
      {messages.length > 0 && <div className="flex flex-col gap-3">{messages.map((message, i) => <React.Fragment key={i}>
        <div className="recharge-chat-user self-end max-w-[90%] rounded-xl px-4 py-2"><p className="text-sm">{message}</p></div>
        {i < messages.length - 1 && pastReplies[i] && <div className="recharge-chat-reply recharge-chat-reply-text rounded-xl p-4 text-sm" lang={assistantLanguageTag(pastReplies[i].language || replyLanguage)}>{assistantReplyText(previousReplyText(pastReplies[i]))}</div>}
      </React.Fragment>)}</div>}
      {(busy || reply || error) && <div aria-live="polite" aria-busy={busy} className="recharge-chat-reply rounded-xl p-4 space-y-3" lang={assistantLanguageTag(replyLanguage)}>
        <p className="text-xs font-semibold text-muted">{text('Recharge assistant', 'ரீசார்ஜ் உதவியாளர்')}</p>
        {busy && <p>{text('Thinking…', 'யோசிக்கிறது…')}</p>}
        {reply?.text && <p className="recharge-chat-reply-text">{assistantReplyText(reply.text)}</p>}
        {reply?.action && assistantReplyText(reply.text || '') !== assistantReplyText(actionNotice(reply.action, replyLanguage)) && <p role="status">{actionNotice(reply.action, replyLanguage)}</p>}
        {(reply?.action?.type === 'show_history' || reply?.action?.type === 'show_recharge_status') && <ul>{(reply.action.type === 'show_history' ? reply.action.orders : reply.action.order ? [reply.action.order] : []).map(order => <li key={order.orderId} className="space-y-2">
          <p>{order.orderId} · {order.packName} · {formatPrice(order.amount, currentLang)}</p>
          <p>{rechargeExplanation(order, replyLanguage)}</p>
          {order.status === 'failed' && <button type="button" className="recharge-chat-suggestion" onClick={() => { setDraft(`Draft a refund request for order ${order.orderId}. Reason: my recharge failed.`); document.getElementById('recharge-ai-message')?.focus(); }}>{'Start a refund request with support'}</button>}
        </li>)}</ul>}
        {(reply?.action?.type === 'contact_draft' || reply?.action?.type === 'refund_draft') && <AssistantDraftCard key={messages.length} action={reply.action} language={replyLanguage} onSubmit={submitSupportDraft} />}
        {reply?.action?.type === 'show_plans' && <ul>{reply.action.plans.map(plan => <li key={plan.id}>{plan.name} · {formatDuration(plan.duration, currentLang)} · {formatPrice(plan.amount, currentLang)}</li>)}</ul>}
        {reply && reply.state !== 'awaiting_payment' && reply.state !== 'alternatives' && <p>{notices[reply.state]}</p>}
        {reply?.state === 'alternatives' && <p>{text('I couldn’t find that exact pack for this duration. Would you like one of these alternatives?', 'இந்த காலத்திற்கு அந்த பேக் கிடைக்கவில்லை. இந்த மாற்று பேக்குகளில் ஒன்றைத் தேர்வு செய்ய விரும்புகிறீர்களா?')}</p>}
        {reply?.state === 'awaiting_payment' && !selectedPlan && <p>{text('I found a few matching packs. Which would you like?', 'பொருந்தும் சில பேக்குகள் உள்ளன. எது வேண்டும்?')}</p>}
        {reply?.source === 'command' && <p className="text-sm text-muted">{text('AI is unavailable; using the standard command matcher.', 'AI கிடைக்கவில்லை; வழக்கமான கட்டளை பொருத்தம் பயன்படுத்தப்படுகிறது.')}</p>}
        {error && <div className="space-y-2"><p role="alert" className="text-error">{error}</p>
          <button type="button" className="recharge-chat-suggestion" disabled={busy} onClick={() => void send(messages)}>{text('Retry request', 'மீண்டும் முயற்சிக்கவும்')}</button>
        </div>}
        {reply?.state === 'history' && <a className="recharge-chat-suggestion" href="/history" onClick={() => setOpen(false)}>{text('View my recharge history', 'என் ரீசார்ஜ் வரலாற்றைப் பார்க்கவும்')} <ArrowRight size={18} /></a>}
      {reply?.operators && <div className="recharge-chat-choice-grid">{reply.operators.map(operator => <button type="button" key={operator.id} disabled={busy || messages.length >= 12} className="recharge-chat-suggestion" onClick={() => {
        const next = [...messages, operator.name]; setMessages(next); void send(next, undefined, operator.id);
      }}>{operator.name}</button>)}</div>}
      {reply?.state === 'awaiting_topup_payment' && reply.box && reply.operator && reply.topUpAmount !== undefined && <div className="space-y-3">
        <p className="font-medium">{reply.box.nickname} · {paymentPrice(reply.topUpAmount)} {text('top-up. Ready for payment.', 'டாப்-அப். கட்டணத்திற்குத் தயார்.')}</p>
        <p className="text-sm text-muted">{reply.box.operatorName} · …{reply.box.smartCardNumber.slice(-4)}</p>
        <p className="text-sm">{text('Amount-only recharge. Pack benefits and validity follow your operator’s terms.', 'தொகை அடிப்படையிலான ரீசார்ஜ். பேக் பலன்களும் காலமும் நிறுவன விதிகளின்படி அமையும்.')}</p>
        <button type="button" className="recharge-chat-pay rounded-lg px-5 py-3 font-semibold" onClick={() => {
          if (!reply.box || !reply.operator || reply.topUpAmount === undefined) return;
          panelRef.current?.close(); setOpen(false);
          onCheckout({ id: 'custom', name: 'Custom top-up', tamilName: 'விருப்ப டாப்-அப்', operatorId: reply.operator.id,
            price: reply.topUpAmount, validityDays: 0, category: 'addon', channelsCount: 0, hdChannelsCount: 0,
            description: 'Operator terms apply', tamilChannelsHighlight: [] }, reply.box, reply.operator);
        }}>{text('Pay', 'செலுத்தவும்')} {paymentPrice(reply.topUpAmount)}</button>
        <p className="text-xs text-muted">{text('After payment is verified, an administrator will process your recharge.', 'கட்டணம் உறுதியான பிறகு நிர்வாகி ரீசார்ஜ் செய்வார்.')}</p>
      </div>}
      {reply?.state === 'preferences' && <div className="recharge-chat-choice-grid">{(!reply.intent?.quality ? ['HD', 'SD'] : ['1 month', '3 months', '6 months', '12 months']).map(choice => <button type="button" key={choice} className="recharge-chat-suggestion" disabled={busy || messages.length >= 12} onClick={() => {
        const next = [...messages, choice]; setMessages(next); void send(next);
      }}>{choice}</button>)}</div>}
      {reply?.boxes?.map(box => <button key={box.id} type="button" disabled={busy || messages.length >= 12} className="border border-rule rounded-lg p-3 mr-2" onClick={() => {
        const next = [...messages, `For ${box.nickname.replace(/\s+box$/i, '')} box`]; setMessages(next); void send(next, box.id);
      }}>{box.nickname} · {box.operatorName} · …{box.lastFour}</button>)}
      {!selectedPlan && reply?.plans?.map(plan => <label key={plan.id} className="border border-rule rounded-lg p-3 flex items-center gap-3 cursor-pointer">
        <input type="radio" name="assistant-pack" value={plan.id} checked={selectedPlanId === plan.id} onChange={() => setSelectedPlanId(plan.id)} />
        <span>{currentLang === 'ta' ? plan.tamilName || plan.plan_name : plan.plan_name} · {formatDuration(plan.duration_months, currentLang)} · {formatPrice(plan.amount, currentLang)}</span>
      </label>)}
      {selectedPlan && reply?.box && <div className="space-y-3">
        <p className="font-medium">{reply.box.nickname} · {currentLang === 'ta' ? selectedPlan.tamilName || selectedPlan.plan_name : selectedPlan.plan_name} · {formatDuration(selectedPlan.duration_months, currentLang)} · {paymentPrice(selectedPlan.amount)}. {text('Ready for payment.', 'கட்டணத்திற்குத் தயார்.')}</p>
        <p className="text-sm text-muted">{reply.box.operatorName} · …{reply.box.smartCardNumber.slice(-4)}</p>
        <button type="button" className="recharge-chat-pay rounded-lg px-5 py-3 font-semibold" onClick={() => {
          if (!reply.box || !reply.operator) return;
          const plan = selectedPlan;
          panelRef.current?.close();
          setOpen(false);
          onCheckout({ id: plan.id, operatorId: plan.operator, name: plan.plan_name, tamilName: plan.tamilName || plan.plan_name,
            price: plan.amount, validityDays: plan.duration_months * 30, category: 'tamil_base', channelsCount: plan.channel_count || 0,
            hdChannelsCount: plan.hd_channel_count || 0, description: plan.description || '', tamilChannelsHighlight: plan.channel_list }, reply.box, reply.operator);
        }}>{text('Pay', 'செலுத்தவும்')} {paymentPrice(selectedPlan.amount)}</button>
        {(reply.plans?.length || 0) > 1 && <button type="button" className="ml-3 text-sm underline" onClick={() => setSelectedPlanId('')}>{text('Change pack', 'பேக்கை மாற்று')}</button>}
        <p className="text-xs text-muted">{text('After payment is verified, an administrator will process your recharge.', 'கட்டணம் உறுதியான பிறகு நிர்வாகி ரீசார்ஜ் செய்வார்.')}</p>
      </div>}
      </div>}
      {!messages.length && <div className="recharge-chat-prompts" aria-label={text('Suggested prompts', 'பரிந்துரைக்கப்பட்ட கோரிக்கைகள்')}>
        {[
          text('Recharge my saved box', 'என் சேமித்த பாக்ஸை ரீசார்ஜ் செய்யவும்'),
          text('Find a 6-month HD pack', '6 மாத HD பேக்கைக் கண்டறியவும்'),
          text('Recharge a new customer ID', 'புதிய சந்தாதாரர் எண்ணை ரீசார்ஜ் செய்யவும்'),
        ].map(prompt => <button type="button" key={prompt} disabled={busy || listening} onClick={() => {
          setDraft(prompt);
          document.getElementById('recharge-ai-message')?.focus();
        }}>{prompt}</button>)}
      </div>}
      </div>
      <div className="recharge-chat-composer">
      <AssistantVoiceControls language={replyLanguage} choice={languageChoice} disabled={busy || listening} onChoice={setLanguageChoice} />
      <form className="recharge-chat-input-wrap" onSubmit={event => { event.preventDefault(); if (!draft.trim() || busy || listening) return;
        if (/\b(?:recharge|new box|my|for .+box)\b|\d{8,11}/i.test(draft)) confirmedBox.current = undefined;
        const next = [...messages, draft.trim()]; setMessages(next); setDraft(''); void send(next); }}>
        <label className="sr-only" htmlFor="recharge-ai-message">{text('Recharge request', 'ரீசார்ஜ் கோரிக்கை')}</label>
        <input id="recharge-ai-message" value={draft} maxLength={500} readOnly={listening} disabled={busy || messages.length >= 12} onChange={event => setDraft(event.target.value)} placeholder={text('Type or tap the microphone…', 'தட்டச்சு செய்யவும் அல்லது மைக்ரோஃபோனை அழுத்தவும்…')} />
        <button type="button" className={`recharge-chat-mic${listening ? ' is-listening' : ''}`} aria-pressed={listening} aria-describedby={listening || voiceError ? 'recharge-voice-status' : undefined}
          aria-label={listening ? text('Stop voice input', 'குரல் உள்ளீட்டை நிறுத்து') : text('Start voice input', 'குரல் உள்ளீட்டைத் தொடங்கு')}
          title={listening ? text('Stop listening', 'கேட்பதை நிறுத்து') : text('Speak your request', 'உங்கள் கோரிக்கையைப் பேசவும்')} disabled={busy || messages.length >= 12} onClick={toggleVoice}><Microphone size={21} weight="bold" /></button>
        <button type="submit" aria-label={text('Send message', 'செய்தியை அனுப்பு')} disabled={busy || listening || !draft.trim() || messages.length >= 12} className="recharge-chat-send"><ArrowRight size={20} weight="bold" /></button>
      </form>
      {(listening || voiceError) && <p id="recharge-voice-status" role="status" className="text-xs text-muted">{listening ? text('Listening… Tap the microphone to stop, then review and send.', 'கேட்கிறது… நிறுத்த மைக்ரோஃபோனை அழுத்தவும். சரிபார்த்து அனுப்பவும்.') : voiceError}</p>}
      </div>
    </div>}
    </dialog>
  </>, document.body);
}
