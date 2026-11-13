import { beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ signin: vi.fn(), signup: vi.fn(), update: vi.fn(), verify: vi.fn(), reset: vi.fn(), link: vi.fn(),
  password: vi.fn(), save: vi.fn(), phone: vi.fn(), linkPhone: vi.fn(), credential: vi.fn((email, password) => ({ email, password })) }));
vi.mock('firebase/auth', () => ({ signInWithEmailAndPassword: sdk.signin, createUserWithEmailAndPassword: sdk.signup, updateProfile: sdk.update,
  sendEmailVerification: sdk.verify, sendPasswordResetEmail: sdk.reset, linkWithCredential: sdk.link, updatePassword: sdk.password,
  signInWithPhoneNumber: sdk.phone, linkWithPhoneNumber: sdk.linkPhone, EmailAuthProvider: { credential: sdk.credential } }));
vi.mock('../src/lib/accountProfile', () => ({ saveAccountProfile: sdk.save }));
import { emailSignIn, emailSignUp, linkEmailPassword, normalizeLoginPhone, resetLoginPassword, sendPhoneCode, confirmPhoneCode, loginError } from '../src/lib/signInMethods';
const user = () => ({ uid: 'owner', email: 'owner@example.com', emailVerified: true, providerData: [{ providerId: 'google.com' }] });
beforeEach(() => { vi.clearAllMocks(); sdk.signup.mockResolvedValue({ user: user() }); sdk.update.mockResolvedValue(undefined); sdk.verify.mockResolvedValue(undefined); sdk.save.mockResolvedValue(undefined); });
it('signs in with the supplied email/password using Firebase, without storing the password in a profile', async () => {
  const auth = {} as any; await emailSignIn(auth, ' owner@example.com ', 'password');
  expect(sdk.signin).toHaveBeenCalledWith(auth, 'owner@example.com', 'password'); expect(sdk.save).not.toHaveBeenCalled();
});
it('creates an email account, saves editable profile details and sends verification', async () => {
  const auth = { currentUser: user() } as any;
  const result = await emailSignUp(auth, {} as any, ' Saved Name ', 'owner@example.com', 'password');
  expect(result).toMatchObject({ verificationSent: true, profileSaved: true });
  expect(sdk.save).toHaveBeenCalledWith(expect.anything(), auth, 'owner', { displayName: 'Saved Name', phoneNumber: undefined }, expect.any(String));
  expect(sdk.save.mock.calls[0][3]).not.toHaveProperty('password');
});
it('keeps a created account usable if a follow-up verification email fails', async () => {
  sdk.verify.mockRejectedValueOnce(new Error('Quota')); expect(await emailSignUp({} as any, null, 'Name', 'owner@example.com', 'password')).toMatchObject({ verificationSent: false });
});
it('links a password to the current Google account instead of creating a new UID', async () => {
  const account = user(); await linkEmailPassword({ currentUser: account } as any, account.email, 'password', 'owner');
  expect(sdk.link).toHaveBeenCalledWith(account, expect.objectContaining({ email: account.email })); expect(sdk.signup).not.toHaveBeenCalled();
});
it('rejects another account or a mismatched email during linking', async () => {
  await expect(linkEmailPassword({ currentUser: user() } as any, 'other@example.com', 'password', 'owner')).rejects.toThrow();
  await expect(linkEmailPassword({ currentUser: user() } as any, 'owner@example.com', 'password', 'different')).rejects.toThrow();
  expect(sdk.link).not.toHaveBeenCalled();
});
it('changes an existing email password without creating or merging accounts', async () => {
  const account = { ...user(), providerData: [{ providerId: 'password' }] };
  await linkEmailPassword({ currentUser: account } as any, account.email, 'new-password', 'owner');
  expect(sdk.password).toHaveBeenCalledWith(account, 'new-password'); expect(sdk.link).not.toHaveBeenCalled();
});
it('resets passwords through Firebase', async () => {
  const auth = {} as any; await resetLoginPassword(auth, ' owner@example.com '); expect(sdk.reset).toHaveBeenCalledWith(auth, 'owner@example.com');
});
it('normalizes local Indian numbers and accepts international numbers', () => {
  expect(normalizeLoginPhone('98765 43210')).toBe('+919876543210'); expect(normalizeLoginPhone('+1 (650) 555-3434')).toBe('+16505553434');
  for (const value of ['1234', '', '0000000000', '+not-a-number']) expect(() => normalizeLoginPhone(value)).toThrow();
});
it('uses Firebase phone verification for sign-in and linking with the provided captcha verifier', async () => {
  const account = user(); const auth = { currentUser: account } as any; const captcha = {} as any;
  await sendPhoneCode(auth, '9876543210', captcha); expect(sdk.phone).toHaveBeenCalledWith(auth, '+919876543210', captcha);
  await sendPhoneCode(auth, '9876543210', captcha, 'owner'); expect(sdk.linkPhone).toHaveBeenCalledWith(account, '+919876543210', captcha);
  await expect(sendPhoneCode(auth, '9876543210', captcha, 'other')).rejects.toThrow();
});
it('requires a real Firebase confirmation result and a six-digit code', async () => {
  const confirmation = { confirm: vi.fn() } as any;
  await expect(confirmPhoneCode({} as any, confirmation, '123')).rejects.toThrow(); expect(confirmation.confirm).not.toHaveBeenCalled();
  await confirmPhoneCode({} as any, confirmation, '123456'); expect(confirmation.confirm).toHaveBeenCalledWith('123456');
});
it('does not reveal raw authentication error details', () => {
  expect(loginError({ code: 'auth/user-not-found', message: 'Sensitive details' })).toBe('Email or password is incorrect.');
  expect(loginError({ code: 'auth/quota-exceeded' })).toContain('email or Google');
});
