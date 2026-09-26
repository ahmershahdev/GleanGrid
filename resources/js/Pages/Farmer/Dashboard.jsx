import { Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, CircleDashed, ClipboardList, Hourglass, PackageCheck, Star, TrendingUp, Wallet } from 'lucide-react';
import { TrendChart } from '@/Components/Charts';
import { CountUp } from '@/Components/motion';
import { Card, EmptyState, SectionTitle, Stat, StatusBadge } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function SetupChecklist({ setup }) {
    const t = useT();
    const steps = [
        ['profile', 'farmer.setup_profile', 'farmer.stall.edit'],
        ['markets', 'farmer.setup_markets', 'farmer.stall.edit'],
        ['slots', 'farmer.setup_slots', 'farmer.slots.index'],
        ['products', 'farmer.setup_products', 'farmer.products.create'],
    ];
    const done = steps.filter(([k]) => setup[k]).length;
    if (done === steps.length) return null;
    return (
        <Card className="mb-6 p-6">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">{t('farmer.setup_title')}</h2>
                <span className="text-sm text-ink-soft">
                    {done}/{steps.length}
                </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/5">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {steps.map(([k, label, r]) => (
                    <li key={k}>
                        <Link href={route(r)} className={cn('flex items-center gap-2 rounded-2xl p-3 text-sm', setup[k] ? 'text-ink-faint line-through' : 'bg-ink/[0.03] hover:bg-ink/[0.06]')}>
                            {setup[k] ? <CheckCircle2 className="size-4 text-success" /> : <CircleDashed className="size-4" />} {t(label)}
                        </Link>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

export default function FarmerDashboard({ farmer, setup, stats, revenueChart, bestSellers, upcoming, lowStock }) {
    const t = useT();
    const { money, date, time } = useFormat();
    const maxQty = Math.max(1, ...bestSellers.map((b) => Number(b.qty)));

    return (
        <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('farmer.dash_eyebrow')}</p>
                    <h1 className="font-display mt-1 text-4xl font-light md:text-5xl">{farmer.stall_name}</h1>
                </div>
                {farmer.rating_count > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-elev px-4 py-2 text-sm ring-1 ring-line">
                        <Star className="size-4 fill-sun text-sun" /> {farmer.rating_avg.toFixed(2)} · {t('reviews.count', { count: farmer.rating_count })}
                    </span>
                )}
            </div>

            <SetupChecklist setup={setup} />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label={t('farmer.stat_total')} value={<CountUp value={stats.total} />} icon={ClipboardList} />
                <Stat label={t('farmer.stat_pending')} value={<CountUp value={stats.pending} />} hint={t('farmer.stat_pending_hint', { count: stats.to_prepare })} icon={Hourglass} tone={stats.pending ? 'accent' : 'default'} />
                <Stat label={t('farmer.stat_revenue')} value={<CountUp value={stats.revenue} format={(n) => money(Math.round(n))} />} hint={t('farmer.stat_week', { amount: money(stats.revenue_week) })} icon={Wallet} tone="brand" />
                <Stat label={t('farmer.stat_pipeline')} value={<CountUp value={stats.pipeline} format={(n) => money(Math.round(n))} />} hint={t('farmer.stat_ready', { count: stats.ready })} icon={TrendingUp} tone="lime" />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                <Card className="p-6">
                    <SectionTitle eyebrow={t('farmer.chart_eyebrow')} title={t('farmer.chart_title')} />
                    <TrendChart
                        data={revenueChart}
                        x="week"
                        formatX={(w) => date(w, { day: 'numeric', month: 'short' })}
                        formatValue={(v, key) => (key === 'revenue' ? money(v) : v)}
                        series={[{ key: 'revenue', name: t('farmer.revenue'), color: 'var(--accent)' }]}
                    />
                </Card>
                <Card className="p-6">
                    <SectionTitle eyebrow={t('farmer.best_eyebrow')} title={t('farmer.best_title')} />
                    {bestSellers.length === 0 ? (
                        <p className="text-sm text-ink-soft">{t('farmer.best_empty')}</p>
                    ) : (
                        <ol className="space-y-4">
                            {bestSellers.map((b, i) => (
                                <li key={b.name}>
                                    <div className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="font-medium">
                                            <span className="me-2 font-mono text-ink-faint">0{i + 1}</span>
                                            {b.name}
                                        </span>
                                        <span className="text-ink-soft tabular-nums">
                                            {b.qty} {t(`units.${b.unit}`)} · {money(b.revenue)}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/5">
                                        <div className="h-full rounded-full bg-lime" style={{ width: `${(b.qty / maxQty) * 100}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </Card>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                <Card className="p-6">
                    <SectionTitle eyebrow={t('farmer.queue_eyebrow')} title={t('farmer.queue_title')} action={<Link href={route('farmer.orders.index')} className="text-sm font-medium text-brand">{t('common.view_all')}</Link>} />
                    {upcoming.length === 0 ? (
                        <EmptyState icon="basket" title={t('farmer.queue_empty')} />
                    ) : (
                        <ul className="divide-y divide-line">
                            {upcoming.map((o) => (
                                <li key={o.id}>
                                    <Link href={route('farmer.orders.show', o.code)} className="flex flex-wrap items-center gap-3 py-3 hover:opacity-80">
                                        <span className="font-mono text-sm font-semibold">{o.code}</span>
                                        <StatusBadge status={o.status} />
                                        <span className="flex-1 text-sm text-ink-soft">{o.customer.name}</span>
                                        <span className="text-sm">
                                            {date(o.pickup_date, { weekday: 'short', day: 'numeric', month: 'short' })} · {time(o.pickup_starts_at)}
                                        </span>
                                        <span className="w-24 text-end font-semibold tabular-nums">{money(o.total_amount)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <Card className="p-6">
                    <SectionTitle eyebrow={t('farmer.stock_eyebrow')} title={t('farmer.stock_title')} action={<Link href={route('farmer.products.index')} className="text-sm font-medium text-brand">{t('common.manage')}</Link>} />
                    {lowStock.length === 0 ? (
                        <p className="flex items-center gap-2 text-sm text-success">
                            <PackageCheck className="size-4" /> {t('farmer.stock_ok')}
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {lowStock.map((p) => (
                                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-ink/[0.03] p-2.5">
                                    <img src={p.image_url} alt="" className="size-9 object-contain" />
                                    <span className="flex-1 text-sm font-medium">{p.name}</span>
                                    <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', p.stock_quantity === 0 ? 'text-accent' : 'text-warning')}>
                                        {p.stock_quantity === 0 && <AlertTriangle className="size-3.5" />}
                                        {p.stock_quantity} {t(`units.${p.unit}`)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </>
    );
}
