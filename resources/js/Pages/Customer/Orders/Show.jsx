import { Link, router, useForm } from '@inertiajs/react';
import { CalendarClock, Mail, MessageCircle, Pencil, Phone, RotateCcw, Timer, XCircle } from 'lucide-react';
import { useState } from 'react';
import { LazyDirectionsMap as DirectionsMap } from '@/Components/LazyMap';
import { OrderTimeline, StatusHistory } from '@/Components/OrderBits';
import OrderQr from '@/Components/OrderQr';
import { Button, buttonClass, Card, Modal, RatingInput, StatusBadge, Textarea } from '@/Components/ui';
import { toast } from '@/Components/widgets';
import { cart } from '@/lib/cart';
import { useFormat, useT } from '@/lib/i18n';

function ReviewForm({ order, type, id, label, image, done }) {
    const t = useT();
    const form = useForm({ type, id, rating: 5, comment: '' });
    if (done) {
        return (
            <div className="flex items-center gap-3 rounded-2xl bg-success/10 p-3 text-sm text-success">
                {image && <img src={image} alt="" className="size-8 object-contain" />} {t('reviews.thanks', { name: label })}
            </div>
        );
    }
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.post(route('customer.reviews.store', order.id), { preserveScroll: true });
            }}
            className="space-y-3 rounded-2xl border border-line p-4"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-medium">
                    {image && <img src={image} alt="" className="size-8 object-contain" />} {label}
                </p>
                <RatingInput value={form.data.rating} onChange={(r) => form.setData('rating', r)} />
            </div>
            <Textarea rows={2} placeholder={t('reviews.placeholder')} value={form.data.comment} onChange={(e) => form.setData('comment', e.target.value)} error={form.errors.comment || form.errors.rating} />
            <Button type="submit" size="sm" loading={form.processing}>
                {t('reviews.submit')}
            </Button>
        </form>
    );
}

export default function CustomerOrderShow({ order, isOwner, reviewed, history = [], scanUrl }) {
    const t = useT();
    const { money, date, time, relative } = useFormat();
    const [confirm, setConfirm] = useState(false);

    const reorder = () => {
        order.items.forEach((i) => i.product && cart.add({ ...i.product, farmer: order.farmer, image_url: i.product.image_url }, i.quantity));
        toast('orders.reordered');
        router.visit(route('cart'));
    };

    return (
        <>
            <Link href={route('customer.orders.index')} className="text-sm text-ink-soft hover:text-ink">
                ← {t('dash.orders')}
            </Link>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-display font-mono text-3xl md:text-4xl">{order.code}</h1>
                        <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                        {t('order.placed_on', { date: date(order.created_at) })}
                        {!isOwner && ` · ${t('order.placed_by', { name: order.customer.name })}`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isOwner && order.editable && (
                        <>
                            <Link href={route('customer.orders.edit', order.code)} className={buttonClass('outline', 'sm')}>
                                <Pencil className="size-4" /> {t('order.modify')}
                            </Link>
                            <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirm(true)}>
                                <XCircle className="size-4" /> {t('order.cancel')}
                            </Button>
                        </>
                    )}
                    <Button variant="primary" size="sm" onClick={reorder}>
                        <RotateCcw className="size-4" /> {t('order.reorder')}
                    </Button>
                </div>
            </div>

            <Card className="mt-8 p-6 md:p-8">
                <OrderTimeline order={order} />
                {order.editable && (
                    <p className="mt-6 flex items-center gap-2 rounded-2xl bg-sun/15 p-3 text-sm">
                        <Timer className="size-4 shrink-0" /> {t('order.cutoff_notice', { when: relative(order.cutoff_at) })}
                    </p>
                )}
            </Card>

            {['placed', 'accepted', 'ready'].includes(order.status) && scanUrl && (
                <Card className="mt-6 p-6 md:p-8">
                    <OrderQr url={scanUrl} code={order.code} />
                </Card>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <Card className="p-6 md:p-8">
                    <h2 className="font-display text-2xl">{t('order.items')}</h2>
                    <ul className="mt-4 divide-y divide-line">
                        {order.items.map((i) => (
                            <li key={i.id} className="flex items-center gap-4 py-3">
                                {i.product?.image_url && <img src={i.product.image_url} alt="" className="size-12 rounded-xl bg-sunk object-contain p-1.5" />}
                                <div className="flex-1">
                                    <p className="font-medium">{i.product_name}</p>
                                    <p className="text-sm text-ink-soft">
                                        {i.quantity} × {money(i.unit_price)} / {t(`units.${i.unit}`)}
                                    </p>
                                </div>
                                <p className="font-semibold tabular-nums">{money(i.line_total)}</p>
                            </li>
                        ))}
                    </ul>
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
                        <span className="text-ink-soft">{t('cart.total')}</span>
                        <span className="font-display text-3xl">{money(order.total_amount)}</span>
                    </div>
                    <p className="mt-1 text-end text-xs text-ink-faint">{t('cart.pay_note')}</p>
                    {order.customer_note && <p className="mt-4 rounded-2xl bg-ink/[0.03] p-3 text-sm">📝 {order.customer_note}</p>}
                    {order.farmer_note && <p className="mt-2 rounded-2xl bg-brand-soft p-3 text-sm">🧑‍🌾 {order.farmer_note}</p>}
                </Card>

                <Card className="p-6 md:p-8">
                    <h2 className="font-display flex items-center gap-2 text-2xl">
                        <CalendarClock className="size-5" /> {t('order.pickup')}
                    </h2>
                    <p className="font-display mt-4 text-3xl">{date(order.pickup_date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-ink-soft">
                        {time(order.pickup_starts_at)} – {time(order.pickup_ends_at)} · {order.market.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-faint">{order.market.address}</p>
                    <Link href={route('farmers.show', order.farmer.slug)} className="mt-3 inline-block text-sm font-medium text-brand">
                        {order.farmer.stall_name} →
                    </Link>
                    {(order.farmer.phone || order.farmer.email) && (
                        <div role="group" className="mt-4 flex flex-wrap gap-2" aria-label={t('order.contact_farmer', {}, 'Contact the farmer')}>
                            {order.farmer.phone && (
                                <>
                                    <a href={`tel:${order.farmer.phone.replace(/[^0-9+]/g, '')}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-sm font-medium transition hover:bg-ink/5">
                                        <Phone className="size-3.5" /> {t('order.call', {}, 'Call')}
                                    </a>
                                    <a
                                        href={`https://wa.me/${order.farmer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Assalam o Alaikum! About my GleanGrid order ${order.code}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-sm font-medium transition hover:bg-ink/5"
                                    >
                                        <MessageCircle className="size-3.5" /> WhatsApp
                                    </a>
                                </>
                            )}
                            {order.farmer.email && (
                                <a href={`mailto:${order.farmer.email}?subject=${encodeURIComponent(`GleanGrid order ${order.code}`)}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-sm font-medium transition hover:bg-ink/5">
                                    <Mail className="size-3.5" /> {t('order.email', {}, 'E-mail')}
                                </a>
                            )}
                        </div>
                    )}
                    <DirectionsMap className="mt-5" lat={order.market.latitude} lng={order.market.longitude} title={order.market.name} subtitle={order.market.address} color="#E2552C" image={order.farmer.logo_url} />
                </Card>
            </div>

            {history.length > 1 && (
                <Card className="mt-6 p-6 md:p-8">
                    <h2 className="font-display text-2xl">{t('order.history', {}, 'Status history')}</h2>
                    <div className="mt-5">
                        <StatusHistory history={history} />
                    </div>
                </Card>
            )}

            {order.status === 'completed' && isOwner && (
                <Card className="mt-6 p-6 md:p-8">
                    <h2 className="font-display text-2xl">{t('reviews.rate_order')}</h2>
                    <p className="mt-1 text-sm text-ink-soft">{t('reviews.rate_hint')}</p>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <ReviewForm order={order} type="farmer" id={order.farmer.id} label={order.farmer.stall_name} image={order.farmer.logo_url} done={reviewed.includes(`farmer:${order.farmer.id}`)} />
                        {order.items
                            .filter((i) => i.product_id)
                            .map((i) => (
                                <ReviewForm key={i.id} order={order} type="product" id={i.product_id} label={i.product_name} image={i.product?.image_url} done={reviewed.includes(`product:${i.product_id}`)} />
                            ))}
                    </div>
                </Card>
            )}

            <Modal open={confirm} onClose={() => setConfirm(false)} title={t('order.cancel_title')}>
                <p className="text-ink-soft">{t('order.cancel_body', { code: order.code })}</p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setConfirm(false)}>
                        {t('order.keep')}
                    </Button>
                    <Button variant="danger" onClick={() => router.post(route('customer.orders.cancel', order.code), {}, { onFinish: () => setConfirm(false) })}>
                        {t('order.cancel_confirm')}
                    </Button>
                </div>
            </Modal>
        </>
    );
}
