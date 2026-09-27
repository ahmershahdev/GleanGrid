import { Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Check, CheckCheck, Heart, Languages, Minus, Plus, ShoppingBasket, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cart, useCart } from '@/lib/cart';
import { fly, HEART_SVG } from '@/lib/fly';
import { applyLocale, loadLocale, useFormat, useT } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

let pushToast = () => {};
export const toast = (message, tone = 'success') => pushToast({ message, tone });

export function Toaster() {
    const t = useT();
    const { flash } = usePage().props;
    const [items, setItems] = useState([]);

    useEffect(() => {
        pushToast = ({ message, tone }) => {
            const id = Math.random().toString(36).slice(2);
            setItems((list) => [...list.slice(-2), { id, message, tone }]);
            setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 4200);
        };
    }, []);

    useEffect(() => {
        if (flash?.success) toast(flash.success, 'success');
        if (flash?.error) toast(flash.error, 'error');
    }, [flash]);

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite">
            <AnimatePresence>
                {items.map((item) => (
                    <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={cn(
                            'pointer-events-auto flex max-w-md items-center gap-3 rounded-full py-2.5 ps-3 pe-5 text-sm font-medium shadow-soft',
                            item.tone === 'error' ? 'bg-danger text-white' : 'bg-ink text-bg',
                        )}
                    >
                        <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', item.tone === 'error' ? 'bg-white/20' : 'bg-lime text-forest')}>
                            {item.tone === 'error' ? <X className="size-3.5" /> : <Check className="size-3.5" />}
                        </span>
                        {t(item.message)}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

export function Popover({ trigger, children, align = 'end', className }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
        const esc = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('pointerdown', close);
            document.removeEventListener('keydown', esc);
        };
    }, [open]);

    useEffect(() => router.on('navigate', () => setOpen(false)), []);

    return (
        <div ref={ref} className="relative">
            {trigger({ open, toggle: () => setOpen((o) => !o) })}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className={cn('absolute top-full z-50 mt-2 rounded-2xl border border-line bg-elev p-1.5 shadow-soft', align === 'end' ? 'end-0' : 'start-0', className)}
                    >
                        {children({ close: () => setOpen(false) })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function LanguageSwitcher({ compact }) {
    const { locale, locales } = usePage().props.app;
    const t = useT();

    useEffect(() => applyLocale(locale, locales), [locale, locales]);

    const change = (code) => loadLocale(code).then(() => router.post(route('preferences.locale'), { locale: code }, { preserveScroll: true, preserveState: false }));

    return (
        <Popover
            trigger={({ toggle, open }) => (
                <button onClick={toggle} aria-expanded={open} aria-label={compact ? t('common.language') : `${locale.toUpperCase()} · ${t('common.language')}`} className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-ink-soft transition hover:bg-ink/5 hover:text-ink">
                    <Languages className="size-4" />
                    {!compact && <span className="uppercase">{locale}</span>}
                </button>
            )}
        >
            {({ close }) => (
                <ul className="w-48" role="listbox">
                    {Object.entries(locales).map(([code, l]) => (
                        <li key={code}>
                            <button
                                onPointerEnter={() => loadLocale(code)}
                                onClick={() => {
                                    close();
                                    change(code);
                                }}
                                className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-ink/5', code === locale && 'bg-ink/5 font-semibold')}
                                role="option"
                                aria-selected={code === locale}
                            >
                                <span>{l.native}</span>
                                <span className="font-mono text-[11px] text-ink-faint uppercase">{code}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Popover>
    );
}

export function ThemeToggle() {
    const { isDark, toggle } = useTheme();
    const t = useT();
    const next = isDark ? 'light' : 'dark';
    const spring = { type: 'spring', stiffness: 260, damping: 22 };
    const maskId = `gg-moon-${useId().replace(/[^a-z0-9]/gi, '')}`;

    return (
        <button
            type="button"
            onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }}
            aria-label={t('common.theme_to', { theme: t(`common.theme_${next}`) })}
            aria-pressed={isDark}
            title={t('common.theme_to', { theme: t(`common.theme_${next}`) })}
            className="group relative inline-flex size-10 items-center justify-center overflow-hidden rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
        >
            <motion.svg viewBox="0 0 24 24" className="size-[19px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" animate={{ rotate: isDark ? 40 : 90 }} transition={spring} aria-hidden="true">
                <mask id={maskId}>
                    <rect x="0" y="0" width="24" height="24" fill="white" />
                    <motion.circle r="9" fill="black" initial={false} animate={isDark ? { cx: 17, cy: 5 } : { cx: 30, cy: -6 }} transition={spring} />
                </mask>
                <motion.circle cx="12" cy="12" fill="currentColor" stroke="none" mask={`url(#${maskId})`} initial={false} animate={{ r: isDark ? 9 : 5 }} transition={spring} />
                <motion.g initial={false} animate={{ opacity: isDark ? 0 : 1, scale: isDark ? 0.4 : 1 }} transition={spring} style={{ transformOrigin: '12px 12px' }}>
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                        <line key={deg} x1="12" y1="1.8" x2="12" y2="3.6" transform={`rotate(${deg} 12 12)`} />
                    ))}
                </motion.g>
            </motion.svg>
            <span className="pointer-events-none absolute inset-0 scale-0 rounded-full bg-lime/25 opacity-0 transition duration-500 ease-out-expo group-active:scale-100 group-active:opacity-100" aria-hidden="true" />
        </button>
    );
}

export function notificationText(t, data) {
    return {
        title: t(`notify.${data.key}.title`, data.params ?? {}),
        body: t(`notify.${data.key}.body`, data.params ?? {}),
    };
}

export function NotificationBell() {
    const { notifications } = usePage().props;
    const t = useT();
    const { relative } = useFormat();

    useEffect(() => {
        const id = setInterval(() => document.visibilityState === 'visible' && router.reload({ only: ['notifications'] }), 45000);
        return () => clearInterval(id);
    }, []);

    if (!notifications) return null;

    return (
        <Popover
            trigger={({ toggle, open }) => (
                <button onClick={toggle} aria-expanded={open} aria-label={t('notifications.title')} className="relative inline-flex size-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink">
                    <Bell className="size-[18px]" />
                    {notifications.unread > 0 && (
                        <span className="absolute top-1.5 end-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink tabular-nums">
                            {notifications.unread > 9 ? '9+' : notifications.unread}
                        </span>
                    )}
                </button>
            )}
            className="w-[min(92vw,380px)]"
        >
            {({ close }) => (
                <div>
                    <div className="flex items-center justify-between px-3 py-2">
                        <p className="font-display text-lg">{t('notifications.title')}</p>
                        {notifications.unread > 0 && (
                            <button onClick={() => router.post(route('notifications.read-all'), {}, { preserveScroll: true })} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
                                <CheckCheck className="size-3.5" /> {t('notifications.mark_all')}
                            </button>
                        )}
                    </div>
                    <ul className="max-h-96 overflow-y-auto">
                        {notifications.latest.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-faint">{t('notifications.empty')}</li>}
                        {notifications.latest.map((n) => {
                            const { title, body } = notificationText(t, n.data);
                            return (
                                <li key={n.id}>
                                    <button
                                        onClick={() => {
                                            close();
                                            router.post(route('notifications.read', n.id));
                                        }}
                                        className="flex w-full gap-3 rounded-xl px-3 py-2.5 text-start transition hover:bg-ink/5"
                                    >
                                        <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent')} />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium">{title}</span>
                                            <span className="line-clamp-2 block text-xs text-ink-soft">{body}</span>
                                            <span className="mt-0.5 block text-[11px] text-ink-faint">{relative(n.created_at)}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <Link href={route('notifications.index')} className="mt-1 block rounded-xl px-3 py-2 text-center text-sm font-medium text-brand hover:bg-ink/5">
                        {t('notifications.view_all')}
                    </Link>
                </div>
            )}
        </Popover>
    );
}

export function FavoriteButton({ type, id, className, size = 'size-10' }) {
    const { auth, favorites } = usePage().props;
    const t = useT();
    const active = (favorites?.[type] ?? []).includes(id);
    const [pop, setPop] = useState(0);

    if (auth.user && auth.user.role !== 'customer') return null;

    const toggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!auth.user) return router.visit(route('login'));
        setPop((p) => (active ? -Math.abs(p) - 1 : Math.abs(p) + 1));
        if (active) fly('favorites', e.currentTarget, { icon: HEART_SVG, tone: 'favorites' });
        else fly(e.currentTarget, 'favorites', { icon: HEART_SVG });
        router.post(
            route('customer.favorites.toggle', { type, id }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['favorites', 'flash'],
                optimistic: (props) => {
                    const list = props.favorites?.[type] ?? [];
                    return { favorites: { ...props.favorites, [type]: active ? list.filter((x) => x !== id) : [...list, id] } };
                },
            },
        );
    };

    return (
        <button
            onClick={toggle}
            aria-pressed={active}
            aria-label={active ? t('favorites.remove') : t('favorites.add')}
            className={cn('inline-flex items-center justify-center rounded-full bg-elev/90 backdrop-blur transition hover:scale-105', size, className)}
        >
            <motion.span
                key={pop}
                initial={false}
                animate={pop > 0 ? { scale: [0.6, 1.3, 1] } : pop < 0 ? { scale: [1, 0.55, 1.1, 1], rotate: [0, -12, 6, 0] } : {}}
                transition={{ duration: pop < 0 ? 0.55 : 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
            >
                <Heart className={cn('size-[18px] transition-colors duration-300', active ? 'fill-accent text-accent' : 'text-ink-soft')} />
                {pop > 0 && (
                    <motion.span
                        aria-hidden="true"
                        initial={{ scale: 0.4, opacity: 0.7 }}
                        animate={{ scale: 2.4, opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-full border-2 border-accent"
                    />
                )}
            </motion.span>
        </button>
    );
}

export function QtyStepper({ value, onChange, max = 999, min = 0, size = 'md', image }) {
    const t = useT();
    const s = size === 'sm' ? 'h-9 text-sm' : 'h-11';
    return (
        <div className={cn('inline-flex items-center rounded-full border border-line-strong bg-elev', s)}>
            <button
                type="button"
                onClick={(e) => {
                    if (image && value > min) fly('cart', e.currentTarget, { image });
                    onChange(Math.max(min, value - 1));
                }}
                className="flex h-full w-9 items-center justify-center rounded-s-full hover:bg-ink/5"
                aria-label={t('cart.decrease')}
            >
                <Minus className="size-3.5" />
            </button>
            <span className="min-w-8 text-center font-medium tabular-nums">{value}</span>
            <button
                type="button"
                onClick={(e) => {
                    if (image && value < max) fly(e.currentTarget, 'cart', { image });
                    onChange(Math.min(max, value + 1));
                }}
                disabled={value >= max} className="flex h-full w-9 items-center justify-center rounded-e-full hover:bg-ink/5 disabled:opacity-30" aria-label={t('cart.increase')}>
                <Plus className="size-3.5" />
            </button>
        </div>
    );
}

export function AddToCart({ product, className, size = 'md' }) {
    const t = useT();
    const { auth } = usePage().props;
    const { quantityOf } = useCart();
    const qty = quantityOf(product.id);
    const orderable = product.status === 'available' && product.stock_quantity > 0;

    if (auth.user && auth.user.role !== 'customer') return null;

    if (!orderable) {
        return (
            <span className={cn('inline-flex items-center rounded-full bg-ink/5 px-4 text-sm font-medium text-ink-faint', size === 'sm' ? 'h-9' : 'h-11', className)}>
                {t(product.status === 'unavailable' ? 'status.unavailable' : 'status.sold_out')}
            </span>
        );
    }

    if (qty > 0) {
        return <QtyStepper size={size} value={qty} max={product.stock_quantity} image={product.image_url} onChange={(q) => cart.set(product.id, q)} />;
    }

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fly(e.currentTarget, 'cart', { image: product.image_url });
                cart.add(product);
                toast('cart.added');
            }}
            className={cn('inline-flex items-center gap-2 rounded-full bg-brand px-4 font-medium text-brand-ink transition hover:brightness-110 active:scale-95', size === 'sm' ? 'h-9 text-sm' : 'h-11', className)}
        >
            <ShoppingBasket className="size-4" />
            {t('cart.add')}
        </button>
    );
}
