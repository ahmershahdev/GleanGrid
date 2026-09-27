import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { useId, useState } from 'react';
import { Magnetic } from '@/Components/motion';
import { useT } from '@/lib/i18n';
import { scrollToTop } from '@/lib/scroll';
import { cn, prefersReducedMotion } from '@/lib/utils';

export function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
    return <motion.div aria-hidden="true" style={{ scaleX }} className="fixed inset-x-0 top-0 z-[130] h-[3px] origin-left bg-gradient-to-r from-lime via-sun to-accent rtl:origin-right" />;
}

const R = 27;
const C = 2 * Math.PI * R;

export function ScrollToTop({ raised = true, className }) {
    const t = useT();
    const { scrollY, scrollYProgress } = useScroll();
    const [visible, setVisible] = useState(false);
    const [launch, setLaunch] = useState(0);
    const [pct, setPct] = useState(0);
    const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30 });
    const dash = useTransform(progress, (v) => C * (1 - v));
    const ringId = `gg-top-ring-${useId().replace(/[^a-z0-9]/gi, '')}`;
    const label = `${t('ui.back_to_top')} • ${t('ui.back_to_top')} • `.toUpperCase();

    useMotionValueEvent(scrollY, 'change', (y) => setVisible(y > window.innerHeight * 0.8));
    useMotionValueEvent(scrollYProgress, 'change', (v) => setPct(Math.round(v * 100)));

    const go = () => {
        setLaunch((n) => n + 1);
        window.setTimeout(() => scrollToTop(), prefersReducedMotion() ? 0 : 180);
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    data-floating
                    initial={{ opacity: 0, scale: 0.3, y: 40, rotate: -120 }}
                    animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.3, y: 40, rotate: 120 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className={cn('fixed end-3 z-[65] sm:end-5', raised ? 'bottom-[5.25rem] sm:bottom-[6.25rem]' : 'bottom-4 sm:bottom-6', className)}
                >
                    <Magnetic strength={0.4}>
                        <motion.button
                            type="button"
                            onClick={go}
                            aria-label={`${t('ui.back_to_top')} (${pct}%)`}
                            data-cursor="Top"
                            whileTap={{ scale: 0.9 }}
                            className="group relative flex size-[72px] items-center justify-center rounded-full border border-line bg-elev/70 shadow-soft backdrop-blur-xl"
                        >
                            <svg viewBox="0 0 100 100" className="gg-orbit absolute inset-0 size-full text-ink-faint transition-colors duration-500 group-hover:text-ink" aria-hidden="true">
                                <defs>
                                    <path id={ringId} d="M50,50 m-42,0 a42,42 0 1,1 84,0 a42,42 0 1,1 -84,0" />
                                </defs>
                                <text className="fill-current font-mono text-[8px] font-medium tracking-[0.2em]">
                                    <textPath href={`#${ringId}`} textLength="262" lengthAdjust="spacing">
                                        {label}
                                    </textPath>
                                </text>
                            </svg>

                            <span className="relative flex size-11 items-center justify-center overflow-hidden rounded-full bg-bg">
                                <svg viewBox="0 0 60 60" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
                                    <circle cx="30" cy="30" r={R} fill="none" stroke="var(--line)" strokeWidth="2" />
                                    <motion.circle cx="30" cy="30" r={R} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} style={{ strokeDashoffset: dash }} />
                                </svg>
                                <span className="absolute inset-[3px] origin-bottom scale-y-0 rounded-full bg-brand transition-transform duration-500 ease-out-expo group-hover:scale-y-100" aria-hidden="true" />

                                <span className="relative flex h-5 w-9 items-center justify-center overflow-hidden text-ink transition-colors duration-300 group-hover:text-brand-ink">
                                    <span className="absolute font-mono text-[11px] font-semibold tabular-nums transition-all duration-500 ease-out-expo group-hover:-translate-y-5 group-hover:opacity-0" aria-hidden="true">
                                        {pct}
                                        <span className="text-[8px] opacity-60">%</span>
                                    </span>
                                    <span className="absolute translate-y-5 opacity-0 transition-all duration-500 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100">
                                        <motion.span
                                            key={`arrow-${launch}`}
                                            className="block"
                                            initial={false}
                                            animate={launch ? { y: [0, 5, -44], opacity: [1, 1, 0] } : { y: 0, opacity: 1 }}
                                            transition={{ duration: 0.55, times: [0, 0.3, 1], ease: 'easeIn' }}
                                        >
                                            <ArrowUp className="size-[18px]" strokeWidth={2.4} />
                                        </motion.span>
                                    </span>
                                </span>
                            </span>

                            <AnimatePresence>
                                {launch > 0 && (
                                    <motion.span
                                        key={`wave-${launch}`}
                                        aria-hidden="true"
                                        initial={{ scale: 0.6, opacity: 0.7 }}
                                        animate={{ scale: 1.7, opacity: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.7, ease: 'easeOut' }}
                                        className="pointer-events-none absolute inset-0 rounded-full border-2 border-lime"
                                    />
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </Magnetic>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export { openSearch, SearchPalette, SearchTrigger } from '@/Components/SearchPalette';
