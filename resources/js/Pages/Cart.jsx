import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, CalendarClock, HandCoins, Leaf, Loader2, MapPin, ShieldCheck, Store, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Magnetic, SplitWords } from '@/Components/motion';
import { buttonClass } from '@/Components/ui';
import { QtyStepper } from '@/Components/widgets';
import { fly } from '@/lib/fly';
import { cart, useCart } from '@/lib/cart';
import { useFormat, useT } from '@/lib/i18n';
import { useCartSync } from '@/lib/useCartSync';
import { cn, produceImage } from '@/lib/utils';

function Rolling({ value, className }) {
    return (
        <span className={cn('relative inline-flex overflow-hidden', className)}>
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={value} initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-100%', opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} className="inline-block">
                    {value}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

function Journey({ step }) {
    const t = useT();
    const steps = [t('cart.step_basket', {}, 'Basket'), t('cart.step_pickup', {}, 'Pickup window'), t('cart.step_done', {}, 'Confirmed')];
    return (
        <ol className="flex items-center gap-2 text-xs font-medium sm:gap-3 sm:text-sm">
            {steps.map((label, i) => (
                <li key={label} className="flex items-center gap-2 sm:gap-3">
                    <span className={cn('flex h-8 items-center gap-2 rounded-full ps-1 pe-3', i === step ? 'bg-ink text-bg' : 'border border-line-strong text-ink-soft')}>
                        <span className={cn('flex size-6 items-center justify-center rounded-full font-mono text-[11px]', i === step ? 'bg-lime text-forest' : 'bg-ink/5')}>{i + 1}</span>
                        <span className={cn(i !== step && 'max-sm:hidden')}>{label}</span>
                    </span>
                    {i < steps.length - 1 && <span className="h-px w-5 bg-line-strong sm:w-10" />}
                </li>
            ))}
        </ol>
    );
}

function EmptyBasket() {
    const t = useT();
    const floaters = ['tomato', 'carrot', 'mango', 'bread', 'honey_pot', 'leafy_green'];
    return (
        <div className="relative mt-10 overflow-hidden rounded-[40px] border border-line bg-elev px-6 py-20 text-center md:py-28">
            <div className="pointer-events-none absolute start-1/2 top-1/2 size-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime/30 blur-[90px] dark:bg-lime/10" />
            {floaters.map((img, i) => (
                <motion.img
                    key={img}
                    src={produceImage(img)}
                    alt=""
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 0.9, scale: 1, y: [0, -12, 0] }}
                    transition={{ delay: 0.2 + i * 0.08, y: { duration: 4 + i, repeat: Infinity, ease: 'easeInOut' } }}
                    className={cn('pointer-events-none absolute w-12 md:w-20', ['start-[8%] top-[14%]', 'end-[9%] top-[18%]', 'start-[14%] bottom-[14%]', 'end-[14%] bottom-[12%]', 'start-[30%] top-[8%] max-md:hidden', 'end-[30%] bottom-[6%] max-md:hidden'][i])}
                />
            ))}
            <div className="relative">
                <motion.img src={produceImage('basket')} alt="" initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }} className="mx-auto size-28 drop-shadow-[0_24px_24px_rgb(0_0_0/0.18)] md:size-36" />
                <h2 className="font-display mx-auto mt-6 max-w-md text-4xl leading-none font-light md:text-5xl">{t('cart.empty_title')}</h2>
                <p className="mx-auto mt-4 max-w-sm text-ink-soft">{t('cart.empty_body')}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link href={route('products.index')} className={buttonClass('primary', 'lg')}>
                        {t('cart.browse')} <ArrowRight className="rtl-flip size-5" />
                    </Link>
                    <Link href={route('markets.index')} className={buttonClass('outline', 'lg')}>
                        <MapPin className="size-5" /> {t('home.find_market')}
                    </Link>
                </div>
            </div>
        </div>
    );
}

function StallGroup({ group, index, of, onRemove }) {
    const t = useT();
    const { money, day, time } = useFormat();
    const subtotal = group.items.filter((i) => i.orderable).reduce((s, i) => s + i.product.price * i.quantity, 0);
    const next = group.slots[0];

    return (
        <motion.article layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden rounded-[32px] border border-line bg-elev">
            <Link href={route('farmers.show', group.farmer.slug)} className="group relative flex items-center gap-4 overflow-hidden p-5 md:p-6">
                {group.farmer.cover_url && (
                    <>
                        <img src={group.farmer.cover_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-25 transition duration-[1.2s] ease-out-expo group-hover:scale-105 dark:opacity-15" />
                        <div className="absolute inset-0 bg-gradient-to-r from-elev via-elev/80 to-elev/30 rtl:bg-gradient-to-l" />
                    </>
                )}
                <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-bg shadow-soft">
                    {group.farmer.logo_url ? <img src={group.farmer.logo_url} alt="" className="size-11 object-contain" /> : <Store className="size-6" />}
                </span>
                <span className="relative min-w-0 flex-1">
                    <span className="block font-mono text-[11px] tracking-[0.18em] text-ink-faint uppercase">
                        {t('cart.order_of', { n: index + 1, total: of }, `Pre-order ${index + 1} of ${of}`)}
                    </span>
                    <span className="font-display block truncate text-2xl leading-tight group-hover:underline">{group.farmer.stall_name}</span>
                </span>
                <span className="relative hidden text-end sm:block">
                    <span className="block text-xs text-ink-faint">{t('checkout.subtotal')}</span>
                    <Rolling value={money(subtotal)} className="font-display text-xl tabular-nums" />
                </span>
            </Link>

            <ul className="divide-y divide-line border-t border-line">
                <AnimatePresence initial={false}>
                    {group.items.map(({ product, quantity, orderable }) => (
                        <motion.li key={product.id} layout exit={{ opacity: 0, x: -40, height: 0, paddingTop: 0, paddingBottom: 0 }} transition={{ duration: 0.35 }} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 p-4 md:grid-cols-[auto_1fr_auto_7rem_auto] md:p-5">
                            <Link href={route('products.show', product.slug)} className="group/img relative flex size-20 items-center justify-center overflow-hidden rounded-[22px] md:size-24" style={{ background: `color-mix(in oklab, ${product.color ?? '#C9E265'} 26%, var(--bg-sunk))` }}>
                                <img src={product.image_url} alt="" className={cn('transition duration-500 group-hover/img:scale-110 group-hover/img:-rotate-6', product.image_url?.includes('/produce/') ? 'size-[70%] object-contain drop-shadow-[0_10px_10px_rgb(0_0_0/0.2)]' : 'size-full object-cover', !orderable && 'opacity-50 grayscale')} />
                            </Link>
                            <div className="min-w-0">
                                <Link href={route('products.show', product.slug)} className="font-display text-lg leading-tight font-medium hover:underline">
                                    {product.name}
                                </Link>
                                <p className="mt-0.5 text-sm text-ink-soft tabular-nums">
                                    {money(product.price)} / {t(`units.${product.unit}`)}
                                </p>
                                {!orderable && <p className="mt-1 inline-flex rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-bg">{t('status.sold_out')}</p>}
                                {orderable && quantity > product.stock_quantity && <p className="mt-1 text-sm text-accent">{t('cart.only_left', { count: product.stock_quantity })}</p>}
                            </div>
                            <button
                                onClick={(e) => {
                                    fly('cart', e.currentTarget, { image: product.image_url });
                                    onRemove(product, quantity);
                                }}
                                className="flex size-10 items-center justify-center self-start rounded-full text-ink-faint transition hover:bg-danger/10 hover:text-danger md:order-last md:self-center"
                                aria-label={`${t('common.remove')} ${product.name}`}
                            >
                                <Trash2 className="size-4" />
                            </button>
                            <div className="col-span-3 flex items-center justify-between gap-4 md:col-span-1 md:contents">
                                {orderable ? <QtyStepper size="sm" value={quantity} min={1} max={product.stock_quantity} image={product.image_url} onChange={(q) => cart.set(product.id, q)} /> : <span />}
                                <Rolling value={orderable ? money(product.price * quantity) : '—'} className="font-display justify-end text-xl font-medium tabular-nums md:w-28" />
                            </div>
                        </motion.li>
                    ))}
                </AnimatePresence>
            </ul>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-dashed border-line-strong bg-sunk/60 px-5 py-4 text-sm md:px-6">
                {next ? (
                    <span className="inline-flex items-center gap-2 text-ink-soft">
                        <CalendarClock className="size-4 text-brand" />
                        {t('cart.next_pickup', {}, 'Next pickup')}: <span className="font-medium text-ink">{day(next.day_of_week, 'long')} · {time(next.starts_at)}–{time(next.ends_at)}</span>
                        {next.market?.name && <span className="text-ink-faint">@ {next.market.name}</span>}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-2 text-accent">
                        <AlertTriangle className="size-4" /> {t('cart.no_slots')}
                    </span>
                )}
                <span className="ms-auto font-medium sm:hidden">
                    {t('checkout.subtotal')} <span className="tabular-nums">{money(subtotal)}</span>
                </span>
            </div>
        </motion.article>
    );
}

export default function Cart() {
    const t = useT();
    const { money } = useFormat();
    const { auth } = usePage().props;
    const { groups, missing, loading } = useCartSync();
    const { items } = useCart();
    const [undo, setUndo] = useState(null);
    const timer = useRef();

    useEffect(() => () => clearTimeout(timer.current), []);
    useEffect(() => {
        const docked = groups.length > 0 && !loading;
        document.documentElement.classList.toggle('has-dock', docked);
        return () => document.documentElement.classList.remove('has-dock');
    }, [groups.length, loading]);

    const remove = (product, quantity) => {
        const saved = items.find((i) => i.id === product.id);
        cart.remove(product.id);
        clearTimeout(timer.current);
        setUndo(saved ? { item: saved, quantity } : null);
        timer.current = setTimeout(() => setUndo(null), 6000);
    };
    const restore = () => {
        if (!undo) return;
        cart.add({ ...undo.item, stock_quantity: undefined }, undo.quantity);
        clearTimeout(timer.current);
        setUndo(null);
    };

    const orderable = groups.flatMap((g) => g.items.filter((i) => i.orderable));
    const total = orderable.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const count = orderable.reduce((s, i) => s + i.quantity, 0);
    const blocked = auth.user && auth.user.role !== 'customer';
    const ready = count > 0 && !blocked;

    const cta = blocked ? (
        <p className="rounded-2xl bg-bg/10 p-3 text-sm">{t('cart.customers_only')}</p>
    ) : (
        <Link href={route('customer.checkout')} className={buttonClass('lime', 'lg', cn('w-full', !ready && 'pointer-events-none opacity-50'))} aria-disabled={!ready}>
            {auth.user ? t('cart.checkout') : t('cart.login_checkout')} <ArrowRight className="rtl-flip size-5" />
        </Link>
    );

    return (
        <section className="mx-auto max-w-[1280px] px-5 pt-12 pb-28 sm:px-8 lg:pb-0">
            <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">
                        {groups.length ? `${t('cart.items', { count })} · ${t('cart.stalls', { count: groups.length })}` : t('cart.eyebrow', {}, 'Pre-order, then collect')}
                    </p>
                    <h1 className="font-display mt-3 text-5xl leading-[0.95] font-light md:text-8xl">
                        <SplitWords text={t('cart.title')} immediate />
                    </h1>
                </div>
                {groups.length > 0 && <Journey step={0} />}
            </div>

            {loading ? (
                <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-5">
                        {[0, 1].map((i) => (
                            <div key={i} className="h-64 animate-pulse rounded-[32px] bg-ink/5" />
                        ))}
                    </div>
                    <div className="flex h-72 items-center justify-center rounded-[32px] bg-ink/5">
                        <Loader2 className="size-7 animate-spin text-ink-faint" />
                    </div>
                </div>
            ) : groups.length === 0 ? (
                <EmptyBasket />
            ) : (
                <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-5">
                        {missing.length > 0 && (
                            <div className="flex items-center gap-3 rounded-2xl border border-sun/40 bg-sun/15 p-4 text-sm">
                                <AlertTriangle className="size-5 shrink-0" />
                                <span className="flex-1">{t('cart.missing', { count: missing.length })}</span>
                                <button onClick={() => cart.removeMany(missing)} className="font-semibold underline">
                                    {t('common.remove')}
                                </button>
                            </div>
                        )}
                        {groups.map((g, i) => (
                            <StallGroup key={g.farmer.id} group={g} index={i} of={groups.length} onRemove={remove} />
                        ))}
                        <Link href={route('products.index')} className="group inline-flex items-center gap-3 pt-2 font-medium">
                            <span className="flex size-10 items-center justify-center rounded-full border border-line-strong transition group-hover:border-ink group-hover:bg-ink group-hover:text-bg">
                                <Leaf className="size-4" />
                            </span>
                            <span className="border-b border-current pb-0.5">{t('cart.keep_shopping', {}, 'Keep filling your basket')}</span>
                        </Link>
                    </div>

                    <aside className="lg:sticky lg:top-24 lg:self-start">
                        <div className="relative overflow-hidden rounded-[32px] bg-ink p-6 text-bg md:p-7">
                            <div className="pointer-events-none absolute -end-16 -top-16 size-56 rounded-full bg-lime/20 blur-3xl" />
                            <p className="font-display relative text-2xl">{t('cart.summary')}</p>
                            <ul className="relative mt-5 space-y-2.5 text-sm">
                                {groups.map((g) => {
                                    const sub = g.items.filter((i) => i.orderable).reduce((s, i) => s + i.product.price * i.quantity, 0);
                                    return (
                                        <li key={g.farmer.id} className="flex items-baseline gap-2">
                                            <span className="truncate opacity-80">{g.farmer.stall_name}</span>
                                            <span className="mb-1 min-w-4 flex-1 border-b border-dotted border-bg/25" />
                                            <Rolling value={money(sub)} className="tabular-nums" />
                                        </li>
                                    );
                                })}
                                <li className="flex items-baseline gap-2">
                                    <span className="opacity-80">{t('cart.pickup_free')}</span>
                                    <span className="mb-1 min-w-4 flex-1 border-b border-dotted border-bg/25" />
                                    <span className="text-lime">{money(0)}</span>
                                </li>
                            </ul>
                            <div className="relative -mx-6 my-6 flex items-center md:-mx-7" aria-hidden="true">
                                <span className="size-6 shrink-0 -translate-x-3 rounded-full bg-bg rtl:translate-x-3" />
                                <span className="flex-1 border-t-2 border-dashed border-bg/20" />
                                <span className="size-6 shrink-0 translate-x-3 rounded-full bg-bg rtl:-translate-x-3" />
                            </div>
                            <div className="relative flex items-end justify-between">
                                <span className="opacity-80">{t('cart.total')}</span>
                                <Rolling value={money(total)} className="font-display text-5xl leading-none tabular-nums" />
                            </div>
                            <div className="relative mt-6">
                                <Magnetic className="block w-full" strength={0.15}>
                                    {cta}
                                </Magnetic>
                            </div>
                            <ul className="relative mt-6 grid gap-2.5 text-xs opacity-70">
                                <li className="flex items-center gap-2">
                                    <HandCoins className="size-4 shrink-0 text-lime" /> {t('cart.pay_note')}
                                </li>
                                <li className="flex items-center gap-2">
                                    <ShieldCheck className="size-4 shrink-0 text-lime" /> {t('checkout.terms')}
                                </li>
                            </ul>
                        </div>
                    </aside>
                </div>
            )}

            {groups.length > 0 && !loading && (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-elev/90 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl lg:hidden">
                    <div className="mx-auto flex max-w-xl items-center gap-4">
                        <div className="shrink-0">
                            <p className="text-xs text-ink-faint">{t('cart.total')}</p>
                            <Rolling value={money(total)} className="font-display text-2xl leading-none tabular-nums" />
                        </div>
                        {blocked ? (
                            <p className="text-xs text-ink-soft">{t('cart.customers_only')}</p>
                        ) : (
                            <Link href={route('customer.checkout')} className={buttonClass('primary', 'lg', cn('flex-1', !ready && 'pointer-events-none opacity-50'))} aria-disabled={!ready}>
                                {t('cart.continue', {}, 'Continue')} <ArrowRight className="rtl-flip size-5" />
                            </Link>
                        )}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {undo && (
                    <motion.div role="status" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-5 lg:bottom-8">
                        <div className="flex items-center gap-3 rounded-full bg-ink py-2 ps-2 pe-2 text-sm text-bg shadow-soft">
                            <img src={undo.item.image_url} alt="" className="size-8 rounded-full bg-bg/10 object-contain p-1" />
                            <span className="max-w-[45vw] truncate">{t('cart.removed', { name: undo.item.name }, `${undo.item.name} removed`)}</span>
                            <button onClick={restore} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-lime px-3 font-semibold text-forest">
                                <Undo2 className="size-4" /> {t('cart.undo', {}, 'Undo')}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
