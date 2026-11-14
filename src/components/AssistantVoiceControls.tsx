import React from 'react';
import { languageText, type AssistantLanguage, type AssistantLanguageChoice } from '../lib/assistantLanguage';

export function AssistantVoiceControls({ language, choice, disabled, onChoice }: {
  language: AssistantLanguage; choice: AssistantLanguageChoice; disabled: boolean;
  onChoice: (choice: AssistantLanguageChoice) => void;
}) {
  const say = (en: string, ta: string, tanglish: string) => languageText(language, en, ta, tanglish);
  return <div className="recharge-chat-language-controls">
    <label>{say('Language', 'மொழி', 'Mozhi')}
      <select value={choice} disabled={disabled} onChange={event => onChoice(event.target.value as AssistantLanguageChoice)}>
        <option value="auto">{say('Auto detect', 'தானாகக் கண்டறி', 'Thaana kandupidi')}</option>
        <option value="ta">தமிழ்</option><option value="en">English</option><option value="tanglish">Tanglish</option>
      </select>
    </label>
  </div>;
}
