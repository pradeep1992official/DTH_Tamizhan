import fs from 'node:fs';
import 'regenerator-runtime/runtime.js';
import path from 'node:path';
import { PDFDocument, rgb, type RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export interface ReceiptPdfData { title: string; rows: string[][]; note: string; operator?: string; testMode?: boolean }
function asset(file: string) {
  for (const root of ['public', 'dist']) {
    const location = path.join(process.cwd(), root, 'assets', file);
    if (fs.existsSync(location)) return fs.readFileSync(location);
  }
  throw new Error(`Missing receipt asset: ${file}`);
}
// Also upgrades queued, not-yet-attempted jobs created before PDF receipts existed.
export function receiptDataFromText(text: string): ReceiptPdfData {
  const lines = text.split('\n');
  const rows = lines.filter(line => line.includes(': ')).map(line => {
    const split = line.indexOf(': '); return [line.slice(0, split), line.slice(split + 2)];
  });
  return { title: lines[1] || 'Payment receipt', rows, note: lines.slice(lines.lastIndexOf('') + 1).join(' ') };
}

export async function receiptPdf(data: ReceiptPdfData): Promise<Buffer> {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  doc.setTitle(`DTH Tamizhan - ${data.title}`); doc.setAuthor('DTH Tamizhan');
  const font = await doc.embedFont(asset('fonts/NotoSans-Regular.ttf'), { subset: true });
  const tamil = await doc.embedFont(asset('fonts/NotoSansTamil-Regular.ttf'), { subset: true });
  const ink = rgb(.18, .16, .17), muted = rgb(.43, .39, .39), burgundy = rgb(.41, .086, .184), rule = rgb(.89, .86, .82);
  let page = doc.addPage([595.28, 841.89]); let y = 0;
  const runs = (text: string) => (text.match(/[\u0b80-\u0bff\u200c\u200d]+|[^\u0b80-\u0bff\u200c\u200d]+/gu) || []).map(value => ({ value, typeface: /[\u0b80-\u0bff]/.test(value) ? tamil : font }));
  const textWidth = (text: string, size: number) => runs(text).reduce((total, run) => total + run.typeface.widthOfTextAtSize(run.value, size), 0);
  const drawText = (text: string, x: number, baseline: number, size: number, color: RGB) => {
    for (const run of runs(text)) {
      page.drawText(run.value, { x, y: baseline, size, font: run.typeface, color });
      x += run.typeface.widthOfTextAtSize(run.value, size);
    }
  };
  const segmenter = new Intl.Segmenter('ta', { granularity: 'grapheme' });
  const wrap = (value: string, width: number, size: number): string[] => {
    const lines: string[] = []; let line = '';
    for (const word of value.replace(/[\r\n\t]+/g, ' ').split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, size) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const { segment: character } of segmenter.segment(word)) {
        if (line && textWidth(line + character, size) > width) { lines.push(line); line = ''; }
        line += character;
      }
    }
    if (line) lines.push(line); return lines.length ? lines : [''];
  };
  const header = () => {
    page.drawRectangle({ x: 0, y: 830, width: 595.28, height: 12, color: burgundy });
    page.drawText('DTH TAMIZHAN', { x: 46, y: 785, size: 12, font, color: burgundy });
    page.drawText(data.title, { x: 46, y: 745, size: 25, font, color: ink });
    y = 708;
    if (data.testMode) { page.drawText('TEST TRANSACTION - No real money collected', { x: 46, y, size: 10, font, color: burgundy }); y -= 27; }
    page.drawLine({ start: { x: 46, y }, end: { x: 549, y }, color: rule, thickness: 1 }); y -= 16;
  };
  header();
  const logoFile = ({ airtel_dth: 'airtel_logo.png', sun_direct: 'sun_logo.png', tata_play: 'tata_logo.png', dish_tv: 'dishtv_logo.png' } as Record<string, string>)[data.operator || ''];
  if (logoFile) {
    try { const logo = await doc.embedPng(asset(logoFile)); const scale = Math.min(100 / logo.width, 40 / logo.height);
      page.drawImage(logo, { x: 549 - logo.width * scale, y: 771, width: logo.width * scale, height: logo.height * scale });
    } catch { /* Operator name is still included as text. */ }
  }
  for (const [label, raw] of data.rows) {
    const value = String(raw ?? 'Not recorded');
    const lines = wrap(value, 326, 10.5); const height = Math.max(36, lines.length * 17 + 18);
    if (y - height < 165) { page = doc.addPage([595.28, 841.89]); header(); }
    page.drawText(label, { x: 46, y: y - 17, size: 10, font, color: muted });
    lines.forEach((line, index) => drawText(line, 216, y - 17 - index * 17, 10.5, label === 'Amount' ? burgundy : ink));
    y -= height; page.drawLine({ start: { x: 46, y }, end: { x: 549, y }, color: rule, thickness: .5 });
  }
  const noteLines = wrap(data.note, 475, 9.5);
  if (y - noteLines.length * 15 - 44 < 85) { page = doc.addPage([595.28, 841.89]); header(); }
  y -= 28;
  noteLines.forEach((line, index) => drawText(line, 46, y - index * 15, 9.5, muted));
  for (const [index, item] of doc.getPages().entries()) {
    item.drawText(`DTH Tamizhan | ${index + 1} / ${doc.getPageCount()}`, { x: 46, y: 39, size: 8, font, color: muted });
  }
  return Buffer.from(await doc.save());
}
