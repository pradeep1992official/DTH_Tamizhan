import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ task: 'recharge' }));
vi.mock('react', async original => ({ ...await original<any>(), useState: () => [state.task, (task: string) => { state.task = task; }] }));
import { HomeHowItWorks, homeRechargeFaqs } from '../src/components/NewConnection/HomeHowItWorks';
function nodes(tree: any): any[] { return Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes((tree.props as any).children)] : []; }
function text(tree: any): string { return Array.isArray(tree) ? tree.map(text).join(' ') : React.isValidElement(tree) ? text((tree.props as any).children) : typeof tree === 'string' ? tree : ''; }
const draw = () => HomeHowItWorks({ lang: 'en', recharge: true, connectionSteps: [{ title: 'Choose your pack', body: 'Review installation details.' }] });
beforeEach(() => { state.task = 'recharge'; });
it('switches all three guides in place and labels the selected panel', () => {
  expect(text(draw())).toContain('Track the recharge');
  nodes(draw()).find(node => node.props.id === 'how-tab-connection').props.onClick();
  expect(text(draw())).toContain('Review installation details.');
  expect(nodes(draw()).find(node => node.props.role === 'tabpanel').props['aria-labelledby']).toBe('how-tab-connection');
  nodes(draw()).find(node => node.props.id === 'how-tab-service').props.onClick();
  expect(text(draw())).toContain('General support is free.');
});
it('supports arrow and Home/End navigation with roving focus', () => {
  const focus = vi.fn(); const preventDefault = vi.fn();
  nodes(draw()).find(node => node.props.id === 'how-tab-recharge').props.onKeyDown({ key: 'End', preventDefault, currentTarget: { parentElement: { querySelector: () => ({ focus }) } } });
  expect(state.task).toBe('service'); expect(focus).toHaveBeenCalled(); expect(preventDefault).toHaveBeenCalled();
  expect(nodes(draw()).find(node => node.props.id === 'how-tab-service').props.tabIndex).toBe(0);
});
it('includes saved-connection, pending-payment and pack availability answers in both languages', () => {
  expect(homeRechargeFaqs('en')).toHaveLength(8); expect(homeRechargeFaqs('en')[1][1]).toContain('Do not pay again');
  expect(homeRechargeFaqs('ta').flat().every(value => /[\u0B80-\u0BFF]/.test(value))).toBe(true);
});
