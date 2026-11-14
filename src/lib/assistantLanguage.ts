export type AssistantLanguage = 'en' | 'ta' | 'tanglish';
export type AssistantLanguageChoice = AssistantLanguage | 'auto';

// Short replies such as HD, 3 months, or an order ID retain the conversation language.
export function detectAssistantLanguage(messages: string[], fallback: AssistantLanguage = 'en'): AssistantLanguage {
  for (const message of [...messages].reverse()) {
    if (/\b(?:tanglish|romanized tamil|tamil in english letters)\b/i.test(message)) return 'tanglish';
    if (/\b(?:in english|english[- ]la|english please)\b/i.test(message)) return 'en';
    if (/\b(?:in tamil|tamil[- ]la|tamil please)\b/i.test(message)) return 'ta';
    if (/[\u0B80-\u0BFF]/u.test(message)) return 'ta';
    if (/\b(?:vanakkam|enakku|enaku|ennoda|enoda|enna|epdi|eppadi|eppo|enga|irukku|irukka|iruku|iruka|illa|illai|venum|vendum|venam|pannunga|panunga|pannu|pannala|aagala|aaguma|achu|aachu|kudunga|kodunga|kaatunga|kaattu|sollunga|sollu|paakanum|parkanum|seiyanum|seyyanum|nanri|nandri|neenga|unga|ungal|thiruppi|varala|varuma|panam|paisa|mudinjudha|mudinjatha|panniten|pannitten)\b/i.test(message)) return 'tanglish';
    const meaningful = message.replace(/\b(?:hd|sd|inr|rs|months?|sun|direct|airtel|digital|tv|tata|play|dish|d2h|order[_\w-]*|pay[_\w-]*)\b|[\d\s\W_]+/gi, '');
    if (meaningful.length >= 3) return 'en';
  }
  return fallback;
}
export function resolveAssistantLanguage(messages: string[], choice: AssistantLanguageChoice = 'auto', fallback: AssistantLanguage = 'en'): AssistantLanguage {
  return choice === 'auto' ? detectAssistantLanguage(messages, fallback) : choice;
}
export function languageText(language: AssistantLanguage, en: string, ta: string, tanglish: string): string {
  return language === 'ta' ? ta : language === 'tanglish' ? tanglish : en;
}
export function assistantLanguageTag(language: AssistantLanguage): string {
  return language === 'ta' ? 'ta-IN' : language === 'tanglish' ? 'ta-Latn-IN' : 'en-IN';
}
