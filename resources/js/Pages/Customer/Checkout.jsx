import { Link, router, usePage } from '@inertiajs/react';
import { postJson } from '@/lib/http';
import { motion } from 'motion/react';
import { CalendarCheck2, Check, Loader2, MapPin, TicketPercent, Timer, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SplitWords } from '@/Components/motion';
import { Button, buttonClass, EmptyState, Textarea } from '@/Components/ui';
import { cart } from '@/lib/cart';
import { useFormat, useT } from '@/lib/i18n';
import { useCartSync } from '@/lib/useCartSync';
import { cn } from '@/lib/utils';

function SlotPicker({ group, value, onChange }) {
    const t = useT();
    const { day, time, date } = useFormat();
    return (
        <div className="space-y-3">
            {group.slots.map((s) => (
                <div key={s.id} className="rounded-2xl border border-line p-3">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="font-semibold">
                            {day(s.day_of_week)} · {time(s.starts_at)}–{time(s.ends_at)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-ink-soft">
                            <MapPin className="size-3.5" /> {s.market.name}
                        </span>
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                        {s.dates.map((d) => {
                            const active = value.slot === s.id && value.date === d;
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => onChange({ slot: s.id, date: d })}
                                    aria-pressed={active}
                                    className={cn('inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition', active ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong hover:border-ink')}
                                >
                                    {active && <Check className="size-4" />}
                                    {date(d, { weekday: 'short', day: 'numeric', month: 'short' })}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
            {group.slots.length === 0 && <p className="text-sm text-accent">{t('cart.no_slots')}</p>}
        </div>
    );
}

function CouponBox({ group, applied, onApply, onRemove }) {
    const t = useT();
    const { money } = useFormat();
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const apply = async (e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const { data } = await postJson(route('customer.coupons.preview'), {
                code,
                farmer_profile_id: group.farmer.id,
                items: group.items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
            });
            onApply(data);
            setCode('');
        } catch (err) {
            setError(err?.response?.data?.errors?.coupon?.[0] ?? (err?.response?.status === 429 ? 'errors.429_title' : 'coupon.invalid'));
        } finally {
            setBusy(false);
        }
    };

    if (applied) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-success/50 bg-success/10 px-4 py-3 text-sm">
                <TicketPercent className="size-5 shrink-0 text-success" />
                <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold tracking-wider">{applied.code}</p>
                    <p className="text-xs text-ink-soft">{applied.description || t('checkout.saved', { amount: money(applied.discount) })}</p>
                </div>
                <span className="font-semibold text-success tabular-nums">−{money(applied.discount)}</span>
                <button type="button" onClick={onRemove} className="rounded-full p-1.5 text-ink-faint hover:bg-ink/5 hover:text-ink" aria-label={t('common.remove')}>
                    <X className="size-4" />
                </button>
            </motion.div>
        );
    }

    return (
        <form onSubmit={apply} className="mt-5">
            <label className={cn('flex h-12 items-center gap-2 rounded-full border bg-bg ps-4 pe-1.5 transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand', error ? 'border-danger' : 'border-line-strong')}>
                <TicketPercent className="size-4 shrink-0 text-ink-faint" />
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('checkout.coupon')} aria-label={t('checkout.coupon')} maxLength={30} className="h-full min-w-0 flex-1 bg-transparent font-mono text-sm tracking-wider uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case focus:outline-none" />
                <Button type="submit" size="sm" variant="soft" loading={busy} disabled={!code.trim()}>
                    {t('checkout.apply')}
                </Button>
            </label>
            {error && <p className="mt-1.5 ps-4 text-xs text-danger" role="alert">{t(error)}</p>}
        </form>
    );
}

export default function Checkout({ customer }) {
    const t = useT();
    const { money } = useFormat();
    const { errors } = usePage().props;
    const { groups, loading } = useCartSync();
    const [choices, setChoices] = useState({});
    const [notes, setNotes] = useState({});
    const [coupons, setCoupons] = useState({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setChoices((c) => {
            const next = { ...c };
            groups.forEach((g) => {
                if (!next[g.farmer.id] && g.slots[0]) next[g.farmer.id] = { slot: g.slots[0].id, date: g.slots[0].dates[0] };
            });
            return next;
        });
    }, [groups]);

    const orderable = groups
        .map((g) => ({ ...g, items: g.items.filter((i) => i.orderable && i.quantity <= i.product.stock_quantity) }))
        .filter((g) => g.items.length && g.slots.length);
    const subtotal = orderable.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.product.price * i.quantity, 0), 0);
    const discount = orderable.reduce((sum, g) => sum + (coupons[g.farmer.id]?.discount ?? 0), 0);
    const total = subtotal - discount;

    const submit = () => {
        const payload = orderable.map((g) => ({
            farmer_profile_id: g.farmer.id,
            pickup_slot_id: choices[g.farmer.id]?.slot,
            pickup_date: choices[g.farmer.id]?.date,
            note: notes[g.farmer.id] ?? '',
            coupon: coupons[g.farmer.id]?.code ?? null,
            items: g.items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        }));
        router.post(route('customer.checkout.store'), { groups: payload }, {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => cart.removeMany(orderable.flatMap((g) => g.items.map((i) => i.product.id))),
        });
    };

    const errorList = Object.entries(errors ?? {});

    return (
        <>
            <section className="mx-auto max-w-[1200px] px-5 pt-12 sm:px-8">
                <Link href={route('cart')} className="text-sm text-ink-soft hover:text-ink">
                    ← {t('nav.cart')}
                </Link>
                <h1 className="font-display mt-3 text-5xl font-light md:text-7xl">
                    <SplitWords text={t('checkout.title')} immediate />
                </h1>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="size-8 animate-spin text-ink-faint" />
                    </div>
                ) : orderable.length === 0 ? (
                    <EmptyState className="mt-10" title={t('cart.empty_title')} action={<Link href={route('products.index')} className={buttonClass('primary')}>{t('cart.browse')}</Link>} />
                ) : (
                    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
                        <div className="space-y-6">
                            {errorList.length > 0 && (
                                <div className="rounded-2xl bg-danger/10 p-4 text-sm text-danger" role="alert">
                                    {errorList.map(([k, v]) => (
                                        <p key={k}>{t(v)}</p>
                                    ))}
                                </div>
                            )}
                            {orderable.map((g, idx) => (
                                <div key={g.farmer.id} className="rounded-[28px] border border-line bg-elev p-5 md:p-7">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('checkout.order_n', { n: idx + 1 })}</p>
                                            <h2 className="font-display mt-1 text-2xl">{g.farmer.stall_name}</h2>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1 text-xs">
                                            <Timer className="size-3.5" /> {t('farmer.cutoff', { hours: g.farmer.order_cutoff_hours })}
                                        </span>
                                    </div>
                                    <ul className="mt-4 space-y-1.5 text-sm">
                                        {g.items.map((i) => (
                                            <li key={i.product.id} className="flex justify-between gap-3">
                                                <span>
                                                    {i.quantity} × {i.product.name} <span className="text-ink-faint">/ {t(`units.${i.product.unit}`)}</span>
                                                </span>
                                                <span className="tabular-nums">{money(i.product.price * i.quantity)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-6 mb-3 flex items-center gap-2 text-sm font-semibold">
                                        <CalendarCheck2 className="size-4" /> {t('checkout.choose_window')}
                                    </p>
                                    <SlotPicker group={g} value={choices[g.farmer.id] ?? {}} onChange={(v) => setChoices((c) => ({ ...c, [g.farmer.id]: v }))} />
                                    <CouponBox
                                        group={g}
                                        applied={coupons[g.farmer.id]}
                                        onApply={(data) => setCoupons((c) => ({ ...c, [g.farmer.id]: data }))}
                                        onRemove={() => setCoupons(({ [g.farmer.id]: _, ...rest }) => rest)}
                                    />
                                    <Textarea wrapperClass="mt-5" rows={2} label={t('checkout.note')} placeholder={t('checkout.note_placeholder')} value={notes[g.farmer.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [g.farmer.id]: e.target.value }))} maxLength={500} />
                                </div>
                            ))}
                        </div>

                        <aside className="lg:sticky lg:top-24 lg:self-start">
                            <div className="rounded-[28px] border border-line bg-elev p-6">
                                <p className="font-display text-2xl">{t('checkout.pickup_by')}</p>
                                <p className="mt-2 text-sm text-ink-soft">
                                    {customer.name} · <span dir="ltr">{customer.phone}</span>
                                    <br />
                                    {customer.email}
                                </p>
                                {discount > 0 && (
                                    <dl className="mt-5 space-y-1.5 border-t border-line pt-5 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-ink-soft">{t('checkout.subtotal')}</dt>
                                            <dd className="tabular-nums">{money(subtotal)}</dd>
                                        </div>
                                        <div className="flex justify-between text-success">
                                            <dt>{t('checkout.discount')}</dt>
                                            <dd className="tabular-nums">−{money(discount)}</dd>
                                        </div>
                                    </dl>
                                )}
                                <div className="mt-5 flex items-end justify-between border-t border-line pt-5">
                                    <span>{t('cart.total')}</span>
                                    <span className="font-display text-4xl tabular-nums">{money(total)}</span>
                                </div>
                                <p className="mt-2 text-xs text-ink-faint">{t('cart.pay_note')}</p>
                                <Button size="lg" variant="accent" className="mt-6 w-full" onClick={submit} loading={processing}>
                                    {t('checkout.place', { count: orderable.length })}
                                </Button>
                                <p className="mt-3 text-center text-xs text-ink-faint">{t('checkout.terms')}</p>
                            </div>
                        </aside>
                    </div>
                )}
            </section>
        </>
    );
}
