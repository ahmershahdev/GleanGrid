import { Link, usePage } from '@inertiajs/react';
import { motion } from 'motion/react';
import { ChevronRight, House, LayoutDashboard } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Trail defined server-side (App\Support\Breadcrumbs) and shared via the `seo`
 * prop, so the visible trail and the BreadcrumbList JSON-LD never disagree.
 */
export default function Breadcrumbs({ className }) {
    const t = useT();
    const items = usePage().props.seo?.breadcrumbs ?? [];
    if (items.length < 2) return null;

    const RootIcon = items[0].key === 'nav.dashboard' ? LayoutDashboard : House;

    return (
        <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
            <ol className="no-scrollbar flex items-center gap-1 overflow-x-auto text-sm whitespace-nowrap text-ink-faint">
                {items.map((item, i) => {
                    const last = i === items.length - 1;
                    const label = item.key ? t(item.key, {}, item.label) : item.label;
                    return (
                        <motion.li key={item.url + i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex min-w-0 items-center gap-1">
                            {i > 0 && <ChevronRight className="rtl-flip size-3.5 shrink-0 opacity-50" aria-hidden="true" />}
                            {last ? (
                                <span aria-current="page" className="max-w-[16rem] truncate font-medium text-ink">
                                    {label}
                                </span>
                            ) : (
                                <Link href={item.url} className="group inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 transition hover:bg-ink/5 hover:text-ink">
                                    {i === 0 && <RootIcon className="size-3.5" aria-hidden="true" />}
                                    <span className={cn(i === 0 && 'sr-only sm:not-sr-only')}>{label}</span>
                                </Link>
                            )}
                        </motion.li>
                    );
                })}
            </ol>
        </nav>
    );
}
