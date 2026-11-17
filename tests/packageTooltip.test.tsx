import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ details: null as any, cleanup: null as null | (() => void), listeners: new Map<string, (event: any) => void>() }));
vi.mock('react', async original => ({ ...await original<any>(), useRef: () => ({ current: f.details }), useEffect: (effect: () => (() => void)) => { f.cleanup = effect(); } }));
import { PackageTooltip } from '../src/components/NewConnection/PackageTooltip';
const inside = {};
let focus: ReturnType<typeof vi.fn>;
let removeListener: ReturnType<typeof vi.fn>;
const props = { packageType: 'only_box' as const, boxType: 'HD' as const, lang: 'en' as const };
beforeEach(() => {
  f.listeners.clear(); focus = vi.fn();
  f.details = { open: true, contains: (target: unknown) => target === inside, querySelector: () => ({ focus }) };
  removeListener = vi.fn();
  vi.stubGlobal('document', { addEventListener: (name: string, handler: (event: any) => void) => f.listeners.set(name, handler), removeEventListener: removeListener, querySelectorAll: () => [] });
});
afterEach(() => { f.cleanup?.(); f.cleanup = null; vi.unstubAllGlobals(); });

it('closes on an outside click or tap without stealing focus', () => {
  PackageTooltip(props);
  f.listeners.get('pointerdown')!({ target: {} });
  expect(f.details.open).toBe(false);
  expect(focus).not.toHaveBeenCalled();
});

it('keeps clicks within the tooltip open, and closes when keyboard focus leaves', () => {
  PackageTooltip(props);
  f.listeners.get('pointerdown')!({ target: inside });
  expect(f.details.open).toBe(true);
  f.listeners.get('focusin')!({ target: {} });
  expect(f.details.open).toBe(false);
});

it('closes on Escape and returns focus to the info toggle', () => {
  PackageTooltip(props);
  f.listeners.get('keydown')!({ key: 'Escape' });
  expect(f.details.open).toBe(false);
  expect(focus).toHaveBeenCalledOnce();
});

it('closes other package tooltips when a new one opens and cleans up listeners', () => {
  const other = { open: true };
  (document.querySelectorAll as any) = () => [f.details, other];
  const tooltip = PackageTooltip(props) as React.ReactElement<any>;
  tooltip.props.onToggle({ currentTarget: f.details });
  expect(other.open).toBe(false);
  expect(f.details.open).toBe(true);
  f.cleanup!(); f.cleanup = null;
  expect(removeListener).toHaveBeenCalledTimes(3);
});
