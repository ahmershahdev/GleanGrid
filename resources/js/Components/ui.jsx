import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Star, X } from 'lucide-react';
import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import Dropdown, { optionsFromChildren } from '@/Components/Dropdown';
import { useT } from '@/lib/i18n';
import { lockScroll } from '@/lib/scroll';
import { clientPortal, cn, FARMER_STATUS_STYLE, initials, ORDER_STATUS_STYLE, PRODUCT_STATUS_STYLE } from '@/lib/utils';

const VARIANTS = {
    primary: 'bg-brand text-brand-ink hover:brightness-110 shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)]',
    accent: 'bg-accent text-accent-ink hover:brightness-105 shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)]',
    lime: 'bg-lime text-forest hover:brightness-105',
    outline: 'border border-line-strong bg-transparent text-ink hover:bg-ink hover:text-bg',
    ghost: 'text-ink hover:bg-ink/5',
    soft: 'bg-ink/5 text-ink hover:bg-ink/10',
    danger: 'bg-danger text-white hover:brightness-110',
};
const SIZES = {
    sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-full',
    md: 'h-11 px-5 text-[15px] gap-2 rounded-full',
    lg: 'h-14 px-7 text-base gap-2.5 rounded-full',
    icon: 'size-10 rounded-full justify-center',
};

export function buttonClass(variant = 'primary', size = 'md', className) {
    return cn(
        'inline-flex select-none items-center justify-center font-medium whitespace-nowrap transition-[filter,background-color,color,transform] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
    );
}

export const Button = forwardRef(function Button({ variant, size, className, loading, children, type = 'button', ...props }, ref) {
    return (
        <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={loading || props.disabled} {...props}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {children}
        </button>
    );
});

export function LinkButton({ variant, size, className, children, ...props }) {
    return (
        <Link className={buttonClass(variant, size, className)} {...props}>
            {children}
        </Link>
    );
}

const fieldBase =
    'w-full rounded-2xl border border-line-strong bg-elev px-4 text-[15px] text-ink placeholder:text-ink-faint/80 placeholder:transition-opacity focus:placeholder:opacity-50 hover:border-ink/40 transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60';

export function Field({ label, error, hint, children, className, id, required }) {
    const t = useT();
    return (
        <div className={cn('space-y-1.5', className)}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-ink-soft">
                    {label}
                    {required && <span className="text-accent"> *</span>}
                </label>
            )}
            {children}
            {error ? (
                <p className="text-sm text-danger" role="alert">
                    {t(error)}
                </p>
            ) : (
                hint && <p className="text-xs text-ink-faint">{hint}</p>
            )}
        </div>
    );
}

export const Input = forwardRef(function Input({ label, error, hint, className, wrapperClass, required, ...props }, ref) {
    const id = useId();
    return (
        <Field label={label} error={error} hint={hint} id={id} className={wrapperClass} required={required}>
            <input ref={ref} id={id} required={required} aria-invalid={!!error} className={cn(fieldBase, 'h-12', error && 'border-danger', className)} {...props} />
        </Field>
    );
});

export const PASSWORD_RULES = [
    ['len', (v) => v.length >= 8],
    ['lower', (v) => /[a-z]/.test(v)],
    ['upper', (v) => /[A-Z]/.test(v)],
    ['number', (v) => /\d/.test(v)],
    ['symbol', (v) => /[^A-Za-z0-9]/.test(v)],
];

function StrengthMeter({ value }) {
    const t = useT();
    const passed = PASSWORD_RULES.filter(([, test]) => test(value)).length;
    const level = value ? Math.max(1, Math.min(4, passed - 1)) : 0;
    const tones = ['bg-line', 'bg-danger', 'bg-warning', 'bg-sun', 'bg-success'];
    return (
        <div className="mt-2.5 space-y-2" aria-live="polite">
            <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                    <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                        <motion.span className={cn('block h-full rounded-full', tones[level])} initial={false} animate={{ width: i <= level ? '100%' : '0%' }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} />
                    </span>
                ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {value && <span className="font-semibold text-ink">{t(`auth.strength_${level}`)}</span>}
                {PASSWORD_RULES.map(([key, test]) => (
                    <span key={key} className={cn('inline-flex items-center gap-1 transition-colors', test(value) ? 'text-success' : 'text-ink-faint')}>
                        <span className={cn('size-1.5 rounded-full', test(value) ? 'bg-success' : 'bg-ink-faint/50')} /> {t(`auth.rule_${key}`)}
                    </span>
                ))}
            </div>
        </div>
    );
}

export const PasswordInput = forwardRef(function PasswordInput({ label, error, hint, className, wrapperClass, required, meter = false, ...props }, ref) {
    const id = useId();
    const t = useT();
    const [visible, setVisible] = useState(false);
    const [caps, setCaps] = useState(false);
    const inner = useRef(null);
    const onCapsCheck = (e) => setCaps(e.getModifierState?.('CapsLock') ?? false);

    const toggle = () => {
        const el = inner.current;
        const pos = el ? [el.selectionStart, el.selectionEnd] : null;
        setVisible((v) => !v);
        requestAnimationFrame(() => {
            if (el && pos && document.activeElement === el) el.setSelectionRange(...pos);
        });
    };

    return (
        <Field label={label} error={error} hint={hint} id={id} className={wrapperClass} required={required}>
            <div className="group/pw relative">
                <input
                    ref={(node) => {
                        inner.current = node;
                        if (typeof ref === 'function') ref(node);
                        else if (ref) ref.current = node;
                    }}
                    id={id}
                    type={visible ? 'text' : 'password'}
                    required={required}
                    aria-invalid={!!error}
                    spellCheck={false}
                    autoCapitalize="off"
                    className={cn(fieldBase, 'h-12 pe-14', !visible && 'tracking-[0.18em] placeholder:tracking-normal', error && 'border-danger', className)}
                    onKeyUp={onCapsCheck}
                    onKeyDown={onCapsCheck}
                    onBlur={() => setCaps(false)}
                    {...props}
                />
                <button
                    type="button"
                    onClick={toggle}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={t('auth.toggle_password')}
                    aria-pressed={visible}
                    aria-controls={id}
                    className="absolute end-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center overflow-hidden rounded-xl text-ink-faint transition hover:bg-ink/5 hover:text-ink focus-visible:text-ink"
                >
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                            key={visible ? 'hide' : 'show'}
                            initial={{ y: 14, opacity: 0, rotate: -20 }}
                            animate={{ y: 0, opacity: 1, rotate: 0 }}
                            exit={{ y: -14, opacity: 0, rotate: 20 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                            className="flex"
                        >
                            {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                        </motion.span>
                    </AnimatePresence>
                </button>
            </div>
            <AnimatePresence>
                {caps && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs font-medium text-warning" role="status">
                        ⇪ {t('auth.caps_lock')}
                    </motion.p>
                )}
            </AnimatePresence>
            {meter && <StrengthMeter value={String(props.value ?? '')} />}
        </Field>
    );
});

export function Textarea({ label, error, hint, className, wrapperClass, rows = 4, required, ...props }) {
    const id = useId();
    return (
        <Field label={label} error={error} hint={hint} id={id} className={wrapperClass} required={required}>
            <textarea id={id} rows={rows} required={required} aria-invalid={!!error} className={cn(fieldBase, 'py-3', error && 'border-danger', className)} {...props} />
        </Field>
    );
}

export function Select({ label, error, hint, className, wrapperClass, children, required, value, onChange, disabled, placeholder }) {
    const id = useId();
    const options = optionsFromChildren(children).map((o) => ({ ...o, label: Array.isArray(o.label) ? o.label.join('') : o.label }));
    return (
        <Field label={label} error={error} hint={hint} id={id} className={wrapperClass} required={required}>
            <Dropdown id={id} value={value} options={options} placeholder={placeholder} disabled={disabled} invalid={!!error} buttonClassName={cn('rounded-2xl', className)} onChange={(v) => onChange?.({ target: { value: v } })} />
        </Field>
    );
}

export function Checkbox({ label, className, ...props }) {
    return (
        <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft select-none', className)}>
            <input type="checkbox" className="size-5 cursor-pointer rounded-md border-line-strong accent-[var(--brand)]" {...props} />
            {label}
        </label>
    );
}

export function ChipToggle({ active, onClick, children, className }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn('h-10 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition', active ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong text-ink-soft hover:border-ink', className)}
        >
            {children}
        </button>
    );
}

export function Card({ className, children, as: Tag = 'div', ...props }) {
    return (
        <Tag className={cn('min-w-0 rounded-3xl border border-line bg-elev', className)} {...props}>
            {children}
        </Tag>
    );
}

export function Badge({ className, children }) {
    return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', className)}>{children}</span>;
}

export function StatusBadge({ status, kind = 'order' }) {
    const t = useT();
    const styles = kind === 'product' ? PRODUCT_STATUS_STYLE : kind === 'farmer' ? FARMER_STATUS_STYLE : ORDER_STATUS_STYLE;
    return (
        <Badge className={styles[status] ?? 'bg-ink/5 text-ink-soft ring-line'}>
            <span className="size-1.5 rounded-full bg-current" />
            {t(`status.${status}`)}
        </Badge>
    );
}

export function Avatar({ name, src, size = 'size-10', className }) {
    return src ? (
        <img src={src} alt="" className={cn(size, 'rounded-full object-cover', className)} />
    ) : (
        <span className={cn(size, 'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand', className)}>{initials(name)}</span>
    );
}

export function Stars({ value = 0, size = 'size-4', className }) {
    return (
        <span role="img" className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} / 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={cn(size, i <= Math.round(value) ? 'fill-sun text-sun' : 'fill-transparent text-ink-faint/50')} />
            ))}
        </span>
    );
}

export function RatingInput({ value, onChange }) {
    return (
        <div className="flex gap-1" role="radiogroup">
            {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i}`} onClick={() => onChange(i)} className="transition hover:scale-110">
                    <Star className={cn('size-8', i <= value ? 'fill-sun text-sun' : 'text-ink-faint')} />
                </button>
            ))}
        </div>
    );
}

export function Stat({ label, value, hint, icon: Icon, tone = 'default', className }) {
    const tones = {
        default: 'bg-elev',
        brand: 'bg-brand text-brand-ink',
        lime: 'bg-lime text-forest',
        accent: 'bg-accent text-accent-ink',
    };
    return (
        <div className={cn('relative overflow-hidden rounded-3xl border border-line p-5', tones[tone], className)}>
            <div className="flex items-start justify-between gap-3">
                <p className={cn('text-sm', tone === 'default' ? 'text-ink-soft' : 'opacity-80')}>{label}</p>
                {Icon && <Icon className="size-5 opacity-60" />}
            </div>
            <p className="font-display mt-3 text-4xl font-medium tabular-nums">{value}</p>
            {hint && <p className={cn('mt-1 text-xs', tone === 'default' ? 'text-ink-faint' : 'opacity-75')}>{hint}</p>}
        </div>
    );
}

export function EmptyState({ icon = 'basket', title, body, action, className }) {
    return (
        <div className={cn('flex flex-col items-center justify-center rounded-3xl border border-dashed border-line-strong px-6 py-16 text-center', className)}>
            <img src={`/images/produce/${icon}.webp`} alt="" className="size-20 animate-float" />
            <h3 className="font-display mt-5 text-2xl">{title}</h3>
            {body && <p className="mt-2 max-w-sm text-ink-soft">{body}</p>}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

export function PageHeader({ eyebrow, title, description, actions, className }) {
    return (
        <div className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
            <div>
                {eyebrow && <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{eyebrow}</p>}
                <h1 className="font-display mt-1 text-3xl font-medium md:text-4xl">{title}</h1>
                {description && <p className="mt-2 max-w-2xl text-ink-soft">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function Tabs({ tabs, active, className }) {
    return (
        <div className={cn('no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1', className)}>
            {tabs.map((tab) => (
                <Link
                    key={tab.key}
                    href={tab.href}
                    preserveScroll
                    className={cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition', active === tab.key ? 'bg-ink text-bg' : 'text-ink-soft hover:bg-ink/5')}
                >
                    {tab.label}
                    {tab.count !== undefined && <span className={cn('rounded-full px-1.5 text-xs tabular-nums', active === tab.key ? 'bg-bg/20' : 'bg-ink/5')}>{tab.count}</span>}
                </Link>
            ))}
        </div>
    );
}

export function Pagination({ meta, className }) {
    const t = useT();
    if (!meta || meta.last_page <= 1) return null;
    return (
        <nav className={cn('flex items-center justify-between gap-4', className)} aria-label="Pagination">
            <p className="text-sm text-ink-faint">{t('common.page_of', { page: meta.current_page, total: meta.last_page })}</p>
            <div className="flex gap-2">
                {[
                    [meta.prev_page_url, 'common.previous', <ChevronLeft key="i" className="rtl-flip size-4" />, true],
                    [meta.next_page_url, 'common.next', <ChevronRight key="i" className="rtl-flip size-4" />, false],
                ].map(([href, label, icon, before]) =>
                    href ? (
                        <LinkButton key={label} variant="outline" size="sm" href={href}>
                            {before && icon}
                            {t(label)}
                            {!before && icon}
                        </LinkButton>
                    ) : (
                        <span key={label} aria-disabled="true" className={buttonClass('outline', 'sm', 'cursor-not-allowed opacity-40')}>
                            {before && icon}
                            {t(label)}
                            {!before && icon}
                        </span>
                    ),
                )}
            </div>
        </nav>
    );
}

export function Modal({ open, onClose, title, children, className, wide }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        lockScroll(true);
        return () => {
            window.removeEventListener('keydown', onKey);
            lockScroll(false);
        };
    }, [open, onClose]);

    return clientPortal(
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="absolute inset-0 bg-soil/50 backdrop-blur-sm" onClick={onClose} />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        initial={{ y: 40, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 30, opacity: 0 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                        className={cn('relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-elev p-6 shadow-soft sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg', className)}
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <h2 className="font-display text-2xl">{title}</h2>
                            <button onClick={onClose} className="rounded-full p-1.5 text-ink-soft hover:bg-ink/5" aria-label="Close">
                                <X className="size-5" />
                            </button>
                        </div>
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
    );
}

export function Table({ head, children, className }) {
    return (
        <div className={cn('overflow-x-auto rounded-3xl border border-line bg-elev', className)}>
            <table className="w-full min-w-[640px] text-sm">
                <thead>
                    <tr className="border-b border-line text-start text-xs tracking-wide text-ink-faint uppercase">
                        {head.map((h, i) => (
                            <th key={i} className="px-5 py-3.5 text-start font-medium">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">{children}</tbody>
            </table>
        </div>
    );
}

export function SectionTitle({ eyebrow, title, action, className }) {
    return (
        <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
            <div>
                {eyebrow && <p className="font-mono text-[11px] tracking-[0.2em] text-ink-faint uppercase">{eyebrow}</p>}
                <h2 className="font-display text-xl font-medium">{title}</h2>
            </div>
            {action}
        </div>
    );
}
