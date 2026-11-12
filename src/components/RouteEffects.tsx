import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import type { Language } from '../types';
import { updatePageMetadata } from '../lib/pageMetadata';
import { navigationScrollPosition, type ScrollPosition } from '../lib/navigationScroll';

const storageKey = 'dth_route_scroll_positions';
function readPositions(): Map<string, ScrollPosition> {
  try {
    const values = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
    return new Map(Object.entries(values).filter(([, value]: [string, any]) => Number.isFinite(value?.x) && Number.isFinite(value?.y) && value.x >= 0 && value.y >= 0) as [string, ScrollPosition][]);
  } catch { return new Map(); }
}
export function RouteEffects({ currentLang }: { currentLang: Language }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [positions] = useState(readPositions);
  const currentKey = useRef(location.key);
  const lastKey = useRef<string | null>(null);
  const pendingRestore = useRef<ScrollPosition | null>(null);

  useLayoutEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const save = () => {
      if (pendingRestore.current) return; // Don't overwrite a target with a clamped, still-loading page position.
      positions.set(currentKey.current, { x: window.scrollX, y: window.scrollY });
      if (positions.size > 50) positions.delete(positions.keys().next().value!);
    };
    const persist = () => { save(); try { sessionStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(positions))); } catch {} };
    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('pagehide', persist);
    return () => { persist(); history.scrollRestoration = previous; window.removeEventListener('scroll', save); window.removeEventListener('pagehide', persist); };
  }, [positions]);

  useLayoutEffect(() => {
    const header = document.querySelector('.app-header');
    const update = () => document.documentElement.style.setProperty('--app-header-height', `${header?.getBoundingClientRect().height || 0}px`);
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (header) observer?.observe(header);
    window.addEventListener('resize', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  useLayoutEffect(() => {
    const initial = lastKey.current === null || lastKey.current === location.key;
    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const saved = positions.get(location.key);
    const target = navigationScrollPosition(navigationType, saved, initial, timing?.type);
    const restoring = navigationType === 'POP' && (!initial || timing?.type === 'back_forward') && !!saved;
    pendingRestore.current = restoring ? target : null;
    lastKey.current = location.key;
    currentKey.current = location.key;
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout>;
    let observer: ResizeObserver | null = null;
    const stop = () => { stopped = true; pendingRestore.current = null; clearTimeout(timeout); observer?.disconnect(); window.removeEventListener('wheel', stop); window.removeEventListener('touchstart', stop); window.removeEventListener('keydown', onKey); };
    const onKey = (event: KeyboardEvent) => { if (['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End', ' '].includes(event.key)) stop(); };
    const apply = () => {
      if (stopped) return;
      if (location.hash && !restoring) {
        let id: string;
        try { id = decodeURIComponent(location.hash.slice(1)); } catch { stop(); return; }
        const element = document.getElementById(id);
        if (!element) return;
        element.scrollIntoView({ block: 'start', behavior: 'instant' });
        if (id === 'custom-recharge-card') document.getElementById('custom-amount-input')?.focus({ preventScroll: true });
        stop(); return;
      }
      window.scrollTo({ left: target.x, top: target.y, behavior: 'instant' });
      if (!restoring || document.documentElement.scrollHeight >= target.y + window.innerHeight) stop();
    };
    // Re-apply a history position when asynchronous catalog content becomes tall enough.
    observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
    observer?.observe(document.body);
    timeout = setTimeout(stop, 5000);
    window.addEventListener('wheel', stop, { passive: true }); window.addEventListener('touchstart', stop, { passive: true }); window.addEventListener('keydown', onKey);
    apply();
    const frame = requestAnimationFrame(apply);
    return () => { cancelAnimationFrame(frame); stop(); };
  }, [location.key, location.hash, navigationType, positions]);

  useEffect(() => {
    updatePageMetadata(document, location.pathname, currentLang, window.location.origin);
    document.cookie = `dth_lang=${currentLang}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  }, [location.pathname, currentLang]);
  return null;
}
