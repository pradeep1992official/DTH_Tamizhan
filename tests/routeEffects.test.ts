import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const hooks = vi.hoisted(() => ({ slots: [] as any[], index: 0, pending: [] as (() => void)[], location: { key: 'recharge', pathname: '/recharge', search: '', hash: '' }, type: 'POP' }));
vi.mock('react', () => ({
  useRef: (initial: any) => { const i = hooks.index++; return hooks.slots[i] ||= { current: initial }; },
  useState: (initial: any) => { const i = hooks.index++; if (!(i in hooks.slots)) hooks.slots[i] = typeof initial === 'function' ? initial() : initial; return [hooks.slots[i]]; },
  useEffect: () => {}, // Metadata is covered separately; these tests execute the actual scroll layout effects.
  useLayoutEffect: (effect: any, deps: any[]) => {
    const i = hooks.index++; const previous = hooks.slots[i];
    if (!previous || deps.some((dep, index) => dep !== previous.deps[index])) hooks.pending.push(() => {
      previous?.cleanup?.(); hooks.slots[i] = { deps, cleanup: effect() };
    });
  },
}));
vi.mock('react-router-dom', () => ({ useLocation: () => hooks.location, useNavigationType: () => hooks.type }));
import { RouteEffects } from '../src/components/RouteEffects';

let events: Map<string, Set<() => void>>;
let observers: { active: boolean; callback: () => void }[];
let win: any;
let doc: any;
const render = () => { hooks.index = 0; hooks.pending = []; RouteEffects({ currentLang: 'en' }); hooks.pending.forEach(effect => effect()); };
const emit = (name: string) => events.get(name)?.forEach(callback => callback());
beforeEach(() => {
  vi.useFakeTimers(); hooks.slots = []; hooks.location = { key: 'recharge', pathname: '/recharge', search: '', hash: '' }; hooks.type = 'POP';
  events = new Map(); observers = [];
  doc = { body: {}, documentElement: { scrollHeight: 4000, style: { setProperty: vi.fn() } }, querySelector: () => ({ getBoundingClientRect: () => ({ height: 160 }) }), getElementById: vi.fn(() => null) };
  win = { scrollX: 0, scrollY: 0, innerHeight: 900,
    addEventListener: (name: string, callback: () => void) => { if (!events.has(name)) events.set(name, new Set()); events.get(name)!.add(callback); },
    removeEventListener: (name: string, callback: () => void) => events.get(name)?.delete(callback),
    scrollTo: vi.fn(({ left, top }) => { win.scrollX = left; win.scrollY = Math.min(top, Math.max(0, doc.documentElement.scrollHeight - win.innerHeight)); emit('scroll'); }),
  };
  vi.stubGlobal('window', win); vi.stubGlobal('document', doc); vi.stubGlobal('history', { scrollRestoration: 'auto' });
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal('performance', { getEntriesByType: () => [{ type: 'navigate' }] });
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => { fn(); return 1; }); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('ResizeObserver', class { record: any; constructor(callback: () => void) { this.record = { callback, active: true }; observers.push(this.record); } observe() {} disconnect() { this.record.active = false; } });
});
afterEach(() => { for (const slot of hooks.slots) slot?.cleanup?.(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it('resets a lower checkout position on Browse Packs navigation and measures the sticky header', () => {
  render(); win.scrollY = 1800; emit('scroll');
  hooks.location = { key: 'plans', pathname: '/plans', search: '', hash: '' }; hooks.type = 'PUSH'; render();
  expect(win.scrollY).toBe(0);
  expect(doc.documentElement.style.setProperty).toHaveBeenCalledWith('--app-header-height', '160px');
});
it('restores a real back navigation after asynchronous content grows without overwriting the saved target', () => {
  render(); win.scrollY = 1800; emit('scroll');
  hooks.location = { key: 'plans', pathname: '/plans', search: '', hash: '' }; hooks.type = 'PUSH'; render();
  doc.documentElement.scrollHeight = 1000;
  hooks.location = { key: 'recharge', pathname: '/recharge', search: '', hash: '' }; hooks.type = 'POP'; render();
  expect(win.scrollY).toBe(100); // Browser clamp while content is loading.
  doc.documentElement.scrollHeight = 4000;
  for (const observer of observers) if (observer.active) observer.callback();
  expect(win.scrollY).toBe(1800);
});
it('honors an explicit custom-top-up destination and focuses the amount field below the header', () => {
  const scrollIntoView = vi.fn(); const focus = vi.fn();
  doc.getElementById.mockImplementation((id: string) => id === 'custom-recharge-card' ? { scrollIntoView } : { focus });
  hooks.location = { key: 'topup', pathname: '/recharge', search: '?operator=dish_tv&topup=1', hash: '#custom-recharge-card' }; hooks.type = 'PUSH'; render();
  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
