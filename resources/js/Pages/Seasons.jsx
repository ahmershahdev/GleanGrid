import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, CalendarRange, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Reveal, SplitWords } from '@/Components/motion';
import { useT } from '@/lib/i18n';
import { pathUrl } from '@/lib/url';
import { cn, produceImage } from '@/lib/utils';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function useMonthNames() {
    const { locale } = usePage().props.app;
    return useMemo(() => {
        const short = new Intl.DateTimeFormat(locale, { month: 'short' });
        const long = new Intl.DateTimeFormat(locale, { month: 'long' });
        return { short: (m) => short.format(new Date(2026, m - 1, 1)), long: (m) => long.format(new Date(2026, m - 1, 1)) };
    }, [locale]);
}

function MonthDial({ month, onPick, items }) {
    const t = useT();
    const names = useMonthNames();
    const size = 340;
    const r = 140;
    const counts = MONTHS.map((m) => items.filter((i) => i.months.includes(m)).length);
    const max = Math.max(...counts, 1);
    return (
        <div className="relative mx-auto aspect-square w-full max-w-[360px]" aria-hidden="true">
            <motion.svg viewBox={`0 0 ${size} ${size}`} className="size-full" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="1" />
                {MONTHS.map((m, i) => {
                    const a0 = ((i - 3) / 12) * Math.PI * 2 + 0.03;
                    const a1 = ((i - 2) / 12) * Math.PI * 2 - 0.03;
                    const len = 8 + (counts[i] / max) * 22;
                    const p = (a, rad) => [size / 2 + Math.cos(a) * rad, size / 2 + Math.sin(a) * rad];
                    const [x0, y0] = p(a0, r - len / 2);
                    const [x1, y1] = p(a1, r - len / 2);
                    const active = m === month;
                    return (
                        <g key={m} onClick={() => onPick(m)} className="cursor-pointer">
                            <motion.path
                                d={`M ${x0} ${y0} A ${r - len / 2} ${r - len / 2} 0 0 1 ${x1} ${y1}`}
                                fill="none"
                                strokeLinecap="butt"
                                initial={{ pathLength: 0 }}
                                strokeWidth={active ? len + 8 : len}
                                animate={{ pathLength: 1 }}
                                transition={{ delay: 0.3 + i * 0.05, duration: 0.8 }}
                                stroke={active ? 'var(--accent)' : 'color-mix(in oklab, var(--lime) 70%, var(--brand))'}
                                opacity={active ? 1 : 0.35 + (counts[i] / max) * 0.6}
                            />
                            <text x={p((a0 + a1) / 2, r + 24)[0]} y={p((a0 + a1) / 2, r + 24)[1]} textAnchor="middle" dominantBaseline="middle" className={cn('font-mono text-[11px] uppercase', active ? 'fill-[var(--accent)] font-semibold' : 'fill-[var(--ink-faint)]')}>
                                {names.short(m)}
                            </text>
                        </g>
                    );
                })}
            </motion.svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <AnimatePresence mode="wait">
                    <motion.div key={month} initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10 }} className="px-16">
                        <p className="font-display text-4xl leading-none md:text-5xl">{names.long(month)}</p>
                        <p className="mt-2 font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('seasons.crops', { count: counts[month - 1] })}</p>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function ProduceCard({ item, month, i }) {
    const t = useT();
    const peak = item.peak_months.includes(month);
    return (
        <motion.article layout initial={{ opacity: 0, y: 24, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: Math.min(i, 12) * 0.035, type: 'spring', stiffness: 160, damping: 20 }} className="group relative overflow-hidden rounded-[28px] border border-line bg-elev p-5">
            <div className="absolute -end-6 -top-6 size-32 rounded-full blur-2xl transition duration-700 group-hover:scale-150" style={{ background: `color-mix(in oklab, ${item.category?.color ?? '#C9E265'} 40%, transparent)` }} />
            <div className="relative flex items-start justify-between gap-3">
                <motion.img src={produceImage(item.image ?? 'basket')} alt="" className="size-16 drop-shadow-[0_12px_14px_rgb(0_0_0/0.18)]" whileHover={{ rotate: -14, scale: 1.1 }} />
                {peak && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold tracking-wider text-accent-ink uppercase">
                        <Sparkles className="size-3" /> {t('seasons.peak')}
                    </span>
                )}
            </div>
            <h3 className="font-display relative mt-4 text-2xl leading-tight">{item.name}</h3>
            {item.notes && <p className="relative mt-1.5 line-clamp-2 text-sm text-ink-soft">{item.notes}</p>}
            <div className="relative mt-4 flex gap-0.5" aria-hidden="true">
                {MONTHS.map((m) => (
                    <span key={m} className={cn('h-1.5 flex-1 rounded-full', item.peak_months.includes(m) ? 'bg-accent' : item.months.includes(m) ? 'bg-lime' : 'bg-ink/10', m === month && 'ring-2 ring-ink ring-offset-1 ring-offset-elev')} />
                ))}
            </div>
            <Link href={pathUrl('products.index', { q: item.search })} className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                {item.in_stock ? t('seasons.in_stock', { count: item.in_stock }) : t('seasons.shop', { name: item.name })} <ArrowUpRight className="rtl-flip size-4" />
            </Link>
        </motion.article>
    );
}

export default function Seasons({ items, categories, month: current }) {
    const t = useT();
    const names = useMonthNames();
    const [month, setMonth] = useState(current);
    const [cat, setCat] = useState(null);
    const [hover, setHover] = useState(null);
    const filtered = cat ? items.filter((i) => i.category?.slug === cat) : items;
    const now = filtered.filter((i) => i.months.includes(month)).sort((a, b) => Number(b.peak_months.includes(month)) - Number(a.peak_months.includes(month)));
    const next = month % 12 + 1;
    const coming = filtered.filter((i) => i.months.includes(next) && !i.months.includes(month));
    const leaving = filtered.filter((i) => i.months.includes(month) && !i.months.includes(next));

    return (
        <>
            <section className="mx-auto grid max-w-[1400px] items-center gap-12 px-5 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1.15fr_1fr]">
                <div>
                    <p className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">
                        <CalendarRange className="size-4" /> {t('seasons.eyebrow')}
                    </p>
                    <h1 className="font-display mt-4 text-5xl leading-[0.95] font-light md:text-8xl">
                        <SplitWords text={t('seasons.title')} immediate />
                    </h1>
                    <p className="mt-6 max-w-xl text-lg text-ink-soft">{t('seasons.lead')}</p>
                    <div className="mt-8 flex flex-wrap gap-2">
                        {[null, ...categories.map((c) => c.slug)].map((slug) => {
                            const c = categories.find((x) => x.slug === slug);
                            return (
                                <button key={slug ?? 'all'} type="button" onClick={() => setCat(slug)} aria-pressed={cat === slug} className={cn('relative h-10 rounded-full px-4 text-sm font-medium transition', cat === slug ? 'text-bg' : 'bg-ink/5 hover:bg-ink/10')}>
                                    {cat === slug && <motion.span layoutId="season-cat" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                                    <span className="relative">{slug ? t(`categories.${slug}`, {}, c?.name) : t('seasons.all')}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <MonthDial month={month} onPick={setMonth} items={filtered} />
            </section>

            <section className="mx-auto mt-16 max-w-[1400px] px-5 sm:px-8">
                <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2" role="tablist" aria-label={t('seasons.view_month')}>
                    {MONTHS.map((m) => (
                        <button key={m} role="tab" aria-selected={month === m} onClick={() => setMonth(m)} className={cn('relative h-11 min-w-16 shrink-0 rounded-full px-4 text-sm font-semibold transition', month === m ? 'text-accent-ink' : 'text-ink-soft hover:bg-ink/5', m === current && month !== m && 'ring-1 ring-accent/50')}>
                            {month === m && <motion.span layoutId="season-month" className="absolute inset-0 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                            <span className="relative">{names.short(m)}</span>
                        </button>
                    ))}
                </div>
                <h2 className="font-display mt-8 text-4xl font-light md:text-6xl">{t('seasons.this_month', { month: names.long(month) })}</h2>
                <motion.div layout className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <AnimatePresence mode="popLayout">
                        {now.map((item, i) => (
                            <ProduceCard key={`${item.id}-${month}`} item={item} month={month} i={i} />
                        ))}
                    </AnimatePresence>
                </motion.div>

                <div className="mt-10 grid gap-4 md:grid-cols-2">
                    {[
                        ['seasons.coming', coming, next],
                        ['seasons.leaving', leaving, month],
                    ].map(([label, list, m]) => (
                        <Reveal key={label} className="rounded-[28px] border border-line bg-elev p-6">
                            <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">
                                {t(label)} · {names.long(m)}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {list.length === 0 && <span className="text-sm text-ink-faint">—</span>}
                                {list.map((i) => (
                                    <Link key={i.id} href={pathUrl('products.index', { q: i.search })} className="inline-flex items-center gap-2 rounded-full bg-ink/5 py-1 ps-1 pe-3 text-sm hover:bg-ink/10">
                                        <img src={produceImage(i.image ?? 'basket')} alt="" className="size-7" /> {i.name}
                                    </Link>
                                ))}
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            <section className="mx-auto mt-24 max-w-[1400px] px-5 sm:px-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <h2 className="font-display text-4xl font-light md:text-6xl">{t('seasons.view_grid')}</h2>
                    <div className="flex items-center gap-4 text-xs text-ink-soft">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="size-3 rounded-full bg-accent" /> {t('seasons.legend_peak')}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="size-3 rounded-full bg-lime" /> {t('seasons.legend_in')}
                        </span>
                    </div>
                </div>
                <div className="mt-8 overflow-x-auto rounded-[28px] border border-line bg-elev" data-lenis-prevent>
                    <table className="w-full min-w-[820px] text-sm" onMouseLeave={() => setHover(null)}>
                        <thead>
                            <tr className="border-b border-line">
                                <th className="sticky start-0 z-10 bg-elev px-5 py-3 text-start font-medium text-ink-faint" />
                                {MONTHS.map((m) => (
                                    <th key={m} scope="col" onMouseEnter={() => setHover(m)} className={cn('px-1 py-3 text-center font-mono text-[11px] font-medium uppercase transition', m === current ? 'text-accent' : 'text-ink-faint', hover === m && 'bg-ink/5')}>
                                        {names.short(m)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {filtered.map((item, row) => (
                                <tr key={item.id} className="group">
                                    <th scope="row" className="sticky start-0 z-10 bg-elev px-5 py-2.5 text-start font-medium group-hover:bg-sunk">
                                        <span className="flex items-center gap-2.5">
                                            <img src={produceImage(item.image ?? 'basket')} alt="" className="size-7" /> {item.name}
                                        </span>
                                    </th>
                                    {MONTHS.map((m) => {
                                        const peak = item.peak_months.includes(m);
                                        const on = item.months.includes(m);
                                        return (
                                            <td key={m} onMouseEnter={() => setHover(m)} className={cn('px-1 py-2.5 transition', hover === m && 'bg-ink/5')}>
                                                <span className="sr-only">{peak ? t('seasons.peak') : on ? t('seasons.season') : t('seasons.off')}</span>
                                                {on && (
                                                    <motion.span
                                                        aria-hidden="true"
                                                        className={cn('mx-auto block h-5 rounded-full', peak ? 'bg-accent' : 'bg-lime', item.months.includes(m - 1) ? 'rounded-s-none' : '', item.months.includes(m + 1) ? 'rounded-e-none' : '')}
                                                        initial={{ scaleX: 0, opacity: 0 }}
                                                        whileInView={{ scaleX: 1, opacity: 1 }}
                                                        viewport={{ once: true, margin: '-40px' }}
                                                        transition={{ delay: (m * 0.025) + Math.min(row, 10) * 0.02, duration: 0.45 }}
                                                        style={{ transformOrigin: 'left' }}
                                                    />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}
