import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
const rules = readFileSync('firestore.rules', 'utf8');
it('keeps server orders default-denied and legacy orders restricted to owner or authorized admin', () => {
  expect(rules).toContain('match /{document=**}');
  expect(rules).toContain('allow read, write: if false;');
  expect(rules).not.toMatch(/match \/server_recharges/);
  for (const collection of ['pending_recharges', 'recharge_orders']) {
    // Inspect the full match block past the path parameter brace.
    const match = rules.match(new RegExp('match /' + collection + '/\\{orderId\\} \\{([\\s\\S]*?)\\n    \\}'));
    expect(match?.[1]).toContain('resource.data.user_id == request.auth.uid');
    expect(match?.[1]).toContain('allow create: if false;');
  }
});
describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('assistant order rules in emulator', () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => { const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    env = await initializeTestEnvironment({ projectId: 'demo-assistant-rules', firestore: { host, port: Number(port), rules } });
    await env.withSecurityRulesDisabled(async context => {
      for (const collection of ['server_recharges', 'pending_recharges', 'recharge_orders']) await context.firestore().doc(`${collection}/order_1`).set({ user_id: 'owner' });
    });
  });
  afterAll(async () => { await env?.cleanup(); });
  it('denies cross-user reads and queries and all direct server-order reads', async () => {
    const owner = env.authenticatedContext('owner').firestore(); const other = env.authenticatedContext('other').firestore();
    for (const collection of ['pending_recharges', 'recharge_orders']) {
      await assertSucceeds(owner.doc(`${collection}/order_1`).get());
      await assertFails(other.doc(`${collection}/order_1`).get());
      await assertFails(other.collection(collection).where('user_id', '==', 'owner').get());
    }
    for (const db of [owner, other, env.unauthenticatedContext().firestore()]) await assertFails(db.doc('server_recharges/order_1').get());
  });
});
