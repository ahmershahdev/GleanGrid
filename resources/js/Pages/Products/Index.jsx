import { router } from '@inertiajs/react';
import { SlidersHorizontal, Search, X } from 'lucide-react';
import { useState } from 'react';
import { ProductCard } from '@/Components/Cards';
import { Reveal, SplitWords } from '@/Components/motion';
import { Button, Checkbox, EmptyState, Modal, Pagination } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cleanQuery, cn, produceImage } from '@/lib/utils';
import { SelectMenu } from '@/Components/Dropdown';

function Filters({ filters, categories, markets, priceRange, apply }) {
    const t = useT();
    const { day, currency } = useFormat();
    const [min, setMin] = useState(filters.min ?? '');
    const [max, setMax] = useState(filters.max ?? '');

    return (
        <div className="space-y-8">
            <div>
                <p className="mb-3 text-sm font-semibold">{t('products.category')}</p>
                <div className="space-y-1">
                    <button onClick={() => apply({ category: undefined })} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-start text-sm', !filters.category ? 'bg-ink text-bg' : 'hover:bg-ink/5')}>
                        <img src={produceImage('basket')} alt="" className="size-6" /> {t('common.all')}
                    </button>
                    {categories.map((c) => (
                        <button key={c.id} onClick={() => apply({ category: c.slug })} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-start text-sm', filters.category === c.slug ? 'bg-ink text-bg' : 'hover:bg-ink/5')}>
                            <img src={produceImage(c.icon)} alt="" className="size-6" /> {t(`categories.${c.slug}`, {}, c.name)}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="mb-3 text-sm font-semibold">{t('products.price')} ({currency})</p>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({ min, max });
                    }}
                    className="flex items-center gap-2"
                >
                    <input type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} placeholder={String(Math.floor(priceRange.min))} className="h-10 w-full rounded-xl border border-line-strong bg-elev px-3 text-sm" aria-label={t('products.min')} />
                    <span className="text-ink-faint">–</span>
                    <input type="number" min="0" value={max} onChange={(e) => setMax(e.target.value)} placeholder={String(Math.ceil(priceRange.max))} className="h-10 w-full rounded-xl border border-line-strong bg-elev px-3 text-sm" aria-label={t('products.max')} />
                    <button className="h-10 shrink-0 rounded-xl bg-ink px-3 text-sm text-bg">{t('common.go')}</button>
                </form>
            </div>

            <div>
                <p className="mb-3 text-sm font-semibold">{t('products.market')}</p>
                <SelectMenu value={filters.market ?? ''} onChange={(e) => apply({ market: e.target.value })} className="h-10 w-full rounded-xl border border-line-strong bg-elev px-3 text-sm">
                    <option value="">{t('farmers.all_markets')}</option>
                    {markets.map((m) => (
                        <option key={m.id} value={m.slug}>
                            {m.name}
                        </option>
                    ))}
                </SelectMenu>
            </div>

            <div>
                <p className="mb-3 text-sm font-semibold">{t('products.market_day')}</p>
                <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                        <button key={d} onClick={() => apply({ day: String(filters.day) === String(d) ? undefined : d })} className={cn('h-9 rounded-full px-3 text-xs font-medium', String(filters.day) === String(d) ? 'bg-brand text-brand-ink' : 'bg-ink/5 hover:bg-ink/10')}>
                            {day(d, 'short')}
                        </button>
                    ))}
                </div>
            </div>

            <Checkbox label={t('products.in_stock_only')} checked={!!Number(filters.in_stock)} onChange={(e) => apply({ in_stock: e.target.checked ? 1 : undefined })} />
        </div>
    );
}

export default function ProductsIndex({ products, categories, markets, priceRange, filters }) {
    const t = useT();
    const [q, setQ] = useState(filters.q ?? '');
    const [sheet, setSheet] = useState(false);
    const apply = (patch) => {
        setSheet(false);
        router.get(route('products.index'), cleanQuery({ ...filters, ...patch }), { preserveState: true, preserveScroll: true, replace: true });
    };

    const activeCategory = categories.find((c) => c.slug === filters.category);
    const chips = [
        filters.q && ['q', `“${filters.q}”`],
        activeCategory && ['category', t(`categories.${activeCategory.slug}`, {}, activeCategory.name)],
        filters.market && ['market', markets.find((m) => m.slug === filters.market)?.name],
        filters.day !== undefined && ['day', t('products.day_chip')],
        (filters.min || filters.max) && ['price', `${filters.min ?? 0} – ${filters.max ?? '∞'}`],
        Number(filters.in_stock) && ['in_stock', t('products.in_stock_only')],
    ].filter(Boolean);

    const filterProps = { filters, categories, markets, priceRange, apply };

    return (
        <>
            <section className="mx-auto max-w-[1400px] px-5 pt-12 sm:px-8">
                <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('products.eyebrow', { count: products.total })}</p>
                <h1 className="font-display mt-3 max-w-4xl text-5xl leading-[0.95] font-light md:text-7xl">
                    <SplitWords text={activeCategory ? t(`categories.${activeCategory.slug}`, {}, activeCategory.name) : t('products.title')} immediate />
                </h1>

                <div className="mt-10 flex flex-wrap items-center gap-3">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply({ q });
                        }}
                        className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full border border-line-strong bg-elev px-4 md:max-w-md"
                        role="search"
                    >
                        <Search className="size-4 text-ink-faint" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('products.search')} className="h-full min-w-0 flex-1 bg-transparent focus:outline-none" aria-label={t('products.search')} />
                    </form>
                    <Button variant="outline" onClick={() => setSheet(true)} className="lg:hidden">
                        <SlidersHorizontal className="size-4" /> {t('common.filters')}
                    </Button>
                    <SelectMenu value={filters.sort ?? 'featured'} onChange={(e) => apply({ sort: e.target.value })} className="ms-auto h-11 rounded-full border border-line-strong bg-elev px-4 text-sm" aria-label={t('common.sort')}>
                        {['featured', 'price_asc', 'price_desc', 'rating', 'popular', 'newest'].map((s) => (
                            <option key={s} value={s}>
                                {t(`products.sort_${s}`)}
                            </option>
                        ))}
                    </SelectMenu>
                </div>
                {chips.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        {chips.map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => apply(key === 'price' ? { min: undefined, max: undefined } : { [key]: undefined })}
                                className="inline-flex items-center gap-1.5 rounded-full bg-lime/40 px-3 py-1.5 text-sm font-medium text-forest dark:text-lime"
                            >
                                {label} <X className="size-3.5" />
                            </button>
                        ))}
                        <button onClick={() => router.get(route('products.index'))} className="text-sm text-ink-soft underline">
                            {t('common.clear_all')}
                        </button>
                    </div>
                )}
            </section>

            <section className="mx-auto mt-10 grid max-w-[1400px] gap-10 px-5 sm:px-8 lg:grid-cols-[240px_1fr]">
                <aside className="hidden lg:block">
                    <div className="sticky top-24">
                        <Filters {...filterProps} key={JSON.stringify(filters)} />
                    </div>
                </aside>
                <div>
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

            <Modal open={sheet} onClose={() => setSheet(false)} title={t('common.filters')}>
                <Filters {...filterProps} />
            </Modal>
        </>
    );
}
