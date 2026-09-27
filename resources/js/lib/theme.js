import { useSyncExternalStore } from 'react';

const KEY = 'gg-theme';
const listeners = new Set();
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function stored() {
    try {
        const v = localStorage.getItem(KEY);
        return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
        return 'system';
    }
}

let current = stored();

function apply() {
    const dark = current === 'dark' || (current === 'system' && media?.matches);
    document.documentElement.classList.toggle('dark', !!dark);
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0D130F' : '#F3EEE3'));
    listeners.forEach((l) => l());
}

media?.addEventListener('change', () => current === 'system' && apply());

export function setTheme(theme, origin) {
    current = theme;
    try {
        localStorage.setItem(KEY, theme);
    } catch {
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) return apply();

    const root = document.documentElement;
    root.classList.add('theme-transition');
    const vt = document.startViewTransition(apply);
    vt.ready
        .then(() => {
            const x = origin?.x ?? window.innerWidth - 40;
            const y = origin?.y ?? 40;
            const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
            root.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
                { duration: 750, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', pseudoElement: '::view-transition-new(root)' },
            );
        })
        .catch(() => {});
    vt.finished.finally(() => root.classList.remove('theme-transition'));
}

const subscribe = (l) => (listeners.add(l), () => listeners.delete(l));

export function useTheme() {
    const theme = useSyncExternalStore(subscribe, () => current, () => 'system');
    const isDark = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'), () => false);
    return { theme, isDark, setTheme, toggle: (origin) => setTheme(isDark ? 'light' : 'dark', origin) };
}
