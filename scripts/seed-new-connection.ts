import 'dotenv/config';
import { getApps, initializeApp } from 'firebase-admin/app';
import config from '../firebase-applet-config.json';
import { catalogIdentity, mutateCatalog, wipeSampleCatalog } from '../server/models/newConnectionCatalog';
import { catalogSchemas, type CatalogKind } from '../src/lib/newConnectionCatalog';

const args = process.argv.slice(2);
const allowed = new Set(['--write', '--wipe-sample', '--project']);
for (let i = 0; i < args.length; i++) { if (!allowed.has(args[i])) throw new Error(`Unknown argument: ${args[i]}`); if (args[i] === '--project') i++; }
const project = args[args.indexOf('--project') + 1];
if (args.includes('--write') && (!args.includes('--project') || project !== config.projectId)) throw new Error(`Writes require --project ${config.projectId}; database: ${config.firestoreDatabaseId}`);
const samples: { kind: CatalogKind; data: any }[] = [];
const channelIds: string[] = [];
const genres = ['News', 'Movies', 'Sports', 'Kids', 'Music', 'Infotainment', 'Devotional', 'Regional'];
for (let i = 1; i <= 40; i++) {
  const data = catalogSchemas.channels.parse({ name: `SAMPLE Channel ${String(i).padStart(2, '0')}`, language: i % 3 ? 'Tamil' : 'English', genre: genres[(i - 1) % genres.length], isHD: i % 4 === 0, isPay: i % 3 === 0, active: false, sortOrder: i });
  samples.push({ kind: 'channels', data }); channelIds.push(catalogIdentity('channels', data));
}
for (let b = 1; b <= 3; b++) {
  const brand = catalogSchemas.brands.parse({ name: `SAMPLE Brand ${b}`, slug: `sample-brand-${b}`, active: false, sortOrder: b, description: 'SAMPLE — fictional brand, not a real DTH operator.', serviceNote: 'SAMPLE — not available for booking.' });
  const brandId = catalogIdentity('brands', brand); samples.push({ kind: 'brands', data: brand });
  let firstPackId = '';
  for (let p = 1; p <= 3; p++) {
    const pack = catalogSchemas.packs.parse({ brandId, name: `SAMPLE Brand ${b} Pack ${p}`, type: p === 1 ? 'SD' : p === 2 ? 'HD' : 'Regional', language: 'Tamil', region: 'SAMPLE region', pricingOptions: [{ validityDays: 30, price: 100 + b * 10 + p }, { validityDays: 90, price: 300 + b * 10 + p }], channelIds: channelIds.slice((b - 1) * 5, 15 + p * 5), highlights: ['SAMPLE prices in INR — entirely fictional', 'SAMPLE channels — demonstration only'], active: false, sortOrder: p });
    if (p === 1) firstPackId = catalogIdentity('packs', pack); samples.push({ kind: 'packs', data: pack });
  }
  samples.push({ kind: 'equipment', data: catalogSchemas.equipment.parse({ brandId, name: `SAMPLE Brand ${b} HD Box Offer`, boxType: 'HD', hardwarePrice: 1000 + b, installationCharge: 100 + b, includedFirstPackId: firstPackId, warrantyNote: 'SAMPLE warranty and SAMPLE prices; no real offer.', active: false, sortOrder: b }) });
}
if (!args.includes('--write')) {
  console.log(JSON.stringify({ dryRun: true, project: config.projectId, database: config.firestoreDatabaseId, action: args.includes('--wipe-sample') ? 'wipe sampleData=true records only' : 'seed 3 brands, 9 packs, 40 channels, 3 offers (all inactive)', samples: args.includes('--wipe-sample') ? undefined : samples }, null, 2));
} else {
  if (!getApps().length) initializeApp({ projectId: project });
  if (args.includes('--wipe-sample')) console.log(`Removed ${await wipeSampleCatalog()} SAMPLE records.`);
  else { for (const sample of samples) await mutateCatalog(sample.kind, sample.data, { sample: true, upsert: true }); console.log('Seeded 55 inactive SAMPLE records. Existing settings were preserved.'); }
}
