import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { visibleCatalog } from '../src/lib/newConnectionBrowse';
import { installationDateBounds, newConnectionOrderSchema } from '../src/lib/newConnectionOrders';
const f = vi.hoisted(() => ({ values: [] as any[], cursor: 0, effects: [] as (() => any)[], fetch: vi.fn(), load: vi.fn(), navigate: vi.fn(), openAuth: vi.fn(), google: true, search: '' }));
vi.mock('react', async original => ({ ...await original<any>(),
  useState: (initial: any) => { const index = f.cursor++; if (!(index in f.values)) f.values[index] = typeof initial === 'function' ? initial() : initial; return [f.values[index], (value: any) => { f.values[index] = typeof value === 'function' ? value(f.values[index]) : value; }]; },
  useRef: (initial: any) => { const index = f.cursor++; if (!(index in f.values)) f.values[index] = { current: initial }; return f.values[index]; },
  useEffect: (action: any) => { f.effects.push(action); },
}));
vi.mock('react-router-dom', () => ({ Link: 'a', useLocation: () => ({ search: f.search }), useNavigate: () => f.navigate }));
vi.mock('../src/lib/firebase', () => ({ auth: { currentUser: { getIdTokenResult: async () => ({ claims: { firebase: { sign_in_provider: f.google ? 'google.com' : 'password' } } }) } } }));
vi.mock('../src/lib/paymentAuth', () => ({ paymentAuthHeaders: async () => ({ Authorization: 'Bearer buyer', 'Content-Type': 'application/json' }) }));
vi.mock('../src/components/RazorpayCheckout', () => ({ loadCheckout: f.load }));
import { BookingPage } from '../src/components/NewConnection/BookingPage';
const data = seedCatalog(); const items = visibleCatalog(data); const user = { uid: 'buyer', displayName: 'Sample Customer', email: 'sample@example.com', role: 'customer' } as any;
function nodes(tree: any): any[] { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!React.isValidElement(tree)) return []; return [tree, ...nodes((tree.props as any).children)]; }
function text(tree: any): string { if (typeof tree === 'string' || typeof tree === 'number') return String(tree); if (Array.isArray(tree)) return tree.map(text).join(' '); if (!React.isValidElement(tree)) return ''; return text((tree.props as any).children); }
const render = () => { f.cursor = 0; f.effects = []; return BookingPage({ data, items, lang: 'en', user, onOpenAuth: f.openAuth }); };
const form = () => nodes(render()).find(n => n.type === 'form');
const submit = () => form().props.onSubmit({ preventDefault() {} });
function fill(labelText: string, value: string) { const label = nodes(render()).find(n => n.type === 'label' && text(n).startsWith(labelText)); const input = nodes(label).find(n => ['input', 'select', 'textarea'].includes(n.type)); input.props.onChange({ target: { value } }); }
function accept() { const boxes = nodes(render()).filter(n => n.type === 'input' && n.props.type === 'checkbox'); boxes.forEach(box => box.props.onChange({ target: { checked: true } })); }
beforeEach(() => {
  vi.clearAllMocks(); f.values = []; f.google = true; f.search = `?brand=${items[0].brand.id}&pack=${items[0].pack.id}&validity=30`;
  vi.stubGlobal('fetch', f.fetch); vi.stubGlobal('sessionStorage', { getItem: () => null, setItem() {}, removeItem() {} });
  f.fetch.mockImplementation(async (url: string, options: any) => {
    if (url.endsWith('/config')) return { ok: true, json: async () => ({ success: true, enabledProviders: [], settings: data.settings }) };
    const payload = JSON.parse(options.body); const at = new Date().toISOString();
    const order = newConnectionOrderSchema.parse({ ...payload.displayedQuote, id: `nc_${'a'.repeat(48)}`, bookingId: 'DTH-NC-261116-0001', uid: 'buyer', brandId: payload.brandId, packId: payload.packId, offerId: payload.offerId, selectedValidityDays: payload.selectedValidityDays, connectionCount: payload.connectionCount, customer: payload.customer, snapshot: { brand: items[0].brand.name, pack: items[0].pack.name, offer: data.equipment[0].name }, provider: 'none', providerOrderId: '', providerPaymentId: '', providerRaw: {}, paymentStatus: 'pending', status: 'received', statusHistory: [{ status: 'received', at, by: 'buyer', note: '' }], consent: { terms: true, contact: true, at }, createdAt: at, updatedAt: at, testMode: false });
    return { ok: true, json: async () => ({ success: true, order, checkout: null }) };
  });
});
afterEach(() => vi.unstubAllGlobals());
async function toReview() {
  render(); f.effects.forEach(effect => effect()); await new Promise(resolve => setTimeout(resolve, 0));
  await submit(); fill('Mobile number', '9876543210'); fill('Full installation address', '12 Sample Road, Chennai'); fill('Pincode', '600001'); fill('District', 'Chennai'); fill('Preferred installation date', installationDateBounds().min); await submit();
}
it('completes all three none-mode steps without opening a payment gateway, and blocks double submit', async () => {
  await toReview(); expect(text(render())).toContain('Confirm booking'); accept(); const ready = form(); await Promise.all([ready.props.onSubmit({ preventDefault() {} }), ready.props.onSubmit({ preventDefault() {} })]);
  const creates = f.fetch.mock.calls.filter(([url]) => String(url).endsWith('/orders')); expect(creates).toHaveLength(1);
  expect(JSON.parse(creates[0][1].body)).toMatchObject({ provider: 'none', displayedQuote: { amountDueNow: 0 }, consent: { terms: true, contact: true } });
  expect(text(render())).toContain('Booking received'); expect(text(render())).toContain('No online payment was taken.'); expect(text(render())).not.toContain('Payment verified'); expect(f.load).not.toHaveBeenCalled();
});
it('requires fresh explicit consent after a server price-change response', async () => {
  await toReview(); accept(); const old = f.fetch.getMockImplementation()!;
  f.fetch.mockImplementation(async (url, options) => { if (String(url).endsWith('/orders')) { const payload = JSON.parse(options.body); const quote = structuredClone(payload.displayedQuote); quote.priceBreakdown.installation += 10; quote.priceBreakdown.perConnectionTotal += 10; quote.priceBreakdown.total += 10; quote.balanceAtInstallation += 10; return { ok: false, json: async () => ({ code: 'PRICE_CHANGED', quote }) }; } return old(url, options); });
  await submit(); expect(text(render())).toContain('Price updated');
  const boxes = nodes(render()).filter(n => n.type === 'input' && n.props.type === 'checkbox'); expect(boxes.every(box => box.props.checked === false)).toBe(true);
  const button = nodes(render()).find(n => n.type === 'button' && n.props.type === 'submit'); expect(button.props.disabled).toBe(true); expect(f.load).not.toHaveBeenCalled();
});
it('requires Google sign-in at confirmation and preserves the form when another provider is signed in', async () => {
  await toReview(); accept(); f.google = false; await submit(); expect(f.openAuth).toHaveBeenCalledOnce(); expect(f.fetch.mock.calls.some(([url]) => String(url).endsWith('/orders'))).toBe(false); expect(text(render())).toContain('Please sign in with Google');
});
