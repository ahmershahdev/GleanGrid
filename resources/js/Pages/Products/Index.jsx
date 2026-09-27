import { router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductCard } from '@/Components/Cards';
import { Reveal, SplitWords } from '@/Components/motion';
import { Button, EmptyState, Modal, Pagination } from '@/Components/ui';
import { SelectMenu } from '@/Components/Dropdown';
import { useFormat, useT } from '@/lib/i18n';
import { cleanQuery, cn, produceImage } from '@/lib/utils';

const SORTS = ['featured', 'price_asc', 'price_desc', 'rating', 'popular', 'newest'];

function Section({ title, onReset, children }) {
    const t = useT();
    return (
        <div className="border-t border-line pt-5 first:border-t-0 first:pt-0">
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-mono text-[11px] tracking-[0.18em] text-ink-faint uppercase">{title}</p>
                {onReset && (
                    <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft transition hover:text-accent">
                        <RotateCcw className="size-3" /> {t('products.reset', {}, 'Reset')}
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

function PriceRange({ min, max, bounds, onCommit }) {
    const t = useT();
    const { currency } = useFormat();
    const floor = Math.floor(bounds.min);
    const ceil = Math.max(Math.ceil(bounds.max), floor + 1);
    const [lo, setLo] = useState(min === undefined || min === '' ? floor : Number(min));
    const [hi, setHi] = useState(max === undefined || max === '' ? ceil : Number(max));

    useEffect(() => {
        setLo(min === undefined || min === '' ? floor : Number(min));
        setHi(max === undefined || max === '' ? ceil : Number(max));
    }, [min, max, floor, ceil]);

    const commit = (a = lo, b = hi) => onCommit({ min: a > floor ? a : undefined, max: b < ceil ? b : undefined });
    const pct = (v) => ((v - floor) / (ceil - floor)) * 100;
    const thumb = 'pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-bg [&::-moz-range-thumb]:bg-ink [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg [&::-webkit-slider-thumb]:bg-ink [&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgb(0_0_0/0.25)] [&::-webkit-slider-thumb]:transition [&::-webkit-slider-thumb]:active:scale-125';

    return (
        <div>
            <div className="relative h-6" dir="ltr">
                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line-strong" />
                <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
                <input type="range" min={floor} max={ceil} value={lo} onChange={(e) => setLo(Math.min(Number(e.target.value), hi - 1))} onPointerUp={() => commit()} onKeyUp={() => commit()} className={thumb} aria-label={t('products.min')} />
                <input type="range" min={floor} max={ceil} value={hi} onChange={(e) => setHi(Math.max(Number(e.target.value), lo + 1))} onPointerUp={() => commit()} onKeyUp={() => commit()} className={thumb} aria-label={t('products.max')} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                    [lo, setLo, 'products.min', (v) => commit(Math.min(v, hi - 1), hi)],
                    [hi, setHi, 'products.max', (v) => commit(lo, Math.max(v, lo + 1))],
                ].map(([v, set, key, done]) => (
                    <label key={key} className="group flex h-11 items-center gap-1.5 rounded-2xl border border-line-strong bg-bg px-3 transition focus-within:border-ink">
                        <span className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">{t(key)}</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={floor}
                            max={ceil}
                            value={v}
                            onChange={(e) => set(Number(e.target.value))}
                            onBlur={(e) => done(Number(e.target.value))}
                            onKeyDown={(e) => e.key === 'Enter' && done(Number(e.currentTarget.value))}
                            className="w-full min-w-0 bg-transparent text-end text-sm font-medium tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label={`${t(key)} (${currency})`}
                        />
                    </label>
                ))}
            </div>
        </div>
    );
}

function Filters({ value, markets, priceRange, onChange }) {
    const t = useT();
    const { day, currency } = useFormat();
    const inStock = !!Number(value.in_stock);

    return (
        <div className="space-y-5">
            <Section title={`${t('products.price')} · ${currency}`} onReset={value.min || value.max ? () => onChange({ min: undefined, max: undefined }) : null}>
                <PriceRange min={value.min} max={value.max} bounds={priceRange} onCommit={onChange} />
            </Section>

            <Section title={t('products.market')} onReset={value.market ? () => onChange({ market: undefined }) : null}>
                <SelectMenu value={value.market ?? ''} onChange={(e) => onChange({ market: e.target.value || undefined })} className="w-full" aria-label={t('products.market')}>
                    <option value="">{t('farmers.all_markets')}</option>
                    {markets.map((m) => (
                        <option key={m.id} value={m.slug}>
                            {m.name}
                        </option>
                    ))}
                </SelectMenu>
            </Section>

            <Section title={t('products.market_day')} onReset={value.day !== undefined ? () => onChange({ day: undefined }) : null}>
                <div className="grid grid-cols-7 gap-1">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                        const on = String(value.day) === String(d);
                        return (
                            <button
                                key={d}
                                type="button"
                                aria-pressed={on}
                                onClick={() => onChange({ day: on ? undefined : d })}
                                className={cn('flex h-10 items-center justify-center rounded-xl text-[11px] font-semibold uppercase transition', on ? 'bg-ink text-bg shadow-soft' : 'bg-ink/5 text-ink-soft hover:bg-ink/10 hover:text-ink')}
                            >
                                {day(d, 'short').slice(0, 3)}
                            </button>
                        );
                    })}
                </div>
            </Section>

            <Section title={t('products.availability', {}, 'Availability')}>
                <button
                    type="button"
                    role="switch"
                    aria-checked={inStock}
                    onClick={() => onChange({ in_stock: inStock ? undefined : 1 })}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line-strong bg-bg px-4 py-3 text-start text-sm transition hover:border-ink"
                >
                    <span>{t('products.in_stock_only')}</span>
                    <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', inStock ? 'bg-brand' : 'bg-line-strong')}>
                        <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className={cn('absolute top-0.5 size-5 rounded-full bg-bg shadow', inStock ? 'end-0.5' : 'start-0.5')} />
                    </span>
                </button>
            </Section>
        </div>
    );
}

function CategoryRail({ categories, active, onPick, total }) {
    const t = useT();
    const rail = useRef(null);

    useEffect(() => {
        rail.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, [active]);

    const pill = (on) => cn('group relative inline-flex h-12 shrink-0 snap-start items-center gap-2.5 rounded-full border ps-1.5 pe-4 text-sm font-medium whitespace-nowrap transition', on ? 'border-ink text-bg' : 'border-line-strong bg-elev text-ink-soft hover:border-ink hover:text-ink');

    return (
        <div className="relative -mx-5 sm:-mx-8">
            <div ref={rail} className="no-scrollbar mask-fade-x flex snap-x gap-2 overflow-x-auto scroll-px-5 px-5 py-1 sm:scroll-px-8 sm:px-8" data-lenis-prevent>
                {[{ slug: undefined, name: t('common.all'), icon: 'basket', count: total }, ...categories].map((c) => {
                    const on = (active ?? undefined) === c.slug;
                    return (
                        <button key={c.slug ?? 'all'} type="button" aria-pressed={on} onClick={() => onPick(c.slug)} className={pill(on)}>
                            {on && <motion.span layoutId="cat-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 -z-0 rounded-full bg-ink" />}
                            <span className={cn('relative flex size-9 items-center justify-center rounded-full transition', on ? 'bg-bg/15' : 'bg-bg')}>
                                <img src={produceImage(c.icon)} alt="" className="size-6 transition duration-500 group-hover:scale-110 group-hover:-rotate-12" />
                            </span>
                            <span className="relative">{c.slug ? t(`categories.${c.slug}`, {}, c.name) : c.name}</span>
                            {c.count !== undefined && <span className={cn('relative font-mono text-[11px] tabular-nums', on ? 'text-bg/60' : 'text-ink-faint')}>{c.count}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function ProductsIndex({ products, categories, markets, priceRange, filters }) {
    const t = useT();
    const [q, setQ] = useState(filters.q ?? '');
    const [sheet, setSheet] = useState(false);
    const [draft, setDraft] = useState(filters);
    const [busy, setBusy] = useState(false);

    useEffect(() => setQ(filters.q ?? ''), [filters.q]);
    useEffect(() => {
        if (sheet) setDraft(filters);
    }, [sheet, filters]);

    const apply = (patch) => {
        router.get(route('products.index'), cleanQuery({ ...filters, ...patch, page: undefined }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
        });
    };

    const activeCategory = categories.find((c) => c.slug === filters.category);
    const allCount = useMemo(() => categories.reduce((n, c) => n + (c.count ?? 0), 0), [categories]);
    const chips = [
        filters.q && ['q', `“${filters.q}”`],
        filters.market && ['market', markets.find((m) => m.slug === filters.market)?.name],
        filters.day !== undefined && ['day', t('products.day_chip')],
        (filters.min || filters.max) && ['price', `${filters.min ?? Math.floor(priceRange.min)} – ${filters.max ?? Math.ceil(priceRange.max)}`],
        Number(filters.in_stock) && ['in_stock', t('products.in_stock_only')],
    ].filter(Boolean);
    const panelCount = chips.filter(([k]) => k !== 'q').length;

    return (
        <>
            <section className="mx-auto max-w-[1400px] px-5 pt-12 sm:px-8">
                <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
                    <div>
                        <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('products.eyebrow', { count: products.total })}</p>
                        <h1 className="font-display mt-3 max-w-4xl text-5xl leading-[0.95] font-light md:text-7xl">
                            <SplitWords key={activeCategory?.slug ?? 'all'} text={activeCategory ? t(`categories.${activeCategory.slug}`, {}, activeCategory.name) : t('products.title')} immediate />
                        </h1>
                    </div>
                </div>

                <div className="gg-under-header sticky z-30 -mx-5 mt-10 border-b border-transparent bg-bg/80 px-5 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
                    <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:items-center sm:gap-3">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                apply({ q: q.trim() || undefined });
                            }}
                            className="group/s col-span-2 flex h-12 min-w-0 items-center gap-2 rounded-full border border-line-strong bg-elev ps-4 pe-1.5 transition focus-within:border-ink focus-within:shadow-soft sm:flex-1 lg:max-w-lg"
                            role="search"
                        >
                            <Search className="size-4 shrink-0 text-ink-faint transition group-focus-within/s:text-accent" />
                            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('products.search')} enterKeyHint="search" className="h-full w-full min-w-0 flex-1 bg-transparent text-base focus:outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden" aria-label={t('products.search')} />
                            <AnimatePresence>
                                {q && (
                                    <motion.button initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} type="button" onClick={() => (setQ(''), filters.q && apply({ q: undefined }))} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5" aria-label={t('common.clear_all')}>
                                        <X className="size-4" />
                                    </motion.button>
                                )}
                            </AnimatePresence>
                            <button className="hidden h-9 shrink-0 items-center rounded-full bg-ink px-4 text-sm font-medium text-bg transition hover:bg-accent hover:text-accent-ink sm:inline-flex">{t('common.search')}</button>
                        </form>

                        <button type="button" onClick={() => setSheet(true)} className="relative inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong bg-elev px-4 text-sm font-medium transition hover:border-ink sm:h-12 lg:hidden">
                            <SlidersHorizontal className="size-4" /> {t('common.filters')}
                            {panelCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-ink tabular-nums">{panelCount}</span>}
                        </button>
                        <SelectMenu value={filters.sort || 'featured'} onChange={(e) => apply({ sort: e.target.value === 'featured' ? undefined : e.target.value })} className="min-w-0 sm:ms-auto" aria-label={t('common.sort')} align="end">
                            {SORTS.map((s) => (
                                <option key={s} value={s}>
                                    {t(`products.sort_${s}`)}
                                </option>
                            ))}
                        </SelectMenu>
                    </div>
                </div>

                <div className="mt-5">
                    <CategoryRail categories={categories} active={filters.category} total={allCount || undefined} onPick={(slug) => apply({ category: slug })} />
                </div>

                <AnimatePresence initial={false}>
                    {chips.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2 pt-4">
                                {chips.map(([key, label]) => (
                                    <motion.button
                                        layout
                                        key={key}
                                        onClick={() => apply(key === 'price' ? { min: undefined, max: undefined } : { [key]: undefined })}
                                        className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-lime/40 ps-3.5 pe-2 text-sm font-medium text-forest transition hover:bg-lime/60 dark:text-lime"
                                    >
                                        {label}
                                        <span className="flex size-5 items-center justify-center rounded-full bg-forest/10 transition group-hover:rotate-90">
                                            <X className="size-3" />
                                        </span>
                                    </motion.button>
                                ))}
                                <button onClick={() => router.get(route('products.index'))} className="ms-1 text-sm font-medium text-ink-soft underline decoration-line-strong underline-offset-4 hover:text-ink">
                                    {t('common.clear_all')}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            <section className="mx-auto mt-8 grid max-w-[1400px] gap-10 px-5 sm:px-8 lg:grid-cols-[272px_1fr]">
                <aside className="hidden lg:block">
                    <div className="sticky top-24 rounded-[28px] border border-line bg-elev p-5">
                        <div className="mb-5 flex items-center justify-between">
                            <p className="font-display text-xl">{t('common.filters')}</p>
                            {panelCount > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink tabular-nums">{panelCount}</span>}
                        </div>
                        <Filters value={filters} markets={markets} priceRange={priceRange} onChange={apply} />
                    </div>
                </aside>
                <div className={cn('transition-opacity duration-300', busy && 'pointer-events-none opacity-50')} aria-busy={busy}>
                    {products.data.length === 0 ? (
                        <EmptyState icon="shopping_cart" title={t('products.empty_title')} body={t('products.empty_body')} action={<Button variant="outline" onClick={() => router.get(route('products.index'))}>{t('common.clear_all')}</Button>} />
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {products.data.map((p, i) => (
                                <Reveal key={p.id} delay={(i % 3) * 0.05}>
                                    <ProductCard product={p} />
                                </Reveal>
                            ))}
                        </div>
                    )}
                    <Pagination meta={products} className="mt-10" />
                </div>
            </section>

            <Modal open={sheet} onClose={() => setSheet(false)} title={t('common.filters')} className="pb-0">
                <Filters value={draft} markets={markets} priceRange={priceRange} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
                <div className="sticky bottom-0 -mx-6 mt-6 flex gap-2 border-t border-line bg-elev px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                    <Button variant="outline" className="flex-1" onClick={() => setDraft({ q: filters.q, category: filters.category, sort: filters.sort })}>
                        <RotateCcw className="size-4" /> {t('products.reset', {}, 'Reset')}
                    </Button>
                    <Button
                        className="flex-[2]"
                        onClick={() => {
                            setSheet(false);
                            router.get(route('products.index'), cleanQuery({ ...draft, page: undefined }), { preserveState: true, preserveScroll: true, replace: true });
                        }}
                    >
                        <Check className="size-4" /> {t('products.apply', {}, 'Show results')}
                    </Button>
                </div>
            </Modal>
        </>
    );
}
