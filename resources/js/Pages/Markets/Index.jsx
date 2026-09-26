import { router } from '@inertiajs/react';
import { LocateFixed, Search, X } from 'lucide-react';
import { useState } from 'react';
import { MarketCard } from '@/Components/Cards';
import { MapView } from '@/Components/Map';
import { SplitWords } from '@/Components/motion';
import { ChipToggle, EmptyState } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cleanQuery } from '@/lib/utils';
import { SelectMenu } from '@/Components/Dropdown';

export default function MarketsIndex({ markets, cities, filters }) {
    const t = useT();
    const { day, days } = useFormat();
    const [active, setActive] = useState(null);
    const [q, setQ] = useState(filters.q ?? '');
    const [locating, setLocating] = useState(false);

    const apply = (patch) => router.get(route('markets.index'), cleanQuery({ ...filters, ...patch }), { preserveState: true, preserveScroll: true, replace: true });

    const nearMe = () => {
        setLocating(true);
        navigator.geolocation?.getCurrentPosition(
            ({ coords }) => {
                setLocating(false);
                apply({ lat: coords.latitude.toFixed(5), lng: coords.longitude.toFixed(5) });
            },
            () => setLocating(false),
        );
    };

    const you = filters.lat ? [Number(filters.lat), Number(filters.lng)] : null;

    return (
        <>
            <section className="mx-auto max-w-[1400px] px-5 pt-12 sm:px-8">
                <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('markets.eyebrow', { count: markets.length })}</p>
                <h1 className="font-display mt-3 max-w-4xl text-5xl leading-[0.95] font-light md:text-7xl">
                    <SplitWords text={t('markets.title')} immediate />
                </h1>

                <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply({ q });
                        }}
                        className="flex h-12 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-elev px-4 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 lg:w-80"
                    >
                        <Search className="size-4 text-ink-faint" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('markets.search')} className="h-full flex-1 bg-transparent focus:outline-none" aria-label={t('markets.search')} />
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
                        <SelectMenu value={filters.city ?? ''} onChange={(e) => apply({ city: e.target.value })} className="h-10 rounded-full border border-line-strong bg-elev px-4 text-sm" aria-label={t('markets.city')}>
                            <option value="">{t('markets.all_areas')}</option>
                            {cities.map((c) => (
                                <option key={c}>{c}</option>
                            ))}
                        </SelectMenu>
                        {you ? (
                            <button onClick={() => apply({ lat: undefined, lng: undefined })} className="inline-flex h-10 items-center gap-2 rounded-full bg-lime px-4 text-sm font-medium text-forest">
                                <X className="size-4" /> {t('markets.near_me_on')}
                            </button>
                        ) : (
                            <button onClick={nearMe} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-medium hover:bg-ink/5">
                                <LocateFixed className={locating ? 'size-4 animate-spin' : 'size-4'} /> {t('markets.near_me')}
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <section className="mx-auto mt-8 grid max-w-[1400px] gap-5 px-5 sm:px-8 lg:grid-cols-[1fr_1.15fr]">
                <div className="order-2 space-y-3 lg:order-1">
                    {markets.length === 0 ? (
                        <EmptyState icon="round_pushpin" title={t('markets.empty_title')} body={t('markets.empty_body')} />
                    ) : (
                        markets.map((m) => <MarketCard key={m.id} market={m} active={active === m.id} onHover={setActive} />)
                    )}
                </div>
                <div className="order-1 lg:order-2">
                    <div className="h-[380px] lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
                        <MapView
                            className="h-full"
                            activeId={active}
                            you={you}
                            scrollWheel
                            onMarkerClick={(m) => setActive(m.id)}
                            markers={markets.map((m) => ({
                                id: m.id,
                                lat: m.latitude,
                                lng: m.longitude,
                                title: m.name,
                                subtitle: `${days(m.operating_days, 'long')} · ${m.address}`,
                                href: route('markets.show', m.slug),
                                cta: t('common.view'),
                                color: m.open_today ? '#E2552C' : '#1F4D36',
                                image: '/images/produce/basket.png',
                            }))}
                        />
                    </div>
                </div>
            </section>
        </>
    );
}
