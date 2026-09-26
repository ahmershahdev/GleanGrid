import { Link, useForm } from '@inertiajs/react';
import { Check, MapPin } from 'lucide-react';
import { Button, Card, PageHeader, Textarea } from '@/Components/ui';
import { QtyStepper } from '@/Components/widgets';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function EditOrder({ order, products, slots }) {
    const t = useT();
    const { money, day, time, date } = useFormat();
    const initial = Object.fromEntries(order.items.map((i) => [i.product_id, i.quantity]));
    const form = useForm({
        pickup_slot_id: order.pickup_slot_id,
        pickup_date: order.pickup_date,
        note: order.customer_note ?? '',
        items: products.map((p) => ({ product_id: p.id, quantity: initial[p.id] ?? 0 })),
    });

    const qty = (id) => form.data.items.find((i) => i.product_id === id)?.quantity ?? 0;
    const setQty = (id, q) => form.setData('items', form.data.items.map((i) => (i.product_id === id ? { ...i, quantity: q } : i)));
    const total = products.reduce((s, p) => s + p.price * qty(p.id), 0);
    // The current window might no longer be listed (e.g. near cut-off) — keep it selectable.
    const currentListed = slots.some((s) => s.id === order.pickup_slot_id && s.dates.includes(order.pickup_date));

    return (
        <>
            <Link href={route('customer.orders.show', order.code)} className="text-sm text-ink-soft hover:text-ink">
                ← {order.code}
            </Link>
            <PageHeader className="mt-3" title={t('order.modify_title')} description={t('order.modify_sub', { farmer: order.farmer.stall_name })} />

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put(route('customer.orders.update', order.code));
                }}
                className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]"
            >
                <Card className="p-6">
                    <h2 className="font-display text-2xl">{t('order.items')}</h2>
                    {form.errors.items && <p className="mt-2 text-sm text-danger">{form.errors.items}</p>}
                    <ul className="mt-4 divide-y divide-line">
                        {products.map((p) => (
                            <li key={p.id} className="flex flex-wrap items-center gap-4 py-3">
                                <img src={p.image_url} alt="" className="size-12 rounded-xl bg-sunk object-contain p-1.5" />
                                <div className="flex-1">
                                    <p className="font-medium">{p.name}</p>
                                    <p className="text-sm text-ink-soft">
                                        {money(p.price)} / {t(`units.${p.unit}`)} · {t('product.only_left', { count: p.available })}
                                    </p>
                                </div>
                                <QtyStepper size="sm" value={qty(p.id)} max={p.available} onChange={(q) => setQty(p.id, q)} />
                            </li>
                        ))}
                    </ul>
                </Card>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="font-display text-2xl">{t('checkout.choose_window')}</h2>
                        {form.errors.pickup && <p className="mt-2 text-sm text-danger">{form.errors.pickup}</p>}
                        <div className="mt-4 space-y-3">
                            {!currentListed && (
                                <p className="rounded-2xl bg-ink/[0.03] p-3 text-sm">
                                    {t('order.current_window')}: {date(order.pickup_date)} · {time(order.pickup_starts_at)}
                                </p>
                            )}
                            {slots.map((s) => (
                                <div key={s.id} className="rounded-2xl border border-line p-3">
                                    <p className="text-sm font-semibold">
                                        {day(s.day_of_week)} · {time(s.starts_at)}–{time(s.ends_at)}
                                    </p>
                                    <p className="flex items-center gap-1 text-xs text-ink-soft">
                                        <MapPin className="size-3" /> {s.market.name}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {s.dates.map((d) => {
                                            const active = form.data.pickup_slot_id === s.id && form.data.pickup_date === d;
                                            return (
                                                <button key={d} type="button" onClick={() => form.setData({ ...form.data, pickup_slot_id: s.id, pickup_date: d })} className={cn('inline-flex h-9 items-center gap-1 rounded-full border px-3 text-sm', active ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong')}>
                                                    {active && <Check className="size-3.5" />} {date(d, { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Textarea wrapperClass="mt-5" rows={2} label={t('checkout.note')} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} />
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-end justify-between">
                            <span>{t('cart.total')}</span>
                            <span className="font-display text-3xl">{money(total)}</span>
                        </div>
                        <p className="mt-2 text-xs text-ink-faint">{t('order.modify_note')}</p>
                        <Button type="submit" className="mt-5 w-full" loading={form.processing} disabled={total === 0}>
                            {t('order.save_changes')}
                        </Button>
                        {form.errors.order && <p className="mt-2 text-sm text-danger">{form.errors.order}</p>}
                    </Card>
                </div>
            </form>
        </>
    );
}
