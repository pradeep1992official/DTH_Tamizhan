import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ values: [] as any[], cursor: 0, effects: [] as (() => any)[], auth: { currentUser: { uid: 'owner' } as { uid: string } | null }, fetch: vi.fn(), tickets: vi.fn() }));
vi.mock('react', async original => ({ ...await original<any>(), useState: (initial: any) => { const index = f.cursor++; if (!(index in f.values)) f.values[index] = initial; return [f.values[index], (next: any) => { f.values[index] = next; }]; }, useEffect: (effect: any) => f.effects.push(effect) }));
vi.mock('../src/lib/firebase', () => ({ auth: f.auth }));
vi.mock('../src/lib/paymentAuth', () => ({ paymentAuthHeaders: async () => ({ Authorization: 'Bearer fixture' }) }));
vi.mock('../src/lib/ticketApi', () => ({ ticketApi: f.tickets }));
vi.mock('../src/lib/newConnectionPublicCatalog', () => ({ loadPublicCatalog: async () => null }));
import { LaunchHome } from '../src/components/NewConnection/LaunchHome';
function render(user: any = { uid: 'owner' }) { f.cursor = 0; f.effects = []; return LaunchHome({ user, currentLang: 'en', recharge: false }); }
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
beforeEach(() => { f.values = []; f.auth.currentUser = { uid: 'owner' }; vi.clearAllMocks(); vi.stubGlobal('fetch', f.fetch); });
it('finds an open booking and request beyond closed first pages using owner-only reads', async () => {
  f.fetch.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('cursor=') ? { orders: [{ uid: 'another-owner', id: 'private', status: 'booked' }, { uid: 'owner', id: 'book-1', status: 'booked' }] } : { orders: [{ uid: 'owner', id: 'closed', status: 'installed' }], nextCursor: 'next' } }));
  f.tickets.mockResolvedValueOnce({ tickets: [{ uid: 'owner', id: 'closed-ticket', status: 'closed' }], nextCursor: 'next-ticket' }).mockResolvedValueOnce({ tickets: [{ uid: 'owner', id: 'ticket-1', status: 'in_progress' }] });
  render(); f.effects.forEach(effect => effect()); await flush();
  const view = render();
  expect(view.props.openBooking).toEqual({ id: 'book-1', status: 'booked' });
  expect(view.props.openService).toEqual({ id: 'ticket-1', status: 'in_progress' });
  expect(f.fetch).toHaveBeenCalledWith('/api/new-connection/orders?cursor=next', expect.objectContaining({ cache: 'no-store' }));
  expect(f.tickets).toHaveBeenCalledWith('?limit=25&cursor=next-ticket');
});
it('hides cached updates immediately when the active account changes or signs out', () => {
  render(); f.values[1] = { uid: 'owner', booking: { id: 'private-booking', status: 'booked' } };
  expect(render({ uid: 'other' }).props.openBooking).toBeUndefined();
  expect(render(null).props.openBooking).toBeUndefined();
});
it('ignores in-flight responses after sign-out', async () => {
  let finish!: (value: unknown) => void;
  f.fetch.mockReturnValue(new Promise(resolve => { finish = resolve; })); f.tickets.mockResolvedValue({ tickets: [] });
  render(); const cleanup = f.effects.map(effect => effect()); await flush();
  f.auth.currentUser = null; cleanup.forEach(fn => fn?.());
  finish({ ok: true, json: async () => ({ orders: [{ uid: 'owner', id: 'private', status: 'booked' }] }) }); await flush();
  expect(render(null).props.openBooking).toBeUndefined();
});
