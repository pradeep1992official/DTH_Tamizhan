import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { getApps, initializeApp } from 'firebase-admin/app';
import config from '../firebase-applet-config.json';
import { checkPersistence, usesFirestore } from '../server/persistence';
import { readPaymentLedger } from '../server/models/paymentLedger';
import { getRechargeOrders } from '../server/models/paidRechargeOrders';
import { planModel } from '../server/models/planModel';
import { readEmailOutbox } from '../server/emailDelivery';
if (!getApps().length) initializeApp({ projectId: config.projectId });
async function main() {
  if (!usesFirestore()) throw new Error('Set PERSISTENCE_DRIVER=firestore before checking shared storage.');
  await checkPersistence();
  const [payments, recharges, plans, emails] = await Promise.all([readPaymentLedger(), getRechargeOrders(), planModel.getAll(), readEmailOutbox()]);
  console.log(JSON.stringify({ driver: 'firestore', database: config.firestoreDatabaseId, payments: payments.length, recharges: recharges.length, plans: plans.length, emails: emails.length }));
  if (process.argv.includes('--compare-local')) {
    const read = (file: string) => { const name = path.join(process.cwd(), 'data', file); return fs.existsSync(name) ? JSON.parse(fs.readFileSync(name, 'utf8')) as any[] : []; };
    const normalize = (value: any): any => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value;
    for (const local of read('razorpay_payments.json')) {
      const remote = payments.find(payment => payment.id === local.id && payment.testMode === local.testMode);
      if (!remote || JSON.stringify(normalize(local)) !== JSON.stringify(normalize(remote))) throw new Error('Payment comparison failed.');
    }
    for (const local of read('recharge_orders.json')) {
      const remote = recharges.find(order => order.orderId === local.orderId && order.paymentId === local.paymentId && order.testMode === local.testMode);
      if (remote && (remote.rechargeStatus !== local.rechargeStatus || remote.updatedAt !== local.updatedAt)) throw new Error('Fulfillment comparison failed.');
    }
    for (const local of read('email_outbox.json')) {
      const remote = emails.find(job => job.id === local.id);
      if (!remote || remote.status !== local.status || remote.idempotencyKey !== local.idempotencyKey || remote.messageId !== local.messageId) throw new Error('Email comparison failed.');
    }
    console.log('Local payment values, saved fulfillment states and email delivery identities match Firestore.');
  }
}
main().catch(() => { console.error('Firestore verification failed. Check server credentials, database access and PERSISTENCE_DRIVER.'); process.exitCode = 1; });
