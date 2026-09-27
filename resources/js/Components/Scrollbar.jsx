import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getLenis } from '@/lib/scroll';
import { cn } from '@/lib/utils';

const MIN_THUMB = 48;
const IDLE_MS = 1300;

export default function Scrollbar() {
    const [enabled, setEnabled] = useState(false);
    const [thumb, setThumb] = useState({ size: 0, offset: 0, pct: 0, scrollable: false });
    const [active, setActive] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [hover, setHover] = useState(false);
    const rail = useRef(null);
    const idle = useRef(0);
    const drag = useRef(null);

    useEffect(() => {
        const fine = window.matchMedia('(pointer: fine)');
        const apply = () => setEnabled(fine.matches);
        apply();
        fine.addEventListener('change', apply);
        return () => fine.removeEventListener('change', apply);
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('has-custom-scrollbar', enabled);
        return () => document.documentElement.classList.remove('has-custom-scrollbar');
    }, [enabled]);

    const measure = useCallback(() => {
        const doc = document.documentElement;
        const view = window.innerHeight;
        const total = doc.scrollHeight;
        const max = Math.max(1, total - view);
        const size = Math.max(MIN_THUMB, (view / total) * view);
        const pct = Math.min(1, Math.max(0, window.scrollY / max));
        setThumb({ size, offset: pct * (view - size), pct, scrollable: total > view + 4 });
    }, []);

    const wake = useCallback(() => {
        setActive(true);
        clearTimeout(idle.current);
        idle.current = setTimeout(() => !drag.current && setActive(false), IDLE_MS);
    }, []);

    useEffect(() => {
        if (!enabled) return;
        measure();
        const onScroll = () => {
            measure();
            wake();
        };
        const ro = new ResizeObserver(measure);
        ro.observe(document.body);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', measure);
        const onMove = (e) => {
            const nearEdge = document.dir === 'rtl' ? e.clientX < 28 : window.innerWidth - e.clientX < 28;
            if (nearEdge) wake();
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => {
            ro.disconnect();
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', measure);
            window.removeEventListener('pointermove', onMove);
        };
    }, [enabled, measure, wake]);

    const scrollToRatio = (ratio, immediate) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const y = Math.min(max, Math.max(0, ratio * max));
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(y, { immediate, lock: false, force: true, duration: 1.1 });
        else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
    };

    const onThumbDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { startY: e.clientY, startOffset: thumb.offset };
        setDragging(true);
        document.documentElement.classList.add('is-grabbing');
        wake();
    };

    const onThumbMove = (e) => {
        if (!drag.current) return;
        const travel = window.innerHeight - thumb.size;
        const offset = drag.current.startOffset + (e.clientY - drag.current.startY);
        scrollToRatio(travel > 0 ? offset / travel : 0, true);
    };

    const endDrag = (e) => {
        if (!drag.current) return;
        drag.current = null;
        setDragging(false);
        document.documentElement.classList.remove('is-grabbing');
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        wake();
    };

    const onRailDown = (e) => {
        if (e.target !== rail.current) return;
        const travel = window.innerHeight - thumb.size;
        scrollToRatio(travel > 0 ? (e.clientY - thumb.size / 2) / travel : 0, false);
    };

    if (!enabled || !thumb.scrollable) return null;
    const visible = active || hover || dragging;

    return (
        <div
            ref={rail}
            onPointerDown={onRailDown}
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => setHover(false)}
            aria-hidden="true"
            data-native-cursor
            className={cn('fixed inset-y-0 end-0 z-[125] w-3 transition-colors duration-300', hover || dragging ? 'bg-ink/[0.04]' : 'bg-transparent')}
        >
            <motion.div
                onPointerDown={onThumbDown}
                onPointerMove={onThumbMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                animate={{ opacity: visible ? 1 : 0, width: hover || dragging ? 6 : 3.5 }}
                transition={{ opacity: { duration: 0.35 }, width: { type: 'spring', stiffness: 500, damping: 30 } }}
                style={{ height: thumb.size, transform: `translateY(${thumb.offset}px)` }}
                className={cn(
                    'absolute end-[2px] top-0 rounded-full',
                    dragging ? 'cursor-grabbing bg-gradient-to-b from-lime via-sun to-accent shadow-[0_0_0_4px_rgb(226_85_44/0.15)]' : 'cursor-grab bg-ink/30 hover:bg-gradient-to-b hover:from-lime hover:via-sun hover:to-accent',
                )}
            >
                <AnimatePresence>
                    {dragging && (
                        <motion.span
                            initial={{ opacity: 0, x: 8, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 8, scale: 0.8 }}
                            className="pointer-events-none absolute end-5 top-1/2 -translate-y-1/2 rounded-full bg-ink px-2.5 py-1 font-mono text-[11px] text-bg tabular-nums shadow-soft"
                        >
                            {Math.round(thumb.pct * 100)}%
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
