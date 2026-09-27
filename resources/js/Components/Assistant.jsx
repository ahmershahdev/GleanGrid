import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, BadgeCheck, Clock, HandCoins, LayoutGrid, LockKeyhole, MapPin, RotateCcw, ShieldCheck, ShoppingBasket, Sparkles, Star, Store, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StallBadges } from '@/Components/Badges';
import { cart } from '@/lib/cart';
import { postJson } from '@/lib/http';
import { useFormat, useT } from '@/lib/i18n';
import { cn, produceImage } from '@/lib/utils';

const Q = (key, intent, topic) => ({ key, intent, topic });

const QUESTIONS = {
    account: [Q('q_my_profile', 'my_profile'), Q('q_track_order', 'track_order'), Q('q_my_next_pickup', 'my_next_pickup'), Q('q_my_orders', 'my_orders'), Q('q_my_cart', 'my_cart'), Q('q_my_favorites', 'my_favorites'), Q('q_my_alerts', 'my_alerts'), Q('q_my_payments', 'my_payments'), Q('q_my_spending', 'my_spending'), Q('q_my_reviews', 'my_reviews')],
    stall: [Q('q_farmer_today', 'farmer_today'), Q('q_farmer_pending', 'farmer_pending'), Q('q_farmer_low_stock', 'farmer_low_stock'), Q('q_farmer_standing', 'farmer_standing'), Q('q_my_profile', 'my_profile')],
    admin: [Q('q_admin_overview', 'admin_overview'), Q('q_my_profile', 'my_profile')],
    shop: [Q('q_browse_fruits', 'browse', 'fruits'), Q('q_browse_vegetables', 'browse', 'vegetables'), Q('q_browse_mango', 'browse', 'mango'), Q('q_browse_dairy', 'browse', 'dairy-eggs'), Q('q_browse_honey', 'browse', 'honey-preserves'), Q('q_browse_bread', 'browse', 'baked-goods'), Q('q_price_drops', 'price_drops'), Q('q_my_cart', 'my_cart')],
    discover: [Q('q_in_season', 'in_season'), Q('q_top_rated', 'top_rated'), Q('q_price_drops', 'price_drops'), Q('q_faq_badges', 'faq_badges')],
    markets: [Q('q_open_today', 'open_today'), Q('q_market_timings', 'market_timings'), Q('q_faq_pickup', 'faq_pickup')],
    help: [Q('q_faq_how', 'faq_how'), Q('q_faq_payment', 'faq_payment'), Q('q_faq_online_pay', 'faq_online_pay'), Q('q_faq_refunds', 'faq_refunds'), Q('q_faq_cancel', 'faq_cancel'), Q('q_faq_cutoff', 'faq_cutoff'), Q('q_faq_delivery', 'faq_delivery'), Q('q_faq_alerts', 'faq_alerts'), Q('q_faq_privacy', 'faq_privacy'), Q('q_faq_farmer', 'faq_farmer')],
};

const TOPIC_META = {
    account: { icon: UserRound, label: 'topic_account' },
    stall: { icon: Store, label: 'topic_stall' },
    admin: { icon: ShieldCheck, label: 'topic_admin' },
    shop: { icon: ShoppingBasket, label: 'topic_shop' },
    discover: { icon: Sparkles, label: 'topic_discover' },
    markets: { icon: MapPin, label: 'topic_markets' },
    help: { icon: HandCoins, label: 'topic_help' },
};

const FOLLOW_UPS = {
    greeting: ['q_in_season', 'q_open_today', 'q_faq_payment'],
    my_profile: ['q_my_orders', 'q_my_payments'],
    my_orders: ['q_track_order', 'q_my_spending'],
    my_orders_none: ['q_browse_fruits', 'q_in_season'],
    track_order: ['q_my_next_pickup', 'q_faq_cancel'],
    track_none: ['q_browse_fruits', 'q_my_cart'],
    my_next_pickup: ['q_track_order', 'q_market_timings'],
    my_cart: ['q_price_drops', 'q_faq_payment'],
    my_cart_empty: ['q_in_season', 'q_browse_fruits'],
    my_favorites: ['q_my_alerts', 'q_price_drops'],
    my_favorites_none: ['q_top_rated', 'q_in_season'],
    my_alerts: ['q_faq_alerts', 'q_my_favorites'],
    my_alerts_none: ['q_faq_alerts', 'q_in_season'],
    my_payments: ['q_faq_refunds', 'q_my_spending'],
    my_payments_none: ['q_faq_online_pay', 'q_faq_payment'],
    my_spending: ['q_my_orders', 'q_my_reviews'],
    my_reviews: ['q_my_orders', 'q_top_rated'],
    my_reviews_none: ['q_my_orders'],
    farmer_today: ['q_farmer_pending', 'q_farmer_low_stock'],
    farmer_pending: ['q_farmer_today', 'q_farmer_standing'],
    farmer_pending_none: ['q_farmer_low_stock', 'q_farmer_standing'],
    farmer_low_stock: ['q_farmer_today', 'q_farmer_standing'],
    farmer_low_stock_none: ['q_farmer_standing'],
    farmer_standing: ['q_faq_badges', 'q_farmer_today'],
    products_found: ['q_price_drops', 'q_in_season', 'q_faq_payment'],
    not_found: ['q_in_season', 'q_browse_fruits'],
    price_drops: ['q_in_season', 'q_top_rated'],
    price_drops_none: ['q_in_season'],
    in_season: ['q_price_drops', 'q_top_rated'],
    top_rated: ['q_faq_badges', 'q_in_season'],
    open_today: ['q_market_timings', 'q_faq_pickup'],
    none_today: ['q_market_timings'],
    market_timings: ['q_open_today', 'q_faq_pickup'],
    faq_payment: ['q_faq_online_pay', 'q_faq_refunds'],
    faq_online_pay: ['q_faq_refunds', 'q_my_payments'],
    faq_refunds: ['q_faq_cancel', 'q_my_payments'],
    faq_cancel: ['q_faq_cutoff', 'q_track_order'],
    faq_cutoff: ['q_faq_cancel'],
    faq_how: ['q_in_season', 'q_faq_payment'],
    faq_pickup: ['q_faq_cutoff', 'q_open_today'],
    login_required: ['q_faq_privacy', 'q_faq_how'],
    fallback: ['q_in_season', 'q_open_today'],
};

const ALL = Object.values(QUESTIONS).flat();
const byKey = (k) => ALL.find((q) => q.key === k);

function Row({ href, children, className }) {
    return href ? (
        <Link href={href} className={cn('flex items-center gap-3 rounded-2xl bg-bg p-2.5 transition hover:ring-1 hover:ring-line-strong', className)}>
            {children}
        </Link>
    ) : (
        <div className={cn('flex items-center gap-3 rounded-2xl bg-bg p-2.5', className)}>{children}</div>
    );
}

function ProfileCard({ p, t, date }) {
    const rows = [
        ['profile_email', p.email],
        ['profile_phone', p.phone],
        ['profile_city', p.city],
        ['profile_since', p.since && date(p.since)],
        ['profile_stall', p.stall],
        ['profile_verified', t(p.verified ? 'assistant.yes' : 'assistant.no')],
        ['profile_password', t(p.password ? 'assistant.yes' : 'assistant.no')],
        ['profile_linked', p.linked?.length ? p.linked.map((x) => x[0].toUpperCase() + x.slice(1)).join(', ') : '—'],
    ].filter(([, v]) => v);
    return (
        <div className="overflow-hidden rounded-2xl bg-bg">
            <div className="flex items-center gap-3 bg-brand/90 px-3 py-2.5 text-brand-ink">
                <span className="flex size-9 items-center justify-center rounded-full bg-lime font-semibold text-forest">{p.first?.[0]}</span>
                <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-[11px] opacity-80">@{p.username} · {t(`roles.${p.role}`)}</span>
                </span>
            </div>
            <dl className="divide-y divide-line text-xs">
                {rows.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 px-3 py-2">
                        <dt className="text-ink-faint">{t(`assistant.${k}`)}</dt>
                        <dd className="truncate text-end font-medium">{v}</dd>
                    </div>
                ))}
            </dl>
            <Link href={route('profile.edit')} className="block border-t border-line px-3 py-2 text-center text-xs font-semibold text-brand hover:underline">
                {t('dash.profile')}
            </Link>
        </div>
    );
}

function BotMessage({ reply }) {
    const t = useT();
    const { money, days, time, day, date } = useFormat();
    const p = reply.params ?? {};
    const params = { ...p };
    ['total', 'spent', 'month', 'saved', 'paid', 'refunded', 'value'].forEach((k) => {
        if (typeof p[k] === 'number') params[k] = money(p[k]);
    });
    if (reply.intent === 'greeting') params.name = p.name ? `, ${p.name}` : '';
    if (reply.intent === 'my_next_pickup') Object.assign(params, { date: date(p.date), from: time(p.from), to: time(p.to) });
    if (reply.intent === 'in_season') params.month = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2026, (p.month ?? 1) - 1, 1));
    const key = reply.intent === 'market_timings' ? 'assistant.market_timings_all' : `assistant.${reply.intent}`;

    return (
        <div className="space-y-2.5">
            <p>{t(key, params)}</p>
            {reply.intent === 'my_cart' && p.problems > 0 && <p className="text-xs text-accent">{t('assistant.my_cart_problems', { problems: p.problems })}</p>}
            {reply.intent === 'my_spending' && p.favourite && <p className="text-xs text-ink-soft">{t('assistant.my_spending_fav', { favourite: p.favourite })}</p>}
            {reply.intent === 'farmer_standing' && (
                <>
                    <StallBadges badges={p.badges ?? []} />
                    {!p.badges?.includes('top_rated') && <p className="text-xs text-ink-soft">{t('assistant.farmer_standing_next', { needs: p.needs_reviews, min: p.min_score })}</p>}
                </>
            )}
            {reply.intent === 'my_profile' && <ProfileCard p={p} t={t} date={date} />}

            {reply.intent === 'my_next_pickup' && p.url && (
                <Link href={p.url} className="inline-flex items-center gap-2 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-ink">
                    {t('assistant.open_order')} <span className="font-mono">{p.code}</span>
                </Link>
            )}
            {reply.intent === 'login_required' && (
                <Link href={route('login')} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-ink">
                    <LockKeyhole className="size-3.5" /> {t('nav.login')}
                </Link>
            )}

            {reply.orders?.map((o) => (
                <Row key={o.code} href={o.url}>
                    <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium">
                            <span className="font-mono">{o.code}</span>
                            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px]">{t(`status.${o.status}`)}</span>
                            {o.payment_method !== 'cash' && <span className="rounded-full bg-lime/40 px-2 py-0.5 text-[10px] text-forest dark:text-lime">{t(`status.${o.payment_status}`)}</span>}
                        </span>
                        <span className="block truncate text-xs text-ink-soft">
                            {o.farmer} · {date(o.date, { day: 'numeric', month: 'short' })} {time(o.from)}
                            {o.market && ` · ${o.market}`}
                        </span>
                        {o.step && (
                            <span className="mt-1.5 flex gap-1" aria-label={t('assistant.step', { n: o.step })}>
                                {[1, 2, 3].map((s) => (
                                    <motion.span key={s} className={cn('h-1 flex-1 rounded-full', s <= o.step ? 'bg-brand' : 'bg-ink/10')} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: s * 0.12 }} style={{ transformOrigin: 'left' }} />
                                ))}
                            </span>
                        )}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{money(o.total)}</span>
                </Row>
            ))}

            {reply.payments?.map((x) => (
                <Row key={x.reference} href={x.url}>
                    <span className="min-w-0 flex-1">
                        <span className="block font-mono text-xs font-semibold">{x.reference}</span>
                        <span className="block text-xs text-ink-soft">
                            {t(`pay.${x.method}`)}
                            {x.card_last4 && ` · •••• ${x.card_last4}`} · {t(`status.${x.status}`)}
                        </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{money(x.amount)}</span>
                </Row>
            ))}

            {reply.lines?.map((l) => (
                <Row key={l.slug} href={route('products.show', l.slug)}>
                    <img src={l.image_url} alt="" className="size-10 shrink-0 object-contain" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                            {l.quantity} × {l.name}
                        </span>
                        <span className={cn('block truncate text-xs', l.orderable ? 'text-ink-soft' : 'text-accent')}>{l.orderable ? l.farmer : t('status.sold_out')}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{money(l.line)}</span>
                </Row>
            ))}
            {reply.intent === 'my_cart' && (
                <Link href={route('cart')} className="inline-flex rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-ink">
                    {t('nav.cart')}
                </Link>
            )}

            {reply.products?.map((x) => (
                <Row key={x.slug} href={x.edit ?? route('products.show', x.slug)}>
                    <img src={x.image_url} alt="" className="size-11 shrink-0 object-contain" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{x.name}</span>
                        <span className="block truncate text-xs text-ink-soft">{x.farmer}</span>
                    </span>
                    <span className="text-end">
                        <span className="block text-sm font-semibold tabular-nums">{money(x.price)}</span>
                        {x.was ? (
                            <span className="block text-[11px] text-success">
                                −{x.drop}% · <s className="text-ink-faint">{money(x.was)}</s>
                            </span>
                        ) : (
                            <span className={cn('block text-[11px]', x.orderable ? 'text-success' : 'text-accent')}>{x.orderable ? t('assistant.in_stock', { count: x.stock }) : t('status.sold_out')}</span>
                        )}
                    </span>
                </Row>
            ))}

            {reply.season && (
                <div className="flex flex-wrap gap-1.5">
                    {reply.season.map((s, i) => (
                        <motion.span key={s.name} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} className={cn('inline-flex items-center gap-1.5 rounded-full py-1 ps-1 pe-2.5 text-xs', s.peak ? 'bg-accent/15 font-semibold text-accent' : 'bg-bg')}>
                            <img src={produceImage(s.image ?? 'basket')} alt="" className="size-5" /> {s.name}
                        </motion.span>
                    ))}
                    <Link href={route('seasons')} className="inline-flex rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-ink">
                        {t('seasons.cta')}
                    </Link>
                </div>
            )}

            {reply.markets?.map((m) => (
                <Row key={m.slug} href={route('markets.show', m.slug)} className="block">
                    <span className="block w-full">
                        <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{m.name}</span>
                            {m.open_today && <span className="rounded-full bg-lime/40 px-2 py-0.5 text-[10px] font-semibold text-forest dark:text-lime">{t('market.open_today')}</span>}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                            <Clock className="size-3" /> {days(m.days)} · {time(m.opens_at)}–{time(m.closes_at)}
                        </span>
                    </span>
                </Row>
            ))}

            {reply.farmers?.map((f) => (
                <Row key={f.slug} href={route('farmers.show', f.slug)}>
                    {f.logo_url && <img src={f.logo_url} alt="" className="size-10 shrink-0 object-contain" />}
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{f.name}</span>
                        <StallBadges badges={f.badges ?? []} compact limit={3} />
                    </span>
                    {f.rating > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs">
                            <Star className="size-3 fill-sun text-sun" /> {Number(f.rating).toFixed(1)}
                        </span>
                    )}
                </Row>
            ))}
        </div>
    );
}

function Chips({ items, onPick, disabled }) {
    const t = useT();
    return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-1.5">
            {items.map((q, i) => (
                <motion.button
                    key={q.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(q)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.04 * i }}
                    whileHover={{ y: -1 }}
                    className="rounded-full border border-line-strong bg-elev px-3 py-1.5 text-start text-xs transition hover:border-brand hover:bg-brand hover:text-brand-ink disabled:opacity-40"
                >
                    {t(`assistant.${q.key}`)}
                </motion.button>
            ))}
        </motion.div>
    );
}

function load(key) {
    try {
        return JSON.parse(sessionStorage.getItem(key) ?? '[]');
    } catch {
        return [];
    }
}

export default function Assistant() {
    const t = useT();
    const { auth } = usePage().props;
    const user = auth.user;
    const store = `gg-buddy:${user?.id ?? 'guest'}`;
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [topic, setTopic] = useState(null);
    const [browsing, setBrowsing] = useState(false);
    const [messages, setMessages] = useState(() => load(store));
    const scroller = useRef(null);

    const topics = useMemo(() => {
        const personal = !user ? ['account'] : user.role === 'farmer' ? ['stall'] : user.role === 'admin' ? ['admin'] : ['account'];
        return [...personal, 'shop', 'discover', 'markets', 'help'];
    }, [user]);

    useEffect(() => setMessages(load(store)), [store]);

    useEffect(() => {
        try {
            sessionStorage.setItem(store, JSON.stringify(messages.slice(-30)));
        } catch {
        }
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
    }, [messages, busy, topic, store]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const ask = async (q) => {
        if (busy || !q) return;
        setTopic(null);
        setBrowsing(false);
        setMessages((m) => [...m, { from: 'me', key: q.key }]);
        setBusy(true);
        try {
            const body = { intent: q.intent, topic: q.topic ?? null };
            if (q.intent === 'my_cart') body.cart = cart.items().map((i) => ({ id: i.id, quantity: i.quantity })).slice(0, 60);
            const { data } = await postJson(route('assistant'), body);
            setMessages((m) => [...m, { from: 'bot', reply: data }]);
        } catch (err) {
            setMessages((m) => [...m, { from: 'bot', reply: { intent: err?.response?.status === 429 ? 'slow_down' : 'error', params: {} } }]);
        } finally {
            setBusy(false);
        }
    };

    const personalGuard = (q) => !user && ['my_profile', 'my_orders', 'track_order', 'my_next_pickup', 'my_favorites', 'my_alerts', 'my_payments', 'my_spending', 'my_reviews'].includes(q.intent);
    const allowed = (q) => {
        if (!q) return false;
        if (q.intent.startsWith('farmer_')) return user?.role === 'farmer';
        if (q.intent === 'admin_overview') return user?.role === 'admin';
        if (q.intent.startsWith('my_') && q.intent !== 'my_profile' && q.intent !== 'my_cart') return !user || user.role === 'customer';
        if (q.intent === 'my_cart') return !user || user.role === 'customer';
        return true;
    };

    const last = messages[messages.length - 1];
    const followUps = last?.from === 'bot' ? (FOLLOW_UPS[last.reply.intent] ?? FOLLOW_UPS.fallback).map(byKey).filter(allowed).filter((q) => !personalGuard(q)) : [];
    const showTopics = (messages.length === 0 || browsing) && !topic;
    const topicQuestions = topic ? QUESTIONS[topic].filter(allowed) : [];

    return (
        <>
            <motion.button
                onClick={() => setOpen((o) => !o)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className="fixed end-4 bottom-4 z-[70] flex h-14 items-center gap-2 rounded-full bg-ink ps-2 pe-5 text-bg shadow-soft sm:end-6 sm:bottom-6"
                aria-expanded={open}
                aria-controls="basket-buddy"
                data-floating
                aria-label={`${t('assistant.name')} · ${t('assistant.open')}`}
                data-no-magnet
            >
                <span className="relative flex size-10 items-center justify-center rounded-full bg-lime text-forest">
                    <img src="/images/produce/basket.webp" alt="" className="size-6" />
                    <span className="absolute -end-0.5 -top-0.5 flex size-3">
                        <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
                        <span className="relative size-3 rounded-full border-2 border-ink bg-accent" />
                    </span>
                </span>
                <span className="hidden text-sm font-medium sm:inline">{t('assistant.name')}</span>
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.section
                        id="basket-buddy"
                        role="dialog"
                        aria-label={t('assistant.name')}
                        initial={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 24, scale: 0.96 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                        style={{ transformOrigin: 'bottom right' }}
                        className="fixed inset-x-3 bottom-22 z-[75] flex max-h-[min(680px,calc(100vh-7rem))] flex-col overflow-hidden rounded-[28px] border border-line bg-elev shadow-soft sm:inset-x-auto sm:end-6 sm:w-[420px]"
                    >
                        <header className="relative flex items-center gap-3 overflow-hidden bg-brand px-5 py-4 text-brand-ink">
                            <motion.span className="absolute -end-10 -top-12 size-40 rounded-full bg-lime/20 blur-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 6 }} />
                            <img src="/images/produce/basket.webp" alt="" className="relative size-10" />
                            <div className="relative flex-1">
                                <p className="font-display text-lg leading-tight">{t('assistant.name')}</p>
                                <p className="flex items-center gap-1.5 text-xs opacity-80">
                                    <span className="size-1.5 rounded-full bg-lime" /> {user ? t('assistant.tagline_personal', { name: user.first_name ?? user.name }) : t('assistant.tagline')}
                                </p>
                            </div>
                            {messages.length > 0 && (
                                <button
                                    onClick={() => {
                                        setMessages([]);
                                        setTopic(null);
                                    }}
                                    className="relative rounded-full p-2 hover:bg-white/10"
                                    aria-label={t('assistant.restart')}
                                    title={t('assistant.restart')}
                                >
                                    <RotateCcw className="size-4" />
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="relative rounded-full p-1.5 hover:bg-white/10" aria-label={t('common.close')}>
                                <X className="size-5" />
                            </button>
                        </header>

                        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" data-lenis-prevent aria-live="polite">
                            <div className="max-w-[88%] rounded-3xl rounded-ss-md bg-sunk px-4 py-3">
                                {t('assistant.greeting', { name: user?.first_name ? `, ${user.first_name}` : '' })}
                                <span className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-faint">
                                    <BadgeCheck className="size-3.5 text-success" /> {t('assistant.private')}
                                </span>
                            </div>

                            {messages.map((m, i) =>
                                m.from === 'me' ? (
                                    <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="ms-auto w-fit max-w-[80%] rounded-3xl rounded-se-md bg-brand px-4 py-2.5 text-brand-ink">
                                        {m.key ? t(`assistant.${m.key}`) : m.text}
                                    </motion.div>
                                ) : (
                                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[94%] rounded-3xl rounded-ss-md bg-sunk px-4 py-3">
                                        <BotMessage reply={m.reply} />
                                    </motion.div>
                                ),
                            )}

                            {showTopics && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                                    <p className="font-mono text-[10px] tracking-[0.18em] text-ink-faint uppercase">{t('assistant.choose')}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {topics.map((key, i) => {
                                            const meta = TOPIC_META[key];
                                            return (
                                                <motion.button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => {
                                                        setTopic(key);
                                                        setBrowsing(false);
                                                    }}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.05 * i }}
                                                    className={cn('group flex items-center gap-2.5 rounded-2xl border p-3 text-start transition hover:border-brand', i === 0 ? 'col-span-2 border-brand/40 bg-brand-soft/50' : 'border-line bg-bg', topics.length % 2 === 0 && i === topics.length - 1 && 'col-span-2')}
                                                >
                                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lime/40 text-forest transition group-hover:bg-brand group-hover:text-brand-ink dark:text-lime">
                                                        <meta.icon className="size-[18px]" />
                                                    </span>
                                                    <span className="text-[13px] leading-tight font-medium">{t(`assistant.${meta.label}`)}</span>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {topic && (
                                <div className="space-y-2">
                                    <button type="button" onClick={() => setTopic(null)} className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink">
                                        <ArrowLeft className="rtl-flip size-3.5" /> {t('assistant.topics')}
                                    </button>
                                    {topic === 'account' && !user ? (
                                        <div className="rounded-2xl border border-dashed border-line-strong bg-bg p-4 text-sm">
                                            <p>{t('assistant.login_prompt')}</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Link href={route('login')} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-ink">
                                                    <LockKeyhole className="size-3.5" /> {t('nav.login')}
                                                </Link>
                                                <Chips items={[byKey('q_my_cart')]} onPick={ask} disabled={busy} />
                                            </div>
                                        </div>
                                    ) : (
                                        <Chips items={topicQuestions} onPick={ask} disabled={busy} />
                                    )}
                                </div>
                            )}

                            {busy && (
                                <div role="status" className="flex w-16 gap-1 rounded-3xl bg-sunk px-4 py-3.5" aria-label={t('assistant.thinking')}>
                                    {[0, 1, 2].map((i) => (
                                        <motion.span key={i} className="size-2 rounded-full bg-ink-faint" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                                    ))}
                                </div>
                            )}
                            {!busy && !browsing && !topic && followUps.length > 0 && (
                                <div className="space-y-2 pt-1">
                                    <p className="font-mono text-[10px] tracking-[0.18em] text-ink-faint uppercase">{t('assistant.next')}</p>
                                    <Chips items={followUps} onPick={ask} disabled={busy} />
                                </div>
                            )}
                        </div>

                        <div className="border-t border-line p-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setTopic(null);
                                    setBrowsing(true);
                                }}
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-sunk text-sm font-medium transition hover:bg-ink/10"
                            >
                                <LayoutGrid className="size-4 text-accent" /> {t('assistant.browse')}
                            </button>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </>
    );
}
