import { motion } from 'motion/react';
import { Award, Heart, Sparkles, Timer } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const BADGE_ORDER = ['top_rated', 'reliable', 'customer_favourite', 'rising_star'];

export const BADGE_STYLE = {
    top_rated: { icon: Award, className: 'gg-medal text-[#4a3100] ring-[#e8b93c]/70', bg: 'linear-gradient(120deg,#f7d774,#e8a91e 45%,#fbe7a1 55%,#e0a21b)' },
    reliable: { icon: Timer, className: 'text-brand-ink ring-brand/40', bg: 'var(--brand)' },
    customer_favourite: { icon: Heart, className: 'text-white ring-accent/50', bg: 'linear-gradient(120deg,#e2552c,#ff8a5c)' },
    rising_star: { icon: Sparkles, className: 'text-forest ring-lime/70', bg: 'linear-gradient(120deg,#c9e265,#e6f3a8)' },
};

export const badgeKeys = (farmer) =>
    [...new Set((farmer?.active_badges ?? farmer?.badges ?? []).map((b) => (typeof b === 'string' ? b : b.badge)))].sort((a, b) => BADGE_ORDER.indexOf(a) - BADGE_ORDER.indexOf(b));

export function BadgePill({ badge, compact = false, className, delay = 0 }) {
    const t = useT();
    const style = BADGE_STYLE[badge];
    if (!style) return null;
    const Icon = style.icon;
    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay }}
            title={t(`badges.${badge}_desc`)}
            aria-label={`${t(`badges.${badge}`)} — ${t(`badges.${badge}_desc`)}`}
            className={cn('relative inline-flex shrink-0 items-center gap-1 overflow-hidden rounded-full font-semibold ring-1 ring-inset', compact ? 'h-6 px-2 text-[10px]' : 'h-7 px-2.5 text-xs', style.className, className)}
            style={{ background: style.bg }}
        >
            <Icon className={compact ? 'size-3' : 'size-3.5'} strokeWidth={2.5} />
            {!compact && <span className="relative">{t(`badges.${badge}`)}</span>}
        </motion.span>
    );
}

export function StallBadges({ farmer, badges, compact = false, limit, className }) {
    const keys = (badges ?? badgeKeys(farmer)).slice(0, limit ?? 4);
    if (!keys.length) return null;
    return (
        <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
            {keys.map((b, i) => (
                <BadgePill key={b} badge={b} compact={compact} delay={i * 0.06} />
            ))}
        </span>
    );
}
