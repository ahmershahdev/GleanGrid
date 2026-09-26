import { router } from '@inertiajs/react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowUp, ArrowUpRight, CornerDownLeft, MapPin, Search, ShoppingBasket, Sprout } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/lib/i18n';
import { lockScroll, scrollToTop } from '@/lib/scroll';
import { cn, produceImage } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1];

/* ------------------------------------------------------ Scroll progress */

/** Hairline across the top of the viewport that fills as you read. */
export function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
    return <motion.div aria-hidden="true" style={{ scaleX }} className="fixed inset-x-0 top-0 z-[130] h-[3px] origin-left bg-gradient-to-r from-lime via-sun to-accent rtl:origin-right" />;
}

/* -------------------------------------------------------- Scroll to top */

const R = 25;
const C = 2 * Math.PI * R;

/**
 * Round button with a ring that traces scroll progress. Appears after the
 * first screen; the arrow shoots up and a fresh one drops in on hover.
 */
export function ScrollToTop({ raised = true, className }) {
    const t = useT();
    const { scrollY, scrollYProgress } = useScroll();
    const [visible, setVisible] = useState(false);
    const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30 });
    const dash = useTransform(progress, (v) => C * (1 - v));
    const pct = useTransform(scrollYProgress, (v) => `${Math.round(v * 100)}`);
    const [label, setLabel] = useState('0');

    useMotionValueEvent(scrollY, 'change', (y) => setVisible(y > window.innerHeight * 0.8));
    useMotionValueEvent(pct, 'change', setLabel);

    return (
        <AnimatePresence>
            {visible && (
                <motion.button
                    type="button"
                    onClick={() => scrollToTop()}
                    aria-label={t('ui.back_to_top')}
                    data-cursor="Top"
                    data-floating
                    initial={{ opacity: 0, scale: 0.4, y: 24, rotate: -90 }}
                    animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.4, y: 24, rotate: 90 }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className={cn(
                        'group fixed end-4 z-[65] flex size-14 items-center justify-center rounded-full border border-line bg-elev/80 text-ink shadow-soft backdrop-blur-xl sm:end-6',
                        // Sits above the assistant launcher when that is on screen.
                        raised ? 'bottom-[5.5rem] sm:bottom-[6.5rem]' : 'bottom-4 sm:bottom-6',
                        className,
                    )}
                >
                    <svg viewBox="0 0 56 56" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
                        <circle cx="28" cy="28" r={R} fill="none" stroke="var(--line)" strokeWidth="2" />
                        <motion.circle cx="28" cy="28" r={R} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C} style={{ strokeDashoffset: dash }} />
                    </svg>
                    <span className="absolute inset-[5px] rounded-full bg-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <span className="relative flex size-5 flex-col items-center overflow-hidden text-ink transition-colors duration-300 group-hover:text-brand-ink">
                        <ArrowUp className="size-5 shrink-0 transition-transform duration-500 ease-out-expo group-hover:-translate-y-full" />
                        <ArrowUp className="size-5 shrink-0 transition-transform duration-500 ease-out-expo group-hover:-translate-y-full" />
                    </span>
                    <span className="pointer-events-none absolute -top-7 font-mono text-[10px] tabular-nums tracking-wider text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
                        {label}%
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------- Search palette */

const SCOPES = [
    { key: 'produce', route: 'products.index', icon: ShoppingBasket, label: 'search.go_produce' },
    { key: 'farmers', route: 'farmers.index', icon: Sprout, label: 'search.go_farmers' },
    { key: 'markets', route: 'markets.index', icon: MapPin, label: 'search.go_markets' },
];
const POPULAR = ['Mangoes', 'Tomatoes', 'Sourdough', 'Honey', 'Eggs', 'Spinach'];

let openPalette = () => {};

/** Opens the global search palette from anywhere (e.g. a hero input). */
export function openSearch(initial = '') {
    openPalette(initial);
}

function isMac() {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
}

/** Header trigger: a quiet pill that expands on hover and shows the shortcut. */
export function SearchTrigger({ className }) {
    const t = useT();
    return (
        <button
            type="button"
            onClick={() => openSearch()}
            aria-label={t('search.open')}
            aria-keyshortcuts="Control+K Meta+K /"
            className={cn('group flex h-10 items-center gap-2 rounded-full text-ink-soft transition hover:text-ink', 'w-10 justify-center hover:bg-ink/5 xl:w-auto xl:justify-start xl:border xl:border-line xl:bg-ink/[0.03] xl:ps-3.5 xl:pe-1.5 xl:hover:border-line-strong', className)}
        >
            <Search className="size-[18px] shrink-0 transition-transform duration-300 group-hover:rotate-[-12deg] group-hover:scale-110" />
            <span className="hidden text-sm xl:inline">{t('search.open')}</span>
            <kbd className="ms-6 hidden rounded-full border border-line bg-elev px-2 py-0.5 font-mono text-[11px] text-ink-faint xl:inline" dir="ltr">
                {isMac() ? '⌘' : 'Ctrl'} K
            </kbd>
        </button>
    );
}

export function SearchPalette() {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [active, setActive] = useState(0);
    const input = useRef(null);

    useEffect(() => {
        openPalette = (initial = '') => {
            setQ(initial);
            setActive(0);
            setOpen(true);
        };
        const onKey = (e) => {
            const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
            if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        const off = router.on('navigate', () => setOpen(false));
        return () => {
            window.removeEventListener('keydown', onKey);
            off();
        };
    }, []);

    useEffect(() => {
        lockScroll(open);
        if (open) requestAnimationFrame(() => input.current?.focus());
        return () => lockScroll(false);
    }, [open]);

    const go = (scope = SCOPES[active] ?? SCOPES[0], term = q) => {
        const query = term.trim();
        router.get(route(scope.route), query ? { q: query } : {});
        setOpen(false);
    };

    const onKeyDown = (e) => {
        if (e.key === 'Escape') setOpen(false);
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => (a + 1) % SCOPES.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => (a - 1 + SCOPES.length) % SCOPES.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            go();
        }
    };

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[110] flex items-start justify-center px-3 pt-[12vh] sm:px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    <motion.div className="absolute inset-0 bg-soil/55 backdrop-blur-md" onClick={() => setOpen(false)} initial={{ backdropFilter: 'blur(0px)' }} animate={{ backdropFilter: 'blur(12px)' }} />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('search.title')}
                        initial={{ y: -24, opacity: 0, scale: 0.97, filter: 'blur(6px)' }}
                        animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ y: -16, opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-line bg-elev shadow-soft"
                    >
                        <div className="flex items-center gap-3 border-b border-line px-5">
                            <Search className="size-5 shrink-0 text-accent" />
                            <input
                                ref={input}
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder={t('search.placeholder')}
                                aria-label={t('search.placeholder')}
                                className="font-display h-16 min-w-0 flex-1 bg-transparent text-xl placeholder:text-ink-faint/70 focus:outline-none sm:text-2xl"
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px] text-ink-faint sm:block">Esc</kbd>
                        </div>

                        <div className="p-3">
                            <p className="px-3 pt-1 pb-2 font-mono text-[10px] tracking-[0.2em] text-ink-faint uppercase">{t('search.quick')}</p>
                            <ul role="listbox" aria-label={t('search.quick')}>
                                {SCOPES.map((scope, i) => (
                                    <li key={scope.key} role="option" aria-selected={active === i}>
                                        <button
                                            type="button"
                                            onMouseEnter={() => setActive(i)}
                                            onClick={() => go(scope)}
                                            className={cn('relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition-colors', active === i ? 'text-ink' : 'text-ink-soft')}
                                        >
                                            {active === i && <motion.span layoutId="search-active" className="absolute inset-0 -z-0 rounded-2xl bg-ink/[0.06]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                                            <span className={cn('relative flex size-9 items-center justify-center rounded-xl transition-colors', active === i ? 'bg-brand text-brand-ink' : 'bg-ink/5')}>
                                                <scope.icon className="size-[18px]" />
                                            </span>
                                            <span className="relative flex-1 truncate">
                                                {t(scope.label)}
                                                {q.trim() && <span className="text-ink-faint"> — “{q.trim()}”</span>}
                                            </span>
                                            <span className={cn('relative transition-opacity', active === i ? 'opacity-100' : 'opacity-0')}>
                                                <CornerDownLeft className="rtl-flip size-4 text-ink-faint" />
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            <p className="px-3 pt-4 pb-2 font-mono text-[10px] tracking-[0.2em] text-ink-faint uppercase">{t('search.popular')}</p>
                            <div className="flex flex-wrap gap-2 px-3 pb-3">
                                {POPULAR.map((word) => (
                                    <button key={word} type="button" onClick={() => go(SCOPES[0], word)} className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm text-ink-soft transition hover:border-brand hover:bg-brand hover:text-brand-ink">
                                        {word}
                                        <ArrowUpRight className="rtl-flip size-3.5 opacity-0 transition-all group-hover:opacity-100" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-line bg-sunk/60 px-5 py-2.5 text-xs text-ink-faint">
                            <span className="flex items-center gap-2">
                                <img src={produceImage('basket')} alt="" className="size-5" />
                                {t('search.hint')}
                            </span>
                            <span className="hidden font-mono sm:block" dir="ltr">↑ ↓ · ↵</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
