import { Link, router } from '@inertiajs/react';
import { Check, PackageCheck, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Button, EmptyState, PageHeader, Pagination, StatusBadge, Tabs } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { pathUrl } from '@/lib/url';

export function QuickActions({ order, size = 'sm' }) {
    const t = useT();
    const go = (status) => router.patch(route('farmer.orders.status', order.code), { status }, { preserveScroll: true });
    return (
        <div className="flex flex-wrap gap-1.5">
            {order.status === 'placed' && (
                <>
                    <Button size={size} onClick={() => go('accepted')}>
                        <Check className="size-4" /> {t('forders.accept')}
                    </Button>
                    <Button size={size} variant="ghost" className="text-danger" onClick={() => go('declined')}>
                        <X className="size-4" /> {t('forders.decline')}
                    </Button>
                </>
            )}
            {order.status === 'accepted' && (
                <Button size={size} variant="lime" onClick={() => go('ready')}>
                    <PackageCheck className="size-4" /> {t('forders.mark_ready')}
                </Button>
            )}
            {order.status === 'ready' && (
                <Button size={size} variant="accent" onClick={() => go('completed')}>
                    <Check className="size-4" /> {t('forders.complete')}
                </Button>
            )}
        </div>
    );
}

export default function FarmerOrders({ orders, counts, filters }) {
    const t = useT();
    const { money, date, time } = useFormat();
    const [q, setQ] = useState(filters.q ?? '');
    const tab = (status) => pathUrl('farmer.orders.index', { ...filters, status });
    const total = Object.values(counts).reduce((a, b) => a + Number(b), 0);

    return (
        <>
            <PageHeader title={t('forders.title')} description={t('forders.subtitle')} />
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    active={filters.status ?? 'all'}
                    tabs={[
                        { key: 'all', label: t('common.all'), href: tab(undefined), count: total },
                        ...['placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled'].map((s) => ({ key: s, label: t(`status.${s}`), href: tab(s), count: counts[s] ?? 0 })),
                    ]}
                />
                <div className="flex gap-2">
                    <input type="date" value={filters.date ?? ''} onChange={(e) => router.get(pathUrl('farmer.orders.index', { ...filters, date: e.target.value }), {}, { preserveState: true })} className="h-10 rounded-full border border-line-strong bg-elev px-3 text-sm" aria-label={t('forders.pickup_date')} />
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            router.get(pathUrl('farmer.orders.index', { ...filters, q }), {}, { preserveState: true });
                        }}
                        className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-elev px-3"
                    >
                        <Search className="size-4 text-ink-faint" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('forders.search')} className="w-36 bg-transparent text-sm focus:outline-none" />
                    </form>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                {orders.data.length === 0 && <EmptyState icon="basket" title={t('forders.empty')} />}
                {orders.data.map((o) => (
                    <div key={o.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-line bg-elev p-4 md:p-5">
                        <Link href={route('farmer.orders.show', o.code)} className="min-w-[200px] flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold hover:underline">{o.code}</span>
                                <StatusBadge status={o.status} />
                            </div>
                            <p className="font-display mt-1 text-lg">{o.customer.name}</p>
                            <p className="line-clamp-1 text-sm text-ink-soft">{o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}</p>
                        </Link>
                        <div className="text-sm text-ink-soft">
                            <p className="font-medium text-ink">{date(o.pickup_date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                            <p>
                                {time(o.pickup_starts_at)}–{time(o.pickup_ends_at)} · {o.market.name}
                            </p>
                        </div>
                        <p className="font-display w-28 text-end text-xl tabular-nums">{money(o.total_amount)}</p>
                        <QuickActions order={o} />
                    </div>
                ))}
            </div>
            <Pagination meta={orders} className="mt-6" />
        </>
    );
}
