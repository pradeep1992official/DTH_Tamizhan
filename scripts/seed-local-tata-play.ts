// Explicit development-only local file import. No Firebase, server store, orders or network imports.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mergeTataPlayTariffs } from './lib/tataPlayTariffs';

if (process.env.NODE_ENV !== 'development' || !process.argv.includes('--confirm=SEED_LOCAL_TATA_PLAY')) {
  throw new Error('Requires NODE_ENV=development and --confirm=SEED_LOCAL_TATA_PLAY. Never use against production.');
}
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'data');
const target = path.join(directory, 'plan_catalog.json');
const original = await readFile(target, 'utf8');
const existing = JSON.parse(original);
const deleted = JSON.parse(await readFile(path.join(directory, 'deleted_plan_ids.json'), 'utf8'));
if (!Array.isArray(existing) || !Array.isArray(deleted)) throw new Error('Expected existing catalog and deletion-list arrays.');
const next = mergeTataPlayTariffs(existing, deleted);
const backupDirectory = path.join(root, '.local-fixtures');
await mkdir(backupDirectory, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(backupDirectory, `catalog-before-tata-play-${stamp}.json`);
await writeFile(backup, original, { flag: 'wx' });
if (await readFile(target, 'utf8') !== original) throw new Error('Catalog changed during preparation. Retry against the latest file.');
const temporary = path.join(directory, `plan_catalog.tata-play-${stamp}.tmp`);
await writeFile(temporary, JSON.stringify(next, null, 2), { flag: 'wx' });
await rename(temporary, target);
console.log(JSON.stringify({ localFile: target, backup, before: existing.length, after: next.length,
  tataPlay: next.filter(p => p.operator === 'tata_play').length,
  recommended: next.filter(p => p.operator === 'tata_play' && p.is_recommended).length,
  message: 'Local catalog only. Restart the development server to reload. No production or payment writes.' }, null, 2));
