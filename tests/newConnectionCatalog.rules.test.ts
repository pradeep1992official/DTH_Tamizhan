import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';

// Explicit skip rather than passing no-op assertions when Java/emulator is absent.
describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('New connection catalog Firestore rules', () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    env = await initializeTestEnvironment({ projectId: 'demo-new-connection-catalog', firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') } });
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      for (const collection of ['dthBrands', 'dthPacks', 'dthChannels', 'dthEquipmentOffers']) {
        await db.doc(`${collection}/active`).set({ name: 'Active', active: true });
        await db.doc(`${collection}/inactive`).set({ name: 'Inactive', active: false });
      }
      await db.doc('appSettings/newConnection').set({ advanceMode: 'full' });
      await db.doc('appSettings/private').set({ private: true });
      await db.doc('admins/approved').set({ email: 'approved@example.com', status: 'approved' });
      await db.doc('admins/revoked').set({ email: 'revoked@example.com', status: 'revoked' });
      await db.doc('newConnectionOrders/owner-order').set({ uid: 'customer', paymentStatus: 'awaiting_admin_confirmation', adminNotes: '' });
      await db.doc('server_new_connection_private/owner-order').set({ adminNotes: 'Bank details: private' });
    });
  });
  afterAll(async () => { await env?.cleanup(); });
  it('permits public active reads and constrained queries, and rejects inactive/unfiltered reads', async () => {
    const db = env.unauthenticatedContext().firestore();
    for (const collection of ['dthBrands', 'dthPacks', 'dthChannels', 'dthEquipmentOffers']) {
      await assertSucceeds(db.doc(`${collection}/active`).get());
      await assertFails(db.doc(`${collection}/inactive`).get());
      expect((await assertSucceeds(db.collection(collection).where('active', '==', true).get())).size).toBe(1);
      await assertFails(db.collection(collection).get());
    }
  });
  it('permits inactive reads for root/approved admins, rejects revoked and email-mismatched admins', async () => {
    for (const [uid, email] of [['root', 'professorpradeeps@gmail.com'], ['approved', 'approved@example.com']]) {
      await assertSucceeds(env.authenticatedContext(uid, { email, email_verified: true }).firestore().doc('dthPacks/inactive').get());
    }
    for (const [uid, email] of [['revoked', 'revoked@example.com'], ['approved', 'different@example.com']]) {
      await assertFails(env.authenticatedContext(uid, { email, email_verified: true }).firestore().doc('dthPacks/inactive').get());
    }
  });
  it('denies direct client mutations even to admins, preserving server-derived invariants', async () => {
    const db = env.authenticatedContext('root', { email: 'professorpradeeps@gmail.com', email_verified: true }).firestore();
    for (const collection of ['dthBrands', 'dthPacks', 'dthChannels', 'dthEquipmentOffers']) {
      await assertFails(db.doc(`${collection}/new`).set({ active: true }));
      await assertFails(db.doc(`${collection}/active`).update({ channelCount: 999 }));
      await assertFails(db.doc(`${collection}/active`).delete());
    }
    await assertFails(db.doc('appSettings/newConnection').set({ advanceMode: 'partial' }));
    await assertFails(db.doc('server_runtime/newConnectionCatalog').set({ updatedAt: 0 }));
  });
  it('publishes only the requested settings document', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(db.doc('appSettings/newConnection').get());
    await assertFails(db.doc('appSettings/private').get());
  });
  it('allows only the owner or approved admins to read new-connection orders, never client mutations', async () => {
    const owner = env.authenticatedContext('customer').firestore();
    const admin = env.authenticatedContext('approved', { email: 'approved@example.com', email_verified: true }).firestore();
    await assertSucceeds(owner.doc('newConnectionOrders/owner-order').get());
    await assertSucceeds(admin.doc('newConnectionOrders/owner-order').get());
    await assertFails(env.unauthenticatedContext().firestore().doc('newConnectionOrders/owner-order').get());
    await assertFails(env.authenticatedContext('another-customer').firestore().doc('newConnectionOrders/owner-order').get());
    for (const db of [owner, admin]) {
      await assertFails(db.doc('newConnectionOrders/new-order').set({ uid: 'customer', paymentStatus: 'paid' }));
      await assertFails(db.doc('newConnectionOrders/owner-order').update({ paymentStatus: 'paid', amountDueNow: 1 }));
      await assertFails(db.doc('newConnectionOrders/owner-order').delete());
      await assertFails(db.doc('server_new_connection_private/owner-order').get());
      await assertFails(db.doc('newConnectionOrders/owner-order').update({ ledger: [{ type: 'payment', amount: 999 }], amountPaid: 999 }));
      await assertFails(db.doc('newConnectionOrders/owner-order').update({ cancellationRequest: { status: 'open' } }));
      for (const collection of ['server_new_connection_notifications', 'server_new_connection_operations', 'server_new_connection_refund_refs', 'server_new_connection_payment_refs']) {
        await assertFails(db.doc(collection + '/private-record').get());
        await assertFails(db.doc(collection + '/private-record').set({ forged: true }));
      }

    }
  });
  it('closes direct recharge plan/operator SDK reads while keeping approved-admin reads', async () => {
    await env.withSecurityRulesDisabled(async context => {
      await context.firestore().doc('plan_catalog/old-plan').set({ id: 'old-plan', plan_name: 'Historical pack' });
      await context.firestore().doc('operator_settings/old-operator').set({ id: 'old-operator', isEnabled: true });
    });
    const admin = env.authenticatedContext('approved', { email: 'approved@example.com', email_verified: true }).firestore();
    for (const [collection, id] of [['plan_catalog', 'old-plan'], ['operator_settings', 'old-operator']]) {
      const publicDb = env.unauthenticatedContext().firestore();
      await assertFails(publicDb.doc(collection + '/' + id).get());
      await assertFails(publicDb.collection(collection).get());
      await assertFails(env.authenticatedContext('customer').firestore().doc(collection + '/' + id).get());
      await assertFails(env.authenticatedContext('revoked', { email: 'revoked@example.com', email_verified: true }).firestore().doc(collection + '/' + id).get());
      await assertSucceeds(admin.doc(collection + '/' + id).get());
    }
  });

});
