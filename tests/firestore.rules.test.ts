import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const PROJECT_ID = 'ai-studio-dthtamizhan-ab9bf4ab-c166-4e84-a763-9f8a48360247';

function checkEmulatorAvailable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request({ host, port, path: '/', method: 'GET', timeout: 1500 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const isFirestoreOk = res.statusCode === 200 && (body.includes('Ok') || Boolean(res.headers['server']?.includes('Firestore')));
        resolve(isFirestoreOk);
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment | null = null;
  let emulatorHost = '127.0.0.1';
  let emulatorPort = 8080;
  let hasEmulator = false;

  beforeAll(async () => {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const parts = process.env.FIRESTORE_EMULATOR_HOST.split(':');
      emulatorHost = parts[0] || '127.0.0.1';
      emulatorPort = parseInt(parts[1] || '8080', 10);
      hasEmulator = await checkEmulatorAvailable(emulatorHost, emulatorPort);
    } else {
      hasEmulator = false;
    }

    if (hasEmulator) {
      const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
      const rules = fs.readFileSync(rulesPath, 'utf8');

      testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
          host: emulatorHost,
          port: emulatorPort,
          rules,
        },
      });
    } else {
      console.warn(
        `\n[Notice] Firestore emulator is not running at ${emulatorHost}:${emulatorPort}. Skipping live emulator assertions. Run 'npm run test:emulator' to execute full emulator rules validation.\n`
      );
    }
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  it('verifies firestore.rules file syntax and structural integrity', () => {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    expect(fs.existsSync(rulesPath)).toBe(true);
    const rules = fs.readFileSync(rulesPath, 'utf8');
    expect(rules).toContain("rules_version = '2'");
    expect(rules).toContain('service cloud.firestore');
    expect(rules).toContain('isSuperAdmin');
    expect(rules).toContain('isAdmin');
    expect(rules).toContain('professorpradeeps@gmail.com');
  });

  describe('Live Emulator Rule Evaluation', () => {
    it('allows public read on /test/connection', async () => {
      if (!testEnv) return;
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertSucceeds(unauthDb.doc('test/connection').get());
    });

    it('denies all reads and writes on undefined root paths (default-deny)', async () => {
      if (!testEnv) return;
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(unauthDb.doc('undefined_collection/random_id').get());
      await assertFails(unauthDb.doc('undefined_collection/random_id').set({ secret: true }));
    });

    describe('/users/{userId}', () => {
      it('allows owner to read and create their own profile without privileged roles', async () => {
        if (!testEnv) return;
        const userDb = testEnv.authenticatedContext('user_123', { email: 'customer@example.com' }).firestore();
        await assertSucceeds(
          userDb.doc('users/user_123').set({
            uid: 'user_123',
            name: 'Customer One',
            role: 'customer',
          })
        );
        await assertSucceeds(userDb.doc('users/user_123').get());
      });

      it('prevents user from escalating privilege to admin during profile creation', async () => {
        if (!testEnv) return;
        const userDb = testEnv.authenticatedContext('attacker_99', { email: 'attacker@example.com' }).firestore();
        await assertFails(
          userDb.doc('users/attacker_99').set({
            uid: 'attacker_99',
            name: 'Attacker',
            is_plan_admin: true,
          })
        );
      });

      it('prevents non-owner and unauthenticated users from reading private user profile', async () => {
        if (!testEnv) return;
        // Seed user document via admin context
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('users/user_123').set({
            uid: 'user_123',
            email: 'customer@example.com',
            role: 'customer',
          });
        });

        const unauthDb = testEnv.unauthenticatedContext().firestore();
        const otherUserDb = testEnv.authenticatedContext('user_456', { email: 'other@example.com' }).firestore();

        await assertFails(unauthDb.doc('users/user_123').get());
        await assertFails(otherUserDb.doc('users/user_123').get());
      });
    });

    describe('/admins/{adminId}', () => {
      it('allows Super Admin (professorpradeeps@gmail.com) to create and manage admins', async () => {
        if (!testEnv) return;
        const superAdminDb = testEnv
          .authenticatedContext('super_admin_uid', { email: 'professorpradeeps@gmail.com' })
          .firestore();

        await assertSucceeds(
          superAdminDb.doc('admins/admin_sub1').set({
            email: 'subadmin@example.com',
            status: 'approved',
            createdAt: new Date().toISOString(),
          })
        );
      });

      it('blocks non-super-admin from creating or writing admin documents', async () => {
        if (!testEnv) return;
        const regularUserDb = testEnv
          .authenticatedContext('regular_user', { email: 'user@example.com' })
          .firestore();

        await assertFails(
          regularUserDb.doc('admins/regular_user').set({
            status: 'approved',
          })
        );
      });
    });

    describe('/plan_catalog/{planId}', () => {
      it('allows public unauthenticated read on plan catalog', async () => {
        if (!testEnv) return;
        // Seed plan doc
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('plan_catalog/sun_hd_1m').set({
            id: 'sun_hd_1m',
            operator: 'sun_direct',
            plan_name: 'Sun Prime HD',
            amount: 299,
          });
        });

        const unauthDb = testEnv.unauthenticatedContext().firestore();
        await assertSucceeds(unauthDb.doc('plan_catalog/sun_hd_1m').get());
      });

      it('blocks regular users from modifying plan catalog', async () => {
        if (!testEnv) return;
        const userDb = testEnv.authenticatedContext('user_123', { email: 'user@example.com' }).firestore();
        await assertFails(
          userDb.doc('plan_catalog/sun_hd_1m').set({
            id: 'sun_hd_1m',
            amount: 1, // Malicious price tampering
          })
        );
      });

      it('allows super admin to create and update plans in plan catalog', async () => {
        if (!testEnv) return;
        const superAdminDb = testEnv
          .authenticatedContext('admin_uid', { email: 'professorpradeeps@gmail.com' })
          .firestore();

        await assertSucceeds(
          superAdminDb.doc('plan_catalog/new_plan_001').set({
            id: 'new_plan_001',
            operator: 'tata_play',
            plan_name: 'Tata Mega HD',
            amount: 399,
          })
        );
      });
    });

    describe('/dth_connections/{connId}', () => {
      it('allows authenticated user to save and retrieve their own DTH connections', async () => {
        if (!testEnv) return;
        const userDb = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' }).firestore();
        await assertSucceeds(
          userDb.doc('dth_connections/conn_alice_1').set({
            user_id: 'user_alice',
            operator: 'sun_direct',
            smartcard_number: '40123456789',
          })
        );
        await assertSucceeds(userDb.doc('dth_connections/conn_alice_1').get());
      });

      it('prevents user from reading or modifying another user connection', async () => {
        if (!testEnv) return;
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('dth_connections/conn_alice_1').set({
            user_id: 'user_alice',
            operator: 'sun_direct',
            smartcard_number: '40123456789',
          });
        });

        const bobDb = testEnv.authenticatedContext('user_bob', { email: 'bob@example.com' }).firestore();
        await assertFails(bobDb.doc('dth_connections/conn_alice_1').get());
        await assertFails(
          bobDb.doc('dth_connections/conn_alice_1').update({
            smartcard_number: '99999999999',
          })
        );
      });
    });

    describe('/recharge_orders/{orderId}', () => {
      it('allows order creation and prevents order deletion (immutable audit trail)', async () => {
        if (!testEnv) return;
        const customerDb = testEnv.authenticatedContext('cust_1', { email: 'cust@example.com' }).firestore();

        await assertSucceeds(
          customerDb.doc('recharge_orders/order_1001').set({
            order_id: 'order_1001',
            user_id: 'cust_1',
            amount: 299,
            operator: 'sun_direct',
          })
        );

        // Deletion is strictly forbidden for anyone to preserve financial audit trail
        const superAdminDb = testEnv
          .authenticatedContext('admin_uid', { email: 'professorpradeeps@gmail.com' })
          .firestore();
        await assertFails(superAdminDb.doc('recharge_orders/order_1001').delete());
        await assertFails(customerDb.doc('recharge_orders/order_1001').delete());
      });
    });
  });
});
