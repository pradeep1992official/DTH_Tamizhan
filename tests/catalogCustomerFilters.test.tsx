import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { visibleCatalog } from '../src/lib/newConnectionBrowse';
const state = vi.hoisted(() => ({ values: [] as any[], cursor: 0 }));
vi.mock('react', async original => ({ ...await original<any>(),
  useState: (initial: any) => { const index = state.cursor++; if (!(index in state.values)) state.values[index] = typeof initial === 'function' ? initial() : initial; return [state.values[index], (value: any) => { state.values[index] = typeof value === 'function' ? value(state.values[index]) : value; }]; },
  useMemo: (compute: () => unknown) => compute(), useId: () => 'catalog-filters',
}));
import { CatalogPage } from '../src/components/NewConnection/CatalogPage';
const data = seedCatalog(); data.packs[0].boxType = 'Android'; const items = visibleCatalog(data);
const props = { data, items, lang: 'en' as const, selected: [], limit: false, onToggle: vi.fn(), onRemove: vi.fn(), onValidity: vi.fn(), onClear: vi.fn() };
function nodes(tree: any): any[] { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!React.isValidElement(tree)) return []; return [tree, ...nodes((tree.props as any).children)]; }
const render = () => { state.cursor = 0; return nodes(CatalogPage(props)); };
const select = (name: string, value: string) => render().find(n => n.type === 'select' && n.props['aria-label'] === name)!.props.onChange({ target: { value } });
const count = () => render().filter(n => n.type === 'article' && n.props.className === 'connection-pack').length;
const remove = (label: string) => render().find(n => n.type === 'button' && n.props['aria-label'] === label)!.props.onClick();
beforeEach(() => { state.values = []; state.cursor = 0; });

it('starts with all brands and lowest total price, then combines brand and box filters', () => {
  expect(count()).toBe(items.length);
  expect(render().find(n => n.type === 'select' && n.props.value === 'price')).toBeDefined();
  select('Brand', data.brands[0].id); select('Box type', 'Android');
  expect(count()).toBe(1);
  expect(render().some(n => n.props['aria-label'] === `Remove Brand: ${data.brands[0].name}`)).toBe(true);
  expect(render().some(n => n.props['aria-label'] === 'Remove Box type: Android')).toBe(true);
  remove(`Remove Brand: ${data.brands[0].name}`);
  expect(count()).toBe(1);
  expect(render().find(n => n.type === 'select' && n.props['aria-label'] === 'Brand').props.value).toBe('');
  remove('Remove Box type: Android');
  expect(count()).toBe(items.length);
  expect(render().some(n => n.props.className === 'connection-active-filters')).toBe(false);
});

it('clears an empty combination and retains the chosen sort order', () => {
  render().find(n => n.type === 'select' && n.props.value === 'price')!.props.onChange({ target: { value: 'channels' } });
  select('Brand', data.brands[1].id); select('Box type', 'Android');
  expect(count()).toBe(0);
  render().find(n => n.type === 'button' && n.props.className === 'connection-clear-filters')!.props.onClick();
  expect(count()).toBe(items.length);
  expect(render().find(n => n.type === 'select' && n.props.value === 'channels')).toBeDefined();
});
