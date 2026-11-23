import React from 'react';
import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ expanded: false }));
vi.mock('react', async original => ({ ...await original<any>(), useState: () => [state.expanded, (next: any) => { state.expanded = typeof next === 'function' ? next(state.expanded) : next; }] }));
vi.mock('react-router-dom', () => ({ Link: 'a' }));
import { HomeDetails } from '../src/components/NewConnection/HomeDetails';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { NEW_CONNECTION_REFUND } from '../src/lib/newConnectionPolicy';
function nodes(tree: any): any[] { return Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes((tree.props as any).children)] : []; }
function text(tree: any): string { return Array.isArray(tree) ? tree.map(text).join('') : React.isValidElement(tree) ? text((tree.props as any).children) : typeof tree === 'string' ? tree : ''; }
it('shows three FAQs, expands all in place, then collapses with View less', () => {
  state.expanded = false;
  const catalog = seedCatalog(); catalog.settings.refundPolicy = ''; catalog.settings.serviceableDistricts = ['Kallakurichi'];
  const draw = () => HomeDetails({ currentLang: 'en', catalog });
  const button = () => nodes(draw()).find(node => node.props.className === 'launch-faq-toggle');
  expect(nodes(draw()).filter(node => node.type === 'details')).toHaveLength(3);
  expect(button().props['aria-expanded']).toBe(false);
  expect(text(button())).toBe('View more');
  button().props.onClick();
  expect(nodes(draw()).filter(node => node.type === 'details')).toHaveLength(9);
  expect(button().props['aria-expanded']).toBe(true);
  expect(text(draw())).toContain('How do I recharge later?');
  expect(text(draw())).toContain(NEW_CONNECTION_REFUND.en);
  catalog.settings.refundPolicy = 'Configured booking refund policy.';
  expect(text(draw())).toContain(catalog.settings.refundPolicy);
  expect(text(button())).toBe('View less');
  button().props.onClick();
  expect(nodes(draw()).filter(node => node.type === 'details')).toHaveLength(3);
});
