import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ state: [] as any[], cursor: 0 }));
vi.mock('react', async original => ({ ...await original<any>(), useState: (initial: any) => {
  const index = f.cursor++; if (!(index in f.state)) f.state[index] = typeof initial === 'function' ? initial() : initial;
  return [f.state[index], (value: any) => { f.state[index] = typeof value === 'function' ? value(f.state[index]) : value; }];
}, useEffect: () => {}, useMemo: (compute: any) => compute() }));
vi.mock('../src/lib/firebase', () => ({ auth: null, db: null }));
vi.mock('../src/lib/planCatalogService', () => ({ INITIAL_PLAN_CATALOG: [], PlanCatalogService: {} }));
import { BrowsePlansView } from '../src/components/BrowsePlans/BrowsePlansView';
import { PlanCard } from '../src/components/BrowsePlans/PlanCard';
import { ComparisonTable } from '../src/components/BrowsePlans/ComparisonTable';
import { PlanSuggestions } from '../src/components/BrowsePlans/PlanSuggestions';
import { getOperatorTheme } from '../src/lib/theme';
const plan = { id: 'public-pack', operator: 'airtel_dth', name: 'Tamil HD', price: 279, type: 'HD', duration_months: 1,
  monthly_equivalent_rate: 279, channel_counts_unavailable: true, channels: [], genre_tags: [], is_recommended: false } as any;
const nodes = (tree: any): any[] => Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes((tree.props as any).children)] : [];
const choose = vi.fn(); const signIn = vi.fn();
function render() { f.cursor = 0; return nodes(BrowsePlansView({ currentLang: 'en', currentTheme: getOperatorTheme('airtel_dth'), user: null,
  connections: [], onChoosePlan: choose, onOpenAuth: signIn, onApplyPlanToBox: vi.fn(), onAddNewConnectionAndApply: vi.fn() })); }
beforeEach(() => { vi.clearAllMocks(); f.state = [[plan], false]; });
it('sends a guest pack selection to Recharge without opening sign-in or a saved-box modal', () => {
  const tree = render(); tree.find(node => node.type === PlanCard).props.onSelectPlan(plan);
  expect(tree.find(node => node.type === 'p' && node.props.children === 'No sign-in needed to browse. Choose a pack to continue to Recharge.')).toBeDefined();
  expect(choose).toHaveBeenCalledWith(plan); expect(signIn).not.toHaveBeenCalled(); expect(f.state[6]).toBeNull();
});
it('uses the same direct selection flow from comparison and recommendation results', () => {
  const tree = render(); tree.find(node => node.type === ComparisonTable).props.onSelectPlan(plan);
  tree.find(node => node.type === PlanSuggestions).props.onSelect(plan.id);
  expect(choose).toHaveBeenCalledTimes(2); expect(signIn).not.toHaveBeenCalled();
});
