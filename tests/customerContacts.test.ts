import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ profile: vi.fn(), account: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ getUser: fixture.account }) }));
vi.mock('../server/middleware/auth', () => ({ getAdminFirestore: () => ({ collection: () => ({ doc: (uid: string) => ({ get: () => fixture.profile(uid) }) }) }) }));
import { enrichCustomerContacts } from '../server/customerContacts';
beforeEach(() => {
  vi.clearAllMocks(); fixture.profile.mockResolvedValue({ data: () => ({ displayName: 'Customer Name', phoneNumber: '9876543210' }) });
  fixture.account.mockResolvedValue({ displayName: 'Account Name' });
});
it('resolves Subscriber to the linked customer profile and shares repeated lookups', async () => {
  const result = await enrichCustomerContacts([{ customerUid: 'customer-1', customerName: 'Subscriber', registeredMobile: '' }, { customerUid: 'customer-1', customerName: 'Subscriber', registeredMobile: '' }]);
  expect(result[0]).toMatchObject({ customerName: 'Customer Name', registeredMobile: '9876543210' });
  expect(fixture.profile).toHaveBeenCalledTimes(1);
});
it('preserves the name and phone recorded during checkout', async () => {
  const result = await enrichCustomerContacts([{ customerUid: 'customer-1', customerName: 'Checkout Name', registeredMobile: '9876543210' }]);
  expect(result[0].customerName).toBe('Checkout Name'); expect(fixture.profile).not.toHaveBeenCalled();
});
it('does not guess identities for unbound payments', async () => {
  const result = await enrichCustomerContacts([{ customerName: 'Subscriber' }]);
  expect(result[0].customerName).toBe('Subscriber'); expect(fixture.account).not.toHaveBeenCalled();
});
it('keeps payments available when account services fail', async () => {
  fixture.profile.mockRejectedValue(new Error('Unavailable')); fixture.account.mockRejectedValue(new Error('Unavailable'));
  expect((await enrichCustomerContacts([{ customerUid: 'customer-1', customerName: 'Subscriber' }]))[0].customerName).toBe('Subscriber');
});
