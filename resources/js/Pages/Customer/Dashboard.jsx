import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarClock, ClipboardList, Heart, MapPin, Navigation, Star, Wallet } from 'lucide-react';
import { ProductCard } from '@/Components/Cards';
import { OrderRow } from '@/Components/OrderBits';
import { CountUp, Reveal } from '@/Components/motion';
import { buttonClass, Card, EmptyState, SectionTitle, Stat, StatusBadge } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { googleDirections, produceImage } from '@/lib/utils';

export default function CustomerDashboard({ stats, upcoming, recent, toReview, suggestions }) {
    const t = useT();
    const { auth } = usePage().props;
    const { money, date, time, number } = useFormat();

    return (
        <>
            <div className="relative overflow-hidden rounded-[32px] bg-brand p-7 text-brand-ink md:p-10">
                <img src={produceImage('basket')} alt="" className="absolute -end-6 -bottom-8 w-44 animate-float md:w-60" />
                <p className="font-mono text-xs tracking-[0.2em] uppercase opacity-70">{t('customer.welcome_eyebrow')}</p>
                <h1 className="font-display mt-2 max-w-xl text-4xl font-light md:text-5xl">{t('customer.welcome', { name: auth.user.name.split(' ')[0] })}</h1>
                <p className="mt-3 max-w-md opacity-80">{upcoming.length ? t('customer.next_pickup_hint', { count: stats.upcoming }) : t('customer.no_pickup_hint')}</p>
                <Link href={route('products.index')} className={buttonClass('lime', 'md', 'mt-6 dark:bg-forest dark:text-lime')}>
                    {t('customer.shop_now')} <ArrowRight className="rtl-flip size-4" />
                </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label={t('customer.stat_orders')} value={<CountUp value={stats.orders} />} icon={ClipboardList} />
                <Stat label={t('customer.stat_upcoming')} value={<CountUp value={stats.upcoming} />} icon={CalendarClock} tone="lime" />
                <Stat label={t('customer.stat_spent')} value={<CountUp value={stats.spent} format={(n) => money(Math.round(n))} />} icon={Wallet} />
                <Stat label={t('customer.stat_favorites')} value={<CountUp value={stats.favorites} />} icon={Heart} />
            </div>

            <div className="mt-10 grid gap-8 xl:grid-cols-[1.3fr_1fr]">
                <section>
                    <SectionTitle eyebrow={t('customer.upcoming_eyebrow')} title={t('customer.upcoming_title')} action={<Link href={route('customer.orders.index', { status: 'open' })} className="text-sm font-medium text-brand">{t('common.view_all')}</Link>} />
                    {upcoming.length === 0 ? (
                        <EmptyState icon="basket" title={t('customer.no_upcoming')} action={<Link href={route('markets.index')} className={buttonClass('outline', 'sm')}>{t('home.find_market')}</Link>} />
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {upcoming.map((o, i) => (
                                <Reveal key={o.id} delay={i * 0.05}>
                                    <Card className="flex h-full flex-col p-5">
                                        <div className="flex items-center justify-between">
                                            <StatusBadge status={o.status} />
                                            <span className="font-mono text-xs text-ink-faint">{o.code}</span>
                                        </div>
                                        <p className="font-display mt-4 text-3xl leading-none">{date(o.pickup_date, { weekday: 'long' })}</p>
                                        <p className="mt-1 text-sm text-ink-soft">
                                            {date(o.pickup_date, { day: 'numeric', month: 'long' })} · {time(o.pickup_starts_at)}–{time(o.pickup_ends_at)}
                                        </p>
                                        <p className="mt-4 text-sm font-medium">{o.farmer.stall_name}</p>
                                        <p className="flex items-center gap-1 text-xs text-ink-soft">
                                            <MapPin className="size-3" /> {o.market.name}
                                        </p>
                                        <div className="mt-auto flex items-center justify-between gap-2 pt-5">
                                            <span className="font-display text-xl">{money(o.total_amount)}</span>
                                            <div className="flex gap-1.5">
                                                <a href={googleDirections(o.market.latitude, o.market.longitude)} target="_blank" rel="noreferrer" className={buttonClass('soft', 'icon', 'size-9')} aria-label={t('map.directions')}>
                                                    <Navigation className="size-4" />
                                                </a>
                                                <Link href={route('customer.orders.show', o.code)} className={buttonClass('primary', 'sm')}>
                                                    {t('common.details')}
                                                </Link>
                                            </div>
                                        </div>
                                    </Card>
                                </Reveal>
                            ))}
                        </div>
                    )}

                    <SectionTitle className="mt-10" eyebrow={t('customer.history_eyebrow')} title={t('customer.recent_title')} action={<Link href={route('customer.orders.index')} className="text-sm font-medium text-brand">{t('common.view_all')}</Link>} />
                    <div className="space-y-3">
                        {recent.map((o) => (
                            <OrderRow key={o.id} order={o} href={route('customer.orders.show', o.code)} who={o.farmer.stall_name} />
                        ))}
                    </div>
                </section>

                <aside className="space-y-8">
                    {toReview.length > 0 && (
                        <Card className="p-6">
                            <SectionTitle eyebrow={t('customer.review_eyebrow')} title={t('customer.review_title')} />
                            <ul className="space-y-2">
                                {toReview.map((o) => (
                                    <li key={o.id}>
                                        <Link href={route('customer.orders.show', o.code)} className="flex items-center justify-between rounded-2xl bg-ink/[0.03] p-3 text-sm hover:bg-ink/[0.06]">
                                            <span>
                                                <span className="block font-medium">{o.farmer.stall_name}</span>
                                                <span className="text-xs text-ink-faint">{o.code}</span>
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-brand">
                                                <Star className="size-4" /> {t('customer.rate')}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    <div>
                        <SectionTitle eyebrow={t('customer.for_you_eyebrow')} title={t('customer.for_you_title')} />
                        {suggestions.length === 0 ? (
                            <Card className="p-6 text-sm text-ink-soft">{t('customer.for_you_empty')}</Card>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {suggestions.map((p) => (
                                    <ProductCard key={p.id} product={p} />
                                ))}
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </>
    );
}
