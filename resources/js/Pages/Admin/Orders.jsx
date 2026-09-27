import { Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, Pagination, StatusBadge, Table } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { SelectMenu } from '@/Components/Dropdown';
import { pathUrl } from '@/lib/url';

export default function AdminOrders({ orders, markets, filters }) {
    const t = useT();
    const { money, date, time } = useFormat();
    const [q, setQ] = useState(filters.q ?? '');
    const apply = (patch) => router.get(pathUrl('admin.orders.index', { ...filters, ...patch }), {}, { preserveState: true });

    return (
        <>
            <PageHeader title={t('aorders.title')} description={t('aorders.subtitle')} />
            <div className="mt-8 flex flex-wrap items-center gap-3">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({ q });
                    }}
                    className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-elev px-3"
                >
                    <Search className="size-4 text-ink-faint" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('aorders.search')} className="w-40 bg-transparent text-sm focus:outline-none" />
                </form>
                <SelectMenu value={filters.status ?? ''} onChange={(e) => apply({ status: e.target.value })}>
                    <option value="">{t('aorders.any_status')}</option>
                    {['placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled'].map((s) => (
                        <option key={s} value={s}>
                            {t(`status.${s}`)}
                        </option>
                    ))}
                </SelectMenu>
                <SelectMenu value={filters.market ?? ''} onChange={(e) => apply({ market: e.target.value })}>
                    <option value="">{t('farmers.all_markets')}</option>
                    {markets.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name}
                        </option>
                    ))}
                </SelectMenu>
            </div>
            <Table className="mt-6" head={[t('aorders.code'), t('acustomers.customer'), t('afarmers.stall'), t('order.pickup'), t('afarmers.status'), t('cart.total')]}>
                {orders.data.map((o) => (
                    <tr key={o.id} className="hover:bg-ink/[0.02]">
                        <td className="px-5 py-3 font-mono text-xs font-semibold">
                            <Link href={route('admin.orders.show', o.code)} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                                {o.code}
                            </Link>
                        </td>
                        <td className="px-5 py-3">{o.customer.name}</td>
                        <td className="px-5 py-3">{o.farmer.stall_name}</td>
                        <td className="px-5 py-3 text-ink-soft">
                            {date(o.pickup_date, { day: 'numeric', month: 'short' })} · {time(o.pickup_starts_at)}
                            <br />
                            <span className="text-xs">{o.market.name}</span>
                        </td>
                        <td className="px-5 py-3">
                            <StatusBadge status={o.status} />
                        </td>
                        <td className="px-5 py-3 font-semibold tabular-nums">{money(o.total_amount)}</td>
                    </tr>
                ))}
            </Table>
            <Pagination meta={orders} className="mt-6" />
        </>
    );
}
