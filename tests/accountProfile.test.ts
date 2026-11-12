import { beforeEach, describe, expect, it, vi } from 'vitest';
const { write, document } = vi.hoisted(() => ({ write: vi.fn(), document: vi.fn(() => 'profile-ref') }));
vi.mock('firebase/firestore', () => ({ doc: document, setDoc: write }));
import { saveAccountProfile } from '../src/lib/accountProfile';

describe('account profile saves', () => {
  beforeEach(() => vi.clearAllMocks());
  const db = {} as any;
  const session = (uid: string) => ({ authStateReady: vi.fn().mockResolvedValue(undefined), currentUser: { uid } }) as any;
  it('writes only editable profile fields even when passed cached privileges', async () => {
    await saveAccountProfile(db, session('owner'), 'owner', { displayName: ' Name ', phoneNumber: ' 123 ', role: 'admin', is_worker: true, email: 'cached@example.test' } as any, 'Sign in');
    expect(document).toHaveBeenCalledWith(db, 'users', 'owner');
    expect(write).toHaveBeenCalledWith('profile-ref', { uid: 'owner', displayName: 'Name', phoneNumber: '123' }, { merge: true });
  });
  it('clears an optional phone number instead of leaving the saved value behind', async () => {
    await saveAccountProfile(db, session('owner'), 'owner', { displayName: 'Name', phoneNumber: undefined }, 'Sign in');
    expect(write.mock.calls[0][1].phoneNumber).toBe('');
  });
  it.each([null, session('other'), { authStateReady: vi.fn(), currentUser: null }])('rejects missing or mismatched sessions before writing', async auth => {
    await expect(saveAccountProfile(db, auth as any, 'owner', { displayName: 'Name' }, 'Sign in again')).rejects.toThrow('Sign in again');
    expect(write).not.toHaveBeenCalled();
  });
  it('propagates write failures so the UI does not report a successful save', async () => {
    write.mockRejectedValueOnce(new Error('permission-denied'));
    await expect(saveAccountProfile(db, session('owner'), 'owner', { displayName: 'Name' }, 'Sign in')).rejects.toThrow('permission-denied');
  });
});
