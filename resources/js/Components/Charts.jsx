import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFormat, useT } from '@/lib/i18n';

function ChartTooltip({ active, payload, label, formatLabel, formatValue }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-2xl border border-line bg-elev px-3 py-2 text-xs shadow-soft">
            <p className="mb-1 font-medium">{formatLabel ? formatLabel(label) : label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} className="flex items-center gap-2 text-ink-soft">
                    <span className="size-2 rounded-full" style={{ background: p.color }} />
                    {p.name}: <span className="font-semibold text-ink">{formatValue ? formatValue(p.value, p.dataKey) : p.value}</span>
                </p>
            ))}
        </div>
    );
}

export function TrendChart({ data, x, series, height = 260, formatX, formatValue }) {
    return (
        <ResponsiveContainer width="100%" height={height} className="animate-chart-in">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <defs>
                    {series.map((s) => (
                        <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey={x} tickLine={false} axisLine={false} tickFormatter={formatX} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : v)} />
                <Tooltip content={<ChartTooltip formatLabel={formatX} formatValue={formatValue} />} cursor={{ stroke: 'var(--line-strong)' }} />
                {series.map((s) => (
                    <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} fill={`url(#g-${s.key})`} yAxisId={0} isAnimationActive={false} />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}

export function Bars({ data, x, y, color = 'var(--brand)', height = 240, formatValue, layout = 'vertical' }) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout={layout} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={layout !== 'vertical'} vertical={layout === 'vertical'} strokeDasharray="3 3" />
                {layout === 'vertical' ? (
                    <>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey={x} width={130} tickLine={false} axisLine={false} />
                    </>
                ) : (
                    <>
                        <XAxis dataKey={x} tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} width={40} />
                    </>
                )}
                <Tooltip content={<ChartTooltip formatValue={formatValue} />} cursor={{ fill: 'var(--line)' }} />
                <Bar dataKey={y} name={y} radius={layout === 'vertical' ? [0, 10, 10, 0] : [10, 10, 0, 0]} animationDuration={1000}>
                    {data.map((d, i) => (
                        <Cell key={i} fill={d.color ?? color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

const STATUS_COLORS = {
    placed: '#F2B33D',
    accepted: '#3E8E63',
    ready: '#C9E265',
    completed: '#2F7D4F',
    declined: '#C73A2B',
    cancelled: '#9AA39B',
};

export function StatusDonut({ counts, height = 220 }) {
    const t = useT();
    const { number } = useFormat();
    const data = Object.entries(counts ?? {}).map(([status, value]) => ({ status, value: Number(value), name: t(`status.${status}`) }));
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative" style={{ width: height, height }}>
                <PieChart width={height} height={height}>
                        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={height * 0.31} outerRadius={height / 2 - 2} paddingAngle={2} stroke="none" animationDuration={1000}>
                            {data.map((d) => (
                                <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                </PieChart>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-3xl">{number(total)}</span>
                    <span className="text-xs text-ink-faint">{t('common.total')}</span>
                </div>
            </div>
            <ul className="grid flex-1 grid-cols-2 gap-2 text-sm sm:grid-cols-1">
                {data.map((d) => (
                    <li key={d.status} className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[d.status] }} />
                        <span className="flex-1 text-ink-soft">{d.name}</span>
                        <span className="font-medium tabular-nums">{d.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
