import { getAuth } from 'firebase-admin/auth';
import { getAdminFirestore } from './middleware/auth';

export const missingCustomerName = (name?: string) => !name?.trim() || name.trim().toLowerCase() === 'subscriber';

// Resolve only the account bound to the order; never guess identity from a phone or card number.
export async function enrichCustomerContacts<T extends { customerUid?: string; customerName: string; registeredMobile?: string }>(records: T[]): Promise<T[]> {
  const profiles = new Map<string, Promise<{ name?: string; phone?: string }>>();
  for (const customer of records) {
    const uid = customer.customerUid;
    if (!uid || uid === 'legacy-unassigned' || (!missingCustomerName(customer.customerName) && customer.registeredMobile)) continue;
    if (!profiles.has(uid)) profiles.set(uid, (async () => {
      const [profile, account] = await Promise.all([
        Promise.resolve().then(() => getAdminFirestore().collection('users').doc(uid).get()).then(doc => doc.data()).catch(() => undefined),
        Promise.resolve().then(() => getAuth().getUser(uid)).catch(() => undefined),
      ]);
      const name = profile?.displayName || account?.displayName;
      const phone = profile?.phoneNumber || account?.phoneNumber;
      return { name: typeof name === 'string' ? name.trim().slice(0, 100) : undefined,
        phone: typeof phone === 'string' ? phone.trim().slice(0, 20) : undefined };
    })());
  }
  await Promise.all(records.map(async customer => {
    const profile = customer.customerUid ? await profiles.get(customer.customerUid) : undefined;
    if (profile?.name && missingCustomerName(customer.customerName)) customer.customerName = profile.name;
    if (profile?.phone && !customer.registeredMobile) customer.registeredMobile = profile.phone;
  }));
  return records;
}
