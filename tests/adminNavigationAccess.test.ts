import { beforeEach, describe, expect, it, vi } from 'vitest';
const session = vi.hoisted(() => ({ current: null as any, ready: vi.fn() }));
vi.mock('../src/lib/firebase', () => ({ auth: { get currentUser() { return session.current; }, authStateReady: session.ready } }));
import { verifyAdminNavigationAccess } from '../src/lib/adminNavigationAccess';
beforeEach(() => {
  vi.unstubAllGlobals(); session.ready.mockReset(); session.ready.mockResolvedValue(undefined);
  session.current = { uid: 'delegate', getIdToken: vi.fn(async () => 'signed-token') };
});
const approved = { success: true, authenticated: true, uid: 'delegate', isApprovedAdmin: true };
describe('server-backed admin navigation', () => {
  it('recognizes an approved delegate using its Firebase token and server verdict', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(approved)));
    vi.stubGlobal('fetch', fetcher);
    expect(await verifyAdminNavigationAccess('delegate')).toBe(true);
    expect(fetcher).toHaveBeenCalledWith('/api/admin/verify-token', expect.objectContaining({ headers: { Accept: 'application/json', Authorization: 'Bearer signed-token' } }));
  });
  it.each([
    { ...approved, isApprovedAdmin: false }, { ...approved, uid: 'someone-else' },
    { ...approved, authenticated: false }, { ...approved, success: false },
  ])('rejects an unapproved or mismatched response: %j', async body => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body))));
    expect(await verifyAdminNavigationAccess('delegate')).toBe(false);
  });
  it.each([null, { uid: 'other-account' }])('does not fetch for a logged-out or mismatched session', async current => {
    session.current = current; const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect(await verifyAdminNavigationAccess('delegate')).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('waits for Firebase restoration before checking access', async () => {
    let restore!: () => void;
    session.current = null;
    session.ready.mockImplementation(() => new Promise<void>(resolve => { restore = resolve; }));
    const fetcher = vi.fn(async () => new Response(JSON.stringify(approved))); vi.stubGlobal('fetch', fetcher);
    const pending = verifyAdminNavigationAccess('delegate');
    expect(fetcher).not.toHaveBeenCalled();
    session.current = { uid: 'delegate', getIdToken: async () => 'restored-token' }; restore();
    expect(await pending).toBe(true);
  });
  it('ignores a successful old-user response after sign-out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { session.current = null; return new Response(JSON.stringify(approved)); }));
    expect(await verifyAdminNavigationAccess('delegate')).toBe(false);
  });
  it('reports unavailable server verification instead of granting navigation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    await expect(verifyAdminNavigationAccess('delegate')).rejects.toThrow('could not be verified');
  });
});
