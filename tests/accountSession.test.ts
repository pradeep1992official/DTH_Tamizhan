import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ authCallback: null as any, authError: null as any,
  listeners: new Map<string, { next: (snapshot: any) => void; error: () => void; stop: ReturnType<typeof vi.fn> }>(),
  stopAuth: vi.fn(), write: vi.fn(), signOut: vi.fn() }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: any, callback: any, error: any) => { fixture.authCallback = callback; fixture.authError = error; return fixture.stopAuth; },
  signOut: fixture.signOut,
}));
vi.mock('firebase/firestore', () => ({ doc: (_db: any, _collection: string, uid: string) => uid,
  onSnapshot: (uid: string, _options: unknown, next: any, error: any) => {
    const stop = vi.fn(); fixture.listeners.set(uid, { next, error, stop }); return stop;
  }, setDoc: fixture.write,
}));
import { observeAccountSession, sessionProfile, signOutAccount } from '../src/lib/accountSession';
const account = (uid = 'owner') => ({ uid, email: `${uid}@example.com`, displayName: 'Google Name', phoneNumber: '9876543210',
  providerData: [{ providerId: 'google.com' }], metadata: { creationTime: '2026-01-01T00:00:00Z' } }) as any;
beforeEach(() => { vi.clearAllMocks(); fixture.listeners.clear(); fixture.write.mockResolvedValue(undefined); fixture.signOut.mockResolvedValue(undefined); });
const snapshot = (data?: any, fromCache = false) => ({ exists: () => data !== undefined, data: () => data, metadata: { fromCache } });
it('restores saved editable fields while deriving identity from Firebase instead of cached profile data', () => {
  expect(sessionProfile(account(), { uid: 'forged', email: 'forged@example.com', displayName: 'Edited Name', phoneNumber: '9000000001', role: 'admin', is_worker: true })).toMatchObject({ uid: 'owner', email: 'owner@example.com', displayName: 'Edited Name', phoneNumber: '9000000001', role: 'customer', is_worker: false });
});
it('preserves an explicitly cleared phone number instead of restoring the Google phone', () => {
  expect(sessionProfile(account(), { phoneNumber: '' }).phoneNumber).toBeUndefined();
});
it('loads profile edits after login and only writes login metadata for existing accounts', () => {
  const auth = { currentUser: account() } as any; const changed = vi.fn();
  observeAccountSession(auth, {} as any, changed); fixture.authCallback(auth.currentUser);
  fixture.listeners.get('owner')!.next(snapshot({ displayName: 'Saved Name', phoneNumber: '9000000001' }));
  expect(changed.mock.calls.at(-1)![0]).toMatchObject({ displayName: 'Saved Name', phoneNumber: '9000000001' });
  expect(fixture.write).toHaveBeenCalledWith('owner', { lastLoginAt: expect.any(String) }, { merge: true });
  fixture.listeners.get('owner')!.next(snapshot({ displayName: 'Updated in another tab', phoneNumber: '' }));
  expect(changed.mock.calls.at(-1)![0]).toMatchObject({ displayName: 'Updated in another tab', phoneNumber: undefined });
  expect(fixture.write).toHaveBeenCalledTimes(1);
});
it('initializes a new profile without role or privilege fields', () => {
  const auth = { currentUser: account() } as any;
  observeAccountSession(auth, {} as any, vi.fn()); fixture.authCallback(auth.currentUser);
  fixture.listeners.get('owner')!.next(snapshot());
  const body = fixture.write.mock.calls[0][1]; expect(body).toMatchObject({ uid: 'owner', displayName: 'Google Name' });
  expect(body).not.toHaveProperty('role'); expect(body).not.toHaveProperty('email'); expect(body).not.toHaveProperty('is_worker');
});
it('does not overwrite a server profile when the offline cache initially looks empty', () => {
  const auth = { currentUser: account() } as any; const changed = vi.fn();
  observeAccountSession(auth, {} as any, changed); fixture.authCallback(auth.currentUser);
  fixture.listeners.get('owner')!.next(snapshot(undefined, true)); expect(fixture.write).not.toHaveBeenCalled();
  fixture.listeners.get('owner')!.next(snapshot({ displayName: 'Saved on server', phoneNumber: '9000000001' }));
  expect(changed.mock.calls.at(-1)![0].displayName).toBe('Saved on server');
  expect(fixture.write.mock.calls[0][1]).not.toHaveProperty('displayName');
});
it('clears the UI after Firebase sign-out and ignores a late profile snapshot', () => {
  const auth = { currentUser: account() } as any; const changed = vi.fn();
  observeAccountSession(auth, {} as any, changed); fixture.authCallback(auth.currentUser);
  const listener = fixture.listeners.get('owner')!;
  auth.currentUser = null; fixture.authCallback(null);
  const count = changed.mock.calls.length; listener.next(snapshot({ displayName: 'Stale Name' }));
  expect(changed.mock.calls).toHaveLength(count); expect(changed.mock.calls.at(-1)![0]).toBeNull(); expect(listener.stop).toHaveBeenCalled();
});
it('ignores old account data after switching accounts and cleans up listeners on unmount', () => {
  const auth = { currentUser: account() } as any; const changed = vi.fn();
  const cleanup = observeAccountSession(auth, {} as any, changed); fixture.authCallback(auth.currentUser);
  const old = fixture.listeners.get('owner')!; auth.currentUser = account('second'); fixture.authCallback(auth.currentUser);
  old.next(snapshot({ displayName: 'Wrong Customer' }));
  expect(changed.mock.calls.at(-1)![0].uid).toBe('second');
  cleanup(); expect(fixture.stopAuth).toHaveBeenCalled(); expect(fixture.listeners.get('second')!.stop).toHaveBeenCalled();
});
it('reports profile read errors while keeping the valid signed-in identity', () => {
  const auth = { currentUser: account() } as any; const changed = vi.fn(); const failed = vi.fn();
  observeAccountSession(auth, {} as any, changed, failed); fixture.authCallback(auth.currentUser); fixture.listeners.get('owner')!.error();
  expect(changed.mock.calls.at(-1)![0].uid).toBe('owner'); expect(failed).toHaveBeenCalled();
});
it('ends the actual Firebase session and propagates sign-out failures', async () => {
  const auth = {} as any; await signOutAccount(auth); expect(fixture.signOut).toHaveBeenCalledWith(auth);
  fixture.signOut.mockRejectedValueOnce(new Error('Unavailable'));
  await expect(signOutAccount(auth)).rejects.toThrow('Unavailable');
});
