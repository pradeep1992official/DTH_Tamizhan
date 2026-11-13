// The Web Speech API is not included in every browser's DOM typings.
export interface VoiceRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export function voiceRecognitionConstructor() {
  const browser = window as unknown as {
    SpeechRecognition?: new () => VoiceRecognition;
    webkitSpeechRecognition?: new () => VoiceRecognition;
  };
  return browser.SpeechRecognition || browser.webkitSpeechRecognition;
}

export function beginVoiceInput({ language, initialText, onText, onError, onEnd }: {
  language: 'en' | 'ta'; initialText: string; onText: (value: string) => void;
  onError: (code: string) => void; onEnd: () => void;
}): VoiceRecognition | null {
  const Recognition = voiceRecognitionConstructor();
  if (!Recognition) { onError('unsupported'); return null; }
  const recognition = new Recognition();
  recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onresult = event => {
    const transcript = Array.from(event.results).map(result => result[0]?.transcript || '').join(' ');
    onText([initialText.trim(), transcript.trim()].filter(Boolean).join(' ').slice(0, 500));
  };
  recognition.onerror = event => onError(event.error);
  recognition.onend = onEnd;
  try { recognition.start(); }
  catch { recognition.onresult = null; recognition.onerror = null; recognition.onend = null; onError('start_failed'); return null; }
  return recognition;
}

export function cancelVoiceInput(recognition: VoiceRecognition | null) {
  if (!recognition) return;
  recognition.onresult = null; recognition.onerror = null; recognition.onend = null;
  recognition.abort();
}
