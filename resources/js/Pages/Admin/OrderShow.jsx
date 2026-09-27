import { Link, useForm } from '@inertiajs/react';
import { History, ScrollText, ShieldAlert } from 'lucide-react';
import { OrderTimeline, StatusHistory } from '@/Components/OrderBits';
import { Button, Card, StatusBadge, Textarea } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';

export default function AdminOrderShow({ order, history, audit }) {
    const t = useT();
    const { money, date, time, relative } = useFormat();
    const cancel = useForm({ reason: '' });
    const open = ['placed', 'accepted', 'ready'].includes(order.status);

    return (
        <>
            <Link href={route('admin.orders.index')} className="text-sm text-ink-soft hover:text-ink">
                ← {t('dash.orders')}
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="font-display font-mono text-3xl md:text-4xl">{order.code}</h1>
                <StatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-ink-soft">
                {order.customer?.name} → {order.farmer?.stall_name} · {order.market?.name} · {date(order.pickup_date, { weekday: 'short', day: 'numeric', month: 'short' })} {time(order.pickup_starts_at)}–{time(order.pickup_ends_at)}
            </p>

            <Card className="mt-8 p-6 md:p-8">
                <OrderTimeline order={order} />
            </Card>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                <Card className="p-6 md:p-8">
                    <h2 className="font-display text-2xl">{t('order.items')}</h2>
                    <ul className="mt-4 divide-y divide-line text-sm">
                        {order.items.map((i) => (
                            <li key={i.id} className="flex justify-between py-3">
                                <span>
                                    {i.quantity} × {i.product_name} <span className="text-ink-faint">@ {money(i.unit_price)}</span>
                                </span>
                                <span className="tabular-nums">{money(i.line_total)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-4 flex justify-between border-t border-line pt-4">
                        <span className="text-ink-soft">{t('checkout.total')}</span>
                        <span className="font-display text-2xl">{money(order.total_amount)}</span>
                    </div>
                    <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt className="text-ink-faint">{t('forders.customer')}</dt>
                            <dd>
                                {order.customer?.name}
                                <br />
                                <span className="text-ink-soft">{order.customer?.email}</span>
                                {order.customer?.no_show_count > 0 && <span className="mt-1 block text-xs text-danger">{t('forders.no_show_count', { count: order.customer.no_show_count }, `${order.customer.no_show_count} missed pickup(s)`)}</span>}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-ink-faint">{t('nav.farmers')}</dt>
                            <dd>
                                {order.farmer?.stall_name}
                                <br />
                                <span className="text-ink-soft" dir="ltr">
                                    {order.farmer?.phone}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </Card>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="font-display flex items-center gap-2 text-xl">
                            <History className="size-5" /> {t('order.history', {}, 'Status history')}
                        </h2>
                        <p className="mt-1 text-xs text-ink-faint">{t('aorders.trigger_note', {}, 'Recorded automatically by a database trigger.')}</p>
                        <div className="mt-4">
                            <StatusHistory history={history} />
                        </div>
                    </Card>

                    {audit.length > 0 && (
                        <Card className="p-6">
                            <h2 className="font-display flex items-center gap-2 text-xl">
                                <ScrollText className="size-5" /> {t('audit.title', {}, 'Audit log')}
                            </h2>
                            <ul className="mt-3 space-y-2 text-sm">
                                {audit.map((a) => (
                                    <li key={a.id}>
                                        <span className="font-medium">{a.user?.name}</span> <span className="text-ink-soft">{a.description}</span> <span className="text-xs text-ink-faint">· {relative(a.created_at)}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {open && (
                        <Card
                            as="form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                cancel.post(route('admin.orders.cancel', order.code), { preserveScroll: true });
                            }}
                            className="space-y-3 border-danger/30 p-6"
                        >
                            <h2 className="font-display flex items-center gap-2 text-xl text-danger">
                                <ShieldAlert className="size-5" /> {t('aorders.override', {}, 'Cancel as administrator')}
                            </h2>
                            <p className="text-sm text-ink-soft">{t('aorders.override_hint', {}, 'For disputes or closed markets. Stock and coupons are released and both sides are notified.')}</p>
                            <Textarea label={t('aorders.reason', {}, 'Reason (shared with both)')} value={cancel.data.reason} onChange={(e) => cancel.setData('reason', e.target.value)} error={cancel.errors.reason} rows={3} required />
                            <Button type="submit" variant="danger" loading={cancel.processing} disabled={cancel.data.reason.trim().length < 5}>
                                {t('aorders.cancel', {}, 'Cancel order')}
                            </Button>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}
