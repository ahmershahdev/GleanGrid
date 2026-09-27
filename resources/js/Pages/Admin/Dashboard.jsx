import { Link, router } from '@inertiajs/react';
import { Check, ClipboardList, Mail, MapPinned, ShieldAlert, ShieldCheck, Store, Users } from 'lucide-react';
import { useState } from 'react';
import { HealthPanels, KpiStrip, LeaderBoards, TodayStrip } from '@/Components/AdminInsights';
import { StatusDonut, TrendChart } from '@/Components/Charts';
import { CountUp } from '@/Components/motion';
import { Button, Card, SectionTitle, Stat, StatusBadge } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { pathUrl } from '@/lib/url';

export default function AdminDashboard({ stats, daily, byStatus, topFarmers, pendingFarmers, recentOrders, security, kpis, today, catalogue, marketRevenue, topProducts, pickupsWeek, system }) {
    const t = useT();
    const { money, date, dateLong, relative } = useFormat();
    const [metric, setMetric] = useState('orders');

    return (
        <>
            <div className="mb-8">
                <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('admin.eyebrow')}</p>
                <h1 className="font-display mt-1 text-4xl font-light md:text-5xl">{t('admin.title')}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                    <span className="relative flex size-2">
                        <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60" />
                        <span className="relative size-2 rounded-full bg-success" />
                    </span>
                    {t('admin.live_as_of', { date: dateLong(new Date().toISOString()) }, `Live · ${dateLong(new Date().toISOString())}`)}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label={t('admin.stat_farmers')} value={<CountUp value={stats.farmers} />} hint={t('admin.pending_hint', { count: stats.pending_farmers })} icon={Store} tone="brand" />
                <Stat label={t('admin.stat_customers')} value={<CountUp value={stats.customers} />} icon={Users} />
                <Stat label={t('admin.stat_markets')} value={<CountUp value={stats.markets} />} icon={MapPinned} />
                <Stat label={t('admin.stat_orders')} value={<CountUp value={stats.orders} />} hint={t('admin.open_hint', { count: stats.open_orders })} icon={ClipboardList} tone="lime" />
            </div>

            <TodayStrip today={today} />
            <KpiStrip kpis={kpis} />

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
                <Card className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <SectionTitle eyebrow={t('admin.chart_eyebrow')} title={t('admin.chart_title')} />
                        <div className="flex items-center gap-4">
                            <div className="flex rounded-full bg-ink/5 p-1 text-xs font-medium" role="tablist">
                                {['orders', 'revenue'].map((m) => (
                                    <button key={m} type="button" role="tab" aria-selected={metric === m} onClick={() => setMetric(m)} className={metric === m ? 'rounded-full bg-elev px-3 py-1.5 shadow-soft' : 'px-3 py-1.5 text-ink-soft'}>
                                        {t(`admin.${m}`, {}, m)}
                                    </button>
                                ))}
                            </div>
                            <div className="text-end">
                                <p className="text-xs text-ink-faint">{t('admin.revenue_total')}</p>
                                <p className="font-display text-2xl">{money(stats.revenue)}</p>
                            </div>
                        </div>
                    </div>
                    <TrendChart
                        data={daily}
                        x="date"
                        formatX={(d) => date(d, { day: 'numeric', month: 'short' })}
                        formatValue={(v, key) => (key === 'revenue' ? money(v) : v)}
                        series={[metric === 'orders' ? { key: 'orders', name: t('admin.orders'), color: 'var(--brand)' } : { key: 'revenue', name: t('admin.revenue', {}, 'Revenue'), color: 'var(--accent)' }]}
                    />
                </Card>
                <Card className="p-6">
                    <SectionTitle eyebrow={t('admin.status_eyebrow')} title={t('admin.status_title')} />
                    <StatusDonut counts={byStatus} height={180} />
                </Card>
            </div>

            <LeaderBoards marketRevenue={marketRevenue} topProducts={topProducts} pickupsWeek={pickupsWeek} />

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <Card className="p-6">
                    <SectionTitle eyebrow={t('admin.approvals_eyebrow')} title={t('admin.approvals_title')} action={<Link href={pathUrl('admin.farmers.index', { status: 'pending' })} className="text-sm font-medium text-brand">{t('common.view_all')}</Link>} />
                    {pendingFarmers.length === 0 ? (
                        <p className="flex items-center gap-2 text-sm text-success">
                            <ShieldCheck className="size-4" /> {t('admin.no_pending')}
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {pendingFarmers.map((f) => (
                                <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-sun/15 p-3">
                                    <Link href={route('admin.farmers.show', f.slug)} className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">{f.stall_name}</p>
                                        <p className="text-xs text-ink-soft">
                                            {f.user.name} · {relative(f.user.created_at)}
                                        </p>
                                    </Link>
                                    <Button size="sm" onClick={() => router.patch(route('admin.farmers.status', f.slug), { status: 'approved' }, { preserveScroll: true })}>
                                        <Check className="size-4" /> {t('admin.approve')}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {stats.unread_messages > 0 && (
                        <Link href={route('admin.messages.index')} className="mt-4 flex items-center gap-2 rounded-2xl bg-ink/[0.03] p-3 text-sm">
                            <Mail className="size-4" /> {t('admin.unread_messages', { count: stats.unread_messages })}
                        </Link>
                    )}
                </Card>
                <Card className="p-6">
                    <SectionTitle eyebrow={t('admin.top_eyebrow')} title={t('admin.top_title')} action={<Link href={route('admin.reports.index')} className="text-sm font-medium text-brand">{t('dash.reports')}</Link>} />
                    <ol className="space-y-3">
                        {topFarmers.map((f, i) => (
                            <li key={f.id} className="flex items-center gap-3">
                                <span className="font-display w-6 text-xl text-ink-faint">{i + 1}</span>
                                <Link href={route('admin.farmers.show', f.slug)} className="flex-1 truncate text-sm font-medium hover:underline">
                                    {f.stall_name}
                                </Link>
                                <span className="text-xs text-ink-soft">{t('admin.orders_n', { count: f.orders_count })}</span>
                                <span className="w-24 text-end text-sm font-semibold tabular-nums">{money(f.revenue ?? 0)}</span>
                            </li>
                        ))}
                    </ol>
                </Card>
                <Card className="p-6">
                    <SectionTitle eyebrow={t('admin.recent_eyebrow')} title={t('admin.recent_title')} action={<Link href={route('admin.orders.index')} className="text-sm font-medium text-brand">{t('common.view_all')}</Link>} />
                    <ul className="space-y-3">
                        {recentOrders.map((o) => (
                            <li key={o.id} className="flex items-center gap-3 text-sm">
                                <span className="font-mono text-xs">{o.code}</span>
                                <span className="min-w-0 flex-1 truncate text-ink-soft">
                                    {o.customer.name} → {o.farmer.stall_name}
                                </span>
                                <StatusBadge status={o.status} />
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <Card className="mt-6 p-6">
                <SectionTitle eyebrow={t('admin.security_eyebrow')} title={t('admin.security_title')} />
                <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr_1.2fr]">
                    <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
                        {[
                            ['admin.sec_failed', security.failed, security.failed > 20 ? 'text-danger' : 'text-ink'],
                            ['admin.sec_success', security.succeeded, 'text-success'],
                            ['admin.sec_unverified', security.unverified, 'text-warning'],
                        ].map(([label, value, tone]) => (
                            <div key={label} className="rounded-2xl bg-ink/[0.03] p-4">
                                <p className={`font-display text-3xl tabular-nums ${tone}`}>
                                    <CountUp value={value} />
                                </p>
                                <p className="mt-1 text-xs text-ink-soft">{t(label)}</p>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h3 className="font-mono text-[11px] tracking-[0.2em] text-ink-faint uppercase">{t('admin.sec_suspicious')}</h3>
                        {security.suspicious.length === 0 ? (
                            <p className="mt-3 flex items-center gap-2 text-sm text-success">
                                <ShieldCheck className="size-4" /> {t('admin.sec_calm')}
                            </p>
                        ) : (
                            <ul className="mt-3 space-y-2">
                                {security.suspicious.map((s) => (
                                    <li key={s.ip_address} className="flex items-center gap-3 rounded-2xl bg-danger/10 p-3 text-sm">
                                        <ShieldAlert className="size-4 shrink-0 text-danger" />
                                        <span className="flex-1 font-mono" dir="ltr">
                                            {s.ip_address}
                                        </span>
                                        <span className="text-xs text-ink-soft">{t('admin.sec_attempts', { count: s.attempts, accounts: s.accounts })}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <h3 className="font-mono text-[11px] tracking-[0.2em] text-ink-faint uppercase">{t('admin.sec_feed')}</h3>
                        <ul className="mt-3 space-y-2.5">
                            {security.recent.map((e) => (
                                <li key={e.id} className="flex items-center gap-3 text-sm">
                                    <span className={e.successful ? 'size-2 shrink-0 rounded-full bg-success' : 'size-2 shrink-0 rounded-full bg-danger'} />
                                    <span className="min-w-0 flex-1 truncate">{e.user?.name ?? e.login}</span>
                                    <span className="text-xs text-ink-faint" dir="ltr">
                                        {e.ip_address} · {relative(e.created_at)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Card>
            <HealthPanels catalogue={catalogue} system={system} />
        </>
    );
}
