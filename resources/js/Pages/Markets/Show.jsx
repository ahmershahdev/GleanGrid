import { Link } from '@inertiajs/react';
import { CalendarDays, Clock, MapPin, Store } from 'lucide-react';
import { FarmerCard, ProductCard } from '@/Components/Cards';
import { LazyDirectionsMap as DirectionsMap } from '@/Components/LazyMap';
import { Reveal, SplitWords } from '@/Components/motion';
import { EmptyState } from '@/Components/ui';
import { FavoriteButton } from '@/Components/widgets';
import { useFormat, useT } from '@/lib/i18n';
import { cn, photoProps } from '@/lib/utils';

export default function MarketShow({ market, farmers, products }) {
    const t = useT();
    const { day, time } = useFormat();

    return (
        <>
            <section className="mx-auto max-w-[1400px] px-5 pt-12 sm:px-8">
                <Link href={route('markets.index')} className="text-sm text-ink-soft hover:text-ink">
                    ← {t('nav.markets')}
                </Link>
                {market.cover_url && (
                    <figure className="relative mt-6 h-[34vh] min-h-56 overflow-hidden rounded-[36px] md:h-[46vh]">
                        <img {...photoProps(market.cover_url, '(min-width: 1400px) 1400px, 100vw')} alt="" fetchPriority="high" className="gg-unveil size-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-soil/55 via-transparent to-transparent" />
                        <figcaption className="absolute start-6 bottom-5 font-mono text-[11px] tracking-[0.2em] text-paper/85 uppercase">
                            {market.city} · {day(new Date().getDay(), 'long')}
                        </figcaption>
                    </figure>
                )}
                <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{market.city}</span>
                            {market.open_today && <span className="rounded-full bg-lime/40 px-2.5 py-1 text-xs font-semibold text-forest dark:text-lime">{t('market.open_today')}</span>}
                        </div>
                        <h1 className="font-display mt-3 text-5xl leading-[0.95] font-light md:text-7xl">
                            <SplitWords text={market.name} immediate />
                        </h1>
                        {market.description && <p className="mt-6 max-w-xl text-lg text-ink-soft">{market.description}</p>}

                        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-3xl border border-line bg-elev p-5">
                                <dt className="flex items-center gap-2 text-sm text-ink-soft">
                                    <CalendarDays className="size-4" /> {t('market.days')}
                                </dt>
                                <dd className="mt-3 flex flex-wrap gap-1.5">
                                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                                        <span key={d} className={cn('rounded-full px-2.5 py-1 text-xs font-medium', market.operating_days.includes(d) ? 'bg-brand text-brand-ink' : 'bg-ink/5 text-ink-faint line-through')}>
                                            {day(d, 'short')}
                                        </span>
                                    ))}
                                </dd>
                            </div>
                            <div className="rounded-3xl border border-line bg-elev p-5">
                                <dt className="flex items-center gap-2 text-sm text-ink-soft">
                                    <Clock className="size-4" /> {t('market.hours')}
                                </dt>
                                <dd className="font-display mt-2 text-3xl">
                                    {time(market.opens_at)} – {time(market.closes_at)}
                                </dd>
                            </div>
                            <div className="rounded-3xl border border-line bg-elev p-5 sm:col-span-2">
                                <dt className="flex items-center gap-2 text-sm text-ink-soft">
                                    <MapPin className="size-4" /> {t('market.address')}
                                </dt>
                                <dd className="mt-2 flex items-start justify-between gap-4">
                                    <span className="text-lg">{market.address}</span>
                                    <FavoriteButton type="market" id={market.id} className="shrink-0 border border-line" />
                                </dd>
                            </div>
                        </dl>
                    </div>
                    <Reveal>
                        <DirectionsMap lat={market.latitude} lng={market.longitude} title={market.name} subtitle={market.address} color="#E2552C" image="/images/produce/basket.webp" />
                    </Reveal>
                </div>
            </section>

            <section className="mx-auto mt-24 max-w-[1400px] px-5 sm:px-8">
                <h2 className="font-display text-4xl font-light md:text-5xl">{t('market.farmers_here', { count: farmers.length })}</h2>
                {farmers.length === 0 ? (
                    <EmptyState icon="seedling" title={t('market.no_farmers')} className="mt-8" />
                ) : (
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {farmers.map((f) => (
                            <div key={f.id}>
                                <FarmerCard farmer={f} />
                                {f.pivot?.stall_number && (
                                    <p className="mt-2 flex items-center gap-1.5 ps-3 text-xs text-ink-soft">
                                        <Store className="size-3.5" /> {t('market.stall_no', { no: f.pivot.stall_number })}
                                        {f.pickup_slots?.length > 0 && <> · {t('market.pickup_windows', { count: f.pickup_slots.length })}</>}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {products.length > 0 && (
                <section className="mx-auto mt-24 max-w-[1400px] px-5 sm:px-8">
                    <h2 className="font-display text-4xl font-light md:text-5xl">{t('market.available_here')}</h2>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {products.map((p) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
