import { postJson } from '@/lib/http';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart';

export function useCartSync() {
    const { items } = useCart();
    const [state, setState] = useState({ groups: [], missing: [], loading: true });
    const timer = useRef();
    const signature = items.map((i) => `${i.id}:${i.quantity}`).join(',');

    useEffect(() => {
        clearTimeout(timer.current);
        if (!items.length) {
            setState({ groups: [], missing: [], loading: false });
            return;
        }
        setState((s) => ({ ...s, loading: s.groups.length === 0 }));
        timer.current = setTimeout(async () => {
            try {
                const { data } = await postJson(route('cart.sync'), { items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })) });
                setState({ groups: data.groups, missing: data.missing, loading: false });
            } catch {
                setState((s) => ({ ...s, loading: false }));
            }
        }, 250);
        return () => clearTimeout(timer.current);
    }, [signature]);

    return state;
}
