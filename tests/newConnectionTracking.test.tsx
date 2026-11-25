import { ProviderBookingDetails } from '../src/components/NewConnection/ProviderBookingDetails';
import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { NewConnectionOrder } from '../src/lib/newConnectionOrders';
import { pageMetadata } from '../src/lib/pageMetadata';
const f = vi.hoisted(() => ({ values: [] as any[], cursor: 0, fetch: vi.fn(), auth: vi.fn() }));
vi.mock('react', async original => ({ ...await original<any>(), useState: (initial: any) => { const i = f.cursor++; if (!(i in f.values)) f.values[i] = typeof initial === 'function' ? initial() : initial; return [f.values[i], (v: any) => { f.values[i] = typeof v === 'function' ? v(f.values[i]) : v; }]; }, useRef: (initial: any) => { const i = f.cursor++; if (!(i in f.values)) f.values[i] = { current: initial }; return f.values[i]; }, useEffect: () => {} }));
vi.mock('react-router-dom', () => ({ Link: 'a', useLocation: () => ({ search: '' }) }));
vi.mock('../src/lib/paymentAuth', () => ({ paymentAuthHeaders: async () => ({ Authorization: 'Bearer buyer' }) }));
import { MyBookings } from '../src/components/NewConnection/MyBookings';
const user = { uid: 'buyer' } as any;
function nodes(tree: any): any[] { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!React.isValidElement(tree)) return []; return [tree, ...nodes((tree.props as any).children)]; }
function text(tree: any): string { if (typeof tree === 'string' || typeof tree === 'number') return String(tree); if (Array.isArray(tree)) return tree.map(text).join(' '); if (!React.isValidElement(tree)) return ''; return text((tree.props as any).children); }
function render(lang: 'en' | 'ta' = 'en', account = user) { f.cursor = 0; return MyBookings({ user: account, lang, onOpenAuth: f.auth }); }
function order(patch: Partial<NewConnectionOrder> = {}): NewConnectionOrder { return { id: 'nc_' + 'a'.repeat(48), bookingId: 'DTH-NC-261116-0001', uid: 'buyer', snapshot: { brand: 'Brand', pack: 'Pack', offer: 'Box' }, customer: { district: 'Chennai', pincode: '600001' }, priceBreakdown: { total: 1000 }, amountPaid: 200, balance: 800, amountRefunded: 0, status: 'received', paymentStatus: 'pending', amountDueNow: 0, providerPaymentId: '', statusHistory: [{ status: 'contacted', at: '2026-11-16T10:00:00Z', by: 'approved-admin', note: 'PUBLIC MESSAGE' }], cancellationRequest: null, schedule: null, createdAt: '2026-11-16T10:00:00Z', ...patch } as NewConnectionOrder; }
beforeEach(() => { f.values = []; f.cursor = 0; vi.clearAllMocks(); vi.stubGlobal('fetch', f.fetch); f.fetch.mockResolvedValue({ ok: true, json: async () => ({ orders: [order({ cancellationRequest: { at: '2026-11-16T10:00:00Z', customerReason: 'Changed plan', status: 'open' } })], nextCursor: null }) }); });
it('registers both routes and marks account bookings private to search engines', () => {
  expect(pageMetadata('/admin/new-connections')).toMatchObject({ status: 200, noindex: true }); expect(pageMetadata('/account/bookings')).toMatchObject({ status: 200, noindex: true }); expect(pageMetadata('/account/bookings', 'ta').title).toContain('எனது பதிவுகள்');
});
it('provides sign-in, empty, loading and localized error states', () => {
  const guest = render('en', null); expect(text(guest)).toContain('Sign in'); nodes(guest).find(n => n.type === 'button').props.onClick(); expect(f.auth).toHaveBeenCalled();
  expect(text(render())).toContain('No bookings yet'); f.values[1] = true; expect(text(render())).toContain('Loading bookings'); f.values[1] = false; f.values[2] = 'பதிவுகளை ஏற்ற முடியவில்லை'; expect(text(render('ta'))).toContain('பதிவுகளை ஏற்ற முடியவில்லை');
});
it('shows public timeline, partial amounts and the existing receipt link in both languages', () => {
  render(); f.values[0] = [order()]; const en = render(); expect(text(en)).toContain('Partially paid'); expect(text(en)).toContain('PUBLIC MESSAGE'); expect(text(en)).toContain('800'); const receipt = nodes(en).find(n => n.type === 'a' && n.props.to?.startsWith('/new-connection/book?order=')); expect(receipt).toBeTruthy(); expect(text(render('ta'))).toContain('பகுதியளவு செலுத்தப்பட்டது');
});
it('offers cancellation only before scheduling, submits owner-authenticated requests and shows review status', async () => {
  render(); f.values[0] = [order()]; const button = nodes(render()).find(n => n.type === 'button' && text(n) === 'Request cancellation'); button.props.onClick(); f.values[7] = 'Changed plan'; const form = nodes(render()).find(n => n.type === 'form'); await form.props.onSubmit({ preventDefault() {} });
  expect(f.fetch).toHaveBeenCalledWith(expect.stringContaining('/cancellation'), expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer buyer' }, body: JSON.stringify({ customerReason: 'Changed plan' }) })); expect(text(render())).toContain('Cancellation requested'); expect(nodes(render()).some(n => n.type === 'button' && text(n) === 'Request cancellation')).toBe(false);
  f.values[0] = [order({ status: 'scheduled' })]; expect(nodes(render()).some(n => n.type === 'button' && text(n) === 'Request cancellation')).toBe(false);
});

it('shows the saved provider references with clear labels and hides the section until added', () => {
  expect(ProviderBookingDetails({ order: order(), lang: 'en' })).toBeNull();
  const details = ProviderBookingDetails({ order: order({ providerCustomerId: 'CUST-001', providerBookingId: 'PROV-123' }), lang: 'en' });
  expect(text(details)).toContain('Provider customer ID CUST-001');
  expect(text(details)).toContain('Provider booking ID PROV-123');
  render(); f.values[0] = [order({ providerCustomerId: 'CUST-001', providerBookingId: 'PROV-123' })];
  expect(nodes(render()).some(node => node.type === ProviderBookingDetails && node.props.order.providerCustomerId === 'CUST-001')).toBe(true);
});
