import { newConnectionSamples, isSampleCatalogRow } from './lib/newConnectionSamples';
import 'dotenv/config';
import { getApps, initializeApp } from 'firebase-admin/app';
import config from '../firebase-applet-config.json';
import { mutateCatalog, readNewConnectionCatalog, wipeSampleCatalog } from '../server/models/newConnectionCatalog';
import { catalogKinds } from '../src/lib/newConnectionCatalog';

const args = process.argv.slice(2);
const allowed = new Set(['--write', '--wipe-sample', '--activate-sample', '--deactivate-sample', '--project']);
for (let i = 0; i < args.length; i++) { if (!allowed.has(args[i])) throw new Error(`Unknown argument: ${args[i]}`); if (args[i] === '--project') i++; }
const project = args[args.indexOf('--project') + 1];
if (args.includes('--write') && (!args.includes('--project') || project !== config.projectId)) throw new Error(`Writes require --project ${config.projectId}; database: ${config.firestoreDatabaseId}`);
if (args.filter(a => ['--wipe-sample', '--activate-sample', '--deactivate-sample'].includes(a)).length > 1) throw new Error('Choose only one sample operation: activate, deactivate or wipe.');
const samples = newConnectionSamples();
const statusChange = args.includes('--activate-sample') || args.includes('--deactivate-sample');
if (!args.includes('--write')) {
  if (statusChange) console.log(JSON.stringify({ dryRun: true, project: config.projectId, database: config.firestoreDatabaseId, action: args.includes('--activate-sample') ? 'activate samples' : 'deactivate samples', scope: 'Catalog documents with sampleData=true AND SAMPLE in their name only. Settings and real data are unchanged. No database reads or writes.' }, null, 2));
  else
  console.log(JSON.stringify({ dryRun: true, project: config.projectId, database: config.firestoreDatabaseId, action: args.includes('--wipe-sample') ? 'wipe sampleData=true records only' : 'seed 3 brands, 9 packs, 40 channels, 3 offers (all inactive)', samples: args.includes('--wipe-sample') ? undefined : samples }, null, 2));
} else {
  if (!getApps().length) initializeApp({ projectId: project });
  if (args.includes('--wipe-sample')) console.log(`Removed ${await wipeSampleCatalog()} SAMPLE records.`);
  else if (statusChange) {
    const data = await readNewConnectionCatalog(); let changed = 0; const active = args.includes('--activate-sample');
    for (const kind of catalogKinds) for (const row of data[kind]) {
      if (!isSampleCatalogRow(row)) continue;
      await mutateCatalog(kind, { ...row, active }, { id: row.id, sample: true }); changed++;
    }
    console.log(`${active ? 'Activated' : 'Deactivated'} ${changed} SAMPLE records. Real data and settings were preserved.`);
  }
  else { for (const sample of samples) await mutateCatalog(sample.kind, sample.data, { sample: true, upsert: true }); console.log('Seeded 55 inactive SAMPLE records. Existing settings were preserved.'); }
}
