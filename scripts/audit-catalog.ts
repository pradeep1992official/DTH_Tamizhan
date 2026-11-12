// Read-only audit: imports no application store/model and has no write API.
// Default: the authoritative server catalog snapshot. Optional --firestore reads
// the legacy named Firestore catalog explicitly; it never changes documents.
import { readFile } from 'node:fs/promises';
import { validateCatalogPack } from '../src/lib/catalog';

async function main() {
  const args = process.argv.slice(2);
  let source: string;
  let packs: any[];
  if (args[0] === '--firestore') {
    const config = JSON.parse(await readFile(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
    const { initializeApp, getApps } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    if (!getApps().length) initializeApp({ projectId: config.projectId });
    const snapshot = await getFirestore(config.firestoreDatabaseId).collection('plan_catalog').get();
    packs = snapshot.docs.filter(doc => !doc.id.startsWith('__')).map(doc => ({ ...doc.data(), id: doc.id }));
    source = `firestore:${config.projectId}/${config.firestoreDatabaseId}/plan_catalog`;
  } else {
    source = args[0] || 'data/plan_catalog.json';
    const data = JSON.parse(await readFile(args[0] || new URL('../data/plan_catalog.json', import.meta.url), 'utf8'));
    if (!Array.isArray(data)) throw new Error('Catalog input must be a JSON array.');
    packs = data;
  }
  const findings = packs.flatMap((value, index) => {
    const pack = value && typeof value === 'object' ? value : {};
    const errors = validateCatalogPack(value);
    const review: string[] = [];
    if (pack.operator === 'airtel_dth' && pack.plan_name === 'Tamil Super Star Pack' && pack.duration_months === 6 && pack.amount === 1289) {
      review.push('QA-08: reported 10 vs 140 channels. Stored total is structurally valid, but must be confirmed by the owner; highlights are not proof of the total.');
    }
    return errors.length || review.length ? [{ id: pack.id ?? `row-${index + 1}`, operator: pack.operator, name: pack.plan_name,
      duration_months: pack.duration_months, amount: pack.amount, total_channels: pack.channel_count,
      hd_channels: pack.hd_channel_count, highlight_count: pack.channel_list?.length, errors, review }] : [];
  });
  console.log(JSON.stringify({ source, scanned: packs.length, invalid: findings.filter(item => item.errors.length).length,
    manualReview: findings.filter(item => item.review.length).length, findings }, null, 2));
}
main().catch(error => { console.error(`Read-only audit failed: ${error.message}`); process.exitCode = 1; });
