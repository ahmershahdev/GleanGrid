import { Link } from '@inertiajs/react';
import { motion } from 'motion/react';
import { ArrowUpRight, Clock, MapPin, Star, Store } from 'lucide-react';
import { AddToCart, FavoriteButton } from '@/Components/widgets';
import { useFormat, useT } from '@/lib/i18n';
import { cn, photoProps } from '@/lib/utils';

const tilt = {
    rest: { rotate: 0, y: 0 },
    hover: { rotate: -6, y: -8, scale: 1.06, transition: { type: 'spring', stiffness: 260, damping: 14 } },
};

export function ProductCard({ product, className }) {
    const t = useT();
    const { money } = useFormat();
    const orderable = product.status === 'available' && product.stock_quantity > 0;
    const low = orderable && product.stock_quantity <= 5;
    const illustration = product.image_url?.includes('/produce/') ? product.image_url : null;
    const photo = product.photo_url && product.photo_url !== illustration ? product.photo_url : null;

    return (
        <motion.article initial="rest" whileHover="hover" animate="rest" className={cn('group relative flex flex-col rounded-[28px] border border-line bg-elev p-3 transition-shadow hover:shadow-soft', className)}>
            <Link href={route('products.show', product.slug)} data-cursor={t('common.view')} className="relative block aspect-[4/3.4] overflow-hidden rounded-[22px]" style={{ background: `color-mix(in oklab, ${product.category?.color ?? '#C9E265'} 22%, var(--bg-sunk))` }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgb(255_255_255/0.55),transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_60%,rgb(255_255_255/0.08),transparent_60%)]" />
                {photo && (
                    <>
                        <img {...photoProps(photo, '(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw')} alt={illustration ? '' : product.name} loading="lazy" decoding="async" className={cn('absolute inset-0 size-full object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-110', !orderable && 'opacity-60 grayscale')} />
                        <div className="absolute inset-0 bg-gradient-to-t from-soil/45 via-transparent to-transparent" />
                    </>
                )}
                {illustration && (
                    <motion.img
                        variants={tilt}
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className={cn(
                            'absolute object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.3)]',
                            photo ? 'end-3 bottom-3 size-[30%]' : 'inset-0 m-auto h-[68%] w-[68%]',
                            !orderable && 'opacity-50 grayscale',
                        )}
                    />
                )}
                <div className="absolute start-3 top-3 flex flex-col gap-1.5">
                    {!orderable && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-bg">{t(`status.${product.status === 'unavailable' ? 'unavailable' : 'sold_out'}`)}</span>}
                    {low && <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink">{t('product.only_left', { count: product.stock_quantity })}</span>}
                    {product.is_featured && orderable && !low && <span className="rounded-full bg-lime px-2.5 py-1 text-[11px] font-semibold text-forest">{t('product.featured')}</span>}
                </div>
            </Link>
            <FavoriteButton type="product" id={product.id} className="absolute end-5 top-5" size="size-9" />
            <div className="flex flex-1 flex-col px-1.5 pt-3.5 pb-1">
                <div className="flex items-start justify-between gap-2">
                    <Link href={route('products.show', product.slug)} className="font-display text-lg leading-tight font-medium hover:underline">
                        {product.name}
                    </Link>
                    {product.rating_count > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink-soft">
                            <Star className="size-3.5 fill-sun text-sun" /> {product.rating_avg.toFixed(1)}
                        </span>
                    )}
                </div>
                {product.farmer && (
                    <Link href={route('farmers.show', product.farmer.slug)} className="mt-1 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
                        <Store className="size-3.5" /> {product.farmer.stall_name}
                    </Link>
                )}
                <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                    <p className="leading-none">
                        <span className="font-display text-2xl font-semibold tabular-nums">{money(product.price)}</span>
                        <span className="text-sm text-ink-faint"> / {t(`units.${product.unit}`)}</span>
                    </p>
                    <AddToCart product={product} size="sm" />
                </div>
            </div>
        </motion.article>
    );
}

export function FarmerCard({ farmer, className }) {
    const t = useT();
    return (
        <motion.article initial="rest" whileHover="hover" animate="rest" className={cn('group relative flex flex-col overflow-hidden rounded-[28px] border border-line bg-elev', className)}>
            <Link href={route('farmers.show', farmer.slug)} data-cursor={t('common.visit')} tabIndex={-1} aria-hidden="true" className="relative block h-44 overflow-hidden bg-brand-soft">
                {farmer.cover_url ? (
                    <>
                        <img {...photoProps(farmer.cover_url, '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw')} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-soil/70 via-soil/10 to-transparent" />
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_14px,rgb(0_0_0/0.035)_14px_15px)]" />
                        <div className="absolute -end-6 -bottom-8 size-44 rounded-full bg-lime/50 blur-2xl transition group-hover:scale-125" />
                    </>
                )}
                {farmer.logo_url && <motion.img variants={tilt} src={farmer.logo_url} alt="" className="absolute start-5 bottom-3 size-20 object-contain drop-shadow-[0_10px_18px_rgb(0_0_0/0.45)]" />}
                <ArrowUpRight className={cn('rtl-flip absolute end-5 top-5 size-6 transition group-hover:translate-x-1 group-hover:-translate-y-1', farmer.cover_url ? 'text-white drop-shadow' : 'text-ink-soft')} />
            </Link>
            <FavoriteButton type="farmer" id={farmer.id} className="absolute end-4 top-14" size="size-9" />
            <div className="flex flex-1 flex-col p-5">
                <Link href={route('farmers.show', farmer.slug)} className="font-display text-xl leading-tight font-medium hover:underline">
                    {farmer.stall_name}
                </Link>
                {farmer.tagline && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{farmer.tagline}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-ink-soft">
                    {farmer.rating_count > 0 && (
                        <span className="inline-flex items-center gap-1 font-medium">
                            <Star className="size-3.5 fill-sun text-sun" /> {farmer.rating_avg.toFixed(1)} <span className="text-ink-faint">({farmer.rating_count})</span>
                        </span>
                    )}
                    {farmer.products_count !== undefined && <span>{t('farmer.products_count', { count: farmer.products_count })}</span>}
                    {farmer.markets?.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" /> {farmer.markets.length === 1 ? farmer.markets[0].name : t('farmer.markets_count', { count: farmer.markets.length })}
                        </span>
                    )}
                </div>
            </div>
        </motion.article>
    );
}

export function MarketCard({ market, active, onHover, className }) {
    const t = useT();
    const { days, time, number } = useFormat();
    return (
        <Link
            href={route('markets.show', market.slug)}
            onMouseEnter={() => onHover?.(market.id)}
            onMouseLeave={() => onHover?.(null)}
            className={cn('group block overflow-hidden rounded-[24px] border bg-elev transition', active ? 'border-brand shadow-soft' : 'border-line hover:border-line-strong', className)}
        >
            {market.cover_url && (
                <div className="relative h-32 overflow-hidden">
                    <img {...photoProps(market.cover_url, '(min-width: 1024px) 33vw, 100vw')} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-elev via-transparent to-transparent" />
                </div>
            )}
            <div className={cn('flex items-start justify-between gap-3 px-5', market.cover_url ? '-mt-6 relative' : 'pt-5')}>
                <div>
                    <p className="font-mono text-[11px] tracking-[0.18em] text-ink-faint uppercase">{market.city}</p>
                    <h2 className="font-display mt-1 text-xl leading-tight font-medium group-hover:underline">{market.name}</h2>
                </div>
                {market.open_today ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-lime/35 px-2.5 py-1 text-xs font-semibold text-forest dark:text-lime">
                        <span className="relative flex size-2">
                            <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-70" />
                            <span className="relative size-2 rounded-full bg-success" />
                        </span>
                        {t('market.open_today')}
                    </span>
                ) : (
                    <span className="shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink-soft">{t('market.closed_today')}</span>
                )}
            </div>
            <p className="mt-3 flex items-start gap-1.5 px-5 text-sm text-ink-soft">
                <MapPin className="mt-0.5 size-3.5 shrink-0" /> {market.address}
            </p>
            <div className="mx-5 mt-4 mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs text-ink-soft">
                <span className="font-medium text-ink">{days(market.operating_days)}</span>
                <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> {time(market.opens_at)} – {time(market.closes_at)}
                </span>
                {market.farmers_count !== undefined && <span>{t('market.farmers_count', { count: market.farmers_count })}</span>}
                {market.distance_km != null && <span className="ms-auto font-medium text-brand">{t('market.km_away', { km: number(market.distance_km, 1) })}</span>}
            </div>
        </Link>
    );
}
