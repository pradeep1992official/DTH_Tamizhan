import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ values: [] as any[], refs: [] as any[], index: 0, refIndex: 0 }));
vi.mock('react', async original => ({ ...(await original<any>()),
  useState: (initial: any) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: any) => { state.values[index] = value; }];
  },
  useRef: (initial: any) => state.refs[state.refIndex++] ||= { current: initial },
}));
vi.mock('../src/lib/useAccessibleModal', () => ({ useAccessibleModal: () => ({ modalRef: { current: null } }) }));
import { SavedConnections } from '../src/components/SavedConnections';
import { OPERATOR_THEMES } from '../src/lib/theme';
function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  return [tree, ...nodes((tree.props as any).children)];
}
const props = { connections: [], user: { uid: 'owner' }, currentLang: 'en', currentTheme: OPERATOR_THEMES.sun_direct,
  onQuickRecharge: vi.fn(), onAddConnection: vi.fn(), onDeleteConnection: vi.fn(), onOpenAuth: vi.fn() } as any;
function render() { state.index = 0; state.refIndex = 0; return nodes(SavedConnections(props)); }
function open() { render().find(node => node.props.id === 'add-connection-btn').props.onClick(); }
const backdrop = () => render().find(node => node.props.onPointerDown);
const dialog = () => render().find(node => node.props.role === 'dialog');
beforeEach(() => { state.values = []; state.refs = []; });
describe('saved box dialog dismissal', () => {
  it('offers ID correction instead of recharge and never renders a balance', () => {
    props.connections = [{ id: 'box', user_id: 'owner', operator: 'sun_direct', operatorName: 'Sun Direct', nickname: 'Home', smartCardNumber: '412536552222', balance: 150, createdAt: '' }];
    try {
      const update = render().find(node => node.type === 'span' && node.props.children === 'Update ID');
      expect(update).toBeDefined();
      expect(render().some(node => node.props.children === 'Balance')).toBe(false);
      const button = render().find(node => node.type === 'button' && nodes(node.props.children).some(child => child.props.children === 'Update ID'));
      button.props.onClick();
      expect(dialog()).toBeDefined();
      expect(render().find(node => node.props.id === 'saved-box-id').props.value).toBe('412536552222');
      expect(props.onQuickRecharge).not.toHaveBeenCalled();
    } finally { props.connections = []; }
  });
  it('keeps the dialog and ID edits when a text selection ends on the backdrop', () => {
    open();
    const surface = {};
    const id = render().find(node => node.props.id === 'saved-box-id');
    backdrop().props.onPointerDown({ target: id, currentTarget: surface });
    id.props.onChange({ target: { value: '12345678901' } });
    backdrop().props.onClick({ target: surface, currentTarget: surface });
    expect(dialog()).toBeDefined();
    expect(render().find(node => node.props.id === 'saved-box-id').props.value).toBe('12345678901');
  });
  it('still closes on an intentional backdrop click', () => {
    open(); const surface = {};
    backdrop().props.onPointerDown({ target: surface, currentTarget: surface });
    backdrop().props.onClick({ target: surface, currentTarget: surface });
    expect(dialog()).toBeUndefined();
  });
  it('does not dismiss after a cancelled pointer gesture', () => {
    open(); const surface = {};
    backdrop().props.onPointerDown({ target: surface, currentTarget: surface });
    backdrop().props.onPointerCancel();
    backdrop().props.onClick({ target: surface, currentTarget: surface });
    expect(dialog()).toBeDefined();
  });
});
