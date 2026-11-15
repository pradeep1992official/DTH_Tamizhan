import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ state: [] as any[], cursor: 0 }));
vi.mock('react', async original => ({ ...await original<any>(),
  useState: (initial: any) => { const i = h.cursor++; if (!(i in h.state)) h.state[i] = typeof initial === 'function' ? initial() : initial;
    return [h.state[i], (value: any) => { h.state[i] = typeof value === 'function' ? value(h.state[i]) : value; }]; },
  useRef: (value: any) => ({ current: value }), useEffect: () => {}, useId: () => 'pack-fixture',
}));
vi.mock('../src/lib/firebase', () => ({ auth: null, db: null, isFirebaseConfigured: false }));
vi.mock('../src/lib/useAccessibleModal', () => ({ useAccessibleModal: () => ({ modalRef: { current: null } }) }));
import { PacksTab } from '../src/components/Admin/tabs/PacksTab';
import { RechargesTab } from '../src/components/Admin/tabs/RechargesTab';
import { RechargeFlow } from '../src/components/RechargeFlow';
import { PlanSuggestions } from '../src/components/BrowsePlans/PlanSuggestions';
import { OperatorCatalogNotice } from '../src/components/OperatorCatalogNotice';
import { getOperatorTheme } from '../src/lib/theme';
import { authModalCopy } from '../src/lib/authModalCopy';
import { operatorCatalogMessage } from '../src/lib/catalogAvailability';
function nodes(tree: any): any[] { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!React.isValidElement(tree)) return []; return [tree, ...nodes((tree.props as any).children)]; }
function text(tree: any): string { if (Array.isArray(tree)) return tree.map(text).join(''); if (React.isValidElement(tree)) return text((tree.props as any).children); return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }
const render = (component: any, props: any) => { h.cursor = 0; return component(props); };
const theme = getOperatorTheme('dish_tv');
beforeEach(() => { h.state = []; vi.unstubAllGlobals(); });
it('associates pack editor fields and channel entry with real labels', () => {
  const props = { plans: [], plansLoading: false, plansError: null, onRefresh: vi.fn(), user: { uid: 'admin' }, currentTheme: theme, currentLang: 'en', showToast: vi.fn(), onPlansUpdated: vi.fn() };
  const first = render(PacksTab, props);
  nodes(first).find(node => node.type === 'button' && text(node).includes('Add New Pack')).props.onClick();
  const tree = render(PacksTab, props); const labels = nodes(tree).filter(node => node.type === 'label');
  for (const name of ['DTH Operator', 'Quality Type', 'Pack Name', 'Amount (Rs.)', 'Channel Highlights']) {
    const label = labels.find(node => text(node) === name);
    expect(label?.props.htmlFor).toBeTruthy();
    expect(nodes(tree).filter(node => ['input', 'select'].includes(node.type) && node.props.id === label.props.htmlFor)).toHaveLength(1);
  }
  expect(nodes(tree).find(node => node.props.role === 'group')?.props['aria-labelledby']).toBeTruthy();
});
it('names recharge history search and filter controls independently of placeholders', () => {
  const tree = render(RechargesTab, { orders: [], ordersLoading: false, ordersError: null, onRefresh: vi.fn(), currentTheme: theme, currentLang: 'en' });
  const controls = nodes(tree).filter(node => node.type === 'select' || node.type === 'input');
  expect(controls).toHaveLength(3);
  for (const control of controls) expect(control.props['aria-label']).toBeTruthy();
});
it('uses custom top-up with no stale HD duration when the selected operator has no catalogue', () => {
  h.state[2] = [{ id: 'dish_tv', name: 'Dish TV' }]; h.state[5] = []; h.state[6] = false;
  const tree = render(RechargeFlow, { selectedOpId: 'dish_tv', onSelectOpId: vi.fn(), currentTheme: theme, currentLang: 'en', user: null, onInitiatePayment: vi.fn() });
  expect(text(tree)).not.toContain('HD pack');
  expect(text(tree)).not.toContain('6 months');
  expect(nodes(tree).some(node => node.props.id === 'recommended-hd-card')).toBe(false);
  expect(nodes(tree).some(node => node.props.id === 'recommended-sd-card')).toBe(false);
  expect(nodes(tree).some(node => node.props.id === 'custom-recharge-card')).toBe(true);
});
it('offers an operator-aware top-up instead of making an AI request for a missing catalogue', async () => {
  h.state[0] = true; h.state[2] = 'dish_tv'; const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const tree = render(PlanSuggestions, { catalogOperators: ['sun_direct'], user: { uid: 'owner' }, currentLang: 'en', onOpenAuth: vi.fn(), onSelect: vi.fn() });
  expect(nodes(tree).find(node => node.type === OperatorCatalogNotice)?.props.operator).toBe('dish_tv');
  await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  expect(fetcher).not.toHaveBeenCalled(); expect(text(tree)).not.toContain('Try a higher budget');
});
it('uses task-specific authentication headings for signup and password reset', () => {
  expect(authModalCopy('signup', 'email', false, false, 'en').title).toBe('Create your DTH Tamizhan account');
  expect(authModalCopy('reset', 'email', false, false, 'en').title).toBe('Reset your password');
  expect(authModalCopy('signup', 'email', false, false, 'ta').title).not.toMatch(/Sign in|Create/);
});
it('keeps Dish TV and D2H separate in translated catalogue notices', () => {
  expect(operatorCatalogMessage('dish_tv', 'en')).toContain('Dish TV packs');
  expect(operatorCatalogMessage('dish_tv', 'ta')).not.toContain('and D2H');
  expect(operatorCatalogMessage('d2h', 'ta')).toContain('D2H');
});
