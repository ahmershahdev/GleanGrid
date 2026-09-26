import { Link } from '@inertiajs/react';
import { CalendarClock, Mail, MapPin, MessageCircleReply, Phone, Star, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ProductCard } from '@/Components/Cards';
import { DirectionsMap } from '@/Components/Map';
import { Reveal, SplitWords } from '@/Components/motion';
import { Avatar, EmptyState, Stars } from '@/Components/ui';
import { FavoriteButton } from '@/Components/widgets';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function ReviewList({ reviews }) {
    const t = useT();
    const { relative } = useFormat();
    if (!reviews.length) return <p className="rounded-3xl border border-dashed border-line-strong p-8 text-center text-ink-soft">{t('reviews.none')}</p>;
    return (
        <ul className="space-y-3">
            {reviews.map((r) => (
                <li key={r.id} className="rounded-3xl border border-line bg-elev p-5">
                    <div className="flex items-center gap-3">
                        <Avatar name={r.user?.name} size="size-9" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold">{r.user?.name}</p>
                            <p className="text-xs text-ink-faint">{relative(r.created_at)}</p>
                        </div>
                        <Stars value={r.rating} />
                    </div>
                    {r.comment && <p className="mt-3 text-ink-soft">{r.comment}</p>}
                    {r.farmer_reply && (
                        <div className="mt-3 flex gap-2 rounded-2xl bg-brand-soft p-3 text-sm">
                            <MessageCircleReply className="mt-0.5 size-4 shrink-0 text-brand" />
                            <p>
                                <span className="font-semibold">{t('reviews.farmer_reply')}: </span>
                                {r.farmer_reply}
                            </p>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
}

export default function FarmerShow({ farmer, products, reviews, slots }) {
    const t = useT();
    const { day, time, date } = useFormat();
    const categories = useMemo(() => [...new Map(products.map((p) => [p.category.slug, p.category])).values()], [products]);
    const [cat, setCat] = useState(null);
    const visible = cat ? products.filter((p) => p.category.slug === cat) : products;
    const inStock = products.filter((p) => p.status === 'available' && p.stock_quantity > 0).length;

    return (
        <>
            <section className="relative mx-auto max-w-[1400px] px-5 pt-6 sm:px-8">
                <div className="relative overflow-hidden rounded-[40px] bg-brand px-7 pt-12 pb-10 text-brand-ink md:px-14 md:pt-16">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_22px,rgb(255_255_255/0.04)_22px_23px)]" />
                    {farmer.logo_url && <img src={farmer.logo_url} alt="" className="absolute -end-4 -bottom-8 w-56 animate-float drop-shadow-2xl md:w-80" style={{ '--r': '-10deg' }} />}
                    <div className="relative max-w-3xl">
                        <Link href={route('farmers.index')} className="text-sm opacity-70 hover:opacity-100">
                            ← {t('nav.farmers')}
                        </Link>
                        <h1 className="font-display mt-4 text-5xl leading-[0.95] font-light md:text-7xl">
                            <SplitWords text={farmer.stall_name} immediate />
                        </h1>
                        {farmer.tagline && <p className="mt-4 text-lg opacity-80 md:text-xl">{farmer.tagline}</p>}
                        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
                            {farmer.rating_count > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-ink/10 px-3 py-1.5">
                                    <Star className="size-4 fill-sun text-sun" /> {farmer.rating_avg.toFixed(1)} · {t('reviews.count', { count: farmer.rating_count })}
                                </span>
                            )}
                            <span className="rounded-full bg-brand-ink/10 px-3 py-1.5">{t('farmer.in_stock', { count: inStock })}</span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-ink/10 px-3 py-1.5">
                                <Timer className="size-4" /> {t('farmer.cutoff', { hours: farmer.order_cutoff_hours })}
                            </span>
                            <FavoriteButton type="farmer" id={farmer.id} className="text-ink" />
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto mt-12 grid max-w-[1400px] gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_380px]">
                <div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h2 className="font-display text-4xl font-light">{t('farmer.this_week')}</h2>
                        <div className="no-scrollbar flex gap-2 overflow-x-auto">
                            <button onClick={() => setCat(null)} className={cn('h-9 shrink-0 rounded-full px-4 text-sm font-medium', !cat ? 'bg-ink text-bg' : 'bg-ink/5')}>
                                {t('common.all')}
                            </button>
                            {categories.map((c) => (
                                <button key={c.slug} onClick={() => setCat(c.slug)} className={cn('h-9 shrink-0 rounded-full px-4 text-sm font-medium', cat === c.slug ? 'bg-ink text-bg' : 'bg-ink/5')}>
                                    {t(`categories.${c.slug}`, {}, c.name)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {visible.length === 0 ? (
                        <EmptyState className="mt-6" title={t('farmer.no_products')} />
                    ) : (
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {visible.map((p, i) => (
                                <Reveal key={p.id} delay={(i % 3) * 0.05}>
                                    <ProductCard product={{ ...p, farmer }} />
                                </Reveal>
                            ))}
                        </div>
                    )}

                    <h2 className="font-display mt-20 mb-6 text-4xl font-light">{t('reviews.title')}</h2>
                    <ReviewList reviews={reviews} />
                </div>

                <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
                    <div className="rounded-3xl border border-line bg-elev p-6">
                        <h3 className="font-display text-2xl">{t('farmer.about')}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{farmer.bio}</p>
                        <ul className="mt-5 space-y-2.5 text-sm">
                            <li className="flex items-center gap-2.5">
                                <Phone className="size-4 text-ink-faint" /> <span dir="ltr">{farmer.phone}</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                                <Mail className="size-4 text-ink-faint" /> {farmer.email}
                            </li>
                        </ul>
                        <div className="mt-5 space-y-2 border-t border-line pt-5">
                            <p className="text-sm font-medium">{t('farmer.sells_at')}</p>
                            {farmer.markets.map((m) => (
                                <Link key={m.id} href={route('markets.show', m.slug)} className="flex items-start gap-2 rounded-2xl bg-ink/[0.03] p-3 text-sm hover:bg-ink/[0.06]">
                                    <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                                    <span>
                                        <span className="block font-medium">{m.name}</span>
                                        {m.pivot?.stall_number && <span className="text-xs text-ink-faint">{t('market.stall_no', { no: m.pivot.stall_number })}</span>}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-line bg-elev p-6">
                        <h3 className="font-display flex items-center gap-2 text-2xl">
                            <CalendarClock className="size-5" /> {t('farmer.pickup_windows')}
                        </h3>
                        {slots.length === 0 ? (
                            <p className="mt-3 text-sm text-ink-soft">{t('farmer.no_slots')}</p>
                        ) : (
                            <ul className="mt-4 space-y-2">
                                {slots.map((s) => (
                                    <li key={s.id} className="rounded-2xl bg-ink/[0.03] p-3 text-sm">
                                        <p className="font-medium">
                                            {day(s.day_of_week)} · {time(s.starts_at)}–{time(s.ends_at)}
                                        </p>
                                        <p className="text-xs text-ink-soft">{s.market.name}</p>
                                        <p className="mt-1 text-xs text-brand">{t('farmer.next_date', { date: date(s.dates[0], { day: 'numeric', month: 'short' }) })}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {farmer.latitude && <DirectionsMap lat={farmer.latitude} lng={farmer.longitude} title={farmer.stall_name} subtitle={farmer.address} image={farmer.logo_url} />}
                </aside>
            </section>
        </>
    );
}
