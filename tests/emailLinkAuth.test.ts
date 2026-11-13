import { beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ send: vi.fn(), valid: vi.fn(), signin: vi.fn(), link: vi.fn(), reauth: vi.fn(),
  credential: vi.fn((email, link) => ({ email, link })), token: vi.fn() }));
vi.mock('firebase/auth', () => ({ sendSignInLinkToEmail: sdk.send, isSignInWithEmailLink: sdk.valid,
  signInWithEmailLink: sdk.signin, linkWithCredential: sdk.link, reauthenticateWithCredential: sdk.reauth,
  EmailAuthProvider: { credentialWithLink: sdk.credential } }));
import { requestEmailSignInLink, finishEmailSignInLink, readEmailLinkHint } from '../src/lib/emailLinkAuth';
import { pageMetadata } from '../src/lib/pageMetadata';
const link = 'https://app.example.com/auth/email-link?mode=signIn&oobCode=one-time-code';
const account = { uid: 'owner', email: 'owner@example.com', providerData: [{ providerId: 'google.com' }] };
const store = () => {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
};
beforeEach(() => {
  vi.clearAllMocks(); sdk.send.mockResolvedValue(undefined); sdk.valid.mockReturnValue(true); sdk.token.mockResolvedValue('fresh-token');
  const credential = { user: { ...account, getIdToken: sdk.token } };
  sdk.signin.mockResolvedValue(credential); sdk.link.mockResolvedValue(credential); sdk.reauth.mockResolvedValue(credential);
});
it('sends a passwordless link using a fixed authorized callback and handleCodeInApp', async () => {
  const auth = {} as any; const storage = store();
  await requestEmailSignInLink(auth, ' owner@example.com ', 'https://app.example.com/somewhere?redirect=https://evil.example', storage);
  expect(sdk.send).toHaveBeenCalledWith(auth, 'owner@example.com', { url: 'https://app.example.com/auth/email-link', handleCodeInApp: true });
  expect(readEmailLinkHint(storage)).toMatchObject({ email: 'owner@example.com', flow: 'signin' });
  expect([...storage.values.values()].join()).not.toContain('one-time-code');
  expect(sdk.send.mock.calls[0][2].url).not.toContain('owner@example.com');
});
it('supports cross-device completion without a stored email', async () => {
  await finishEmailSignInLink({} as any, 'owner@example.com', link, null, 'signin');
  expect(sdk.signin).toHaveBeenCalledWith(expect.anything(), 'owner@example.com', link); expect(sdk.token).toHaveBeenCalledWith(true);
});
it('uses the explicitly confirmed email rather than an address supplied in the link URL', async () => {
  await finishEmailSignInLink({} as any, 'owner@example.com', `${link}&email=attacker@example.com`, null, 'signin');
  expect(sdk.signin.mock.calls[0][1]).toBe('owner@example.com');
});
it('clears the hint only after successful completion', async () => {
  const storage = store(); await requestEmailSignInLink({} as any, 'owner@example.com', 'https://app.example.com', storage);
  sdk.signin.mockRejectedValueOnce({ code: 'auth/expired-action-code' });
  await expect(finishEmailSignInLink({} as any, 'owner@example.com', link, storage, 'signin')).rejects.toMatchObject({ code: 'auth/expired-action-code' });
  expect(readEmailLinkHint(storage)).not.toBeNull();
  await finishEmailSignInLink({} as any, 'owner@example.com', link, storage, 'signin'); expect(readEmailLinkHint(storage)).toBeNull();
});
it('links an email credential to the current original account, preserving its UID', async () => {
  const auth = { currentUser: account } as any; const storage = store();
  await requestEmailSignInLink(auth, account.email, 'https://app.example.com', storage, 'owner');
  expect(sdk.send.mock.calls[0][2].url).toBe('https://app.example.com/auth/email-link?flow=link');
  expect(readEmailLinkHint(storage)?.uid).toBe('owner');
  await finishEmailSignInLink(auth, account.email, link, storage, 'link', 'owner');
  expect(sdk.link).toHaveBeenCalledWith(account, expect.anything()); expect(sdk.signin).not.toHaveBeenCalled();
});
it('reauthenticates an already-linked email provider instead of trying to add it twice', async () => {
  const currentUser = { ...account, providerData: [{ providerId: 'password' }] };
  await finishEmailSignInLink({ currentUser } as any, account.email, link, null, 'link', 'owner');
  expect(sdk.reauth).toHaveBeenCalledWith(currentUser, expect.anything()); expect(sdk.link).not.toHaveBeenCalled();
});
it('rejects wrong-account linking and invalid links before consuming a code', async () => {
  await expect(finishEmailSignInLink({ currentUser: account } as any, account.email, link, null, 'link', 'other')).rejects.toThrow();
  sdk.valid.mockReturnValue(false);
  await expect(finishEmailSignInLink({} as any, account.email, link, null, 'signin')).rejects.toThrow('invalid');
  expect(sdk.signin).not.toHaveBeenCalled(); expect(sdk.link).not.toHaveBeenCalled();
});
it('rejects invalid recipients and insecure non-local callback origins', async () => {
  await expect(requestEmailSignInLink({} as any, 'not-an-email', 'https://app.example.com', null)).rejects.toThrow();
  await expect(requestEmailSignInLink({} as any, account.email, 'http://app.example.com', null)).rejects.toThrow();
  expect(sdk.send).not.toHaveBeenCalled();
});
it('can send without browser storage and expires old hints', async () => {
  await requestEmailSignInLink({} as any, account.email, 'http://localhost:3000', null); expect(sdk.send).toHaveBeenCalledTimes(1);
  const storage = store(); storage.setItem('dth_email_link_hint', JSON.stringify({ email: account.email, flow: 'signin', savedAt: Date.now() - 86400001 }));
  expect(readEmailLinkHint(storage)).toBeNull(); expect(storage.values.size).toBe(0);
});
it('serves the completion route as a private, valid page', () => {
  expect(pageMetadata('/auth/email-link?mode=signIn&oobCode=secret')).toMatchObject({ status: 200, noindex: true, path: '/auth/email-link' });
});
