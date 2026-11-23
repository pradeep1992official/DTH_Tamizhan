import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { visibleCatalog } from '../src/lib/newConnectionBrowse';
import { installationDateBounds, newConnectionOrderSchema, TN_DISTRICTS } from '../src/lib/newConnectionOrders';
import { PackageInclusions } from '../src/components/NewConnection/PackageInclusions';
import { BookingConfirmation } from '../src/components/NewConnection/BookingConfirmation';
import { BookingSummary } from '../src/components/NewConnection/BookingSummary';
import { confirmationAddress, reviewAddress, reviewDate } from '../src/lib/newConnectionReview';
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
function nodes(tree: any): any[] { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!React.isValidElement(tree)) return []; return [tree, ...nodes(tree.type === BookingConfirmation ? BookingConfirmation(tree.props as any) : tree.type === BookingSummary ? BookingSummary(tree.props as any) : tree.type === PackChips ? PackChips(tree.props as any) : tree.type === PackQualityChip ? PackQualityChip(tree.props as any) : (tree.props as any).children)]; }
function text(tree: any): string { if (typeof tree === 'string' || typeof tree === 'number') return String(tree); if (Array.isArray(tree)) return tree.map(text).join(' '); if (!React.isValidElement(tree)) return ''; return text(tree.type === BookingConfirmation ? BookingConfirmation(tree.props as any) : tree.type === BookingSummary ? BookingSummary(tree.props as any) : tree.type === PackChips ? PackChips(tree.props as any) : tree.type === PackQualityChip ? PackQualityChip(tree.props as any) : (tree.props as any).children); }
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
  await toReview(); expect(text(render())).toContain('Book without payment'); accept(); const ready = form(); await Promise.all([ready.props.onSubmit({ preventDefault() {} }), ready.props.onSubmit({ preventDefault() {} })]);
  const creates = f.fetch.mock.calls.filter(([url]) => String(url).endsWith('/orders')); expect(creates).toHaveLength(1);
  expect(JSON.parse(creates[0][1].body)).toMatchObject({ provider: 'none', displayedQuote: { amountDueNow: 0 }, consent: { terms: true, contact: true } });
  expect(text(render())).toContain('Booking received'); expect(text(render())).toContain('No online payment was taken.'); expect(text(render())).not.toContain('Payment verified'); expect(f.load).not.toHaveBeenCalled();
});
it('requires fresh explicit consent after a server price-change response', async () => {
  await toReview(); accept(); const old = f.fetch.getMockImplementation()!;
  f.fetch.mockImplementation(async (url, options) => { if (String(url).endsWith('/orders')) { const payload = JSON.parse(options.body); const quote = structuredClone(payload.displayedQuote); quote.priceBreakdown.installation += 10; quote.priceBreakdown.perConnectionTotal += 10; quote.priceBreakdown.total += 10; quote.balanceAtInstallation += 10; return { ok: false, json: async () => ({ code: 'PRICE_CHANGED', quote }) }; } return old(url, options); });
  await submit(); expect(text(render())).toContain('Price updated');
  const boxes = nodes(render()).filter(n => n.type === 'input' && n.props.type === 'checkbox'); expect(boxes.every(box => box.props.checked === false)).toBe(true);
  const button = nodes(render()).find(n => n.type === 'button' && n.props.type === 'submit'); expect(button.props.disabled).toBe(true); await submit(); expect(text(render())).toContain('Please accept the terms to continue.'); expect(f.load).not.toHaveBeenCalled();
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

it('reviews the saved address once in order and edits without losing values', async () => {
  await toReview();
  f.values[0].customer = { ...f.values[0].customer, address: '12 Sample Road', addressLine2: 'Flat 3', landmark: 'Near temple', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pincode: '600001', preferredSlot: 'Afternoon' };
  const customer = structuredClone(f.values[0].customer);
  const sections = nodes(render()).filter(node => node.props.className === 'connection-review-section');
  expect(sections).toHaveLength(4);
  expect(reviewAddress(customer)).toEqual(['12 Sample Road', 'Flat 3', 'Near temple', 'Chennai', 'Tamil Nadu', '600001']);
  expect(text(nodes(sections[2]).find(node => node.type === 'address'))).toBe('12 Sample Road Flat 3 Near temple Chennai Tamil Nadu 600001');
  expect(text(sections[3]).replace(/\s+/g, ' ')).toContain('Afternoon (preferred, not confirmed)');
  expect(reviewDate('2026-11-26', 'en')).toBe('Thu, 26 Nov 2026');
  expect(text(render())).not.toContain('Box: HD');
  expect(text(render())).not.toContain('\u00d7 1');
  nodes(sections[2]).find(node => node.type === 'button').props.onClick();
  expect(f.values[0].customer).toEqual(customer);
  expect(nodes(render()).some(node => node.props.id === 'booking-address')).toBe(true);
  await submit();
  nodes(render()).find(node => node.props['aria-label'] === 'Edit Plan').props.onClick();
  expect(f.values[0].customer).toEqual(customer);
  expect(nodes(render()).some(node => node.props.id === 'booking-plan')).toBe(true);
});

it('explains unavailability in all steps and never offers an unsupported payment-free booking', async () => {
  f.fetch.mockImplementation(async () => ({ ok: true, json: async () => ({ enabledProviders: [], settings: { ...data.settings, advanceMode: 'full', enabledProviders: ['razorpay'], defaultProvider: 'razorpay' } }) }));
  render(); f.effects.forEach(effect => effect()); await new Promise(resolve => setTimeout(resolve, 0));
  expect(text(render())).toContain('Online payment is currently unavailable.');
  expect(nodes(render()).some(node => node.type === 'a' && node.props.href?.startsWith('tel:'))).toBe(true);
  await submit();
  expect(text(render())).toContain('Contact support to arrange your booking');
  fill('Mobile number', '9876543210'); fill('Address Line 1', '12 Sample Road'); fill('Pincode', '600001'); fill('District', 'Chennai'); fill('Preferred installation date', installationDateBounds().min); await submit();
  expect(text(render())).toContain('Online payment is currently unavailable.');
  expect(text(render())).not.toContain('Book without payment');
  expect(nodes(render()).find(node => node.type === 'button' && node.props.type === 'submit').props.disabled).toBe(true);
  expect(f.fetch.mock.calls.some(([url]) => String(url).endsWith('/orders'))).toBe(false);
});

it('shows the configured refund policy and rental wording before a single required consent', async () => {
  const policy = 'Refunds are reviewed after installation feasibility is checked. Contact support with your reference.';
  const old = f.fetch.getMockImplementation()!;
  f.fetch.mockImplementation((url, options) => String(url).endsWith('/config') ? Promise.resolve({ ok: true, json: async () => ({ enabledProviders: [], settings: { ...data.settings, refundPolicy: policy } }) }) : old(url, options));
  await toReview();
  expect(text(nodes(render()).find(node => node.props.className?.split(' ').includes('connection-review-refund')))).toContain('Refunds are reviewed after installation feasibility is checked.');
  expect(text(nodes(render()).find(node => node.props.className === 'connection-review-terms'))).toContain('The set-top box is provided on a rental basis.');
  expect(nodes(render()).some(node => node.props.className === 'connection-review-rental')).toBe(false);
  const checks = nodes(render()).filter(node => node.type === 'input' && node.props.type === 'checkbox');
  expect(checks).toHaveLength(1); expect(checks[0].props.required).toBe(true);
  await submit(); expect(text(render())).toContain('Please accept the terms to continue.');
  expect(f.fetch.mock.calls.some(([url]) => String(url).endsWith('/orders'))).toBe(false);
  accept(); expect(text(render())).not.toContain('Please accept the terms to continue.');
});

it('uses actual due-now amounts without an installation-payment row in the Review summary', async () => {
  await toReview();
  const summary = nodes(render()).find(node => node.type === BookingSummary);
  const fullQuote = { ...summary.props.quote, amountDueNow: 3100, balanceAtInstallation: 0 };
  const full = BookingSummary({ ...summary.props, quote: fullQuote });
  expect(text(full)).toContain('Total due now'); expect(text(full)).not.toContain('Pay at installation'); expect(text(full)).not.toContain('no balance due');
  const deferred = BookingSummary({ ...summary.props, quote: { ...fullQuote, amountDueNow: 0, balanceAtInstallation: 3100 } });
  expect(text(deferred)).not.toContain('no balance due');
  expect(nodes(full).find(node => node.type === PackChips).props.showValidity).toBe(false);
});

it('hides a single payment option and defaults the multiple-option selector to the configured provider', async () => {
  const old = f.fetch.getMockImplementation()!;
  const settings = { ...data.settings, advanceMode: 'full', enabledProviders: ['razorpay'], defaultProvider: 'razorpay' };
  f.fetch.mockImplementation((url, options) => String(url).endsWith('/config') ? Promise.resolve({ ok: true, json: async () => ({ enabledProviders: ['razorpay'], settings }) }) : old(url, options));
  await toReview();
  expect(nodes(render()).some(node => node.props.className === 'connection-review-provider')).toBe(false);
  expect(text(render())).not.toContain('Secure payment through your selected payment provider.');
  expect(nodes(render()).some(node => node.props.className === 'connection-review-support')).toBe(false);
  f.values = []; settings.enabledProviders = ['razorpay', 'youpi']; settings.defaultProvider = 'youpi';
  f.fetch.mockImplementation((url, options) => String(url).endsWith('/config') ? Promise.resolve({ ok: true, json: async () => ({ enabledProviders: ['razorpay', 'youpi'], settings }) }) : old(url, options));
  await toReview();
  const selector = nodes(nodes(render()).find(node => node.props.className === 'connection-review-provider')).find(node => node.type === 'select');
  expect(selector.props.value).toBe('youpi');
  expect(nodes(selector).some(node => node.type === 'option' && node.props.value === '' && node.props.disabled)).toBe(true);
});

it('keeps the existing confirmation route and renders the verified reference and next steps after payment', async () => {
  const old = f.fetch.getMockImplementation()!;
  let created: any;
  f.fetch.mockImplementation(async (url, options) => {
    if (String(url).endsWith('/config')) return { ok: true, json: async () => ({ enabledProviders: ['razorpay'], settings: { ...data.settings, advanceMode: 'full', enabledProviders: ['razorpay'], defaultProvider: 'razorpay' } }) };
    if (String(url).endsWith('/verify')) return { ok: true, json: async () => ({ order: { ...created, paymentStatus: 'paid', amountPaid: created.amountDueNow, balance: 0 } }) };
    const response = await old(url, options); const value = await response.json();
    created = { ...value.order, provider: 'razorpay', providerOrderId: 'order_test' };
    return { ok: true, json: async () => ({ order: created, checkout: { provider: 'razorpay', providerOrderId: 'order_test', keyId: 'rzp_test_demo', amount: created.amountDueNow * 100, currency: 'INR', testMode: true } }) };
  });
  vi.stubGlobal('window', { Razorpay: class { options: any; constructor(options: any) { this.options = options; } on() {} open() { void this.options.handler({ razorpay_order_id: 'order_test', razorpay_payment_id: 'pay_test', razorpay_signature: 'test' }); } } });
  await toReview(); accept(); await submit();
  expect(f.navigate).toHaveBeenCalledWith(`/new-connection/book?order=${created.id}`, { replace: true });
  expect(text(render())).toContain('Booking confirmed'); expect(text(render())).toContain('Paid');
  expect(text(render())).toContain(created.bookingId);
  expect(text(render())).toContain('Confirmation call within 24 to 48 hours to arrange your installation.');
  expect(f.load).toHaveBeenCalledOnce();
});

it('keeps all refund content inside collapsed Terms and uses plain validity in the summary', async () => {
  await toReview();
  const tree = render();
  const terms = nodes(tree).find(node => node.type === 'details' && node.props.className === 'connection-review-terms');
  expect(terms.props.open).not.toBe(true);
  const refund = nodes(tree).find(node => node.props.className?.split(' ').includes('connection-review-refund'));
  expect(nodes(terms)).toContain(refund);
  expect(nodes(tree).filter(node => node.type === 'details' && text(node).startsWith('Refund policy'))).toHaveLength(0);
  const summary = nodes(tree).find(node => node.type === BookingSummary);
  expect(nodes(summary).some(node => node.props.className === 'connection-plan-validity-text')).toBe(true);
});

it('disables payment until the required agreement is checked and disables it again when unchecked', async () => {
  await toReview();
  const button = () => nodes(render()).find(node => node.type === 'button' && node.props.type === 'submit');
  expect(button().props.disabled).toBe(true);
  accept(); expect(button().props.disabled).toBe(false);
  nodes(render()).find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: false } });
  expect(button().props.disabled).toBe(true);
});

it('shows a clean confirmation, full saved address, print-only breakdown and copyable reference', async () => {
  await toReview();
  f.values[0].customer = { ...f.values[0].customer, address: '12 Sample Road', addressLine2: 'Flat 3', city: 'Chennai', district: 'Chennai', landmark: 'Near temple', state: 'Tamil Nadu' };
  accept(); await submit();
  const tree = render();
  expect(text(tree)).not.toMatch(/received \? paid|ONLY BOX|FULL SET|1 \u00d7|\ufffd|\u00c2/);
  const address = nodes(tree).find(node => node.type === 'address');
  expect(text(address)).toBe('12 Sample Road Flat 3 Near temple Chennai Tamil Nadu 600001');
  expect(nodes(tree).filter(node => node.type === 'dt' && text(node) === 'Amount paid')).toHaveLength(1);
  const print = nodes(tree).find(node => node.props.className === 'connection-print-only');
  expect(nodes(print).some(node => node.props.className === 'connection-booking-breakdown')).toBe(true);
  expect(nodes(tree).some(node => node.type === 'button' && text(node) === 'Check payment status')).toBe(false);
  expect(nodes(tree).find(node => node.type === 'a' && node.props['aria-label'] === 'My Bookings').props.to).toBe('/account/bookings');
  expect(text(tree)).not.toContain('WhatsApp');
  const copy = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('navigator', { clipboard: { writeText: copy } });
  nodes(tree).find(node => node.type === 'button' && node.props['aria-label'] === 'Copy booking number').props.onClick();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(copy).toHaveBeenCalledWith('DTH-NC-261116-0001');
  expect(text(render())).toContain('Booking number copied.');
});

it('separates payment status, team confirmation and the gateway test banner', async () => {
  await toReview(); accept(); await submit();
  const props = render().props as any;
  const paid = { ...props.order, provider: 'razorpay', amountDueNow: 100, amountPaid: 100, balance: 0, paymentStatus: 'paid', testMode: false };
  const production = BookingConfirmation({ ...props, order: paid });
  expect(text(nodes(production).find(node => node.type === 'h1'))).toBe('Booking confirmed');
  expect(text(production)).toContain('Payment successful. Our team will confirm your installation appointment.');
  expect(text(nodes(production).find(node => node.props.className === 'connection-confirmation-status'))).toBe('Paid');
  expect(text(production)).not.toContain('TEST PAYMENT');
  expect(text(BookingConfirmation({ ...props, order: { ...paid, testMode: true } }))).toContain('TEST PAYMENT');
  expect(text(nodes(BookingConfirmation({ ...props, order: { ...paid, status: 'scheduled' } })).find(node => node.type === 'h1'))).toBe('Booking confirmed');
  const pending = BookingConfirmation({ ...props, order: { ...paid, paymentStatus: 'pending', amountPaid: 0 } });
  expect(nodes(pending).some(node => node.type === 'button' && text(node) === 'Check payment status')).toBe(true);
  expect(nodes(pending).some(node => node.type === 'button' && text(node) === 'Retry payment')).toBe(false);
  const duplicateNotice = BookingConfirmation({ ...props, notice: 'If your account was debited, do not pay again. Our team will check the payment.', order: { ...paid, paymentStatus: 'pending', amountPaid: 0 } });
  expect(text(duplicateNotice).match(/If your account was debited/g)).toHaveLength(1);

});

it('does not render another account booking even if its ID is known', async () => {
  await toReview(); accept(); await submit();
  f.search = '?order=nc_' + 'a'.repeat(48);
  const own = render().props.order;
  // The loaded order is checked against the current account before rendering.
  const orderIndex = f.values.findIndex(value => value?.id === own.id);
  f.values[orderIndex] = { ...own, uid: 'another-account' };
  expect(text(render())).not.toContain(own.bookingId);
  f.cursor = 0; f.effects = [];
  expect(text(BookingPage({ data, items, lang: 'en', user: null, onOpenAuth: f.openAuth }))).not.toContain(own.bookingId);
});

it('shows Plan facts, a product tile and realistic next-step timings on confirmation', async () => {
  await toReview(); accept(); await submit();
  const tree = render();
  const plan = nodes(tree).find(node => node.props.className === 'connection-confirmation-plan');
  expect(nodes(plan).some(node => node.props.className === 'connection-confirmation-product')).toBe(true);
  expect(text(plan).replace(/\s+/g, ' ')).toContain(`${items[0].counts.channelCount} channels`);
  expect(nodes(plan).some(node => node.type === PackQualityChip)).toBe(true);
  expect(nodes(plan).some(node => node.props.className === 'connection-pack-chip connection-validity-chip')).toBe(true);
  expect(text(tree)).toContain('within 24 to 48 hours');
  expect(text(tree)).toContain('on or near your preferred date, subject to availability');
  expect(text(tree)).not.toContain('Incl. taxes');
});

it('collapses all confirmation details and suppresses repeated address phrases without changing saved fields', async () => {
  await toReview(); accept(); await submit();
  const tree = render();
  const details = nodes(tree).filter(node => node.type === 'details');
  expect(details).toHaveLength(0);
  expect(nodes(tree).find(node => node.props.id === 'connection-confirmation-details').props.hidden).toBe(true);
  const header = nodes(tree).find(node => node.type === 'header' && node.props.className === 'connection-confirmation-header');
  expect(nodes(header).some(node => node.props.className === 'connection-confirmation-status')).toBe(false);
  expect(text(tree)).toContain('Full refund if installation is not completed within 7 days of booking.');
  const customer = { ...f.values[0].customer, address: '64, 8 CROSS STREET, KONGU NAGAR, GANDHINAGAR, COIMBATORE', addressLine2: '64, 8 cross street', city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', pincode: '641035' };
  const before = structuredClone(customer);
  expect(confirmationAddress(customer)).toEqual([customer.address, 'Tamil Nadu', '641035']);
  expect(customer).toEqual(before);
});

it('toggles all confirmation content together from More details in the hero', async () => {
  await toReview(); accept(); await submit();
  const toggle = () => nodes(render()).find(node => node.props['aria-controls'] === 'connection-confirmation-details');
  const body = () => nodes(render()).find(node => node.props.id === 'connection-confirmation-details');
  expect(toggle().props['aria-expanded']).toBe(false); expect(body().props.hidden).toBe(true);
  expect(text(toggle())).toBe('View booking details');
  toggle().props.onClick();
  expect(toggle().props['aria-expanded']).toBe(true); expect(body().props.hidden).toBe(false);
  expect(text(body())).toContain('Installation address'); expect(text(body())).toContain('Payment details');
  expect(nodes(body()).some(node => node.type === 'details')).toBe(false);
  toggle().props.onClick(); expect(body().props.hidden).toBe(true);
});

it('keeps the actions before the expanded details and the hero outside the toggle body', async () => {
  await toReview(); accept(); await submit();
  nodes(render()).find(node => node.props['aria-controls'] === 'connection-confirmation-details').props.onClick();
  const tree = render(); const all = nodes(tree);
  const hero = all.findIndex(node => node.props.className === 'connection-confirmation-header');
  const actions = all.findIndex(node => node.type === 'nav' && node.props.className.includes('connection-confirmation-actions'));
  const body = all.findIndex(node => node.props.id === 'connection-confirmation-details');
  expect(hero).toBeLessThan(actions); expect(actions).toBeLessThan(body);
  expect(all[body].props.hidden).toBe(false);
  expect(nodes(all[body]).some(node => node.props.className === 'connection-confirmation-header')).toBe(false);
});

it('uses the shared printable receipt root and places icon actions inside the hero', async () => {
  await toReview(); accept(); await submit();
  const tree = render();
  expect(nodes(tree).some(node => node.props.className?.split(' ').includes('receipt-print'))).toBe(true);
  const header = nodes(tree).find(node => node.props.className === 'connection-confirmation-header');
  const actions = nodes(header).find(node => node.type === 'nav');
  expect(actions).toBeTruthy();
  expect(nodes(actions).filter(node => typeof node.type === 'object').length).toBeGreaterThan(0);
});
