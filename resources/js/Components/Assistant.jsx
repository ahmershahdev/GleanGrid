import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUp, CalendarClock, Clock, HandCoins, Keyboard, LayoutGrid, MapPin, RotateCcw, ShoppingBasket, Sprout, Star, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { translate, useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/*
 * Basket Buddy is guided first: pick a topic, then a question, then follow
 * the suggested next questions. Every chip shows translated text but sends a
 * canonical English query, so the server-side intent matching stays simple
 * and answers render in the visitor's language.
 *
 * Typing is still available (behind the keyboard button) because the SRS asks
 * for finding *specific* items — "who sells ginger?" can't be a preset.
 */

const TOPICS = [
    { key: 'produce', icon: ShoppingBasket, questions: ['q_fruit', 'q_veg', 'q_dairy', 'q_honey', 'q_bread', 'q_mangoes'] },
    { key: 'markets', icon: MapPin, questions: ['s_open_today', 's_timings', 'q_weekend'] },
    { key: 'orders', icon: CalendarClock, questions: ['q_next_pickup', 's_cancel', 'q_cutoff', 'q_how'] },
    { key: 'pay', icon: HandCoins, questions: ['s_payment', 'q_delivery', 'q_pickup'] },
    { key: 'farmers', icon: Sprout, questions: ['q_become_farmer', 'q_how'] },
];

// What to offer next, keyed by the intent the server answered with.
const FOLLOW_UPS = {
    greeting: ['s_open_today', 'q_fruit', 's_payment'],
    open_today: ['s_timings', 'q_fruit', 'q_pickup'],
    none_today: ['q_weekend', 'q_how'],
    market_timings: ['s_open_today', 'q_pickup'],
    market_info: ['s_timings', 'q_pickup', 's_payment'],
    farmer_availability: ['q_pickup', 's_payment'],
    farmer_slots: ['q_cutoff', 's_payment'],
    products_found: ['q_pickup', 's_payment', 'q_veg'],
    products_sold_out: ['q_fruit', 'q_veg'],
    not_found: ['q_fruit', 'q_veg', 'q_dairy'],
    faq_payment: ['q_delivery', 's_cancel'],
    faq_delivery: ['q_pickup', 's_open_today'],
    faq_cancel: ['q_cutoff', 'q_next_pickup'],
    faq_cutoff: ['s_cancel', 'q_next_pickup'],
    faq_how: ['q_fruit', 's_open_today', 's_payment'],
    faq_pickup: ['q_cutoff', 's_payment'],
    faq_farmer: ['q_how'],
    my_next_pickup: ['s_cancel', 's_timings'],
    my_orders_none: ['q_fruit', 's_open_today'],
    my_orders_guest: ['q_how', 's_open_today'],
    fallback: ['s_open_today', 'q_fruit', 's_payment'],
    error: ['s_open_today'],
};

const STORE = 'gg-buddy';

function BotMessage({ reply }) {
    const t = useT();
    const { money, days, time, day, date } = useFormat();
    const params = { ...reply.params, market: reply.params?.market ?? '' };
    const key = reply.intent === 'market_timings' && !reply.params?.market ? 'assistant.market_timings_all' : `assistant.${reply.intent}`;
    if (reply.intent === 'my_next_pickup') {
        params.date = date(reply.params.date);
        params.from = time(reply.params.from);
        params.to = time(reply.params.to);
    }

    return (
        <div className="space-y-2.5">
            <p>{t(key, params)}</p>

            {reply.intent === 'my_next_pickup' && reply.params?.url && (
                <Link href={reply.params.url} className="inline-flex items-center gap-2 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-ink">
                    {t('assistant.open_order')} <span className="font-mono">{reply.params.code}</span>
                </Link>
            )}
            {reply.intent === 'my_orders_guest' && (
                <Link href={route('login')} className="inline-flex rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-ink">
                    {t('nav.login')}
                </Link>
            )}

            {reply.products?.map((p) => (
                <Link key={p.slug} href={route('products.show', p.slug)} className="flex items-center gap-3 rounded-2xl bg-bg p-2.5 transition hover:ring-1 hover:ring-line-strong">
                    <img src={p.image_url} alt="" className="size-11 shrink-0 object-contain" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-ink-soft">{p.farmer}</span>
                    </span>
                    <span className="text-end">
                        <span className="block text-sm font-semibold tabular-nums">{money(p.price)}</span>
                        <span className={cn('block text-[11px]', p.orderable ? 'text-success' : 'text-accent')}>{p.orderable ? t('assistant.in_stock', { count: p.stock }) : t('status.sold_out')}</span>
                    </span>
                </Link>
            ))}

            {reply.markets?.map((m) => (
                <Link key={m.slug} href={route('markets.show', m.slug)} className="block rounded-2xl bg-bg p-3 transition hover:ring-1 hover:ring-line-strong">
                    <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{m.name}</span>
                        {m.open_today && <span className="rounded-full bg-lime/40 px-2 py-0.5 text-[10px] font-semibold text-forest dark:text-lime">{t('market.open_today')}</span>}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                        <Clock className="size-3" /> {days(m.days)} · {time(m.opens_at)}–{time(m.closes_at)}
                    </span>
                </Link>
            ))}

            {reply.farmers?.map((f) => (
                <Link key={f.slug} href={route('farmers.show', f.slug)} className="block rounded-2xl bg-bg p-3 transition hover:ring-1 hover:ring-line-strong">
                    <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{f.name}</span>
                        {f.rating > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs">
                                <Star className="size-3 fill-sun text-sun" /> {Number(f.rating).toFixed(1)}
                            </span>
                        )}
                    </span>
                    {f.in_stock !== undefined && <span className="mt-1 block text-xs text-ink-soft">{t('assistant.farmer_stock', { count: f.in_stock, hours: f.cutoff })}</span>}
                    {f.slots?.slice(0, 4).map((s, i) => (
                        <span key={i} className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                            <MapPin className="size-3" /> {day(s.day, 'short')} {time(s.from)}–{time(s.to)} · {s.market}
                        </span>
                    ))}
                </Link>
            ))}
        </div>
    );
}

function Chips({ keys, onPick, disabled }) {
    const t = useT();
    return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-1.5">
            {keys.map((k, i) => (
                <motion.button
                    key={k}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(k)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * i }}
                    className="rounded-full border border-line-strong bg-elev px-3 py-1.5 text-start text-xs transition hover:border-brand hover:bg-brand hover:text-brand-ink disabled:opacity-40"
                >
                    {t(`assistant.${k}`)}
                </motion.button>
            ))}
        </motion.div>
    );
}

function load() {
    try {
        return JSON.parse(sessionStorage.getItem(STORE) ?? '[]');
    } catch {
        return [];
    }
}

export default function Assistant() {
    const t = useT();
    const { auth } = usePage().props;
    const [open, setOpen] = useState(false);
    const [typing, setTyping] = useState(false);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [topic, setTopic] = useState(null);
    const [browsing, setBrowsing] = useState(false);
    const [messages, setMessages] = useState(load);
    const scroller = useRef(null);
    const field = useRef(null);

    useEffect(() => {
        try {
            sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-30)));
        } catch {
            /* storage blocked — conversation just won't survive a reload */
        }
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
    }, [messages, busy, topic]);

    useEffect(() => {
        if (typing) field.current?.focus();
    }, [typing]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const ask = async (label, query = label) => {
        const message = label.trim();
        if (!message || busy) return;
        setTopic(null);
        setBrowsing(false);
        setMessages((m) => [...m, { from: 'me', text: message }]);
        setInput('');
        setBusy(true);
        try {
            const { data } = await axios.post(route('assistant'), { message: query.trim() });
            setMessages((m) => [...m, { from: 'bot', reply: data }]);
        } catch (err) {
            const intent = err?.response?.status === 429 ? 'slow_down' : 'error';
            setMessages((m) => [...m, { from: 'bot', reply: { intent, params: {} } }]);
        } finally {
            setBusy(false);
        }
    };

    const pick = (key) => ask(t(`assistant.${key}`), translate('en', `assistant.${key}`));
    const last = messages[messages.length - 1];
    const followUps = last?.from === 'bot' ? (FOLLOW_UPS[last.reply.intent] ?? FOLLOW_UPS.fallback).filter((k) => k !== 'q_next_pickup' || auth.user) : [];
    const showTopics = (messages.length === 0 || browsing) && !topic;

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
                aria-label={t('assistant.open')}
                data-no-magnet
            >
                <span className="relative flex size-10 items-center justify-center rounded-full bg-lime text-forest">
                    <img src="/images/produce/basket.png" alt="" className="size-6" />
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
                        className="fixed inset-x-3 bottom-22 z-[75] flex max-h-[min(660px,calc(100vh-7rem))] flex-col overflow-hidden rounded-[28px] border border-line bg-elev shadow-soft sm:inset-x-auto sm:end-6 sm:w-[410px]"
                    >
                        <header className="flex items-center gap-3 bg-brand px-5 py-4 text-brand-ink">
                            <img src="/images/produce/basket.png" alt="" className="size-10" />
                            <div className="flex-1">
                                <p className="font-display text-lg leading-tight">{t('assistant.name')}</p>
                                <p className="flex items-center gap-1.5 text-xs opacity-80">
                                    <span className="size-1.5 rounded-full bg-lime" /> {t('assistant.tagline')}
                                </p>
                            </div>
                            {messages.length > 0 && (
                                <button
                                    onClick={() => {
                                        setMessages([]);
                                        setTopic(null);
                                    }}
                                    className="rounded-full p-2 hover:bg-white/10"
                                    aria-label={t('assistant.restart')}
                                    title={t('assistant.restart')}
                                >
                                    <RotateCcw className="size-4" />
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-white/10" aria-label={t('common.close')}>
                                <X className="size-5" />
                            </button>
                        </header>

                        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" data-lenis-prevent aria-live="polite">
                            <div className="max-w-[88%] rounded-3xl rounded-ss-md bg-sunk px-4 py-3">{t('assistant.welcome')}</div>

                            {messages.map((m, i) =>
                                m.from === 'me' ? (
                                    <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="ms-auto w-fit max-w-[80%] rounded-3xl rounded-se-md bg-brand px-4 py-2.5 text-brand-ink">
                                        {m.text}
                                    </motion.div>
                                ) : (
                                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[92%] rounded-3xl rounded-ss-md bg-sunk px-4 py-3">
                                        <BotMessage reply={m.reply} />
                                    </motion.div>
                                ),
                            )}
                            {showTopics && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-2">
                                    {TOPICS.map((tp, i) => (
                                        <motion.button
                                            key={tp.key}
                                            type="button"
                                            onClick={() => {
                                                setTopic(tp.key);
                                                setBrowsing(false);
                                            }}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.06 * i }}
                                            className={cn('group flex items-center gap-2.5 rounded-2xl border border-line bg-bg p-3 text-start transition hover:border-brand', i === TOPICS.length - 1 && TOPICS.length % 2 && 'col-span-2')}
                                        >
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lime/40 text-forest transition group-hover:bg-brand group-hover:text-brand-ink dark:text-lime">
                                                <tp.icon className="size-[18px]" />
                                            </span>
                                            <span className="text-[13px] leading-tight font-medium">{t(`assistant.topic_${tp.key}`)}</span>
                                        </motion.button>
                                    ))}
                                </motion.div>
                            )}

                            {topic && (
                                <div className="space-y-2">
                                    <button type="button" onClick={() => setTopic(null)} className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink">
                                        <ArrowLeft className="rtl-flip size-3.5" /> {t('assistant.topics')}
                                    </button>
                                    <Chips keys={TOPICS.find((x) => x.key === topic).questions.filter((k) => k !== 'q_next_pickup' || auth.user)} onPick={pick} disabled={busy} />
                                </div>
                            )}

                            {busy && (
                                <div className="flex w-16 gap-1 rounded-3xl bg-sunk px-4 py-3.5" aria-label={t('assistant.thinking')}>
                                    {[0, 1, 2].map((i) => (
                                        <motion.span key={i} className="size-2 rounded-full bg-ink-faint" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                                    ))}
                                </div>
                            )}
                            {!busy && !browsing && !topic && followUps.length > 0 && (
                                <div className="space-y-2 pt-1">
                                    <p className="font-mono text-[10px] tracking-[0.18em] text-ink-faint uppercase">{t('assistant.next')}</p>
                                    <Chips keys={followUps} onPick={pick} disabled={busy} />
                                </div>
                            )}
                        </div>

                        <div className="border-t border-line p-3">
                            {typing ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        ask(input);
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        ref={field}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={t('assistant.placeholder')}
                                        maxLength={300}
                                        className="h-11 flex-1 rounded-full bg-sunk px-4 text-sm placeholder:text-ink-faint focus:ring-2 focus:ring-brand/30 focus:outline-none"
                                        aria-label={t('assistant.placeholder')}
                                    />
                                    <button type="submit" disabled={!input.trim() || busy} className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-ink transition disabled:opacity-40" aria-label={t('assistant.send')}>
                                        <ArrowUp className="size-5" />
                                    </button>
                                </form>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTopic(null);
                                            setBrowsing(true);
                                        }}
                                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-sunk text-sm font-medium transition hover:bg-ink/10"
                                    >
                                        <LayoutGrid className="size-4 text-accent" /> {t('assistant.browse')}
                                    </button>
                                    <button type="button" onClick={() => setTyping(true)} className="flex h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm transition hover:border-ink" aria-label={t('assistant.type_instead')}>
                                        <Keyboard className="size-4" /> <span className="hidden sm:inline">{t('assistant.type')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </>
    );
}
