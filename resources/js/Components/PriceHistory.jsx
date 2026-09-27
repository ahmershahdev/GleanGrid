import { motion } from 'motion/react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const RANGES = [
    ['range_1m', 31],
    ['range_3m', 92],
    ['range_6m', 183],
];

function fillDaily(points, days) {
    if (!points.length) return [];
    const byDate = new Map(points.map((p) => [p.date, p.price]));
    const end = new Date(`${points[points.length - 1].date}T00:00:00`);
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    let last = [...points].reverse().find((p) => new Date(`${p.date}T00:00:00`) <= start)?.price ?? points[0].price;
    const out = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        if (byDate.has(key)) last = byDate.get(key);
        out.push({ date: key, price: last });
    }
    return out;
}

function Tip({ active, payload, label, money, date, unit }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-2xl border border-line bg-elev px-3 py-2 text-xs shadow-soft">
            <p className="text-ink-faint">{date(label, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            <p className="font-display text-lg tabular-nums">
                {money(payload[0].value)} <span className="text-xs text-ink-faint">/ {unit}</span>
            </p>
        </div>
    );
}

export default function PriceHistory({ history, unit, current }) {
    const t = useT();
    const { money, date } = useFormat();
    const [range, setRange] = useState(92);
    const data = useMemo(() => fillDaily(history.points, range), [history.points, range]);
    const prices = data.map((d) => d.price);
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const lowPoint = data.find((d) => d.price === low);
    const highPoint = [...data].reverse().find((d) => d.price === high);
    const pad = Math.max(5, (high - low) * 0.25);
    const change = history.change_30;
    const trend = change < -1 ? 'down' : change > 1 ? 'up' : 'flat';
    const TrendIcon = { down: TrendingDown, up: TrendingUp, flat: Minus }[trend];
    const verdict = current < history.avg_30 * 0.97 ? 'below_avg' : current > history.avg_30 * 1.03 ? 'above_avg' : 'steady';

    if (history.points.length < 2) return null;

    return (
        <div className="rounded-[32px] border border-line bg-elev p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="font-display text-3xl font-light md:text-4xl">{t('prices.title')}</h2>
                    <p className="mt-1 text-sm text-ink-soft">{t('prices.sub')}</p>
                </div>
                <div role="radiogroup" aria-label={t('prices.title')} className="flex rounded-full bg-ink/5 p-1 text-xs font-semibold">
                    {RANGES.map(([key, days]) => (
                        <button key={key} type="button" role="radio" aria-checked={range === days} onClick={() => setRange(days)} className={cn('relative h-8 rounded-full px-3.5 transition', range === days ? 'text-bg' : 'text-ink-soft hover:text-ink')}>
                            {range === days && <motion.span layoutId="price-range" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                            <span className="relative">{t(`prices.${key}`)}</span>
                        </button>
                    ))}
                </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    ['prices.low', money(low), 'text-success'],
                    ['prices.high', money(high), 'text-accent'],
                    ['prices.avg30', money(history.avg_30), ''],
                ].map(([k, v, c]) => (
                    <div key={k} className="rounded-2xl bg-ink/[0.03] p-3">
                        <dt className="text-xs text-ink-faint">{t(k)}</dt>
                        <dd className={cn('font-display mt-0.5 text-xl tabular-nums', c)}>{v}</dd>
                    </div>
                ))}
                <div className={cn('rounded-2xl p-3', trend === 'down' ? 'bg-success/10 text-success' : trend === 'up' ? 'bg-accent/10 text-accent' : 'bg-ink/[0.03]')}>
                    <dt className="text-xs opacity-80">{t('prices.change')}</dt>
                    <dd className="font-display mt-0.5 flex items-center gap-1 text-xl tabular-nums">
                        <TrendIcon className="size-4" /> {change > 0 ? '+' : ''}
                        {change}%
                    </dd>
                </div>
            </dl>

            <div className="mt-6 h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
                        <defs>
                            <linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--line)" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={40} tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickFormatter={(d) => date(d, { day: 'numeric', month: 'short' })} />
                        <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} domain={[Math.max(0, Math.floor(low - pad)), Math.ceil(high + pad)]} tickFormatter={(v) => Math.round(v)} />
                        <Tooltip content={<Tip money={money} date={date} unit={t(`units.${unit}`)} />} cursor={{ stroke: 'var(--line-strong)' }} />
                        <ReferenceLine y={history.avg_30} stroke="var(--ink-faint)" strokeDasharray="5 5" label={{ value: t('prices.avg30'), position: 'insideTopRight', fill: 'var(--ink-faint)', fontSize: 11 }} />
                        <Area type="stepAfter" dataKey="price" name={t('prices.price')} stroke="var(--brand)" strokeWidth={2.5} fill="url(#price-fill)" animationDuration={1200} />
                        {lowPoint && <ReferenceDot x={lowPoint.date} y={low} r={5} fill="var(--success)" stroke="var(--bg-elev)" strokeWidth={2} />}
                        {highPoint && <ReferenceDot x={highPoint.date} y={high} r={5} fill="var(--accent)" stroke="var(--bg-elev)" strokeWidth={2} />}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <p className={cn('mt-4 text-sm', verdict === 'below_avg' ? 'text-success' : 'text-ink-soft')}>{t(`prices.${verdict}`)}</p>
        </div>
    );
}
