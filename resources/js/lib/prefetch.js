import { router } from '@inertiajs/react';

const SKIP = /^\/(logout|storage\/|build\/|webhooks\/|admin\/reports\/export)|\.(pdf|csv|xml|txt|zip|png|jpe?g|webp|svg)$/i;
const HOVER_DELAY = 65;
const seen = new Map();

function candidate(el) {
    const a = el instanceof Element ? el.closest('a[href]') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.noPrefetch !== undefined) return null;
    let url;
    try {
        url = new URL(a.href, location.href);
    } catch {
        return null;
    }
    if (url.origin !== location.origin || SKIP.test(url.pathname)) return null;
    if (url.pathname === location.pathname && url.search === location.search) return null;
    return url;
}

function prefetch(url) {
    const key = url.pathname + url.search;
    const last = seen.get(key) ?? 0;
    if (Date.now() - last < 25_000) return;
    seen.set(key, Date.now());
    router.prefetch(key, { method: 'get' }, { cacheFor: '30s' });
}

export function installPrefetch() {
    if (typeof window === 'undefined' || navigator.connection?.saveData) return;
    let timer = 0;
    document.addEventListener(
        'pointerover',
        (e) => {
            const url = candidate(e.target);
            clearTimeout(timer);
            if (url) timer = setTimeout(() => prefetch(url), HOVER_DELAY);
        },
        { passive: true },
    );
    document.addEventListener('pointerout', () => clearTimeout(timer), { passive: true });
    document.addEventListener(
        'touchstart',
        (e) => {
            const url = candidate(e.target);
            if (url) prefetch(url);
        },
        { passive: true },
    );
    document.addEventListener('focusin', (e) => {
        const url = candidate(e.target);
        if (url) prefetch(url);
    });
    router.on('finish', (event) => {
        if (event.detail.visit?.method && event.detail.visit.method !== 'get') {
            router.flushAll();
            seen.clear();
        }
    });
}
