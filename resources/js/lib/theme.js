import { useSyncExternalStore } from 'react';

const KEY = 'gg-theme';
const listeners = new Set();
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function stored() {
    try {
        return localStorage.getItem(KEY) || 'system';
    } catch {
        return 'system';
    }
}

let current = stored();

function apply() {
    const dark = current === 'dark' || (current === 'system' && media?.matches);
    document.documentElement.classList.toggle('dark', !!dark);
    listeners.forEach((l) => l());
}

media?.addEventListener('change', () => current === 'system' && apply());

export function setTheme(theme) {
    current = theme;
    try {
        localStorage.setItem(KEY, theme);
    } catch {
        /* ignore */
    }
    // Cross-fade colours instead of snapping.
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.startViewTransition(apply);
    } else {
        apply();
    }
}

export function useTheme() {
    const theme = useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => current, () => 'system');
    const isDark = useSyncExternalStore(
        (l) => (listeners.add(l), () => listeners.delete(l)),
        () => document.documentElement.classList.contains('dark'),
        () => false,
    );
    return { theme, isDark, setTheme };
}
