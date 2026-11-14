import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
const rules = readFileSync('firestore.rules', 'utf8');
it('keeps ticket mutations and counters server-only', () => {
  expect(rules).toContain('resource.data.uid == request.auth.uid || isAdmin()');
  expect(rules).toContain('match /server_ticket_counters/');
  expect(rules).toContain('allow create, update, delete: if false;');
});
describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('ticket rules emulator', () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    env = await initializeTestEnvironment({ projectId: 'demo-ticket-rules', firestore: { host, port: Number(port), rules } });
    await env.withSecurityRulesDisabled(async context => {
      await context.firestore().doc('tickets/one').set({ uid: 'owner', status: 'open' });
    });
  });
  afterAll(async () => { await env?.cleanup(); });
  it('allows own reads, rejects other users and client mutations including forged admin claims', async () => {
    const owner = env.authenticatedContext('owner').firestore();
    await assertSucceeds(owner.doc('tickets/one').get());
    await assertSucceeds(owner.collection('tickets').where('uid', '==', 'owner').get());
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('other').firestore()]) await assertFails(db.doc('tickets/one').get());
    await assertFails(owner.doc('tickets/two').set({ uid: 'owner' }));
    await assertFails(owner.doc('tickets/one').update({ status: 'paid' }));
    await assertFails(owner.doc('server_ticket_counters/support').set({ value: 99 }));
    await assertFails(env.authenticatedContext('forged', { admin: true }).firestore().doc('tickets/one').get());
    const admin = env.authenticatedContext('root', { email: 'professorpradeeps@gmail.com', email_verified: true }).firestore();
    await assertSucceeds(admin.doc('tickets/one').get());
    await assertFails(admin.doc('tickets/one').update({ status: 'paid' }));
  });
});
