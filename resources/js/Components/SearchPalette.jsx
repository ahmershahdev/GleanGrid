import { router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, CornerDownLeft, History, LayoutGrid, LoaderCircle, MapPin, Search, SearchX, ShoppingBasket, Sparkles, Sprout, Star, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFormat, useT } from '@/lib/i18n';
import { lockScroll } from '@/lib/scroll';
import { clientPortal, cn, produceImage } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1];
const RECENT_KEY = 'gg-recent-searches';
const SCOPES = [
    { key: 'all', icon: LayoutGrid, route: 'products.index' },
    { key: 'produce', icon: ShoppingBasket, route: 'products.index' },
    { key: 'farmers', icon: Sprout, route: 'farmers.index' },
    { key: 'markets', icon: MapPin, route: 'markets.index' },
];
const JUMPS = [
    { key: 'produce', route: 'products.index', icon: ShoppingBasket, label: 'search.go_produce' },
    { key: 'farmers', route: 'farmers.index', icon: Sprout, label: 'search.go_farmers' },
    { key: 'markets', route: 'markets.index', icon: MapPin, label: 'search.go_markets' },
];
const TRENDING = ['Mangoes', 'Tomatoes', 'Sourdough', 'Honey', 'Desi eggs', 'Spinach'];
const GROUP_ORDER = ['produce', 'categories', 'farmers', 'markets'];

let openPalette = () => {};

export function openSearch(initial = '') {
    openPalette(initial);
}

function isMac() {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
}

function readRecent() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]').slice(0, 6);
    } catch {
        return [];
    }
}

function writeRecent(list) {
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
    } catch {
    }
}

function Highlight({ text, query }) {
    const words = query.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!words.length || !text) return text ?? null;
    const parts = String(text).split(new RegExp(`(${words.join('|')})`, 'gi'));
    return parts.map((part, i) =>
        i % 2 ? (
            <mark key={i} className="rounded-[3px] bg-lime/60 px-px text-inherit dark:bg-lime/30">
                {part}
            </mark>
        ) : (
            <Fragment key={i}>{part}</Fragment>
        ),
    );
}

function Thumb({ src, fallback: Icon, round }) {
    return (
        <span className={cn('relative flex size-11 shrink-0 items-center justify-center overflow-hidden bg-sunk', round ? 'rounded-full' : 'rounded-xl')}>
            {src ? <img src={src} alt="" className="size-full object-contain p-1" loading="lazy" /> : <Icon className="size-[18px] text-ink-faint" />}
        </span>
    );
}

function Row({ item, query, active, id, onHover, onPick }) {
    const t = useT();
    const { money } = useFormat();

    return (
        <li id={id} role="option" aria-selected={active}>
            <button
                type="button"
                tabIndex={-1}
                onMouseMove={onHover}
                onClick={onPick}
                className={cn('relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors', active ? 'text-ink' : 'text-ink-soft')}
            >
                {active && <motion.span layoutId="search-active" className="absolute inset-0 rounded-2xl bg-ink/[0.06]" transition={{ type: 'spring', stiffness: 520, damping: 42 }} />}

                {item.type === 'product' && <Thumb src={item.image} fallback={ShoppingBasket} />}
                {item.type === 'farmer' && <Thumb src={item.image} fallback={Sprout} round />}
                {item.type === 'market' && (
                    <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                        <MapPin className="size-[18px]" />
                        {item.open_today && <span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full border-2 border-elev bg-success" />}
                    </span>
                )}
                {item.type === 'suggestion' && <Thumb fallback={Sparkles} />}
                {item.type === 'recent' && <Thumb fallback={History} />}
                {item.type === 'jump' && <Thumb fallback={item.icon} />}
                {item.type === 'fallthrough' && <Thumb fallback={Search} />}

                <span className="relative min-w-0 flex-1">
                    <span className="block truncate font-medium">
                        {item.type === 'suggestion' ? (
                            <>
                                {t('search.did_you_mean', {}, 'Did you mean')} <em className="font-display text-accent not-italic">“{item.title}”</em>?
                            </>
                        ) : (
                            <Highlight text={item.title} query={query} />
                        )}
                    </span>
                    {item.meta && (
                        <span className="mt-0.5 block truncate text-xs text-ink-faint">
                            <Highlight text={item.meta} query={query} />
                        </span>
                    )}
                </span>

                <span className="relative flex shrink-0 items-center gap-2">
                    {item.type === 'product' && (
                        <>
                            {!item.available && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] text-ink-faint">{t('status.sold_out')}</span>}
                            <span className="font-mono text-xs tabular-nums text-ink" dir="ltr">
                                {money(item.price)}
                                <span className="text-ink-faint">/{t(`units.${item.unit}`, {}, item.unit)}</span>
                            </span>
                        </>
                    )}
                    {item.type === 'farmer' && item.rating > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                            <Star className="size-3.5 fill-sun text-sun" /> {item.rating.toFixed(1)}
                        </span>
                    )}
                    {item.type === 'market' && (
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', item.open_today ? 'bg-success/15 text-success' : 'bg-ink/5 text-ink-faint')}>
                            {item.open_today ? t('search.open_today', {}, 'Open today') : (item.hours ?? t('search.closed_today', {}, 'Closed today'))}
                        </span>
                    )}
                    {item.type === 'recent' && (
                        <span
                            role="button"
                            tabIndex={-1}
                            aria-label={t('search.forget', {}, 'Remove from recent')}
                            onClick={(e) => {
                                e.stopPropagation();
                                item.onForget();
                            }}
                            className="rounded-full p-1 text-ink-faint opacity-60 transition hover:bg-ink/10 hover:text-ink hover:opacity-100"
                        >
                            <X className="size-3.5" />
                        </span>
                    )}
                    <CornerDownLeft className={cn('rtl-flip size-4 text-ink-faint transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
                </span>
            </button>
        </li>
    );
}

function GroupLabel({ children, action }) {
    return (
        <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ink-faint uppercase">{children}</p>
            {action}
        </div>
    );
}

export function SearchPalette() {
    const t = useT();
    const listId = useId();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [scope, setScope] = useState('all');
    const [active, setActive] = useState(0);
    const [state, setState] = useState({ status: 'idle', data: null });
    const [recent, setRecent] = useState([]);
    const input = useRef(null);
    const list = useRef(null);
    const memo = useRef(new Map());

    useEffect(() => {
        openPalette = (initial = '') => {
            setQ(initial);
            setActive(0);
            setOpen(true);
        };
        const onKey = (e) => {
            const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
            if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        const off = router.on('navigate', () => setOpen(false));
        return () => {
            window.removeEventListener('keydown', onKey);
            off();
        };
    }, []);

    useEffect(() => {
        lockScroll(open);
        if (open) {
            setRecent(readRecent());
            requestAnimationFrame(() => input.current?.select());
        }
        return () => lockScroll(false);
    }, [open]);

    const term = q.trim();
    useEffect(() => {
        if (!open || term.length < 2) {
            setState({ status: 'idle', data: null });
            return;
        }
        const key = `${scope}|${term.toLowerCase()}`;
        if (memo.current.has(key)) {
            setState({ status: 'done', data: memo.current.get(key) });
            return;
        }
        setState((s) => ({ status: 'loading', data: s.data }));
        const ctrl = new AbortController();
        const timer = setTimeout(() => {
            fetch(`${route('search.suggest')}?${new URLSearchParams({ q: term, scope })}`, { headers: { Accept: 'application/json' }, signal: ctrl.signal })
                .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
                .then((data) => {
                    memo.current.set(key, data);
                    setState({ status: 'done', data });
                })
                .catch((err) => err?.name !== 'AbortError' && setState({ status: 'error', data: null }));
        }, 140);
        return () => {
            clearTimeout(timer);
            ctrl.abort();
        };
    }, [term, scope, open]);

    const remember = useCallback((text) => {
        const clean = text.trim();
        if (clean.length < 2) return;
        const next = [clean, ...readRecent().filter((r) => r.toLowerCase() !== clean.toLowerCase())];
        writeRecent(next);
    }, []);

    const forget = useCallback((text) => {
        const next = readRecent().filter((r) => r !== text);
        writeRecent(next);
        setRecent(next);
    }, []);

    const scopeInfo = SCOPES.find((s) => s.key === scope);
    const seeAll = useCallback(
        (text = term) => {
            remember(text);
            router.get(route(scopeInfo.route), text ? { q: text } : {});
            setOpen(false);
        },
        [term, scopeInfo, remember],
    );

    const { sections, flat } = useMemo(() => {
        const out = [];
        if (term.length < 2) {
            if (recent.length) out.push({ key: 'recent', label: t('search.recent', {}, 'Recent'), items: recent.map((r) => ({ type: 'recent', title: r, run: () => setQ(r), onForget: () => forget(r) })) });
            out.push({ key: 'jump', label: t('search.quick'), items: JUMPS.map((j) => ({ type: 'jump', title: t(j.label), icon: j.icon, run: () => (router.get(route(j.route)), setOpen(false)) })) });
        } else if (state.data) {
            const groups = state.data.groups ?? {};
            GROUP_ORDER.filter((g) => g !== 'categories' && groups[g]?.length).forEach((g) =>
                out.push({
                    key: g,
                    label: t(`search.group_${g}`, {}, g),
                    items: groups[g].map((item) => ({ ...item, run: () => (remember(term), router.visit(item.url), setOpen(false)) })),
                }),
            );
            if (state.data.suggestion) out.push({ key: 'suggest', label: t('search.no_match', { q: term }, `Nothing for “${term}”`), items: [{ type: 'suggestion', title: state.data.suggestion, run: () => setQ(state.data.suggestion) }] });
            out.push({ key: 'all', label: null, items: [{ type: 'fallthrough', title: t('search.see_all', { q: term }, `See every result for “${term}”`), meta: t(`search.scope_${scope}`, {}, scope), run: () => seeAll() }] });
        }
        return { sections: out, flat: out.flatMap((s) => s.items) };
    }, [term, recent, state.data, scope, t, forget, remember, seeAll]);

    const categories = term.length >= 2 ? (state.data?.groups?.categories ?? []) : [];

    useEffect(() => setActive(0), [term, scope]);
    useEffect(() => {
        list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const onKeyDown = (e) => {
        const last = flat.length - 1;
        if (e.key === 'Escape') setOpen(false);
        else if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => (a >= last ? 0 : a + 1)));
        else if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => (a <= 0 ? last : a - 1)));
        else if (e.key === 'Home' && e.ctrlKey) (e.preventDefault(), setActive(0));
        else if (e.key === 'End' && e.ctrlKey) (e.preventDefault(), setActive(last));
        else if (e.key === 'Tab') {
            e.preventDefault();
            const i = SCOPES.findIndex((s) => s.key === scope);
            setScope(SCOPES[(i + (e.shiftKey ? -1 : 1) + SCOPES.length) % SCOPES.length].key);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if ((e.metaKey || e.ctrlKey) && term) seeAll();
            else if (flat[active]) flat[active].run();
            else if (term) seeAll();
        }
    };

    const loading = state.status === 'loading';
    const empty = term.length >= 2 && state.status === 'done' && !state.data?.total;
    let index = -1;

    return clientPortal(
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[110] flex items-start justify-center sm:px-6 sm:pt-[10vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                    <motion.div className="absolute inset-0 bg-soil/55" onClick={() => setOpen(false)} initial={{ backdropFilter: 'blur(0px)' }} animate={{ backdropFilter: 'blur(12px)' }} exit={{ backdropFilter: 'blur(0px)' }} />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('search.title')}
                        initial={{ y: -24, opacity: 0, scale: 0.97, filter: 'blur(6px)' }}
                        animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ y: -16, opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className="relative flex h-full w-full flex-col overflow-hidden border-line bg-elev shadow-soft sm:h-auto sm:max-h-[78vh] sm:max-w-2xl sm:rounded-[28px] sm:border"
                    >
                        <div className="flex items-center gap-3 border-b border-line px-5">
                            {loading ? <LoaderCircle className="size-5 shrink-0 animate-spin text-accent" /> : <Search className="size-5 shrink-0 text-accent" />}
                            <input
                                ref={input}
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder={t('search.placeholder')}
                                role="combobox"
                                aria-expanded="true"
                                aria-controls={listId}
                                aria-autocomplete="list"
                                aria-activedescendant={flat[active] ? `${listId}-${active}` : undefined}
                                aria-label={t('search.placeholder')}
                                className="font-display h-16 min-w-0 flex-1 bg-transparent text-xl placeholder:text-ink-faint/70 focus:outline-none sm:text-2xl"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                enterKeyHint="search"
                                maxLength={80}
                            />
                            {q && (
                                <button type="button" onClick={() => (setQ(''), input.current?.focus())} aria-label={t('common.clear_all')} className="rounded-full p-1.5 text-ink-faint hover:bg-ink/5 hover:text-ink">
                                    <X className="size-4" />
                                </button>
                            )}
                            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px] text-ink-faint hover:text-ink">
                                Esc
                            </button>
                        </div>

                        <div className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-2.5" role="tablist" aria-label={t('search.scope', {}, 'Search in')}>
                            {SCOPES.map((s) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={scope === s.key}
                                    onClick={() => (setScope(s.key), input.current?.focus())}
                                    className={cn('relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm transition-colors', scope === s.key ? 'text-brand-ink' : 'text-ink-soft hover:text-ink')}
                                >
                                    {scope === s.key && <motion.span layoutId="search-scope" className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                                    <s.icon className="relative size-3.5" />
                                    <span className="relative">{t(`search.scope_${s.key}`, {}, s.key)}</span>
                                </button>
                            ))}
                            <span className="ms-auto hidden items-center font-mono text-[10px] text-ink-faint sm:flex">Tab ⇥</span>
                        </div>

                        <div ref={list} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2" data-lenis-prevent>
                            {categories.length > 0 && (
                                <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1">
                                    {categories.map((c) => (
                                        <button key={c.slug} type="button" onClick={() => (router.visit(c.url), setOpen(false))} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-sm text-ink-soft transition hover:border-brand hover:text-ink">
                                            <span className="size-2 rounded-full" style={{ background: c.color }} />
                                            {t(`categories.${c.slug}`, {}, c.title)}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <ul id={listId} role="listbox" aria-label={t('search.title')} aria-busy={loading}>
                                {sections.map((section) => (
                                    <li key={section.key} role="presentation">
                                        {section.label && (
                                            <GroupLabel
                                                action={
                                                    section.key === 'recent' && (
                                                        <button type="button" onClick={() => (writeRecent([]), setRecent([]))} className="text-[11px] text-ink-faint hover:text-ink">
                                                            {t('common.clear_all')}
                                                        </button>
                                                    )
                                                }
                                            >
                                                {section.label}
                                            </GroupLabel>
                                        )}
                                        <ul role="group">
                                            {section.items.map((item) => {
                                                index += 1;
                                                const i = index;
                                                return <Row key={`${section.key}-${item.url ?? item.title}`} id={`${listId}-${i}`} item={item} query={term} active={active === i} onHover={() => active !== i && setActive(i)} onPick={item.run} />;
                                            })}
                                        </ul>
                                    </li>
                                ))}
                            </ul>

                            {loading && !state.data && (
                                <div className="space-y-2 p-3" aria-hidden="true">
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="size-11 animate-pulse rounded-xl bg-ink/5" />
                                            <span className="h-3 flex-1 animate-pulse rounded-full bg-ink/5" style={{ maxWidth: `${70 - i * 15}%` }} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {empty && !state.data?.suggestion && (
                                <div className="flex flex-col items-center px-6 py-8 text-center">
                                    <SearchX className="size-8 text-ink-faint" />
                                    <p className="font-display mt-3 text-xl">{t('search.none_title', {}, 'Nothing at the stalls for that')}</p>
                                    <p className="mt-1 max-w-sm text-sm text-ink-soft">{t('search.none_body', {}, 'Try a simpler word, another scope, or one of these favourites.')}</p>
                                </div>
                            )}

                            {state.status === 'error' && <p className="px-4 py-6 text-center text-sm text-danger">{t('search.error', {}, 'Search is taking a breather. Press Enter to search the full catalogue.')}</p>}

                            {(term.length < 2 || empty) && (
                                <>
                                    <GroupLabel>{t('search.popular')}</GroupLabel>
                                    <div className="flex flex-wrap gap-2 px-3 pb-3">
                                        {TRENDING.map((word) => (
                                            <button key={word} type="button" onClick={() => (setQ(word), input.current?.focus())} className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm text-ink-soft transition hover:border-brand hover:bg-brand hover:text-brand-ink">
                                                {word}
                                                <ArrowUpRight className="rtl-flip size-3.5 opacity-0 transition-all group-hover:opacity-100" />
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-line bg-sunk/60 px-5 py-2.5 text-xs text-ink-faint">
                            <span className="flex min-w-0 items-center gap-2">
                                <img src={produceImage('basket')} alt="" className="size-5" />
                                <span className="truncate" aria-live="polite">
                                    {term.length >= 2 && state.data ? t(`search.count_${state.data.total === 1 ? 'one' : 'other'}`, { count: state.data.total }, `${state.data.total} matches`) : t('search.hint')}
                                </span>
                            </span>
                            <span className="hidden shrink-0 items-center gap-3 font-mono sm:flex" dir="ltr">
                                <span>↑↓ {t('search.k_move', {}, 'move')}</span>
                                <span>↵ {t('search.k_open', {}, 'open')}</span>
                                <span>{isMac() ? '⌘' : 'Ctrl'}↵ {t('search.k_all', {}, 'all results')}</span>
                            </span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
    );
}

export function SearchTrigger({ className }) {
    const t = useT();
    return (
        <button
            type="button"
            onClick={() => openSearch()}
            aria-label={`${t('search.open')} ${isMac() ? '⌘' : 'Ctrl'} K`}
            aria-keyshortcuts="Control+K Meta+K /"
            className={cn('group flex h-10 items-center gap-2 rounded-full text-ink-soft transition hover:text-ink', 'w-10 justify-center hover:bg-ink/5 xl:w-auto xl:justify-start xl:border xl:border-line xl:bg-ink/[0.03] xl:ps-3.5 xl:pe-1.5 xl:hover:border-line-strong', className)}
        >
            <Search className="size-[18px] shrink-0 transition-transform duration-300 group-hover:rotate-[-12deg] group-hover:scale-110" />
            <span className="hidden text-sm xl:inline">{t('search.open')}</span>{' '}
            <kbd className="ms-6 hidden rounded-full border border-line bg-elev px-2 py-0.5 font-mono text-[11px] whitespace-nowrap text-ink-faint xl:inline" dir="ltr">
                {isMac() ? '⌘' : 'Ctrl'} K
            </kbd>
        </button>
    );
}
