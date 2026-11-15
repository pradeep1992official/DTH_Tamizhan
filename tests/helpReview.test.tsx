import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
const harness = vi.hoisted(() => ({ states: [] as unknown[], cursor: 0, create: vi.fn() }));
vi.mock('react', async importOriginal => {
  const original = await importOriginal<typeof import('react')>();
  return { ...original, useEffect: () => {}, useRef: (value: unknown) => ({ current: value }),
    useState: (initial: unknown) => { const index = harness.cursor++; if (!(index in harness.states)) harness.states[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
      return [harness.states[index], (value: unknown) => { harness.states[index] = typeof value === 'function' ? (value as (old: unknown) => unknown)(harness.states[index]) : value; }]; } };
});
vi.mock('react-router-dom', () => ({ Link: 'a', useNavigate: () => vi.fn(), useLocation: () => ({ state: { ticketPrefill: { issueCategory: 'payment_deducted', brand: 'tata_play' } } }) }));
vi.mock('../src/lib/firebase', () => ({ auth: { currentUser: { uid: 'owner' } } }));
vi.mock('../src/lib/ticketApi', () => ({ ticketApi: harness.create }));
import { HelpPage } from '../src/components/HelpPage';
import type { UserProfile } from '../src/types';
function form(node: any): any {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'form') return node;
  for (const child of React.Children.toArray(node.props?.children)) { const found = form(child); if (found) return found; }
}
function render() { harness.cursor = 0; return form(HelpPage({ user: { uid: 'owner' } as UserProfile, currentLang: 'en', onOpenAuth: vi.fn() })); }
beforeEach(() => { harness.states = []; harness.create.mockReset(); });
it('reviews money-deducted details without creating a ticket, then submits the reviewed snapshot once', async () => {
  const original = globalThis.FormData;
  const fields = new Map([['phone', '9876543210'], ['website', ''], ['orderId', 'order-1']]);
  globalThis.FormData = class { get(key: string) { return fields.get(key) || null; } } as any;
  try {
    const event = { preventDefault: vi.fn(), currentTarget: {} };
    await render().props.onSubmit(event);
    expect(harness.create).not.toHaveBeenCalled();
    fields.set('phone', '9999999999');
    harness.create.mockResolvedValue({ ticket: { id: 'ticket-1' } });
    await render().props.onSubmit(event);
    expect(harness.create).toHaveBeenCalledTimes(1);
    expect(harness.create).toHaveBeenCalledWith('/help', expect.objectContaining({ phone: '9876543210', problem: 'payment_deducted', brand: 'tata_play', orderId: 'order-1' }));
  } finally { globalThis.FormData = original; }
});
