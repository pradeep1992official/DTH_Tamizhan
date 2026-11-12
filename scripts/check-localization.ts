import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { translations } from '../src/lib/translations';
import { BUSINESS_DETAILS, POLICY_CONTENT, POLICY_ROUTES } from '../src/lib/trustContent';
import { BUSINESS_DETAILS_TA, POLICY_CONTENT_TA } from '../src/lib/policyTranslations';

export function localizationIssues(english: Record<string, unknown>, tamil: Record<string, unknown>, prefix = ''): string[] {
  const issues: string[] = [];
  for (const key of Object.keys(english)) {
    const name = `${prefix}${key}`;
    if (!(key in tamil)) { issues.push(`${name}: missing Tamil key`); continue; }
    const en = english[key], ta = tamil[key];
    if (typeof en === 'string') {
      if (typeof ta !== 'string' || !ta.trim()) issues.push(`${name}: empty or non-string Tamil value`);
      for (const [lang, value] of [['en', en], ['ta', ta]] as const) {
        if (typeof value === 'string' && (/\?{2,}|\uFFFD|à®|à¯|â€|Ã¢/.test(value))) issues.push(`${name}.${lang}: damaged text`);
      }
      if (typeof ta === 'string') {
        const tokens = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join(',');
        if (tokens(en) !== tokens(ta)) issues.push(`${name}: interpolation tokens disagree`);
      }
    }
  }
  for (const key of Object.keys(tamil)) if (!(key in english)) issues.push(`${prefix}${key}: missing English key`);
  return issues;
}
export async function checkLocalization(root = fileURLToPath(new URL('../', import.meta.url))): Promise<string[]> {
  const issues = localizationIssues(translations.en, translations.ta);
  issues.push(...localizationIssues(BUSINESS_DETAILS, BUSINESS_DETAILS_TA, 'business.'));
  for (const route of POLICY_ROUTES) {
    if (!route.ta || /\?{2,}|\uFFFD/.test(route.ta)) issues.push(`policy route ${route.key}: damaged or missing Tamil`);
    const en = POLICY_CONTENT[route.key], ta = POLICY_CONTENT_TA[route.key];
    if (en.length !== ta.length || en.some((section, index) => section.paragraphs.length !== ta[index]?.paragraphs.length)) issues.push(`policy ${route.key}: section/paragraph parity mismatch`);
    for (const section of ta) for (const value of [section.heading, ...section.paragraphs]) if (/\?{2,}|\uFFFD/.test(value)) issues.push(`policy ${route.key}: damaged Tamil`);
  }
  async function scan(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) { await scan(target); continue; }
      if (!/\.(?:tsx?|css|html)$/.test(target)) continue;
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(target));
        if (target.endsWith('.tsx')) for (const literal of text.matchAll(/(?:'(?:\\.|[^'\\\r\n])*'|"(?:\\.|[^"\\\r\n])*")/g)) {
          if (/\?{2,}|\uFFFD/.test(literal[0])) issues.push(`${path.relative(root, target)}: damaged literal`);
        }
      }
      catch { issues.push(`${path.relative(root, target)}: invalid UTF-8`); }
    }
  }
  await scan(path.join(root, 'src'));
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  if (!/<meta\s+charset=["']UTF-8["']/i.test(html)) issues.push('index.html: missing UTF-8 charset');
  return issues;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issues = await checkLocalization();
  if (issues.length) { console.error(issues.join('\n')); process.exitCode = 1; }
  else console.log('English/Tamil keys, interpolation tokens, policy coverage and UTF-8 checks passed.');
}
