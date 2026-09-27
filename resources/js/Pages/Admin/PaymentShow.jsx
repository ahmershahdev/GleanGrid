import { Link, useForm } from '@inertiajs/react';
import { Undo2 } from 'lucide-react';
import { useState } from 'react';
import { MethodIcon } from '@/Components/PaymentVisuals';
import { Button, Card, Modal, PageHeader, StatusBadge, Textarea } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function AdminPaymentShow({ payment, orders, events }) {
    const t = useT();
    const { money, date } = useFormat();
    const [open, setOpen] = useState(false);
    const form = useForm({ reason: '' });
    const refundable = orders.some((o) => o.payment_status === 'paid') || ['pending', 'processing'].includes(payment.status);
    const stamp = (iso) => date(iso, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <>
            <Link href={route('admin.payments.index')} className="text-sm text-ink-soft hover:text-ink">
                ← {t('pay.admin_title')}
            </Link>
            <PageHeader
                className="mt-3"
                eyebrow={t('pay.reference')}
                title={payment.reference}
                actions={
                    refundable && (
                        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                            <Undo2 className="size-4" /> {t('pay.refund')}
                        </Button>
                    )
                }
            />

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                <Card className="space-y-4 p-6">
                    <div className="flex items-center gap-3">
                        <MethodIcon method={payment.method} />
                        <p className="font-display flex-1 text-2xl">{t(`pay.${payment.method}`)}</p>
                        <StatusBadge status={payment.status} />
                    </div>
                    <p className="font-display text-5xl tabular-nums">{money(payment.amount)}</p>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                        {[
                            [t('pay.customer'), `${payment.customer?.name ?? '—'} · ${payment.customer?.email ?? ''}`],
                            [t('pay.provider_ref'), payment.provider_ref ?? '—'],
                            [t('pay.total_refunded'), money(payment.refunded_amount)],
                            ['Card', payment.card_last4 ? `${payment.card_brand} •••• ${payment.card_last4}` : '—'],
                            ['Wallet', payment.wallet_msisdn ?? '—'],
                            ['Provider', payment.provider],
                        ].map(([k, v]) => (
                            <div key={k} className="rounded-2xl bg-ink/[0.03] p-3">
                                <dt className="text-xs text-ink-faint">{k}</dt>
                                <dd className="mt-0.5 font-medium break-words">{v}</dd>
                            </div>
                        ))}
                    </dl>
                    <div>
                        <p className="mb-2 text-sm font-semibold">{t('pay.orders')}</p>
                        <ul className="space-y-2">
                            {orders.map((o) => (
                                <li key={o.code} className="flex items-center gap-3 rounded-2xl border border-line p-3 text-sm">
                                    <Link href={route('admin.orders.show', o.code)} className="font-mono font-semibold underline-offset-4 hover:underline">
                                        {o.code}
                                    </Link>
                                    <span className="flex-1 truncate text-ink-soft">{o.farmer}</span>
                                    <StatusBadge status={o.status} />
                                    <StatusBadge status={o.payment_status} />
                                    <span className="tabular-nums">{money(o.total_amount)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>

                <Card className="p-6">
                    <p className="font-display text-2xl">{t('pay.events')}</p>
                    <ol className="relative mt-6 space-y-5 border-s border-line ps-6">
                        {events.map((e) => (
                            <li key={e.id} className="relative">
                                <span className={cn('absolute -start-[31px] top-1 size-3 rounded-full ring-4 ring-elev', e.status === 'paid' ? 'bg-success' : ['failed', 'expired'].includes(e.status) ? 'bg-danger' : e.type === 'refund' ? 'bg-lime' : 'bg-ink-faint')} />
                                <p className="text-sm font-semibold capitalize">{e.type.replaceAll('_', ' ')}</p>
                                {e.message && <p className="text-sm text-ink-soft">{e.message}</p>}
                                <p className="text-xs text-ink-faint">
                                    {stamp(e.created_at)}
                                    {e.ip_address && ` · ${e.ip_address}`}
                                </p>
                            </li>
                        ))}
                    </ol>
                </Card>
            </div>

            <Modal open={open} onClose={() => setOpen(false)} title={t('pay.refund_title')}>
                <p className="text-sm text-ink-soft">{t('pay.refund_body')}</p>
                <form
                    className="mt-4 space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(route('admin.payments.refund', payment.reference), { preserveScroll: true, onSuccess: () => setOpen(false) });
                    }}
                >
                    <Textarea label={t('pay.reason')} rows={3} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} required maxLength={200} />
                    <Button type="submit" variant="accent" className="w-full" loading={form.processing}>
                        {t('pay.refund')} {money(payment.amount - payment.refunded_amount)}
                    </Button>
                </form>
            </Modal>
        </>
    );
}
