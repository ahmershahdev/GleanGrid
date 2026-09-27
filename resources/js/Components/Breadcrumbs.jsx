import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { House, LayoutDashboard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1];

function Roll({ children }) {
    return (
        <span className="relative block overflow-hidden">
            <span className="block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full">{children}</span>
            <span className="absolute inset-0 block translate-y-full text-ink transition-transform duration-500 ease-out-expo group-hover:translate-y-0" aria-hidden="true">
                {children}
            </span>
        </span>
    );
}

function Separator() {
    return <span className="mx-0.5 h-3.5 w-px shrink-0 rotate-[20deg] bg-line-strong rtl:-rotate-[20deg]" aria-hidden="true" />;
}

export default function Breadcrumbs({ className }) {
    const t = useT();
    const items = usePage().props.seo?.breadcrumbs ?? [];
    const [expanded, setExpanded] = useState(false);
    const trailKey = items.map((i) => i.url).join('|');
    useEffect(() => setExpanded(false), [trailKey]);

    if (items.length < 2) return null;

    const RootIcon = items[0].key === 'nav.dashboard' ? LayoutDashboard : House;
    const foldable = items.length > 3;

    return (
        <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
            <ol className="no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-elev/60 p-1 text-[13px] whitespace-nowrap text-ink-faint shadow-[0_1px_0_rgb(0_0_0/0.02)] backdrop-blur-md">
                <AnimatePresence initial={false} mode="popLayout">
                    {items.map((item, i) => {
                        const last = i === items.length - 1;
                        const hiddenOnPhone = foldable && !expanded && i > 1 && i < items.length - 2;
                        const label = item.key ? t(item.key, {}, item.label) : item.label;

                        return (
                            <motion.li
                                key={item.url + i}
                                layout
                                initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
                                className={cn('flex min-w-0 items-center gap-1', hiddenOnPhone && 'hidden sm:flex')}
                            >
                                {i > 0 && <Separator />}
                                {foldable && !expanded && i === 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setExpanded(true)}
                                        className="inline-flex h-7 items-center rounded-full px-2 font-mono tracking-widest text-ink-soft transition hover:bg-ink/5 hover:text-ink sm:hidden"
                                        aria-label={t('ui.show_full_path', {}, 'Show full path')}
                                    >
                                        …
                                    </button>
                                )}
                                {last ? (
                                    <span aria-current="page" className="inline-flex h-7 max-w-[14rem] items-center gap-2 rounded-full bg-ink px-3 font-medium text-bg sm:max-w-[20rem]">
                                        <span className="relative flex size-1.5 shrink-0" aria-hidden="true">
                                            <span className="absolute inset-0 animate-ping rounded-full bg-lime opacity-75" />
                                            <span className="relative size-1.5 rounded-full bg-lime" />
                                        </span>
                                        <span className="truncate">{label}</span>
                                    </span>
                                ) : (
                                    <Link
                                        href={item.url}
                                        className={cn('group inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-ink/[0.06]', foldable && !expanded && i === 1 && 'max-sm:hidden')}
                                    >
                                        {i === 0 && <RootIcon className="size-3.5 shrink-0 transition-transform duration-500 ease-out-expo group-hover:-translate-y-px group-hover:scale-110" aria-hidden="true" />}
                                        <span className={cn(i === 0 && 'sr-only sm:not-sr-only')}>
                                            <Roll>{label}</Roll>
                                        </span>
                                    </Link>
                                )}
                            </motion.li>
                        );
                    })}
                </AnimatePresence>
            </ol>
        </nav>
    );
}
