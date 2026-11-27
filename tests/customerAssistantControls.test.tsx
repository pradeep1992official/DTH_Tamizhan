import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ state: [] as any[], cursor: 0 }));
vi.mock('react', async original => ({ ...await original<any>(),
  useState: (initial: any) => { const i = h.cursor++; if (!(i in h.state)) h.state[i] = typeof initial === 'function' ? initial() : initial;
    return [h.state[i], (value: any) => { h.state[i] = typeof value === 'function' ? value(h.state[i]) : value; }]; },
  useRef: (value: any) => ({ current: value }), useEffect: () => {},
}));
vi.mock('react-dom', () => ({ createPortal: (tree: any) => tree }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../src/lib/firebase', () => ({ auth: null, db: null }));
import { RechargeAssistant } from '../src/components/RechargeAssistant';
function nodes(tree: any): any[] { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!React.isValidElement(tree)) return []; return [tree, ...nodes((tree.props as any).children)]; }
function text(tree: any): string { if (Array.isArray(tree)) return tree.map(text).join(''); if (React.isValidElement(tree)) return text((tree.props as any).children); return typeof tree === 'string' ? tree : ''; }
const checkout = vi.fn();
const render = () => { h.cursor = 0; return RechargeAssistant({ currentLang: 'en', onCheckout: checkout }); };
beforeEach(() => { h.state = []; checkout.mockReset(); vi.stubGlobal('document', { body: {} }); });
it('keeps the selected pack through Escape dismissal and reopening without triggering checkout', () => {
  let tree = render();
  nodes(tree).find(node => node.props.className === 'recharge-chat-launcher').props.onClick();
  h.state[4] = { language: 'en', state: 'awaiting_payment', plans: [{ id: 'pack-1', plan_name: 'Tamil HD', duration_months: 1, amount: 309 }],
    box: { id: 'box', nickname: 'Living room', operatorName: 'Tata Play', smartCardNumber: '1326748991' }, operator: { id: 'tata_play', name: 'Tata Play' } };
  tree = render(); nodes(tree).find(node => node.type === 'input' && node.props.type === 'radio').props.onChange();
  tree = render(); expect(text(tree)).toContain('Tamil HD'); expect(text(tree)).toContain('Ready for payment.');
  nodes(tree).find(node => node.type === 'dialog').props.onCancel();
  expect(h.state[0]).toBe(false); expect(checkout).not.toHaveBeenCalled();
  tree = render(); nodes(tree).find(node => node.props.className === 'recharge-chat-launcher').props.onClick();
  expect(text(render())).toContain('Tamil HD'); expect(h.state[7]).toBe('pack-1');
});
it('shows catalog clarification choices without offering payment or submitting an order', () => {
  render(); h.state[0] = true;
  h.state[4] = { state: 'choose_catalog_duration', language: 'en', text: 'How many months?', suggestions: ['1 months', '6 months'] };
  const tree = render();
  expect(nodes(tree).filter(node => node.type === 'button').map(node => text(node))).toContain('6 months');
  expect(nodes(tree).filter(node => node.type === 'button').some(node => /^Pay\s/.test(text(node)))).toBe(false);
  expect(checkout).not.toHaveBeenCalled();
});
it('offers an explicit support link without submitting a request or opening checkout', () => {
  render(); h.state[0] = true;
  h.state[4] = { state: 'support_help', language: 'en', text: 'Review a support request. Nothing submitted.' };
  const tree = render();
  expect(nodes(tree).find(node => node.type === 'a' && node.props.href === '/help')).toBeDefined();
  expect(checkout).not.toHaveBeenCalled();
});
