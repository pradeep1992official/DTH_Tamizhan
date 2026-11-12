import React from 'react';
import { translations } from '../lib/translations';
import type { Language } from '../types';

export function RechargeHelp({ currentLang }: { currentLang: Language }) {
  const t = translations[currentLang];
  return <aside className="recharge-help">
    <details className="id-guide">
      <summary>{t.uiFindYourId}</summary>
      <div className="id-guide-content">
        <p>{t.uiIdGuide}</p>
        <figure className="id-photo-slot">
          <svg viewBox="0 0 240 90" aria-hidden="true">
            <rect x="24" y="16" width="192" height="60" rx="5" fill="none" stroke="currentColor" />
            <rect x="72" y="34" width="96" height="22" fill="none" stroke="currentColor" strokeDasharray="4 3" />
            <path d="M120 3v22m-4-4 4 4 4-4" fill="none" stroke="currentColor" />
          </svg>
          <figcaption>{t.uiIdPhotoSlot}</figcaption>
        </figure>
      </div>
    </details>
  </aside>;
}
