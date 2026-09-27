import { Link, useForm } from '@inertiajs/react';
import { History, Mail, MapPin, Phone, Printer, UserX } from 'lucide-react';
import { OrderTimeline, StatusHistory } from '@/Components/OrderBits';
import { Button, Card, StatusBadge, Textarea } from '@/Components/ui';
import { confirmDialog } from '@/lib/confirm';
import { QuickActions } from '@/Pages/Farmer/Orders/Index';
import { useFormat, useT } from '@/lib/i18n';

export default function FarmerOrderShow({ order, history = [], customerNoShows = 0 }) {
    const t = useT();
    const { money, date, time } = useFormat();
    const decline = useForm({ status: 'declined', note: '' });
    const noShow = useForm({ status: 'no_show', note: '' });
    const canDecline = ['placed', 'accepted'].includes(order.status);
    const windowOver = new Date(`${order.pickup_date}T${order.pickup_ends_at}`) < new Date();
    const canNoShow = ['accepted', 'ready'].includes(order.status) && windowOver;
    const markNoShow = async () => {
        const ok = await confirmDialog({ title: t('forders.no_show_title', {}, 'Mark as not collected?'), body: t('forders.no_show_body', {}, 'The stock goes back on sale and the customer is told. Repeated no-shows pause their pre-ordering.'), confirmLabel: t('forders.no_show', {}, 'Mark no-show'), tone: 'danger' });
        if (ok) noShow.patch(route('farmer.orders.status', order.code), { preserveScroll: true });
    };

    return (
        <>
            <Link href={route('farmer.orders.index')} className="text-sm text-ink-soft hover:text-ink print:hidden">
                ← {t('dash.orders')}
            </Link>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="font-display font-mono text-3xl md:text-4xl">{order.code}</h1>
                    <StatusBadge status={order.status} />
                    {order.payment_method && order.payment_method !== 'cash' && <StatusBadge status={order.payment_status === 'paid' ? 'paid' : order.payment_status} />}
                </div>
                <div className="flex gap-2 print:hidden">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Printer className="size-4" /> {t('forders.print')}
                    </Button>
                    <QuickActions order={order} />
                </div>
            </div>

            <Card className="mt-8 p-6 md:p-8">
                <OrderTimeline order={order} />
            </Card>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                <Card className="p-6 md:p-8">
                    <h2 className="font-display text-2xl">{t('forders.packing_list')}</h2>
                    <table className="mt-4 w-full text-sm">
                        <thead>
                            <tr className="border-b border-line text-xs text-ink-faint uppercase">
                                <th className="py-2 text-start font-medium">{t('forders.item')}</th>
                                <th className="py-2 text-end font-medium">{t('forders.qty')}</th>
                                <th className="py-2 text-end font-medium">{t('forders.line')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {order.items.map((i) => (
                                <tr key={i.id}>
                                    <td className="py-3">
                                        {i.product_name} <span className="text-ink-faint">@ {money(i.unit_price)}</span>
                                    </td>
                                    <td className="py-3 text-end font-semibold">
                                        {i.quantity} {t(`units.${i.unit}`)}
                                    </td>
                                    <td className="py-3 text-end tabular-nums">{money(i.line_total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {order.discount_amount > 0 && (
                        <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-ink-soft">{t('checkout.subtotal')}</dt>
                                <dd className="tabular-nums">{money(order.subtotal)}</dd>
                            </div>
                            <div className="flex justify-between text-success">
                                <dt>
                                    {t('checkout.discount')} <span className="font-mono text-xs">{order.coupon_code}</span>
                                </dt>
                                <dd className="tabular-nums">−{money(order.discount_amount)}</dd>
                            </div>
                        </dl>
                    )}
                    <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
                        <span className="text-ink-soft">{order.payment_status === 'paid' ? t('pay.paid_online') : t('forders.collect')}</span>
                        <span className="font-display text-3xl">{money(order.total_amount)}</span>
                    </div>
                    {order.customer_note && <p className="mt-4 rounded-2xl bg-sun/15 p-3 text-sm">📝 {order.customer_note}</p>}
                </Card>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="font-display text-xl">{t('forders.customer')}</h2>
                        <p className="mt-3 font-medium">{order.customer.name}</p>
                        <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                            <Phone className="size-4" /> <a href={`tel:${order.customer.phone}`} dir="ltr">{order.customer.phone}</a>
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
                            <Mail className="size-4" /> {order.customer.email}
                        </p>
                        {customerNoShows > 0 && (
                            <p className="mt-3 rounded-xl bg-sun/15 px-3 py-2 text-xs text-ink-soft">{t('forders.no_show_count', { count: customerNoShows }, `${customerNoShows} missed pickup(s) recently`)}</p>
                        )}
                        {canNoShow && (
                            <Button variant="outline" size="sm" className="mt-4 w-full print:hidden" onClick={markNoShow} disabled={noShow.processing}>
                                <UserX className="size-4" /> {t('forders.no_show', {}, 'Mark no-show')}
                            </Button>
                        )}
                    </Card>
                    {history.length > 0 && (
                        <Card className="p-6 print:hidden">
                            <h2 className="font-display flex items-center gap-2 text-xl">
                                <History className="size-5" /> {t('order.history', {}, 'Status history')}
                            </h2>
                            <div className="mt-4">
                                <StatusHistory history={history} />
                            </div>
                        </Card>
                    )}
                    <Card className="p-6">
                        <h2 className="font-display text-xl">{t('order.pickup')}</h2>
                        <p className="font-display mt-3 text-2xl">{date(order.pickup_date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <p className="text-sm text-ink-soft">
                            {time(order.pickup_starts_at)} – {time(order.pickup_ends_at)}
                        </p>
                        <p className="mt-2 flex items-center gap-1.5 text-sm">
                            <MapPin className="size-4 text-accent" /> {order.market.name}
                        </p>
                    </Card>
                    {canDecline && (
                        <Card
                            as="form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                decline.patch(route('farmer.orders.status', order.code), { preserveScroll: true });
                            }}
                            className="space-y-3 p-6 print:hidden"
                        >
                            <h2 className="font-display text-xl">{t('forders.decline_title')}</h2>
                            <Textarea rows={2} placeholder={t('forders.decline_placeholder')} value={decline.data.note} onChange={(e) => decline.setData('note', e.target.value)} />
                            <Button type="submit" variant="danger" size="sm" loading={decline.processing}>
                                {t('forders.decline_with_note')}
                            </Button>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}
