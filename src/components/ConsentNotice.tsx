import React from 'react';
import type { Language } from '../types';

export function ConsentNotice({ currentLang }: { currentLang: Language }) {
  const ta = currentLang === 'ta';
  return <p lang={currentLang} className="text-xs text-muted leading-relaxed" style={{ margin: '12px 0' }}>
    {ta ? 'தொடர்வதன் மூலம், எங்கள் ' : 'By continuing, you agree to our '}
    <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{ta ? 'பயன்பாட்டு விதிமுறைகள்' : 'Terms of Use'}</a>
    {ta ? ' மற்றும் ' : ' and '}
    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{ta ? 'தனியுரிமைக் கொள்கை' : 'Privacy Policy'}</a>
    {ta ? ' ஆகியவற்றை ஏற்கிறீர்கள்.' : '.'}
  </p>;
}
