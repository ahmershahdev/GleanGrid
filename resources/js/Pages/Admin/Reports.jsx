import { router } from '@inertiajs/react';
import { Download, Printer } from 'lucide-react';
import { useState } from 'react';
import { Bars, StatusDonut } from '@/Components/Charts';
import { Button, Card, PageHeader, SectionTitle, Stat, Table } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { pathUrl } from '@/lib/url';

export default function Reports({ range, summary, byMarket, activeFarmers, byCategory, history }) {
    const t = useT();
    const { money, number, date, relative } = useFormat();
    const [from, setFrom] = useState(range.from);
    const [to, setTo] = useState(range.to);
    const exportUrl = (type) => pathUrl('admin.reports.export', { from: range.from, to: range.to }, { type });

    return (
        <>
            <PageHeader
                title={t('reports.title')}
                description={t('reports.subtitle', { from: date(range.from), to: date(range.to) })}
                actions={
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
                        <Printer className="size-4" /> {t('forders.print')}
                    </Button>
                }
            />
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    router.get(pathUrl('admin.reports.index', { from, to }), {}, { preserveScroll: true });
                }}
                className="mt-6 flex flex-wrap items-end gap-3 print:hidden"
            >
                <label className="text-sm">
                    <span className="mb-1 block text-ink-soft">{t('reports.from')}</span>
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl border border-line-strong bg-elev px-3" />
                </label>
                <label className="text-sm">
                    <span className="mb-1 block text-ink-soft">{t('reports.to')}</span>
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl border border-line-strong bg-elev px-3" />
                </label>
                <Button type="submit" size="sm" className="h-10">
                    {t('reports.run')}
                </Button>
            </form>

            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label={t('reports.orders')} value={number(summary.orders)} hint={t('reports.customers', { count: summary.customers })} />
                <Stat label={t('reports.completed')} value={number(summary.completed)} hint={t('reports.cancelled', { count: summary.cancelled })} tone="lime" />
                <Stat label={t('reports.revenue')} value={money(summary.revenue)} tone="brand" />
                <Stat label={t('reports.average')} value={money(summary.average)} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <Card className="p-6">
                    <SectionTitle
                        eyebrow={t('reports.market_eyebrow')}
                        title={t('reports.market_title')}
                        action={
                            <a href={exportUrl('markets')} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand print:hidden">
                                <Download className="size-4" /> CSV
                            </a>
                        }
                    />
                    <Bars data={byMarket.map((m) => ({ ...m, name: m.name.replace(/ (Market|Bazaar|Mela)$/, '') }))} x="name" y="revenue" formatValue={money} height={280} />
                </Card>
                <Card className="p-6">
                    <SectionTitle eyebrow={t('reports.status_eyebrow')} title={t('reports.status_title')} />
                    <StatusDonut counts={summary.byStatus} />
                    {byCategory.length > 0 && (
                        <div className="mt-6 space-y-2 border-t border-line pt-5">
                            <p className="text-sm font-medium">{t('reports.by_category')}</p>
                            {byCategory.map((c) => (
                                <div key={c.name} className="flex items-center gap-3 text-sm">
                                    <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                                    <span className="flex-1">{c.name}</span>
                                    <span className="tabular-nums">{money(c.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <div className="mt-6">
                <SectionTitle
                    eyebrow={t('reports.farmers_eyebrow')}
                    title={t('reports.farmers_title')}
                    action={
                        <div className="flex gap-3 print:hidden">
                            <a href={exportUrl('farmers')} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                                <Download className="size-4" /> {t('reports.farmers_csv')}
                            </a>
                            <a href={exportUrl('orders')} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                                <Download className="size-4" /> {t('reports.orders_csv')}
                            </a>
                        </div>
                    }
                />
                <Table head={['#', t('afarmers.stall'), t('reports.orders'), t('reports.completed'), t('reports.revenue'), t('reviews.rating')]}>
                    {activeFarmers.map((f, i) => (
                        <tr key={f.id}>
                            <td className="px-5 py-3 font-display text-lg text-ink-faint">{i + 1}</td>
                            <td className="px-5 py-3 font-medium">{f.stall_name}</td>
                            <td className="px-5 py-3 tabular-nums">{f.orders}</td>
                            <td className="px-5 py-3 tabular-nums">{f.completed}</td>
                            <td className="px-5 py-3 font-semibold tabular-nums">{money(f.revenue)}</td>
                            <td className="px-5 py-3 tabular-nums">{Number(f.rating_avg).toFixed(1)} ★</td>
                        </tr>
                    ))}
                </Table>
            </div>

            {history.length > 0 && (
                <Card className="mt-6 p-6 print:hidden">
                    <SectionTitle title={t('reports.history')} />
                    <ul className="space-y-2 text-sm">
                        {history.map((h) => (
                            <li key={h.id} className="flex flex-wrap gap-x-3 text-ink-soft">
                                <span className="font-medium text-ink">{t(`reports.type_${h.report_type}`)}</span>
                                <span>
                                    {h.filters?.from} → {h.filters?.to}
                                </span>
                                <span>· {h.author?.name}</span>
                                <span className="ms-auto text-xs">{relative(h.generated_at)}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </>
    );
}
