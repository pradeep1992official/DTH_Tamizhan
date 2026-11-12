import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ values: [] as any[], refs: [] as any[], index: 0, refIndex: 0 }));
vi.mock('react', async original => ({ ...(await original<any>()),
  useState: (initial: any) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: any) => { state.values[index] = value; }];
  },
  useRef: (initial: any) => { const index = state.refIndex++; return state.refs[index] ||= { current: initial }; },
}));
vi.mock('../src/lib/useAccessibleModal', () => ({ useAccessibleModal: () => ({ modalRef: { current: null } }) }));
import { ApprovalsTab } from '../src/components/Admin/tabs/ApprovalsTab';
const admin = { uid: 'listed-uid', email: 'delegate@example.com', status: 'approved', role: 'admin' } as any;
let props: any;
const render = () => { state.index = 0; state.refIndex = 0; return ApprovalsTab(props); };
function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  return [tree, ...nodes((tree.props as any).children)];
}
function text(tree: any): string {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (React.isValidElement(tree)) return text((tree.props as any).children);
  return typeof tree === 'string' ? tree : '';
}
const confirm = (tree: any) => nodes(tree).find(node => node.type === 'button' && text(node) === 'Revoke Access');
function open() {
  nodes(render()).find(node => node.props['aria-label'] === 'Revoke Access: delegate@example.com').props.onClick();
  return render();
}
beforeEach(() => {
  vi.unstubAllGlobals(); state.values = []; state.refs = [];
  props = { approvedAdmins: [admin], pendingRequests: [], accessLoading: false, currentTheme: { isLightMode: true }, currentLang: 'en',
    user: { email: 'professorpradeeps@gmail.com' }, onRefresh: vi.fn(), showToast: vi.fn(), getAuthHeaders: vi.fn(async () => ({ Authorization: 'Bearer fixture' })) };
});
describe('administrator grant form', () => {
  const form = () => nodes(render()).find(node => node.type === 'form');
  const prepare = () => {
    vi.stubGlobal('window', { confirm: vi.fn(() => true) });
    nodes(render()).find(node => node.type === 'input' && node.props.type === 'email').props.onChange({ target: { value: 'new@example.com' } });
  };
  it('shows registration guidance and keeps the email for retry after a missing-account error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 'ADMIN_ACCOUNT_NOT_REGISTERED', error: 'Ask the person to sign in with Google once.' }), { status: 404 })));
    prepare();
    expect(text(render())).toContain('must sign in to this app with Google once');
    await form().props.onSubmit({ preventDefault() {} });
    expect(text(nodes(render()).find(node => node.props.role === 'alert'))).toContain('sign in with Google once');
    expect(nodes(render()).find(node => node.type === 'input' && node.props.type === 'email').props.value).toBe('new@example.com');
    expect(props.onRefresh).not.toHaveBeenCalled();
  });
  it('localizes the missing-account error when Tamil is selected', async () => {
    props.currentLang = 'ta';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 'ADMIN_ACCOUNT_NOT_REGISTERED', error: 'English server message' }), { status: 404 })));
    prepare(); await form().props.onSubmit({ preventDefault() {} });
    expect(text(nodes(render()).find(node => node.props.role === 'alert'))).toContain('பதிவு செய்யப்படவில்லை');
    expect(text(nodes(render()).find(node => node.props.role === 'alert'))).not.toContain('English server message');
  });
  it('does not claim success for a non-JSON response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Unavailable</html>', { status: 503 })));
    prepare(); await form().props.onSubmit({ preventDefault() {} });
    expect(text(nodes(render()).find(node => node.props.role === 'alert'))).toContain('HTTP 503');
    expect(props.showToast).not.toHaveBeenCalled();
  });
  it('clears the email and refreshes only after an affirmative success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true }))));
    prepare(); await form().props.onSubmit({ preventDefault() {} });
    expect(nodes(render()).find(node => node.type === 'input' && node.props.type === 'email').props.value).toBe('');
    expect(props.onRefresh).toHaveBeenCalledOnce();
  });
});
describe('revocation dialog', () => {
  it('sends the listed UID and email, closing only after confirmed success', async () => {
    const fetcher = vi.fn(async (_url: string, _options: RequestInit) => new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const tree = open();
    expect(text(tree)).toContain('The user account and data are kept.');
    await confirm(tree).props.onClick();
    expect(JSON.parse(fetcher.mock.calls[0][1].body as string)).toEqual({ uid: 'listed-uid', userEmail: 'delegate@example.com' });
    expect(nodes(render()).some(node => node.props.role === 'dialog')).toBe(false);
    expect(props.onRefresh).toHaveBeenCalledOnce();
  });
  it('keeps the dialog open and displays the server failure beside retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Administrator details changed. Refresh the admin list.' }), { status: 409 })));
    await confirm(open()).props.onClick();
    expect(nodes(render()).find(node => node.props.role === 'alert').props.children).toContain('Administrator details changed');
    expect(confirm(render())).toBeDefined();
    expect(props.onRefresh).not.toHaveBeenCalled();
  });
  it('blocks double clicks while awaiting the server', async () => {
    let finish!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', fetcher);
    const button = confirm(open());
    const first = button.props.onClick();
    await button.props.onClick();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(nodes(render()).find(node => node.type === 'button' && text(node) === 'Revoking…').props.disabled).toBe(true);
    finish(new Response(JSON.stringify({ success: true })));
    await first;
  });
  it('handles a non-JSON server response without closing or claiming success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Unavailable</html>', { status: 503 })));
    await confirm(open()).props.onClick();
    expect(text(nodes(render()).find(node => node.props.role === 'alert'))).toContain('HTTP 503');
    expect(props.showToast).not.toHaveBeenCalled();
  });
});
