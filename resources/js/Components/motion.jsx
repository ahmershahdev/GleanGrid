import { animate, AnimatePresence, motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn, prefersReducedMotion } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1];

export function Reveal({ children, delay = 0, y = 28, className, as = 'div' }) {
    const Tag = motion[as];
    return (
        <Tag
            className={className}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.9, delay, ease: EASE }}
        >
            {children}
        </Tag>
    );
}

export function SplitWords({ text, className, delay = 0, stagger = 0.06, as = 'span', immediate = false }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-40px' });
    const show = immediate || inView;
    const Tag = as;
    const words = String(text).split(' ');
    return (
        <Tag ref={ref} className={className}>
            <span className="sr-only">{text}</span>
            {words.map((word, i) => (
                <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.12em] align-top">
                    {immediate ? (
                        <span className="gg-word inline-block" style={{ animationDelay: `${delay + i * stagger}s` }}>
                            {word}
                        </span>
                    ) : (
                        <motion.span
                            className="inline-block will-change-transform"
                            initial={{ y: '110%', rotate: 4 }}
                            animate={show ? { y: 0, rotate: 0 } : {}}
                            transition={{ duration: 1, delay: delay + i * stagger, ease: EASE }}
                        >
                            {word}
                        </motion.span>
                    )}
                    {i < words.length - 1 && ' '}
                </span>
            ))}
        </Tag>
    );
}

export function Magnetic({ children, strength = 0.35, className }) {
    const ref = useRef(null);
    const x = useSpring(0, { stiffness: 200, damping: 15 });
    const y = useSpring(0, { stiffness: 200, damping: 15 });

    const onMove = (e) => {
        if (prefersReducedMotion() || window.matchMedia('(pointer: coarse)').matches) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const reset = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div ref={ref} style={{ x, y }} onPointerMove={onMove} onPointerLeave={reset} className={cn(/(^|\s)(hidden|block|flex|inline-flex|grid)(\s|$)/.test(className ?? '') ? null : 'inline-block', className)}>
            {children}
        </motion.div>
    );
}

export function Marquee({ children, duration = 40, reverse = false, className }) {
    return (
        <div className={cn('mask-fade-x flex overflow-hidden', className)}>
            <div className="flex w-max shrink-0 animate-marquee hover:[animation-play-state:paused]" style={{ '--marquee-duration': `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}>
                <div className="flex shrink-0 items-center">{children}</div>
                <div className="flex shrink-0 items-center" aria-hidden="true">
                    {children}
                </div>
            </div>
        </div>
    );
}

export function CountUp({ value, format = (n) => Math.round(n).toLocaleString(), duration = 1.8, className }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    const [display, setDisplay] = useState(prefersReducedMotion() ? value : 0);

    useEffect(() => {
        if (!inView || prefersReducedMotion()) return;
        const controls = animate(0, Number(value) || 0, { duration, ease: EASE, onUpdate: setDisplay });
        return () => controls.stop();
    }, [inView, value, duration]);

    return (
        <span ref={ref} className={className}>
            {format(display)}
        </span>
    );
}

export function Parallax({ children, speed = 0.2, className, style }) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, `${-speed * 100}%`]);
    return (
        <motion.div ref={ref} style={{ ...style, y }} className={className}>
            {children}
        </motion.div>
    );
}

export function HorizontalScroll({ head, children, count, className, trackClassName, label }) {
    const outer = useRef(null);
    const track = useRef(null);
    const [dist, setDist] = useState(0);
    const [still, setStill] = useState(false);
    const [rtl, setRtl] = useState(false);
    const { scrollYProgress } = useScroll({ target: outer, offset: ['start start', 'end end'] });
    const raw = useTransform(scrollYProgress, (v) => (rtl ? 1 : -1) * v * dist);
    const x = useSpring(raw, { stiffness: 140, damping: 30, mass: 0.4 });
    const bar = useTransform(scrollYProgress, [0, 1], [0, 1]);
    const [index, setIndex] = useState(1);

    useEffect(() => {
        setStill(prefersReducedMotion());
        setRtl(document.documentElement.dir === 'rtl');
        const measure = () => track.current && setDist(Math.max(0, track.current.scrollWidth - window.innerWidth));
        measure();
        const ro = new ResizeObserver(measure);
        if (track.current) ro.observe(track.current);
        window.addEventListener('resize', measure);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, []);

    useEffect(() => scrollYProgress.on('change', (v) => setIndex(Math.min(count, Math.max(1, Math.round(v * (count - 1)) + 1)))), [scrollYProgress, count]);

    const onFocus = (e) => {
        const item = e.target.closest('[data-hs-item]');
        if (!item || !outer.current || !dist) return;
        const start = outer.current.getBoundingClientRect().top + window.scrollY;
        const offset = rtl ? track.current.scrollWidth - item.offsetLeft - item.offsetWidth : item.offsetLeft;
        const ratio = Math.min(1, Math.max(0, (offset - 24) / dist));
        window.scrollTo({ top: start + ratio * (outer.current.offsetHeight - window.innerHeight), behavior: 'instant' });
    };

    if (still) {
        return (
            <section className={className} aria-label={label}>
                {head}
                <ul className={cn('no-scrollbar mt-10 flex snap-x snap-mandatory overflow-x-auto', trackClassName)} data-lenis-prevent>
                    {children}
                </ul>
            </section>
        );
    }

    return (
        <section ref={outer} className={cn('relative', className)} style={{ height: `calc(100svh + ${dist}px)` }} aria-label={label}>
            <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden py-[max(5rem,8svh)]">
                {head}
                <motion.ul ref={track} style={{ x }} onFocusCapture={onFocus} className={cn('mt-8 flex w-max will-change-transform md:mt-12', trackClassName)}>
                    {children}
                </motion.ul>
                <div className="mx-auto mt-8 flex w-full max-w-[1400px] items-center gap-4 px-5 sm:px-8" aria-hidden="true">
                    <span className="font-mono text-xs tabular-nums text-ink-soft">{String(index).padStart(2, '0')}</span>
                    <span className="relative h-px flex-1 overflow-hidden bg-line-strong">
                        <motion.span style={{ scaleX: bar }} className="absolute inset-0 origin-left bg-ink rtl:origin-right" />
                    </span>
                    <span className="font-mono text-xs tabular-nums text-ink-faint">{String(count).padStart(2, '0')}</span>
                </div>
            </div>
        </section>
    );
}

export function Cursor() {
    const x = useMotionValue(-100);
    const y = useMotionValue(-100);
    const rx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.5 });
    const ry = useSpring(y, { stiffness: 380, damping: 32, mass: 0.5 });
    const [state, setState] = useState({ mode: 'idle', label: '', rect: null, radius: 999 });
    const [enabled, setEnabled] = useState(false);
    const [visible, setVisible] = useState(false);
    const [down, setDown] = useState(false);

    useEffect(() => {
        if (!window.matchMedia('(pointer: fine)').matches || prefersReducedMotion()) return;
        setEnabled(true);
        document.documentElement.classList.add('has-custom-cursor');

        let stuck = null;
        const move = (e) => {
            setVisible(true);
            const native = e.target.closest?.('[data-native-cursor], .leaflet-container, iframe');
            const field = e.target.closest?.('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]), textarea, select, [contenteditable=true]');
            const labelled = e.target.closest?.('[data-cursor]');
            const target = e.target.closest?.('a, button, [role="button"], label, summary');

            if (stuck && stuck !== target) {
                stuck.style.translate = '';
                stuck = null;
            }

            if (native) {
                x.set(e.clientX);
                y.set(e.clientY);
                return setState((s) => (s.mode === 'native' ? s : { mode: 'native', label: '', rect: null, radius: 999 }));
            }
            if (field) {
                x.set(e.clientX);
                y.set(e.clientY);
                return setState((s) => (s.mode === 'text' ? s : { mode: 'text', label: '', rect: null, radius: 2 }));
            }
            if (labelled) {
                x.set(e.clientX);
                y.set(e.clientY);
                const label = labelled.getAttribute('data-cursor');
                return setState((s) => (s.mode === 'label' && s.label === label ? s : { mode: 'label', label, rect: null, radius: 999 }));
            }
            if (target) {
                const r = target.getBoundingClientRect();
                if (r.width < 260 && r.height < 90) {
                    const cx = r.left + r.width / 2;
                    const cy = r.top + r.height / 2;
                    const dx = (e.clientX - cx) * 0.18;
                    const dy = (e.clientY - cy) * 0.18;
                    x.set(cx + dx);
                    y.set(cy + dy);
                    const ownTranslate = stuck === target ? 'none' : getComputedStyle(target).translate;
                    if (!target.closest('[data-no-magnet]') && ownTranslate === 'none') {
                        target.style.transition = 'translate 0.25s cubic-bezier(0.16,1,0.3,1)';
                        target.style.translate = `${dx * 0.5}px ${dy * 0.5}px`;
                        stuck = target;
                    }
                    const radius = parseFloat(getComputedStyle(target).borderTopLeftRadius) || 12;
                    return setState((s) => (s.mode === 'stick' && s.rect?.width === r.width && s.rect?.height === r.height ? s : { mode: 'stick', label: '', rect: { width: r.width + 10, height: r.height + 10 }, radius: Math.min(radius + 5, (r.height + 10) / 2) }));
                }
                x.set(e.clientX);
                y.set(e.clientY);
                return setState((s) => (s.mode === 'hover' ? s : { mode: 'hover', label: '', rect: null, radius: 999 }));
            }
            x.set(e.clientX);
            y.set(e.clientY);
            setState((s) => (s.mode === 'idle' ? s : { mode: 'idle', label: '', rect: null, radius: 999 }));
        };
        const leave = () => setVisible(false);
        const press = () => setDown(true);
        const release = () => setDown(false);
        const scroll = () => {
            if (stuck) {
                stuck.style.translate = '';
                stuck = null;
            }
            setState((s) => (s.mode === 'stick' ? { mode: 'idle', label: '', rect: null, radius: 999 } : s));
        };

        window.addEventListener('pointermove', move, { passive: true });
        document.documentElement.addEventListener('pointerleave', leave);
        window.addEventListener('pointerdown', press);
        window.addEventListener('pointerup', release);
        window.addEventListener('scroll', scroll, { passive: true });
        return () => {
            window.removeEventListener('pointermove', move);
            document.documentElement.removeEventListener('pointerleave', leave);
            window.removeEventListener('pointerdown', press);
            window.removeEventListener('pointerup', release);
            window.removeEventListener('scroll', scroll);
            document.documentElement.classList.remove('has-custom-cursor');
            if (stuck) stuck.style.translate = '';
        };
    }, [x, y]);

    if (!enabled) return null;

    const { mode, label, rect, radius } = state;
    const ring = {
        idle: { width: 34, height: 34, backgroundColor: 'rgba(0,0,0,0)', borderColor: 'var(--line-strong)' },
        hover: { width: 56, height: 56, backgroundColor: 'rgba(201,226,101,0.18)', borderColor: 'var(--brand)' },
        stick: { width: rect?.width ?? 40, height: rect?.height ?? 40, backgroundColor: 'rgba(201,226,101,0.12)', borderColor: 'var(--brand)' },
        label: { width: 92, height: 92, backgroundColor: 'rgba(201,226,101,1)', borderColor: 'rgba(201,226,101,1)' },
        text: { width: 3, height: 26, backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' },
        native: { width: 0, height: 0, backgroundColor: 'rgba(0,0,0,0)', borderColor: 'rgba(0,0,0,0)' },
    }[mode];

    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[140] hidden md:block">
            <motion.div className="absolute top-0 left-0" style={{ x: rx, y: ry }}>
                <motion.div
                    className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center border text-[11px] font-semibold tracking-[0.14em] text-forest uppercase"
                    animate={{ ...ring, borderRadius: mode === 'stick' ? radius : mode === 'text' ? 2 : 999, opacity: visible ? 1 : 0, scale: down ? 0.82 : 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.6 }}
                >
                    <AnimatePresence>
                        {mode === 'label' && (
                            <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
                                {label}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
            <motion.div className="absolute top-0 left-0" style={{ x, y }}>
                <motion.div
                    className="size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
                    animate={{ opacity: visible && (mode === 'idle' || mode === 'hover') ? 1 : 0, scale: down ? 2 : 1 }}
                    transition={{ duration: 0.15 }}
                />
            </motion.div>
        </div>
    );
}
