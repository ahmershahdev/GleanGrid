import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { MethodIcon } from '@/Components/PaymentVisuals';
import { EmptyState, PageHeader, Pagination, Stat, StatusBadge } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';

export default function CustomerPayments({ payments, totals }) {
    const t = useT();
    const { money, relative } = useFormat();

    return (
        <>
            <PageHeader title={t('pay.history_title')} description={t('pay.history_sub')} />
            <div className="mt-8 grid grid-cols-2 gap-3 md:max-w-xl">
                <Stat label={t('pay.total_paid')} value={money(totals.paid)} tone="brand" />
                <Stat label={t('pay.total_refunded')} value={money(totals.refunded)} />
            </div>
            {payments.data.length === 0 ? (
                <EmptyState className="mt-8" title={t('pay.history_empty')} />
            ) : (
                <ul className="mt-8 space-y-3">
                    {payments.data.map((p) => (
                        <li key={p.reference}>
                            <Link href={route('customer.payments.show', p.reference)} className="group flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-elev p-4 transition hover:border-line-strong md:p-5">
                                <span className="flex size-12 items-center justify-center rounded-2xl bg-bg">
                                    <MethodIcon method={p.method} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-mono text-sm font-semibold">{p.reference}</span>
                                    <span className="block text-xs text-ink-soft">
                                        {t(`pay.${p.method}`)}
                                        {p.card_last4 && ` · •••• ${p.card_last4}`}
                                        {p.wallet_msisdn && ` · ${p.wallet_msisdn}`} · {t('pay.orders_count', { count: p.orders_count })} · {relative(p.created_at)}
                                    </span>
                                </span>
                                <StatusBadge status={p.status} />
                                <span className="font-display text-2xl tabular-nums">{money(p.amount)}</span>
                                <ArrowUpRight className="rtl-flip size-5 text-ink-faint transition group-hover:text-ink" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            <Pagination meta={payments} className="mt-6" />
        </>
    );
}
