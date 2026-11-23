import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { visibleCatalog } from '../src/lib/newConnectionBrowse';
import { installationDateBounds, newConnectionOrderSchema, TN_DISTRICTS } from '../src/lib/newConnectionOrders';
import { PackageInclusions } from '../src/components/NewConnection/PackageInclusions';
import { PackChips, PackQualityChip } from '../src/components/NewConnection/PackChips';
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
function nodes(tree: any): any[] { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!React.isValidElement(tree)) return []; return [tree, ...nodes(tree.type === PackChips ? PackChips(tree.props as any) : tree.type === PackQualityChip ? PackQualityChip(tree.props as any) : (tree.props as any).children)]; }
function text(tree: any): string { if (typeof tree === 'string' || typeof tree === 'number') return String(tree); if (Array.isArray(tree)) return tree.map(text).join(' '); if (!React.isValidElement(tree)) return ''; return text(tree.type === PackChips ? PackChips(tree.props as any) : tree.type === PackQualityChip ? PackQualityChip(tree.props as any) : (tree.props as any).children); }
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
  await submit(); fill('Mobile number', '9876543210'); fill('Address Line 1', '12 Sample Road, Chennai'); fill('Pincode', '600001'); fill('District', 'Chennai'); fill('Preferred installation date', installationDateBounds().min); await submit();
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

it('locks a URL-selected pack and uses a single plan card with only the required price lines', async () => {
  const catalog = seedCatalog();
  catalog.packs[0] = { ...catalog.packs[0], name: 'Tamil Super Star HD - ONLY BOX', packageType: 'only_box', pricingOptions: [{ validityDays: 360, validityMonths: 12, price: 3100 }, { validityDays: 30, price: 400 }] };
  const visible = visibleCatalog(catalog); const item = visible[0];
  // A pack ID alone resolves its brand; it does not rely on a brand parameter.
  f.search = `?pack=${item.pack.id}&validity=360`;
  const draw = () => { f.cursor = 0; f.effects = []; return BookingPage({ data: catalog, items: visible, lang: 'en', user, onOpenAuth: f.openAuth }); };
  const initial = draw();
  expect(nodes(initial).find(node => node.props.className === 'connection-plan-card')).toBeTruthy();
  expect(text(initial)).not.toContain('ONLY BOX');
  expect(text(initial)).toContain('Box only (existing dish)');
  expect(text(initial)).not.toContain('Number of connections');
  const selectLabels = nodes(initial).filter(node => node.type === 'label' && nodes(node).some(child => child.type === 'select')).map(text);
  expect(selectLabels.every(label => !label.startsWith('Brand') && !label.startsWith('Pack'))).toBe(true);
  expect(nodes(initial).filter(node => node.type === 'dt').map(text)).toEqual(['Total price']);
  expect(text(nodes(initial).find(node => node.props.className === 'connection-plan-price-amount'))).toContain('\u20b93,100');
  expect(nodes(initial).find(node => node.type === PackageInclusions)?.props.packageType).toBe('only_box');
  expect(nodes(initial).find(node => node.type === 'button' && node.props.type === 'submit').props.disabled).toBe(true);
  f.effects.forEach(effect => effect()); await new Promise(resolve => setTimeout(resolve, 0));
  nodes(draw()).find(node => node.type === 'select' && node.props['aria-label']?.startsWith('Validity:')).props.onChange({ target: { value: '30' } });
  expect(nodes(draw()).filter(node => node.type === 'dt').map(text)).toEqual(['Total price']);
  expect(text(draw())).toContain('\u20b9400');
  await nodes(draw()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  expect(nodes(draw()).some(node => node.type === 'li' && node.props['data-state'] === 'complete')).toBe(true);
});

it('shows Brand and Pack selectors only when no pack is preselected and keeps brand changes valid', () => {
  f.search = '';
  const tree = render();
  const brandLabel = nodes(tree).find(node => node.type === 'label' && text(node).startsWith('Brand'));
  const packLabel = nodes(tree).find(node => node.type === 'label' && text(node).startsWith('Pack'));
  expect(brandLabel).toBeTruthy(); expect(packLabel).toBeTruthy();
  const next = items.find(item => item.brand.id !== items[0].brand.id)!;
  nodes(brandLabel).find(node => node.type === 'select').props.onChange({ target: { value: next.brand.id } });
  const updatedPack = nodes(nodes(render()).find(node => node.type === 'label' && text(node).startsWith('Pack'))).find(node => node.type === 'select');
  expect(items.find(item => item.pack.id === updatedPack.props.value)?.brand.id).toBe(next.brand.id);
});

it('normalizes a saved draft to one connection and locks the restored pack', () => {
  render(); const saved = { ...f.values[0], count: 3 };
  f.values = []; f.search = '';
  vi.stubGlobal('sessionStorage', { getItem: () => JSON.stringify(saved), setItem() {}, removeItem() {} });
  const restored = render();
  expect(f.values[0].count).toBe(1);
  expect(f.values[0].packId).toBe(saved.packId);
  expect(nodes(restored).some(node => node.type === 'label' && ['Brand', 'Pack'].some(label => text(node).startsWith(label)))).toBe(false);
});

it('shows a single validity as text and rejects an invalid URL validity', () => {
  const catalog = seedCatalog(); catalog.packs[0].pricingOptions = [{ validityDays: 360, validityMonths: 12, price: 3100 }];
  const visible = visibleCatalog(catalog); const item = visible[0];
  const draw = () => { f.cursor = 0; f.effects = []; return BookingPage({ data: catalog, items: visible, lang: 'en', user, onOpenAuth: f.openAuth }); };
  f.search = `?pack=${item.pack.id}&validity=360`;
  const initial = draw();
  expect(nodes(initial).some(node => node.props.className === 'connection-plan-validity-text')).toBe(true);
  expect(nodes(initial).some(node => node.type === 'label' && text(node).startsWith('Validity') && nodes(node).some(child => child.type === 'select'))).toBe(false);
  expect(text(initial)).toContain('12 months');
  f.values = []; f.search = `?pack=${item.pack.id}&validity=31`;
  expect(text(draw())).toContain('no longer available');
  expect(nodes(draw()).some(node => node.type === 'button' && node.props.type === 'submit')).toBe(false);
});

it('deduplicates a fully prepaid price and keeps fixed validity and zero balance context in the card', () => {
  const catalog = seedCatalog();
  catalog.settings = { ...catalog.settings, advanceMode: 'full', enabledProviders: ['razorpay'], defaultProvider: 'razorpay' };
  catalog.packs[0] = { ...catalog.packs[0], packageType: 'only_box', name: 'Tamil Super Star HD - ONLY BOX', pricingOptions: [{ validityDays: 360, validityMonths: 12, price: 3100 }] };
  const visible = visibleCatalog(catalog); const item = visible[0];
  f.search = `?pack=${item.pack.id}&validity=360`; f.cursor = 0;
  const tree = BookingPage({ data: catalog, items: visible, lang: 'en', user, onOpenAuth: f.openAuth });
  expect(nodes(tree).filter(node => node.type === 'dt').map(text)).toEqual(['Total price']);
  expect(text(tree)).toContain('\u2248 \u20b9258/month');
  expect(text(tree)).not.toContain('Pay at installation');
  expect(text(tree)).not.toContain('no balance due');
  expect(nodes(tree).find(node => node.props.className === 'connection-plan-validity-text')).toBeTruthy();
  expect(nodes(tree).some(node => node.props.className === 'connection-booking-payment-note')).toBe(false);
  expect(nodes(tree).find(node => node.type === PackageInclusions)?.props.existingDishNote).toBe('Dish not included. Your existing dish is required.');
  expect(text(tree)).toContain('Box only (existing dish)');
  const heading = nodes(tree).find(node => node.props.className === 'connection-plan-heading');
  expect(text(heading)).toContain('Tamil Super Star HD');
  const coverage = nodes(tree).find(node => node.props.className === 'connection-plan-coverage');
  expect(text(coverage)).toBe('Pack 12 months + HD set-top box + installation');
  expect(nodes(tree).some(node => node.props.className === 'connection-card-validity')).toBe(false);
  expect(text(tree)).not.toMatch(/incl.*tax/i);
  expect(nodes(tree).some(node => node.props.className === 'connection-plan-terms')).toBe(false);
  expect(nodes(tree).some(node => node.props.className === 'connection-plan-next')).toBe(false);
  expect(text(tree)).not.toContain('24\u201348 hours');
  expect(nodes(tree).find(node => node.type === 'a' && text(node) === 'Call support').props.href).toMatch(/^tel:\+91/);
});

it('shows a loading state and blocks a second Plan submission while advancing', async () => {
  render(); f.effects.forEach(effect => effect()); await new Promise(resolve => setTimeout(resolve, 0));
  const advancing = submit();
  const button = nodes(render()).find(node => node.type === 'button' && node.props.type === 'submit');
  expect(button.props.disabled).toBe(true); expect(button.props['aria-busy']).toBe(true);
  expect(text(button)).toContain('Please wait');
  await submit(); await advancing;
  expect(nodes(render()).find(node => node.type === 'li' && node.props['aria-current'] === 'step') && text(nodes(render()).find(node => node.type === 'li' && node.props['aria-current'] === 'step'))).toContain('Your details');
  expect(f.fetch.mock.calls.some(([url]) => String(url).endsWith('/orders'))).toBe(false);
});

it('orders contact and address fields and fills location from the pincode', async () => {
  render(); f.effects.forEach(effect => effect()); await new Promise(resolve => setTimeout(resolve, 0)); await submit();
  const labels = nodes(render()).filter(node => node.type === 'label').map(text);
  expect(labels.slice(1, 12).map(value => value.trim())).toEqual(['Mobile number', 'Full name', 'Alternate mobile (optional)', 'Email (optional)', 'Pincode', 'City', 'District Choose ' + TN_DISTRICTS.join(' '), 'State Tamil Nadu', 'Address Line 1', 'Address Line 2 (optional)', 'Landmark (optional)']);
  for (const [label, autocomplete] of [['Mobile number', 'tel'], ['Full name', 'name'], ['Email (optional)', 'email'], ['Address Line 1', 'address-line1'], ['Address Line 2 (optional)', 'address-line2'], ['Pincode', 'postal-code']]) {
    const field = nodes(render()).find(node => node.type === 'label' && text(node).startsWith(label));
    expect(nodes(field).find(node => node.type === 'input').props.autoComplete).toBe(autocomplete);
    if (label.startsWith('Address Line')) expect(field.props.className).toBe('connection-field-wide');
  }
  expect(nodes(render()).find(node => node.type === 'textarea').props.placeholder).toBe('e.g. dish on the terrace, call before arriving');
  const stateLabel = nodes(render()).find(node => node.type === 'label' && text(node).startsWith('State'));
  expect(nodes(stateLabel).some(node => ['input', 'select', 'textarea'].includes(node.type))).toBe(false);
  const old = f.fetch.getMockImplementation()!;
  f.fetch.mockImplementation((url, options) => String(url).includes('postalpincode') ? Promise.resolve({ ok: true, json: async () => [{ Status: 'Success', PostOffice: [{ District: 'Chennai', State: 'Tamil Nadu' }] }] }) : old(url, options));
  fill('Pincode', '600001'); render(); const cleanups = f.effects.map(effect => effect()); await new Promise(resolve => setTimeout(resolve, 0));
  expect(f.values[0].customer).toMatchObject({ city: 'Chennai', state: 'Tamil Nadu', district: 'Chennai' });
  cleanups.forEach(cleanup => typeof cleanup === 'function' && cleanup());
});

it('keeps navigation under the details form and outside the summary', async () => {
  render(); f.effects.forEach(effect => effect()); await new Promise(resolve => setTimeout(resolve, 0)); await submit();
  const tree = render();
  const main = nodes(tree).find(node => node.props.className === 'connection-booking-main');
  const summary = nodes(tree).find(node => node.type === 'aside' && node.props.className === 'connection-booking-summary');
  expect(nodes(main).some(node => node.type === 'button' && node.props.type === 'submit')).toBe(true);
  expect(nodes(summary).some(node => node.type === 'button' && node.props.type === 'submit')).toBe(false);
});
