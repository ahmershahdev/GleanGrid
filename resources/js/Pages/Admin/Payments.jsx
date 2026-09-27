import { Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { SelectMenu } from '@/Components/Dropdown';
import { MethodIcon } from '@/Components/PaymentVisuals';
import { PageHeader, Pagination, Stat, StatusBadge, Table } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { pathUrl } from '@/lib/url';

const STATUSES = ['pending', 'processing', 'paid', 'failed', 'expired', 'refunded', 'partially_refunded'];

export default function AdminPayments({ payments, stats, filters }) {
    const t = useT();
    const { money, relative } = useFormat();
    const [q, setQ] = useState(filters.q ?? '');
    const apply = (patch) => router.get(pathUrl('admin.payments.index', { ...filters, ...patch, page: undefined }), {}, { preserveState: true });

    return (
        <>
            <PageHeader title={t('pay.admin_title')} description={t('pay.admin_sub')} />

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label={t('pay.captured')} value={money(stats.captured)} tone="brand" />
                <Stat label={t('pay.total_refunded')} value={money(stats.refunded)} />
                <Stat label={t('pay.open')} value={stats.open} tone="lime" />
                <Stat label={t('pay.success_rate')} value={stats.success_rate === null ? '—' : `${stats.success_rate}%`} />
            </div>

            {stats.by_method.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {stats.by_method.map((m) => (
                        <div key={m.method} className="flex items-center gap-3 rounded-3xl border border-line bg-elev p-4">
                            <MethodIcon method={m.method} />
                            <span className="flex-1">
                                <span className="block text-sm font-medium">{t(`pay.${m.method}`)}</span>
                                <span className="block text-xs text-ink-soft">{m.count} × · {money(m.amount)}</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({ q });
                    }}
                    className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-elev px-3"
                >
                    <Search className="size-4 text-ink-faint" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('pay.search')} aria-label={t('pay.search')} className="w-52 bg-transparent text-sm focus:outline-none" />
                </form>
                <SelectMenu value={filters.status ?? ''} onChange={(e) => apply({ status: e.target.value })} ariaLabel={t('pay.any_status')}>
                    <option value="">{t('pay.any_status')}</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {t(`status.${s}`)}
                        </option>
                    ))}
                </SelectMenu>
                <SelectMenu value={filters.method ?? ''} onChange={(e) => apply({ method: e.target.value })} ariaLabel={t('pay.any_method')}>
                    <option value="">{t('pay.any_method')}</option>
                    {['easypaisa', 'jazzcash', 'card'].map((m) => (
                        <option key={m} value={m}>
                            {t(`pay.${m}`)}
                        </option>
                    ))}
                </SelectMenu>
            </div>

            <Table className="mt-6" head={[t('pay.reference'), t('pay.customer'), t('pay.method'), t('afarmers.status'), t('cart.total'), '']}>
                {payments.data.map((p) => (
                    <tr key={p.reference} className="hover:bg-ink/[0.02]">
                        <td className="px-5 py-3 font-mono text-xs font-semibold">
                            <Link href={route('admin.payments.show', p.reference)} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                                {p.reference}
                            </Link>
                            <span className="mt-0.5 block font-sans font-normal text-ink-faint">{t('pay.orders_count', { count: p.orders_count })}</span>
                        </td>
                        <td className="px-5 py-3">
                            {p.customer?.name}
                            <span className="block text-xs text-ink-faint">{p.customer?.email}</span>
                        </td>
                        <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-2">
                                <MethodIcon method={p.method} className="size-6 rounded-lg text-[8px]" /> {t(`pay.${p.method}`)}
                            </span>
                            {p.card_last4 && <span className="block text-xs text-ink-faint">•••• {p.card_last4}</span>}
                        </td>
                        <td className="px-5 py-3">
                            <StatusBadge status={p.status} />
                        </td>
                        <td className="px-5 py-3 font-semibold tabular-nums">
                            {money(p.amount)}
                            {p.refunded_amount > 0 && <span className="block text-xs font-normal text-ink-faint">−{money(p.refunded_amount)}</span>}
                        </td>
                        <td className="px-5 py-3 text-xs text-ink-faint">{relative(p.created_at)}</td>
                    </tr>
                ))}
            </Table>
            <Pagination meta={payments} className="mt-6" />
        </>
    );
}
