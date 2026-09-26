import { useSyncExternalStore } from 'react';

/*
 * The basket lives in localStorage so guests can fill it before signing in.
 * Shape: [{ id, name, price, unit, image_url, farmer: { id, stall_name, slug }, quantity }]
 * Server-side `/cart/sync` re-validates prices and stock before checkout.
 */
const KEY = 'gg-cart';
const listeners = new Set();
let cache = read();

function read() {
    try {
        return JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
        return [];
    }
}

function write(items) {
    cache = items;
    try {
        localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
        /* storage unavailable (private mode) — keep the in-memory copy */
    }
    listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
    // Keep multiple tabs in sync.
    window.addEventListener('storage', (e) => {
        if (e.key === KEY) {
            cache = read();
            listeners.forEach((l) => l());
        }
    });
}

export const cart = {
    items: () => cache,
    add(product, quantity = 1) {
        const existing = cache.find((i) => i.id === product.id);
        const max = product.stock_quantity ?? 999;
        if (existing) {
            write(cache.map((i) => (i.id === product.id ? { ...i, quantity: Math.min(max, i.quantity + quantity) } : i)));
        } else {
            write([
                ...cache,
                {
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    unit: product.unit,
                    image_url: product.image_url,
                    farmer: product.farmer ? { id: product.farmer.id, stall_name: product.farmer.stall_name, slug: product.farmer.slug } : null,
                    quantity: Math.min(max, quantity),
                },
            ]);
        }
    },
    set(id, quantity) {
        write(quantity <= 0 ? cache.filter((i) => i.id !== id) : cache.map((i) => (i.id === id ? { ...i, quantity } : i)));
    },
    remove(id) {
        write(cache.filter((i) => i.id !== id));
    },
    removeMany(ids) {
        write(cache.filter((i) => !ids.includes(i.id)));
    },
    clear() {
        write([]);
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};

export function useCart() {
    const items = useSyncExternalStore(cart.subscribe, cart.items, () => []);
    return {
        items,
        count: items.reduce((sum, i) => sum + i.quantity, 0),
        total: items.reduce((sum, i) => sum + i.quantity * i.price, 0),
        quantityOf: (id) => items.find((i) => i.id === id)?.quantity ?? 0,
    };
}
