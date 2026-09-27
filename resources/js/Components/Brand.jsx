import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export function LogoMark({ className }) {
    return (
        <span className={cn('inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-paper ring-1 ring-forest/10 dark:ring-paper/10', className)}>
            <img src="/images/brand/gleangrid-mark.webp" alt="" width="160" height="160" decoding="async" fetchPriority="high" className="size-[88%] object-contain" />
        </span>
    );
}

export function LogoFull({ className }) {
    return <img src="/images/brand/gleangrid-logo.webp" alt="GleanGrid" width="520" height="368" decoding="async" loading="lazy" className={cn('h-auto', className ?? 'w-40')} />;
}

export function Logo({ className, compact }) {
    return (
        <Link href={route('home')} className={cn('group inline-flex items-center gap-2.5', className)} aria-label="GleanGrid home">
            <LogoMark className="transition-transform duration-500 ease-out-expo group-hover:rotate-[-8deg] group-hover:scale-105" />
            {!compact && (
                <span className="font-display text-[22px] leading-none font-semibold tracking-tight" dir="ltr">
                    <span className="text-forest dark:text-paper">Glean</span>
                    <span className="italic text-accent">Grid</span>
                </span>
            )}
        </Link>
    );
}
