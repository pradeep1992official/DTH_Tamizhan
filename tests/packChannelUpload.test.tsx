import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ state: [] as any[], cursor: 0, save: vi.fn(), token: vi.fn(), auth: { currentUser: null as any } }));
vi.mock('react', async original => ({ ...await original<any>(), useState: (initial: any) => {
  const i = f.cursor++; if (!(i in f.state)) f.state[i] = typeof initial === 'function' ? initial() : initial;
  return [f.state[i], (value: any) => { f.state[i] = typeof value === 'function' ? value(f.state[i]) : value; }];
}, useRef: () => ({ current: null }), useEffect: () => {}, useId: () => 'pack-upload' }));
vi.mock('../src/lib/firebase', () => ({ auth: f.auth }));
vi.mock('../src/lib/planCatalogService', () => ({ INITIAL_PLAN_CATALOG: [], PlanCatalogService: { savePlan: f.save } }));
vi.mock('../src/lib/useAccessibleModal', () => ({ useAccessibleModal: () => ({ modalRef: { current: null } }) }));
import { PacksTab } from '../src/components/Admin/tabs/PacksTab';
import { getOperatorTheme } from '../src/lib/theme';
const pack = { id: 'pack', operator: 'airtel_dth', pack_type: 'HD', duration_months: 1, plan_name: 'Tamil Plus HD', tamilName: 'தமிழ் பிளஸ்',
  amount: 309, is_recommended: false, channel_counts_unavailable: true, channel_list: [], channel_list_url: '/channel-flyers/old.pdf' };
const toast = vi.fn();
const props = { plans: [pack] as any[], plansLoading: false, onRefresh: vi.fn(), user: { uid: 'admin' } as any,
  currentTheme: getOperatorTheme('airtel_dth'), currentLang: 'en' as const, showToast: toast, onPlansUpdated: vi.fn() };
const nodes = (tree: any): any[] => Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes((tree.props as any).children)] : [];
function render() { f.cursor = 0; return nodes(PacksTab(props)); }
function open() {
  const tree = render(); tree.find(node => node.type === 'button' && node.props['aria-label'] === `Edit ${pack.plan_name}`).props.onClick(); return render();
}
beforeEach(() => {
  f.state = []; vi.clearAllMocks(); f.token.mockResolvedValue('admin-token'); f.auth.currentUser = { uid: 'admin', getIdToken: f.token };
  f.save.mockImplementation(async value => value);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, url: 'https://files.example.com/list.pdf' }))));
  vi.stubGlobal('FileReader', class {
    result = 'data:application/pdf;base64,JVBERi0xLjc='; onload?: () => void;
    readAsDataURL() { this.onload?.(); }
  });
});
afterEach(() => vi.unstubAllGlobals());
it('preserves and saves an existing channel-list link and unrelated pack details', async () => {
  let tree = open();
  expect(tree.find(node => node.props.id === 'pack-upload-channel-url').props.value).toBe('/channel-flyers/old.pdf');
  tree.find(node => node.props.id === 'pack-upload-channel-url').props.onChange({ target: { value: '/channel-flyers/new.pdf' } });
  tree = render(); await tree.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ channel_list_url: '/channel-flyers/new.pdf', tamilName: 'தமிழ் பிளஸ்', amount: 309 }), 'admin');
});
it('uploads first and only attaches the returned file URL when the admin saves', async () => {
  const tree = open();
  tree.find(node => node.props.id === 'pack-upload-channel-file').props.onChange({ target: { files: [{ name: 'Airtel-channel-list.pdf', type: 'application/pdf', size: 100 }], value: 'file.pdf' } });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(fetch).toHaveBeenCalledWith('/api/admin/catalog/channel-list', expect.objectContaining({ headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' } }));
  expect(f.save).not.toHaveBeenCalled();
  const updated = render(); expect(updated.find(node => node.props.id === 'pack-upload-channel-url').props.value).toBe('https://files.example.com/list.pdf');
  expect(updated.find(node => node.type === 'p' && node.props.children === 'Airtel-channel-list.pdf')).toBeDefined();
  expect(updated.find(node => node.type === 'a' && node.props.href === 'https://files.example.com/list.pdf')).toBeDefined();
  await updated.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ channel_list_url: 'https://files.example.com/list.pdf' }), 'admin');
});
it('rejects oversized files without calling the server', async () => {
  open().find(node => node.props.id === 'pack-upload-channel-file').props.onChange({ target: { files: [{ type: 'application/pdf', size: 6 * 1024 * 1024 }], value: 'file.pdf' } });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(fetch).not.toHaveBeenCalled(); expect(f.save).not.toHaveBeenCalled(); expect(toast).toHaveBeenCalledWith(expect.stringContaining('5 MB'));
});
it('does not upload or attach a file if the account changes during token retrieval', async () => {
  f.token.mockImplementation(async () => { f.auth.currentUser = { uid: 'other' }; return 'old-token'; });
  open().find(node => node.props.id === 'pack-upload-channel-file').props.onChange({ target: { files: [{ type: 'application/pdf', size: 100 }], value: 'file.pdf' } });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(fetch).not.toHaveBeenCalled(); expect(render().find(node => node.props.id === 'pack-upload-channel-url').props.value).toBe('/channel-flyers/old.pdf');
});
it('keeps manual links collapsed and the file picker accessible', () => {
  const tree = open();
  const manual = tree.find(node => node.type === 'details' && nodes(node).some(child => child.props.id === 'pack-upload-channel-url'));
  expect(manual.props.open).not.toBe(true);
  expect(tree.find(node => node.props.id === 'pack-upload-channel-file').props['aria-label']).toBe('Replace channel-list file');
  expect(tree.find(node => node.props.id === 'pack-upload-channel-file').props['aria-describedby']).toBeTruthy();
});
it('removes the attachment from the form and waits for Save before changing the pack', async () => {
  const tree = open();
  tree.find(node => node.type === 'button' && node.props.children === 'Remove').props.onClick();
  expect(f.save).not.toHaveBeenCalled();
  const cleared = render();
  expect(cleared.find(node => node.props.id === 'pack-upload-channel-url').props.value).toBe('');
  expect(cleared.find(node => node.props.id === 'pack-upload-channel-file').props['aria-label']).toBe('Upload channel-list file');
  await cleared.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ channel_list_url: '' }), 'admin');
});
it('shows upload failures inline and preserves the previously attached file', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'Please try again.' }), { status: 503 }));
  open().find(node => node.props.id === 'pack-upload-channel-file').props.onChange({ target: { files: [{ name: 'new.pdf', type: 'application/pdf', size: 100 }], value: 'file.pdf' } });
  await new Promise(resolve => setTimeout(resolve, 0));
  const failed = render();
  expect(failed.find(node => node.props.role === 'alert').props.children).toBe('Please try again.');
  expect(failed.find(node => node.props.id === 'pack-upload-channel-url').props.value).toBe('/channel-flyers/old.pdf');
});
