import { Link, router } from '@inertiajs/react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowLeft, ArrowRight, MapPin, Search, ShoppingBasket, Sprout, LifeBuoy } from 'lucide-react';
import { useState } from 'react';
import { buttonClass } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { cn, produceImage } from '@/lib/utils';

const ART = { 403: 'chestnut', 404: 'tomato', 429: 'honeybee', 500: 'eggplant', 503: 'tractor' };

export default function Error({ status }) {
    const t = useT();
    const key = [403, 404, 429, 503].includes(status) ? status : 500;
    const [q, setQ] = useState('');
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const sx = useSpring(mx, { stiffness: 60, damping: 18 });
    const sy = useSpring(my, { stiffness: 60, damping: 18 });
    const near = { x: useTransform(sx, (v) => v * 18), y: useTransform(sy, (v) => v * 18) };
    const far = { x: useTransform(sx, (v) => v * -30), y: useTransform(sy, (v) => v * -30) };

    const digits = String(status).split('');
    const quick = [
        ['nav.markets', 'markets.index', MapPin],
        ['nav.produce', 'products.index', ShoppingBasket],
        ['nav.farmers', 'farmers.index', Sprout],
        ['footer.faq', 'faq', LifeBuoy],
    ];

    return (
        <section
            onPointerMove={(e) => {
                mx.set(e.clientX / window.innerWidth - 0.5);
                my.set(e.clientY / window.innerHeight - 0.5);
            }}
            className="relative mx-auto flex min-h-[78vh] max-w-5xl flex-col items-center justify-center overflow-hidden px-5 py-16 text-center"
        >
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute start-1/2 top-1/3 size-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime/30 blur-[100px] dark:bg-lime/10" />
            </div>

            <p className="font-mono text-xs tracking-[0.3em] text-ink-faint uppercase">{t('errors.code', { code: status })}</p>

            <div className="font-display relative mt-4 flex items-center justify-center leading-none font-light select-none" aria-hidden="true">
                {digits.map((d, i) =>
                    i === 1 ? (
                        <motion.span key={i} style={near} className="relative mx-[-0.05em] inline-flex size-[clamp(7rem,24vw,14rem)] items-center justify-center">
                            <motion.img
                                src={produceImage(ART[key] ?? 'tomato')}
                                alt=""
                                initial={{ scale: 0, rotate: -120 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 120, damping: 11, delay: 0.15 }}
                                className="w-[78%] animate-float drop-shadow-[0_30px_30px_rgba(0,0,0,0.2)]"
                                style={{ '--r': '0deg' }}
                            />
                        </motion.span>
                    ) : (
                        <motion.span
                            key={i}
                            style={far}
                            initial={{ y: '40%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.9, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                            className={cn('text-[clamp(8rem,30vw,18rem)] tracking-[-0.06em]', i === 0 ? 'text-outline' : 'text-accent italic')}
                        >
                            {d}
                        </motion.span>
                    ),
                )}
            </div>

            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="font-display mt-4 text-4xl md:text-5xl">
                {t(`errors.${key}_title`)}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-3 max-w-lg text-lg text-ink-soft">
                {t(`errors.${key}_body`)}
            </motion.p>

            {key === 404 && (
                <motion.form
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.get(route('products.index'), q.trim() ? { q: q.trim() } : {});
                    }}
                    role="search"
                    className="mt-8 flex w-full max-w-md items-center gap-2 rounded-full border border-line-strong bg-elev p-1.5 shadow-soft transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand"
                >
                    <Search className="ms-3 size-5 shrink-0 text-ink-faint" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('errors.search')} aria-label={t('errors.search')} className="h-11 min-w-0 flex-1 bg-transparent focus:outline-none" />
                    <button className={buttonClass('accent', 'md')} aria-label={t('common.search')}>
                        <ArrowRight className="rtl-flip size-4" />
                    </button>
                </motion.form>
            )}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6 flex flex-wrap justify-center gap-2">
                {quick.map(([label, name, Icon]) => (
                    <Link key={name} href={route(name)} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm transition hover:border-brand hover:bg-brand hover:text-brand-ink">
                        <Icon className="size-4" /> {t(label)}
                    </Link>
                ))}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-10 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => window.history.back()} className={buttonClass('outline', 'lg')}>
                    <ArrowLeft className="rtl-flip size-5" /> {t('errors.back')}
                </button>
                <Link href={route('home')} className={buttonClass('primary', 'lg')}>
                    {t('errors.home')}
                </Link>
            </motion.div>
        </section>
    );
}
