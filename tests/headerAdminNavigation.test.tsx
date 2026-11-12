import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const harness = vi.hoisted(() => ({ values: [] as any[], index: 0, effects: [] as (() => any)[], verify: vi.fn() }));
vi.mock('react', async original => ({ ...(await original<any>()),
  useState: (initial: any) => {
    const index = harness.index++;
    if (!(index in harness.values)) harness.values[index] = initial;
    return [harness.values[index], (value: any) => { harness.values[index] = typeof value === 'function' ? value(harness.values[index]) : value; }];
  },
  useRef: (initial: any) => ({ current: initial }),
  useEffect: (action: any) => { harness.effects.push(action); },
}));
vi.mock('../src/lib/useAccessibleModal', () => ({ useAccessibleModal: () => ({ modalRef: { current: null } }) }));
vi.mock('../src/lib/adminNavigationAccess', () => ({ verifyAdminNavigationAccess: harness.verify }));
import { Header } from '../src/components/Header';
let props: any;
const render = () => { harness.index = 0; harness.effects = []; return Header(props); };
function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  return [tree, ...nodes((tree.props as any).children)];
}
const find = (id: string) => nodes(render()).find(node => node.props.id === id);
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
async function open() {
  find('profile-dropdown-trigger-btn').props.onClick();
  render(); const cleanups = harness.effects.map(effect => effect()); await flush();
  return cleanups;
}
beforeEach(() => {
  harness.values = []; harness.verify.mockReset(); harness.verify.mockResolvedValue(true);
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn(), getElementById: vi.fn() });
  props = { currentLang: 'en', user: { uid: 'delegate', email: 'new@example.com', role: 'customer' }, currentTheme: { isLightMode: true },
    onTabChange: vi.fn(), onOpenAuth: vi.fn(), onSignOut: vi.fn(), onLanguageChange: vi.fn(), onUpdateProfile: vi.fn(), activeTab: 'recharge' };
});
describe('approved administrator account dropdown', () => {
  it('shows Admin Panel to a server-approved delegate and navigates through the router callback', async () => {
    expect(find('dropdown-admin-portal-btn')).toBeUndefined();
    await open();
    const button = find('dropdown-admin-portal-btn');
    expect(button).toBeDefined();
    button.props.onClick();
    expect(props.onTabChange).toHaveBeenCalledWith('admin-portal');
  });
  it('does not trust a forged cached administrator role', async () => {
    props.user.role = 'admin'; harness.verify.mockResolvedValue(false);
    await open();
    expect(find('dropdown-admin-portal-btn')).toBeUndefined();
  });
  it('rechecks when the dropdown is reopened after approval changes', async () => {
    harness.verify.mockResolvedValue(false); let cleanup = await open();
    expect(find('dropdown-admin-portal-btn')).toBeUndefined();
    cleanup.forEach(fn => fn?.()); find('profile-dropdown-trigger-btn').props.onClick();
    render(); harness.effects.forEach(effect => effect());
    harness.verify.mockResolvedValue(true); await open();
    expect(find('dropdown-admin-portal-btn')).toBeDefined();
    expect(harness.verify).toHaveBeenCalledTimes(2);
  });
  it('offers a retry on server failure and ignores a response after closing', async () => {
    harness.verify.mockRejectedValue(new Error('offline'));
    await open();
    expect(nodes(render()).some(node => node.props.role === 'alert')).toBe(true);
    expect(find('dropdown-admin-portal-btn')).toBeUndefined();
    let finish!: (value: boolean) => void;
    harness.verify.mockImplementation(() => new Promise<boolean>(resolve => { finish = resolve; }));
    render(); const cleanups = harness.effects.map(effect => effect());
    cleanups.forEach(fn => fn?.()); finish(true); await flush();
    expect(find('dropdown-admin-portal-btn')).toBeUndefined();
  });
});
