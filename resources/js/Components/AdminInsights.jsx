import { Link } from '@inertiajs/react';
import { motion } from 'motion/react';
import { AlarmClock, ArrowDownRight, ArrowUpRight, CheckCircle2, CircleAlert, CircleDashed, Minus, PackageCheck, PackageX, ShieldCheck, Tag, TriangleAlert } from 'lucide-react';
import { CountUp } from '@/Components/motion';
import { Card, SectionTitle } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function Delta({ change, goodWhenDown = false }) {
    const t = useT();
    if (change === null || change === undefined) {
        return <span className="text-[11px] text-ink-faint">{t('admin.no_baseline', {}, 'no earlier data')}</span>;
    }
    const flat = Math.abs(change) < 0.5;
    const up = change > 0;
    const good = flat ? null : up !== goodWhenDown;
    const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
    return (
        <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums', good === null ? 'bg-ink/5 text-ink-soft' : good ? 'bg-success/15 text-success' : 'bg-danger/10 text-danger')}>
            <Icon className="size-3" />
            {Math.abs(change).toFixed(1)}%
        </span>
    );
}

export function KpiStrip({ kpis }) {
    const t = useT();
    const { money } = useFormat();
    const tiles = [
        ['orders', t('admin.kpi_orders', {}, 'Orders'), (v) => <CountUp value={v} />],
        ['revenue', t('admin.kpi_revenue', {}, 'Completed revenue'), (v) => money(v)],
        ['aov', t('admin.kpi_aov', {}, 'Avg. order value'), (v) => money(v)],
        ['completion', t('admin.kpi_completion', {}, 'Completion rate'), (v) => `${v}%`],
        ['lost', t('admin.kpi_lost', {}, 'Cancelled or declined'), (v) => `${v}%`, true],
        ['customers', t('admin.kpi_customers', {}, 'New customers'), (v) => <CountUp value={v} />],
    ];

    return (
        <div className="mt-6">
            <p className="mb-3 font-mono text-[10px] tracking-[0.2em] text-ink-faint uppercase">{t('admin.kpi_eyebrow', {}, 'Last 30 days vs the 30 before')}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {tiles.map(([key, label, format, inverted], i) => (
                    <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="rounded-3xl border border-line bg-elev p-4">
                        <p className="truncate text-xs text-ink-soft">{label}</p>
                        <p className="font-display mt-2 truncate text-2xl tabular-nums">{format(kpis[key].value)}</p>
                        <div className="mt-2">
                            <Delta change={kpis[key].change} goodWhenDown={inverted} />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export function TodayStrip({ today }) {
    const t = useT();
    const items = [
        { key: 'placed', icon: CircleDashed, label: t('admin.today_placed', {}, 'Placed today'), href: route('admin.orders.index') },
        { key: 'awaiting_accept', icon: AlarmClock, label: t('admin.today_waiting', {}, 'Awaiting a farmer'), href: route('admin.orders.index', { status: 'placed' }), warn: today.awaiting_accept > 10 },
        { key: 'ready', icon: PackageCheck, label: t('admin.today_ready', {}, 'Packed & ready'), href: route('admin.orders.index', { status: 'ready' }) },
        { key: 'pickups', icon: CheckCircle2, label: t('admin.today_pickups', {}, 'Pickups today'), href: route('admin.orders.index') },
        { key: 'overdue', icon: TriangleAlert, label: t('admin.today_overdue', {}, 'Past pickup, still open'), href: route('admin.orders.index'), danger: today.overdue > 0 },
    ];
    return (
        <Card className="mt-6 overflow-hidden p-0">
            <div className="grid divide-y divide-line sm:grid-cols-5 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
                {items.map((it) => (
                    <Link key={it.key} href={it.href} className="group flex items-center gap-3 p-4 transition hover:bg-ink/[0.03]">
                        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', it.danger ? 'bg-danger/10 text-danger' : it.warn ? 'bg-sun/25 text-warning' : 'bg-ink/5 text-ink-soft')}>
                            <it.icon className="size-[18px]" />
                        </span>
                        <span className="min-w-0">
                            <span className={cn('font-display block text-2xl leading-none tabular-nums', it.danger && 'text-danger')}>
                                <CountUp value={today[it.key]} />
                            </span>
                            <span className="mt-1 block truncate text-xs text-ink-soft group-hover:text-ink">{it.label}</span>
                        </span>
                    </Link>
                ))}
            </div>
        </Card>
    );
}

function Meters({ rows, value, label, sub, format }) {
    const max = Math.max(1, ...rows.map(value));
    return (
        <ol className="space-y-3.5">
            {rows.map((r, i) => (
                <li key={label(r)}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate">
                            <span className="font-display me-2 text-ink-faint">{i + 1}</span>
                            {label(r)}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">{format(value(r))}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/5">
                        <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} whileInView={{ width: `${(value(r) / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                    {sub && <p className="mt-1 text-[11px] text-ink-faint">{sub(r)}</p>}
                </li>
            ))}
        </ol>
    );
}

export function LeaderBoards({ marketRevenue, topProducts, pickupsWeek }) {
    const t = useT();
    const { money, day } = useFormat();
    const maxPickups = Math.max(1, ...pickupsWeek.map((d) => d.pickups));

    return (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="p-6">
                <SectionTitle eyebrow={t('admin.week_eyebrow', {}, 'Next 7 days')} title={t('admin.week_title', {}, 'Pickups booked')} />
                <div className="flex h-44 items-end gap-2">
                    {pickupsWeek.map((d, i) => (
                        <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                            <span className="text-xs font-semibold tabular-nums">{d.pickups}</span>
                            <motion.div
                                className={cn('w-full rounded-t-xl', i === 0 ? 'bg-accent' : 'bg-brand/80')}
                                initial={{ height: 4 }}
                                whileInView={{ height: `${Math.max(4, (d.pickups / maxPickups) * 100)}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                            />
                            <span className={cn('text-[11px]', i === 0 ? 'font-semibold text-ink' : 'text-ink-faint')}>{i === 0 ? t('admin.today', {}, 'Today') : day(new Date(`${d.date}T00:00:00`).getDay(), 'short')}</span>
                        </div>
                    ))}
                </div>
            </Card>
            <Card className="p-6">
                <SectionTitle eyebrow={t('admin.markets_eyebrow', {}, '30 days · completed')} title={t('admin.markets_title', {}, 'Revenue by market')} action={<Link href={route('admin.markets.index')} className="text-sm font-medium text-brand">{t('common.view_all')}</Link>} />
                <Meters rows={marketRevenue} value={(r) => r.revenue} label={(r) => r.name} sub={(r) => t('admin.orders_n', { count: r.orders })} format={money} />
            </Card>
            <Card className="p-6">
                <SectionTitle eyebrow={t('admin.products_eyebrow', {}, '30 days · by quantity')} title={t('admin.products_title', {}, 'Best-selling produce')} />
                <Meters rows={topProducts} value={(r) => r.qty} label={(r) => r.name} sub={(r) => money(r.revenue)} format={(v) => v} />
            </Card>
        </div>
    );
}

export function HealthPanels({ catalogue, system }) {
    const t = useT();
    const cells = [
        { label: t('admin.cat_products', {}, 'Live listings'), value: catalogue.products, icon: PackageCheck },
        { label: t('admin.cat_soldout', {}, 'Sold out'), value: catalogue.sold_out, icon: PackageX, tone: catalogue.sold_out ? 'warn' : null, href: route('admin.moderation.products') },
        { label: t('admin.cat_low', {}, 'Low stock (≤ 5)'), value: catalogue.low_stock, icon: CircleAlert, tone: catalogue.low_stock ? 'warn' : null },
        { label: t('admin.cat_removed', {}, 'Removed listings'), value: catalogue.removed, icon: PackageX, href: route('admin.moderation.products', { removed: 1 }) },
        { label: t('admin.cat_low_reviews', {}, '1–2★ reviews to check'), value: catalogue.low_reviews, icon: TriangleAlert, tone: catalogue.low_reviews ? 'warn' : null, href: route('admin.moderation.reviews', { max_rating: 2 }) },
        { label: t('admin.cat_hidden', {}, 'Hidden reviews'), value: catalogue.hidden_reviews, icon: ShieldCheck, href: route('admin.moderation.reviews', { hidden: 1 }) },
        { label: t('admin.cat_categories', {}, 'Active categories'), value: catalogue.categories, icon: Tag, href: route('admin.categories.index') },
        { label: t('admin.cat_coupons', {}, 'Live coupons'), value: catalogue.coupons, icon: Tag, href: route('admin.coupons.index') },
    ];
    const checks = [
        [t('admin.sys_env', {}, 'Environment'), system.env, system.env === 'production'],
        [t('admin.sys_debug', {}, 'Debug mode'), system.debug ? 'on' : 'off', !system.debug],
        [t('admin.sys_queue', {}, 'Queue'), system.queue, system.queue !== 'sync'],
        [t('admin.sys_mail', {}, 'Mail'), system.mail, system.mail !== 'log'],
        [t('admin.sys_captcha', {}, 'reCAPTCHA'), system.captcha ? 'on' : 'off', system.captcha],
        [t('admin.sys_storage', {}, 'Public storage link'), system.storage_link ? 'linked' : 'missing', system.storage_link],
        [t('admin.sys_images', {}, 'Image pipeline'), system.image_engine, system.image_engine.startsWith('GD')],
        ['PHP / Laravel', `${system.php} / ${system.laravel}`, true],
    ];

    return (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Card className="p-6">
                <SectionTitle eyebrow={t('admin.cat_eyebrow', {}, 'Catalogue & moderation')} title={t('admin.cat_title', {}, 'Health check')} />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {cells.map((c) => {
                        const Wrapper = c.href ? Link : 'div';
                        return (
                            <Wrapper key={c.label} {...(c.href ? { href: c.href } : {})} className={cn('rounded-2xl p-4 transition', c.tone === 'warn' ? 'bg-sun/15' : 'bg-ink/[0.03]', c.href && 'hover:bg-ink/[0.06]')}>
                                <c.icon className={cn('size-4', c.tone === 'warn' ? 'text-warning' : 'text-ink-faint')} />
                                <p className="font-display mt-2 text-2xl tabular-nums">
                                    <CountUp value={c.value} />
                                </p>
                                <p className="mt-0.5 text-xs text-ink-soft">{c.label}</p>
                            </Wrapper>
                        );
                    })}
                </div>
            </Card>
            <Card className="p-6">
                <SectionTitle eyebrow={t('admin.sys_eyebrow', {}, 'Platform')} title={t('admin.sys_title', {}, 'System status')} />
                <ul className="divide-y divide-line text-sm">
                    {checks.map(([label, value, ok]) => (
                        <li key={label} className="flex items-center justify-between gap-3 py-2.5">
                            <span className="text-ink-soft">{label}</span>
                            <span className="flex items-center gap-2 font-mono text-xs">
                                {value}
                                <span className={cn('size-2 rounded-full', ok ? 'bg-success' : 'bg-sun')} title={ok ? 'OK' : 'Review'} />
                            </span>
                        </li>
                    ))}
                </ul>
                {system.queue === 'sync' && <p className="mt-3 rounded-2xl bg-sun/15 p-3 text-xs text-ink-soft">{t('admin.sys_queue_hint', {}, 'E-mail is sent inside the request. For production, set QUEUE_CONNECTION=database and run a queue worker.')}</p>}
            </Card>
        </div>
    );
}
