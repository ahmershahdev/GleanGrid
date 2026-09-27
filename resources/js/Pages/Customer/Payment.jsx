import { Link, router, useForm, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Clock, FlaskConical, LockKeyhole, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SplitWords } from '@/Components/motion';
import { CreditCard3D, formatCardNumber, MethodIcon, WalletPhone, WALLET_THEME } from '@/Components/PaymentVisuals';
import { Button, buttonClass, Input, StatusBadge } from '@/Components/ui';
import { confirmDialog } from '@/lib/confirm';
import { getJson } from '@/lib/http';
import { useFormat, useT } from '@/lib/i18n';
import { cn, produceImage } from '@/lib/utils';

const newKey = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`.replace(/^(.{8})/, '$1-0000'));

function useCountdown(iso) {
    const [left, setLeft] = useState(() => Math.max(0, new Date(iso) - Date.now()));
    useEffect(() => {
        const id = setInterval(() => setLeft(Math.max(0, new Date(iso) - Date.now())), 1000);
        return () => clearInterval(id);
    }, [iso]);
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    return { left, label: `${m}:${String(s).padStart(2, '0')}` };
}

function Burst() {
    const items = ['mango', 'tomato', 'carrot', 'leafy_green', 'strawberry', 'honey_pot', 'bread', 'egg'];
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {items.map((img, i) => {
                const angle = (i / items.length) * Math.PI * 2;
                return (
                    <motion.img
                        key={img}
                        src={produceImage(img)}
                        alt=""
                        className="absolute start-1/2 top-1/2 size-12"
                        initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 0 }}
                        animate={{ x: Math.cos(angle) * 170, y: Math.sin(angle) * 120, scale: [0, 1.2, 1], rotate: 180 * (i % 2 ? 1 : -1), opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.8, delay: 0.15 + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                    />
                );
            })}
        </div>
    );
}

function CardForm({ payment, amount, onPay, busy, errors, t }) {
    const [card, setCard] = useState({ card_name: '', card_number: '', card_expiry: '', card_cvc: '' });
    const [flipped, setFlipped] = useState(false);
    const set = (k) => (e) => {
        let v = e.target.value;
        if (k === 'card_number') v = formatCardNumber(v);
        if (k === 'card_expiry') v = v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
        if (k === 'card_cvc') v = v.replace(/\D/g, '').slice(0, 4);
        setCard((c) => ({ ...c, [k]: v }));
    };
    return (
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
            <CreditCard3D number={card.card_number} name={card.card_name} expiry={card.card_expiry} cvc={card.card_cvc} flipped={flipped} />
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onPay('card', card);
                }}
                className="space-y-4"
                autoComplete="on"
            >
                <Input label={t('pay.card_number')} inputMode="numeric" autoComplete="cc-number" dir="ltr" placeholder="4242 4242 4242 4242" value={card.card_number} onChange={set('card_number')} error={t(errors.card_number ?? '')} required maxLength={23} />
                <Input label={t('pay.card_name')} autoComplete="cc-name" value={card.card_name} onChange={set('card_name')} error={t(errors.card_name ?? '')} required maxLength={80} />
                <div className="grid grid-cols-2 gap-3">
                    <Input label={t('pay.card_expiry')} inputMode="numeric" autoComplete="cc-exp" dir="ltr" placeholder="MM/YY" value={card.card_expiry} onChange={set('card_expiry')} error={t(errors.card_expiry ?? '')} required maxLength={5} />
                    <Input
                        label={t('pay.card_cvc')}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        type="password"
                        dir="ltr"
                        placeholder="•••"
                        value={card.card_cvc}
                        onChange={set('card_cvc')}
                        onFocus={() => setFlipped(true)}
                        onBlur={() => setFlipped(false)}
                        error={t(errors.card_cvc ?? '')}
                        required
                        maxLength={4}
                    />
                </div>
                <Button type="submit" size="lg" variant="accent" className="w-full" loading={busy}>
                    <LockKeyhole className="size-4" /> {t('pay.pay_now', { amount })}
                </Button>
                {payment.attempts > 0 && <p className="text-center text-xs text-ink-faint">{t('pay.attempts', { n: payment.attempts, max: 5 })}</p>}
            </form>
        </div>
    );
}

function WalletForm({ method, payment, amount, onPay, busy, errors, t, waiting, approved, seconds }) {
    const [msisdn, setMsisdn] = useState('');
    const theme = WALLET_THEME[method];
    return (
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
            <WalletPhone wallet={method} state={approved ? 'approved' : waiting ? 'waiting' : 'idle'} number={waiting ? payment.wallet_msisdn : msisdn} amount={amount} seconds={seconds} />
            <div>
                <AnimatePresence mode="wait">
                    {waiting ? (
                        <motion.div key="wait" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3" role="status" aria-live="polite">
                            <p className="font-display text-3xl">{approved ? t('pay.wallet_approved') : t('pay.wallet_waiting')}</p>
                            <p className="text-ink-soft">{t('pay.wallet_waiting_body', { number: payment.wallet_msisdn, wallet: t(`pay.${method}`) })}</p>
                        </motion.div>
                    ) : (
                        <motion.form
                            key="form"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            onSubmit={(e) => {
                                e.preventDefault();
                                onPay(method, { msisdn: msisdn.replace(/\D/g, '') });
                            }}
                            className="space-y-4"
                        >
                            <Input label={t('pay.msisdn')} inputMode="tel" autoComplete="tel-national" dir="ltr" placeholder={t('pay.msisdn_ph')} value={msisdn} onChange={(e) => setMsisdn(e.target.value.replace(/[^\d ]/g, '').slice(0, 12))} error={t(errors.msisdn ?? '')} required />
                            <Button type="submit" size="lg" className="w-full" loading={busy} style={{ background: theme.bg, color: theme.ink }}>
                                <LockKeyhole className="size-4" /> {t('pay.pay_now', { amount })}
                            </Button>
                            {payment.attempts > 0 && <p className="text-center text-xs text-ink-faint">{t('pay.attempts', { n: payment.attempts, max: 5 })}</p>}
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function Outcome({ payment, t, money }) {
    const paid = payment.status === 'paid';
    const refunded = ['refunded', 'partially_refunded'].includes(payment.status);
    const Icon = paid || refunded ? CheckCircle2 : XCircle;
    return (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-[36px] bg-brand px-6 py-14 text-center text-brand-ink md:py-20">
            {paid && <Burst />}
            <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }} className="relative mx-auto flex size-20 items-center justify-center rounded-full bg-lime text-forest">
                <Icon className="size-10" />
            </motion.span>
            <h2 className="font-display relative mt-6 text-4xl md:text-5xl">{t(paid ? 'pay.paid_title' : refunded ? 'pay.refunded_title' : payment.status === 'failed' ? 'pay.failed_title' : 'pay.expired_title')}</h2>
            <p className="relative mx-auto mt-3 max-w-md opacity-80">{paid ? t('pay.paid_body') : refunded ? money(payment.refunded_amount) : t('pay.expired_body')}</p>
            {paid && payment.card_last4 && (
                <p className="relative mt-4 font-mono text-sm opacity-70">
                    {payment.card_brand?.toUpperCase()} •••• {payment.card_last4}
                </p>
            )}
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                <Link href={route('customer.orders.index')} className={buttonClass('accent', 'lg')}>
                    {t('pay.view_orders')} <ArrowRight className="rtl-flip size-4" />
                </Link>
                {!paid && !refunded && (
                    <Link href={route('products.index')} className={buttonClass('outline', 'lg', 'border-brand-ink/30 text-brand-ink')}>
                        <RotateCcw className="size-4" /> {t('cart.browse')}
                    </Link>
                )}
            </div>
        </motion.div>
    );
}

export default function Payment({ payment: initial, orders, methods, sandbox, testData, redirect }) {
    const t = useT();
    const { money, date, time } = useFormat();
    const { errors } = usePage().props;
    const [payment, setPayment] = useState(initial);
    const [method, setMethod] = useState(methods.includes(initial.method) ? initial.method : methods[0]);
    const key = useRef(newKey());
    const redirectForm = useRef(null);
    const form = useForm({});
    const { left, label } = useCountdown(payment.expires_at);
    const amount = money(payment.amount);
    const open = ['pending', 'processing'].includes(payment.status) && left > 0;
    const waiting = payment.status === 'processing' && ['easypaisa', 'jazzcash'].includes(payment.method);
    const [approved, setApproved] = useState(false);

    useEffect(() => setPayment(initial), [initial]);

    useEffect(() => {
        if (redirect && redirectForm.current) redirectForm.current.submit();
    }, [redirect]);

    useEffect(() => {
        if (payment.status !== 'processing' || redirect) return;
        let stop = false;
        const tick = async () => {
            try {
                const { data } = await getJson(route('customer.payments.status', payment.reference));
                if (stop) return;
                if (data.payment.status !== 'processing') {
                    if (data.payment.status === 'paid') setApproved(true);
                    setTimeout(() => router.reload({ preserveScroll: true }), data.payment.status === 'paid' ? 900 : 0);
                    stop = true;
                    return;
                }
            } catch {
            }
            if (!stop) setTimeout(tick, 1500);
        };
        const id = setTimeout(tick, 1200);
        return () => {
            stop = true;
            clearTimeout(id);
        };
    }, [payment.status, payment.reference, redirect]);

    const pay = (m, fields) => {
        form.transform(() => ({ method: m, idempotency_key: key.current, ...fields }));
        form.post(route('customer.payments.pay', payment.reference), {
            preserveScroll: true,
            onFinish: () => {
                key.current = newKey();
            },
        });
    };

    const cancel = async () => {
        const ok = await confirmDialog({ title: t('pay.cancel_title'), body: t('pay.cancel_body'), confirmLabel: t('pay.cancel') });
        if (ok) router.post(route('customer.payments.cancel', payment.reference));
    };

    const errorText = useMemo(() => [errors.payment, errors.method].filter(Boolean).map((e) => t(e)), [errors, t]);

    return (
        <section className="mx-auto max-w-[1200px] px-5 pt-10 pb-10 sm:px-8">
            {redirect && (
                <form ref={redirectForm} method="POST" action={redirect.url} className="hidden">
                    {Object.entries(redirect.fields).map(([k, v]) => (
                        <input key={k} type="hidden" name={k} value={v} />
                    ))}
                </form>
            )}

            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('pay.eyebrow', { ref: payment.reference })}</p>
                    <h1 className="font-display mt-2 text-5xl font-light md:text-6xl">
                        <SplitWords text={t('pay.title')} immediate />
                    </h1>
                </div>
                {open && (
                    <div className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium tabular-nums', left < 120000 ? 'bg-accent/15 text-accent' : 'bg-ink/5')} role="timer" aria-live="off">
                        <Clock className="size-4" /> {t('pay.expires_in', { time: label })}
                    </div>
                )}
            </div>

            {sandbox && testData && open && (
                <div className="mt-6 rounded-3xl border border-dashed border-warning/50 bg-sun/10 p-5 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-warning">
                        <FlaskConical className="size-4" /> {t('pay.sandbox')} — {t('pay.sandbox_body')}
                    </p>
                    <div className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                        {testData.cards.map(([number, outcome]) => (
                            <p key={number} className="font-mono text-xs">
                                {number.trim()} <span className="font-sans text-ink-soft">{t(`pay.outcome_${outcome}`)}</span>
                            </p>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">{t('pay.test_wallet', { secs: testData.approval_seconds, tail: testData.wallet_decline_suffix })}</p>
                </div>
            )}

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
                <div className="min-w-0">
                    {!open ? (
                        <Outcome payment={payment} t={t} money={money} />
                    ) : (
                        <div className="rounded-[32px] border border-line bg-elev p-5 md:p-8">
                            {!waiting && (
                                <div role="tablist" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-6">
                                    {methods.map((m) => (
                                        <button key={m} type="button" role="tab" aria-selected={method === m} onClick={() => setMethod(m)} className={cn('relative inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition', method === m ? 'text-bg' : 'text-ink-soft hover:bg-ink/5')}>
                                            {method === m && <motion.span layoutId="pay-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                                            <span className="relative flex items-center gap-2">
                                                <MethodIcon method={m} className="size-6 rounded-lg text-[8px]" /> {t(`pay.${m}`)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {errorText.length > 0 && (
                                <div className="mb-6 rounded-2xl bg-danger/10 p-4 text-sm text-danger" role="alert">
                                    {errorText.map((e) => (
                                        <p key={e}>{e}</p>
                                    ))}
                                </div>
                            )}
                            {payment.failure_reason && payment.status === 'pending' && !errorText.length && (
                                <div className="mb-6 rounded-2xl bg-danger/10 p-4 text-sm text-danger" role="alert">
                                    {t(`payment.reason_${payment.failure_reason}`)}
                                </div>
                            )}
                            <AnimatePresence mode="wait">
                                <motion.div key={waiting ? 'waiting' : method} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                                    {(waiting ? payment.method : method) === 'card' ? (
                                        <CardForm payment={payment} amount={amount} onPay={pay} busy={form.processing} errors={errors} t={t} />
                                    ) : (
                                        <WalletForm method={waiting ? payment.method : method} payment={payment} amount={amount} onPay={pay} busy={form.processing} errors={errors} t={t} waiting={waiting} approved={approved} seconds={testData?.approval_seconds ?? 4} />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                            <p className="mt-8 flex items-start gap-2 border-t border-line pt-5 text-xs text-ink-faint">
                                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" /> {t('pay.secure')}
                            </p>
                        </div>
                    )}
                </div>

                <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                    <div className="rounded-[28px] border border-line bg-elev p-6">
                        <p className="text-sm text-ink-soft">{t('pay.total')}</p>
                        <p className="font-display mt-1 text-5xl tabular-nums">{amount}</p>
                        <div className="mt-3">
                            <StatusBadge status={payment.status} />
                        </div>
                        <p className="mt-6 mb-3 text-sm font-semibold">{t('pay.orders')}</p>
                        <ul className="space-y-2">
                            {orders.map((o) => (
                                <li key={o.code} className="flex items-center gap-3 rounded-2xl bg-ink/[0.03] p-3 text-sm">
                                    {o.logo && <img src={o.logo} alt="" className="size-9 object-contain" />}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{o.farmer}</span>
                                        <span className="block truncate text-xs text-ink-soft">
                                            <span className="font-mono">{o.code}</span> · {date(o.pickup_date, { day: 'numeric', month: 'short' })} {time(o.pickup_starts_at)}
                                        </span>
                                    </span>
                                    <span className="font-semibold tabular-nums">{money(o.total_amount)}</span>
                                </li>
                            ))}
                        </ul>
                        {open && payment.status === 'pending' && (
                            <button type="button" onClick={cancel} className="mt-5 w-full text-center text-sm text-ink-faint underline-offset-4 hover:text-danger hover:underline">
                                {t('pay.cancel')}
                            </button>
                        )}
                    </div>
                </aside>
            </div>
        </section>
    );
}
