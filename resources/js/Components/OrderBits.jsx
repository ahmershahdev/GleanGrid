import { Link } from '@inertiajs/react';
import { motion } from 'motion/react';
import { Check, CircleX, Clock, MapPin } from 'lucide-react';
import { StatusBadge } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const FLOW = ['placed', 'accepted', 'ready', 'completed'];

export function OrderTimeline({ order }) {
    const t = useT();
    const { date, time } = useFormat();
    const stamps = { placed: order.created_at, accepted: order.accepted_at, ready: order.ready_at, completed: order.completed_at };
    const terminal = ['declined', 'cancelled', 'no_show'].includes(order.status);
    const reached = terminal ? FLOW.filter((s) => stamps[s]) : FLOW.slice(0, FLOW.indexOf(order.status) + 1);

    return (
        <ol className="relative grid grid-cols-4 gap-2">
            {FLOW.map((step, i) => {
                const done = reached.includes(step);
                return (
                    <li key={step} className="relative">
                        {i > 0 && (
                            <div className="absolute start-[-50%] end-[50%] top-4 h-0.5 bg-line">
                                <motion.div className="h-full origin-left bg-brand rtl:origin-right" initial={{ scaleX: 0 }} animate={{ scaleX: done ? 1 : 0 }} transition={{ delay: i * 0.15, duration: 0.5 }} />
                            </div>
                        )}
                        <div className="relative flex flex-col items-center text-center">
                            <motion.span
                                initial={{ scale: 0.6 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.15 }}
                                className={cn('flex size-8 items-center justify-center rounded-full border-2', done ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong bg-elev text-ink-faint')}
                            >
                                {done ? <Check className="size-4" /> : <span className="text-xs">{i + 1}</span>}
                            </motion.span>
                            <p className={cn('mt-2 text-xs font-medium sm:text-sm', !done && 'text-ink-faint')}>{t(`status.${step}`)}</p>
                            {stamps[step] && <p className="text-[11px] text-ink-faint">{date(stamps[step], { day: 'numeric', month: 'short' })}</p>}
                        </div>
                    </li>
                );
            })}
            {terminal && (
                <li className="col-span-4 mt-4 flex items-center gap-2 rounded-2xl bg-danger/10 p-3 text-sm text-danger">
                    <CircleX className="size-4" /> {t(`order.${order.status}_note`)} {order.farmer_note && `— “${order.farmer_note}”`}
                </li>
            )}
        </ol>
    );
}

export function OrderRow({ order, href, who }) {
    const t = useT();
    const { money, date, time } = useFormat();
    return (
        <Link href={href} className="group flex flex-wrap items-center gap-x-6 gap-y-2 rounded-3xl border border-line bg-elev p-4 transition hover:border-line-strong md:p-5">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{order.code}</span>
                    <StatusBadge status={order.status} />
                    {order.payment_method && order.payment_method !== 'cash' && <StatusBadge status={order.payment_status === 'paid' ? 'paid' : order.payment_status} />}
                    {order.editable && <span className="text-xs text-brand">{t('order.editable')}</span>}
                </div>
                <p className="font-display mt-1 truncate text-lg group-hover:underline">{who}</p>
            </div>
            <div className="text-sm text-ink-soft">
                <p className="flex items-center gap-1.5">
                    <Clock className="size-3.5" /> {date(order.pickup_date, { weekday: 'short', day: 'numeric', month: 'short' })} · {time(order.pickup_starts_at)}
                </p>
                {order.market && (
                    <p className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" /> {order.market.name}
                    </p>
                )}
            </div>
            <div className="text-end">
                <p className="font-display text-xl tabular-nums">{money(order.total_amount)}</p>
                <p className="text-xs text-ink-faint">{t('cart.items', { count: order.items_count })}</p>
            </div>
        </Link>
    );
}

export function StatusHistory({ history = [] }) {
    const t = useT();
    const { date } = useFormat();
    if (!history.length) return null;
    return (
        <ol className="relative space-y-4 border-s border-line ps-5">
            {history.map((h, i) => (
                <li key={i} className="relative">
                    <span className="absolute -start-[1.6rem] top-1 size-2.5 rounded-full border-2 border-bg bg-brand" aria-hidden="true" />
                    <p className="text-sm font-medium">
                        {h.from ? `${t(`status.${h.from}`)} → ` : ''}
                        {t(`status.${h.to}`)}
                    </p>
                    <p className="text-xs text-ink-faint">
                        {date(h.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </li>
            ))}
        </ol>
    );
}
