import { Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { BellRing, BellOff, CalendarRange, Leaf, MapPin, Package, ShoppingBasket, Star, Store, Timer } from 'lucide-react';
import { useState } from 'react';
import { ProductCard } from '@/Components/Cards';
import { SplitWords } from '@/Components/motion';
import { Button, StatusBadge } from '@/Components/ui';
import { FavoriteButton, QtyStepper, toast } from '@/Components/widgets';
import { ReviewList, ReviewSummary } from '@/Components/Reviews';
import { StallBadges } from '@/Components/Badges';
import PriceHistory from '@/Components/PriceHistory';
import { cart, useCart } from '@/lib/cart';
import { fly } from '@/lib/fly';
import { useFormat, useT } from '@/lib/i18n';
import { cn, photoProps } from '@/lib/utils';

function NotifyMe({ product, alerting: initial }) {
    const t = useT();
    const { auth } = usePage().props;
    const [on, setOn] = useState(initial);
    const [busy, setBusy] = useState(false);
    const toggle = () => {
        if (!auth.user) return router.visit(route('login'));
        setBusy(true);
        setOn(!on);
        const opts = { preserveScroll: true, onError: () => setOn(on), onFinish: () => setBusy(false) };
        on ? router.delete(route('customer.alerts.destroy', product.id), opts) : router.post(route('customer.alerts.store', product.id), {}, opts);
    };
    return (
        <div className="w-full rounded-3xl border border-dashed border-accent/40 bg-accent/5 p-4">
            <p className="text-sm text-accent">{t('product.sold_out_hint')}</p>
            <button
                type="button"
                onClick={toggle}
                disabled={busy}
                aria-pressed={on}
                className={cn('group relative mt-3 inline-flex h-12 items-center gap-2 overflow-hidden rounded-full px-5 text-sm font-semibold transition', on ? 'bg-ink text-bg' : 'bg-accent text-accent-ink hover:brightness-110')}
            >
                <motion.span key={String(on)} initial={{ rotate: -30, scale: 0.6 }} animate={{ rotate: on ? [0, -18, 14, -8, 0] : 0, scale: 1 }} transition={{ duration: 0.6 }}>
                    <BellRing className="size-5" />
                </motion.span>
                {on ? t('product.notifying') : t('product.notify_me')}
                {on && <BellOff className="size-4 opacity-0 transition group-hover:opacity-70" />}
            </button>
            <p className="mt-2 text-xs text-ink-soft">{t('product.notify_hint')}</p>
        </div>
    );
}

function SeasonChip({ season }) {
    const t = useT();
    const { locale } = usePage().props.app;
    if (!season) return null;
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short' });
    const months = season.months.map((m) => fmt.format(new Date(2026, m - 1, 1))).join(' · ');
    return (
        <Link href={route('seasons')} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition hover:brightness-95', season.is_peak ? 'bg-lime text-forest ring-lime' : season.in_season ? 'bg-lime/30 text-forest ring-lime/60 dark:text-lime' : 'bg-ink/5 text-ink-soft ring-line')} title={t('product.season_months', { months })}>
            <CalendarRange className="size-3.5" /> {t(season.is_peak ? 'product.peak_season' : season.in_season ? 'product.in_season' : 'product.off_season')}
        </Link>
    );
}

export default function ProductShow({ product, reviews, reviewSummary, priceHistory, season, alerting = false, related, moreFromFarmer }) {
    const t = useT();
    const { money } = useFormat();
    const { auth } = usePage().props;
    const { quantityOf } = useCart();
    const [qty, setQty] = useState(1);
    const inCart = quantityOf(product.id);
    const orderable = product.status === 'available' && product.stock_quantity > 0;
    const canBuy = !auth.user || auth.user.role === 'customer';
    const color = product.category?.color ?? '#C9E265';
    const illustration = product.image_url?.includes('/produce/') ? product.image_url : null;
    const photo = product.photo_url && product.photo_url !== illustration ? product.photo_url : null;
    const [view, setView] = useState(photo ? 'photo' : 'art');

    const add = (e) => {
        fly(e.currentTarget, 'cart', { image: product.image_url });
        cart.add(product, qty);
        toast('cart.added');
    };

    return (
        <>
            <section className="mx-auto max-w-[1400px] px-5 pt-6 sm:px-8">

                <div className="grid gap-10 lg:grid-cols-2">
                    <motion.div
                        initial={{ clipPath: 'inset(12% 12% 12% 12% round 48px)' }}
                        animate={{ clipPath: 'inset(0% 0% 0% 0% round 40px)' }}
                        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[40px]"
                        style={{ background: `color-mix(in oklab, ${color} 35%, var(--bg-sunk))` }}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgb(255_255_255/0.6),transparent_55%)] dark:opacity-20" />
                        <div className="font-display absolute start-6 top-4 text-[9rem] leading-none font-light text-ink/[0.06] select-none md:text-[12rem]" aria-hidden="true">
                            {product.name.split(' ').pop()}
                        </div>
                        <AnimatePresence mode="popLayout" initial={false}>
                            {view === 'photo' && photo ? (
                                <motion.img
                                    key="photo"
                                    {...photoProps(photo, '(min-width: 1024px) 50vw, 100vw')}
                                    alt={product.name}
                                    initial={{ opacity: 0, scale: 1.08 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    className={cn('absolute inset-0 size-full object-cover', !orderable && 'grayscale')}
                                />
                            ) : (
                                <motion.img
                                    key="art"
                                    src={illustration ?? product.image_url}
                                    alt={product.name}
                                    initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
                                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 80, damping: 12 }}
                                    className={illustration ? 'relative w-3/5 animate-float drop-shadow-[0_40px_40px_rgba(0,0,0,0.25)]' : 'relative h-full w-full object-cover'}
                                />
                            )}
                        </AnimatePresence>
                        {view === 'photo' && illustration && (
                            <motion.img src={illustration} alt="" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: -8 }} transition={{ delay: 0.4, type: 'spring', stiffness: 140, damping: 12 }} className="absolute start-6 bottom-6 w-24 drop-shadow-[0_18px_22px_rgba(0,0,0,0.45)] md:w-32" />
                        )}
                        {photo && illustration && (
                            <div role="radiogroup" aria-label={t('product.view', {}, 'View')} className="absolute end-5 bottom-5 flex rounded-full bg-bg/80 p-1 text-xs font-semibold backdrop-blur">
                                {[
                                    ['photo', t('product.view_photo', {}, 'Photo')],
                                    ['art', t('product.view_art', {}, '3D')],
                                ].map(([key, label]) => (
                                    <button key={key} type="button" role="radio" aria-checked={view === key} onClick={() => setView(key)} className={cn('relative h-8 rounded-full px-3.5 transition', view === key ? 'text-bg' : 'text-ink-soft hover:text-ink')}>
                                        {view === key && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                                        <span className="relative">{label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <FavoriteButton type="product" id={product.id} className="absolute end-5 top-5" />
                    </motion.div>

                    <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={orderable ? 'available' : product.status === 'unavailable' ? 'unavailable' : 'sold_out'} kind="product" />
                            <SeasonChip season={season} />
                            {product.rating_count > 0 && (
                                <span className="inline-flex items-center gap-1 text-sm text-ink-soft">
                                    <Star className="size-4 fill-sun text-sun" /> {product.rating_avg.toFixed(1)} ({product.rating_count})
                                </span>
                            )}
                        </div>
                        <h1 className="font-display mt-4 text-5xl leading-[0.95] font-light md:text-7xl">
                            <SplitWords text={product.name} immediate />
                        </h1>
                        <p className="mt-6 flex items-baseline gap-2">
                            <span className="font-display text-5xl font-medium tabular-nums">{money(product.price)}</span>
                            <span className="text-lg text-ink-faint">/ {t(`units.${product.unit}`)}</span>
                        </p>
                        {product.description && <p className="mt-6 max-w-lg text-lg text-ink-soft">{product.description}</p>}

                        {canBuy && (
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                {orderable ? (
                                    <>
                                        <QtyStepper value={qty} min={1} max={Math.max(1, product.stock_quantity - inCart)} onChange={setQty} />
                                        <Button size="lg" onClick={add} disabled={inCart >= product.stock_quantity}>
                                            <ShoppingBasket className="size-5" /> {t('product.add_qty', { qty })}
                                        </Button>
                                        {inCart > 0 && (
                                            <Link href={route('cart')} className="text-sm font-medium text-brand underline">
                                                {t('product.in_basket', { count: inCart })}
                                            </Link>
                                        )}
                                    </>
                                ) : (
                                    <NotifyMe product={product} alerting={alerting} />
                                )}
                            </div>
                        )}

                        <dl className="mt-10 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-3xl border border-line bg-elev p-4">
                                <dt className="flex items-center gap-1.5 text-ink-soft">
                                    <Package className="size-4" /> {t('product.available_qty')}
                                </dt>
                                <dd className="font-display mt-1 text-2xl">
                                    {product.stock_quantity} <span className="text-base text-ink-faint">{t(`units.${product.unit}`)}</span>
                                </dd>
                            </div>
                            <div className="rounded-3xl border border-line bg-elev p-4">
                                <dt className="flex items-center gap-1.5 text-ink-soft">
                                    <Timer className="size-4" /> {t('product.cutoff')}
                                </dt>
                                <dd className="font-display mt-1 text-2xl">{t('product.hours_before', { hours: product.farmer.order_cutoff_hours })}</dd>
                            </div>
                        </dl>

                        <Link href={route('farmers.show', product.farmer.slug)} className="group mt-3 flex items-center gap-4 rounded-3xl border border-line bg-elev p-4 transition hover:border-line-strong">
                            {product.farmer.logo_url && <img src={product.farmer.logo_url} alt="" className="size-14 object-contain" />}
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5 text-xs text-ink-faint">
                                    <Store className="size-3.5" /> {t('product.grown_by')}
                                </span>
                                <span className="font-display block text-xl group-hover:underline">{product.farmer.stall_name}</span>
                                <StallBadges farmer={product.farmer} limit={2} className="my-1" />
                                <span className="flex flex-wrap items-center gap-1 text-xs text-ink-soft">
                                    <MapPin className="size-3" /> {product.farmer.markets.map((m) => m.name).join(' · ')}
                                </span>
                            </span>
                        </Link>
                        <p className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
                            <Leaf className="size-3.5" /> {t('product.pay_at_pickup')}
                        </p>
                    </div>
                </div>
            </section>

            {priceHistory && (
                <section className="mx-auto mt-20 max-w-[1400px] px-5 sm:px-8">
                    <PriceHistory history={priceHistory} unit={product.unit} current={product.price} />
                </section>
            )}

            <section className="mx-auto mt-24 grid max-w-[1400px] gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_1fr]">
                <div>
                    <h2 className="font-display mb-6 text-4xl font-light">{t('reviews.title')}</h2>
                    <ReviewSummary average={product.rating_avg} count={product.rating_count} distribution={reviewSummary?.distribution} withPhotos={reviewSummary?.with_photos} />
                    <ReviewList reviews={reviews} />
                </div>
                {moreFromFarmer.length > 0 && (
                    <div>
                        <h2 className="font-display mb-6 text-4xl font-light">{t('product.more_from', { farmer: product.farmer.stall_name })}</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {moreFromFarmer.map((p) => (
                                <ProductCard key={p.id} product={{ ...p, farmer: product.farmer }} />
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {related.length > 0 && (
                <section className="mx-auto mt-24 max-w-[1400px] px-5 sm:px-8">
                    <h2 className="font-display mb-6 text-4xl font-light">{t('product.related')}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {related.map((p) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
