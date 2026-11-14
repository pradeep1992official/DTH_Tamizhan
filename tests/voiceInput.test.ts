import { afterEach, expect, it, vi } from 'vitest';
import { beginVoiceInput, cancelVoiceInput } from '../src/lib/voiceInput';

afterEach(() => vi.unstubAllGlobals());
function setup() {
  const recognition = { start: vi.fn(), stop: vi.fn(), abort: vi.fn(), lang: '', continuous: true, interimResults: false,
    onresult: null as any, onerror: null as any, onend: null as any };
  vi.stubGlobal('window', { webkitSpeechRecognition: class { constructor() { return recognition; } } });
  const callbacks = { language: 'ta' as const, initialText: 'Recharge', onText: vi.fn(), onError: vi.fn(), onEnd: vi.fn() };
  return { recognition, callbacks };
}
it('uses Tamil, preserves typed text and replaces interim transcripts without duplicating them', () => {
  const { recognition, callbacks } = setup();
  beginVoiceInput(callbacks);
  expect(recognition.lang).toBe('ta-IN'); expect(recognition.start).toHaveBeenCalledOnce();
  recognition.onresult({ results: [[{ transcript: 'hall' }]] });
  recognition.onresult({ results: [[{ transcript: 'hall box' }]] });
  expect(callbacks.onText).toHaveBeenLastCalledWith('Recharge hall box');
  recognition.onresult({ results: [[{ transcript: 'x'.repeat(600) }]] });
  expect(callbacks.onText.mock.lastCall![0]).toHaveLength(500);
});
it('forwards permission errors and releases microphone callbacks when cancelled', () => {
  const { recognition, callbacks } = setup();
  const active = beginVoiceInput({ ...callbacks, language: 'en' });
  expect(recognition.lang).toBe('en-IN');
  recognition.onerror({ error: 'not-allowed' }); expect(callbacks.onError).toHaveBeenCalledWith('not-allowed');
  cancelVoiceInput(active);
  expect(recognition.abort).toHaveBeenCalledOnce(); expect(recognition.onresult).toBeNull(); expect(recognition.onend).toBeNull();
});
it('handles unsupported browsers and startup failures', () => {
  const { recognition, callbacks } = setup();
  recognition.start.mockImplementation(() => { throw new Error('Blocked'); });
  expect(beginVoiceInput(callbacks)).toBeNull(); expect(callbacks.onError).toHaveBeenCalledWith('start_failed');
  vi.stubGlobal('window', {});
  expect(beginVoiceInput(callbacks)).toBeNull(); expect(callbacks.onError).toHaveBeenCalledWith('unsupported');
});

it('supports the unprefixed API and gracefully handles throwing constructors and aborts', () => {
  const { recognition, callbacks } = setup();
  vi.stubGlobal('window', { SpeechRecognition: class { constructor() { return recognition; } } });
  expect(beginVoiceInput(callbacks)).toBe(recognition);
  recognition.abort.mockImplementation(() => { throw new Error('already stopped'); });
  expect(() => cancelVoiceInput(recognition)).not.toThrow();
  vi.stubGlobal('window', { SpeechRecognition: class { constructor() { throw new Error('unavailable'); } } });
  expect(beginVoiceInput(callbacks)).toBeNull(); expect(callbacks.onError).toHaveBeenCalledWith('start_failed');
});
