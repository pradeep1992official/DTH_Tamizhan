import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { visibleCatalog } from '../src/lib/newConnectionBrowse';
const state = vi.hoisted(() => ({ values: [] as any[], cursor: 0 }));
vi.mock('react', async original => ({ ...await original<any>(),
  useState: (initial: any) => { const i = state.cursor++; if (!(i in state.values)) state.values[i] = typeof initial === 'function' ? initial() : initial; return [state.values[i], (next: any) => { state.values[i] = typeof next === 'function' ? next(state.values[i]) : next; }]; },
  useMemo: (fn: any) => fn(), useRef: () => ({ current: null }), useEffect: () => {}, useId: () => 'catalog-test',
}));
vi.mock('react-router-dom', () => ({ Link: 'a' }));
import { CatalogPage } from '../src/components/NewConnection/CatalogPage';
import { PackChips, PackQualityChip } from '../src/components/NewConnection/PackChips';
function children(tree: any) { return tree.type === PackChips ? PackChips(tree.props) : tree.type === PackQualityChip ? PackQualityChip(tree.props) : tree.props.children; }
function nodes(tree: any): any[] { return Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes(children(tree))] : []; }
function text(tree: any): string { return Array.isArray(tree) ? tree.map(text).join('') : React.isValidElement(tree) ? text(children(tree)) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }
beforeEach(() => { state.values = []; state.cursor = 0; vi.stubGlobal('sessionStorage', { getItem: () => null, setItem() {} }); });
afterEach(() => vi.unstubAllGlobals());

it('updates card price, monthly amount and booking validity through the validity selector beside the price', () => {
  const catalog = seedCatalog();
  catalog.packs = [{ ...catalog.packs[0], name: 'Tamil Super Star HD - ONLY BOX', packageType: 'only_box', type: 'HD', pricingOptions: [{ validityDays: 180, validityMonths: 6, price: 1800 }, { validityDays: 360, validityMonths: 12, price: 3100 }] }];
  const items = visibleCatalog(catalog); const onValidity = vi.fn(); const onToggle = vi.fn();
  const draw = () => { state.cursor = 0; return CatalogPage({ data: catalog, items, lang: 'en', selected: [], limit: false, onToggle, onRemove() {}, onValidity, onClear() {} }); };
  const card = () => nodes(draw()).find(node => node.type === 'article');
  expect(text(card())).toContain('\u20b91,800'); expect(text(card())).toContain('\u2248 \u20b9300/month');
  nodes(card()).find(node => node.type === 'select' && node.props['aria-label'].startsWith('Validity:')).props.onChange({ target: { value: '360' } });
  expect(onValidity).toHaveBeenCalledWith(items[0].pack.id, 360);
  expect(text(card())).toContain('\u20b93,100'); expect(text(card())).toContain('\u2248 \u20b9258/month');
  expect(nodes(card()).find(node => node.props.className === 'connection-primary').props.to).toContain('validity=360');
  nodes(card()).find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange();
  expect(onToggle).toHaveBeenCalledWith(items[0], 360);
});

it('exposes quick quality/validity filters and counts only active extra filters', () => {
  const catalog = seedCatalog();
  catalog.packs = catalog.packs.slice(0, 2).map((pack, i) => ({ ...pack, type: i ? 'SD' as const : 'HD' as const, pricingOptions: [{ validityDays: i ? 180 : 360, validityMonths: i ? 6 : 12, price: 1000 }] }));
  const draw = () => { state.cursor = 0; return CatalogPage({ data: catalog, items: visibleCatalog(catalog), lang: 'en', selected: [], limit: false, onToggle() {}, onRemove() {}, onValidity() {}, onClear() {} }); };
  const quick = () => nodes(draw()).find(node => node.props.className === 'connection-catalog-actions');
  const selects = nodes(quick()).filter(node => node.type === 'select' && ['Brand', 'Box type', 'Picture quality', 'Validity'].includes(node.props['aria-label']));
  expect(nodes(quick()).some(node => node.type === 'details' && node.props.className === 'connection-extra-filters')).toBe(true);
  expect(selects.map(node => node.props['aria-label'])).toEqual(['Brand', 'Box type', 'Picture quality', 'Validity']);
  selects.find(node => node.props['aria-label'] === 'Picture quality').props.onChange({ target: { value: 'HD' } });
  expect(nodes(draw()).filter(node => node.type === 'article')).toHaveLength(1);
  expect(nodes(draw()).some(node => node.props.className === 'connection-filter-count')).toBe(false);
  const language = nodes(draw()).find(node => node.type === 'label' && text(node).startsWith('Language'));
  nodes(language).find(node => node.type === 'select').props.onChange({ target: { value: 'Tamil' } });
  expect(text(nodes(draw()).find(node => node.props.className === 'connection-filter-count'))).toBe('1');
  nodes(quick()).find(node => node.type === 'select' && node.props['aria-label'] === 'Validity').props.onChange({ target: { value: 'months:6' } });
  expect(nodes(draw()).filter(node => node.type === 'article')).toHaveLength(0);
});
