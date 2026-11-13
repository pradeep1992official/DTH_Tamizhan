import { auth } from './firebase';

export async function paymentAuthHeaders(): Promise<Record<string, string>> {
  await auth?.authStateReady?.();
  const customer = auth?.currentUser;
  if (!customer) throw new Error('Please sign in to continue with payment.');
  const token = await customer.getIdToken();
  if (auth?.currentUser?.uid !== customer.uid) throw new Error('Your account changed. Please reopen checkout.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
