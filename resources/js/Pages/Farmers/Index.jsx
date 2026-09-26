import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { FarmerCard } from '@/Components/Cards';
import { Reveal, SplitWords } from '@/Components/motion';
import { ChipToggle, EmptyState, Pagination } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cleanQuery } from '@/lib/utils';
import { SelectMenu } from '@/Components/Dropdown';

export default function FarmersIndex({ farmers, markets, filters }) {
    const t = useT();
    const { day } = useFormat();
    const [q, setQ] = useState(filters.q ?? '');
    const apply = (patch) => router.get(route('farmers.index'), cleanQuery({ ...filters, ...patch }), { preserveState: true, preserveScroll: true, replace: true });

    return (
        <>
            <section className="mx-auto max-w-[1400px] px-5 pt-12 sm:px-8">
                <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('farmers.eyebrow', { count: farmers.total })}</p>
                <h1 className="font-display mt-3 max-w-4xl text-5xl leading-[0.95] font-light md:text-7xl">
                    <SplitWords text={t('farmers.title')} immediate />
                </h1>

                <div className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-center">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply({ q });
                        }}
                        className="flex h-12 flex-1 items-center gap-2 rounded-full border border-line-strong bg-elev px-4 lg:max-w-sm"
                    >
                        <Search className="size-4 text-ink-faint" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('farmers.search')} className="h-full flex-1 bg-transparent focus:outline-none" aria-label={t('farmers.search')} />
                    </form>
                    <div className="no-scrollbar flex gap-2 overflow-x-auto">
                        <ChipToggle active={filters.day === undefined} onClick={() => apply({ day: undefined })}>
                            {t('markets.any_day')}
                        </ChipToggle>
                        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                            <ChipToggle key={d} active={String(filters.day) === String(d)} onClick={() => apply({ day: d })}>
                                {day(d, 'short')}
                            </ChipToggle>
                        ))}
                    </div>
                    <div className="flex gap-2 lg:ms-auto">
                        <SelectMenu value={filters.market ?? ''} onChange={(e) => apply({ market: e.target.value })} className="h-10 max-w-52 rounded-full border border-line-strong bg-elev px-4 text-sm" aria-label={t('farmers.market')}>
                            <option value="">{t('farmers.all_markets')}</option>
                            {markets.map((m) => (
                                <option key={m.id} value={m.slug}>
                                    {m.name}
                                </option>
                            ))}
                        </SelectMenu>
                        <SelectMenu value={filters.sort ?? 'rating'} onChange={(e) => apply({ sort: e.target.value })} className="h-10 rounded-full border border-line-strong bg-elev px-4 text-sm" aria-label={t('common.sort')}>
                            <option value="rating">{t('farmers.sort_rating')}</option>
                            <option value="name">{t('farmers.sort_name')}</option>
                            <option value="newest">{t('farmers.sort_newest')}</option>
                        </SelectMenu>
                    </div>
                </div>
            </section>

            <section className="mx-auto mt-10 max-w-[1400px] px-5 sm:px-8">
                {farmers.data.length === 0 ? (
                    <EmptyState icon="seedling" title={t('farmers.empty_title')} body={t('farmers.empty_body')} />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {farmers.data.map((f, i) => (
                            <Reveal key={f.id} delay={(i % 4) * 0.05}>
                                <FarmerCard farmer={f} />
                            </Reveal>
                        ))}
                    </div>
                )}
                <Pagination meta={farmers} className="mt-10" />
            </section>
        </>
    );
}
