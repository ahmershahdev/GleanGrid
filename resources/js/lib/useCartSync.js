import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart';

/** Re-validates the local basket against live stock and fetches pickup windows per farmer. */
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
                const { data } = await axios.post(route('cart.sync'), { items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })) });
                setState({ groups: data.groups, missing: data.missing, loading: false });
            } catch {
                setState((s) => ({ ...s, loading: false }));
            }
        }, 250);
        return () => clearTimeout(timer.current);
    }, [signature]);

    return state;
}
