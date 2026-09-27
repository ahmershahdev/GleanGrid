import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { clientPortal, cn } from '@/lib/utils';

export default function Dropdown({ value, onChange, options, placeholder, icon: Icon, size = 'md', className, buttonClassName, align = 'start', ariaLabel, invalid, disabled, id: idProp }) {
    const t = useT();
    const autoId = useId();
    const id = idProp ?? autoId;
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [query, setQuery] = useState('');
    const [pos, setPos] = useState(null);
    const button = useRef(null);
    const list = useRef(null);
    const typed = useRef({ text: '', at: 0 });

    const selected = options.find((o) => String(o.value) === String(value ?? ''));
    const searchable = options.length > 8;
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? options.filter((o) => String(o.label).toLowerCase().includes(q)) : options;
    }, [options, query]);

    const place = useCallback(() => {
        const r = button.current?.getBoundingClientRect();
        if (!r) return;
        const below = window.innerHeight - r.bottom;
        const up = below < 280 && r.top > below;
        setPos({
            left: align === 'end' ? undefined : Math.min(r.left, window.innerWidth - Math.max(r.width, 220) - 8),
            right: align === 'end' ? window.innerWidth - r.right : undefined,
            top: up ? undefined : r.bottom + 8,
            bottom: up ? window.innerHeight - r.top + 8 : undefined,
            minWidth: Math.max(r.width, 200),
            maxHeight: Math.min(340, (up ? r.top : below) - 24),
            up,
        });
    }, [align]);

    useLayoutEffect(() => {
        if (!open) return;
        place();
        const onMove = () => place();
        window.addEventListener('resize', onMove);
        window.addEventListener('scroll', onMove, true);
        return () => {
            window.removeEventListener('resize', onMove);
            window.removeEventListener('scroll', onMove, true);
        };
    }, [open, place]);

    useEffect(() => {
        if (!open) return;
        const close = (e) => {
            if (!button.current?.contains(e.target) && !list.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [open]);

    useEffect(() => {
        if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [active, open]);

    const openList = () => {
        if (disabled) return;
        setQuery('');
        setActive(Math.max(0, options.findIndex((o) => String(o.value) === String(value ?? ''))));
        setOpen(true);
    };

    const choose = (option) => {
        onChange?.(option.value);
        setOpen(false);
        button.current?.focus();
    };

    const onKeyDown = (e) => {
        if (!open) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                openList();
            }
            return;
        }
        const last = shown.length - 1;
        if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(last, a + 1)));
        else if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
        else if (e.key === 'Home') (e.preventDefault(), setActive(0));
        else if (e.key === 'End') (e.preventDefault(), setActive(last));
        else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
        else if (e.key === 'Enter' || (e.key === ' ' && !searchable)) {
            e.preventDefault();
            if (shown[active]) choose(shown[active]);
        } else if (!searchable && e.key.length === 1) {
            const now = Date.now();
            typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : '') + e.key.toLowerCase(), at: now };
            const hit = shown.findIndex((o) => String(o.label).toLowerCase().startsWith(typed.current.text));
            if (hit >= 0) setActive(hit);
        }
    };

    const sizes = { sm: 'h-10 text-sm ps-4 pe-3', md: 'h-12 text-[15px] ps-4 pe-3.5' };

    return (
        <div className={cn('relative', className)}>
            <button
                ref={button}
                id={id}
                type="button"
                disabled={disabled}
                onClick={() => (open ? setOpen(false) : openList())}
                onKeyDown={onKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={`${id}-list`}
                aria-label={ariaLabel ? `${ariaLabel}: ${selected ? selected.label : (placeholder ?? '')}` : undefined}
                aria-invalid={invalid || undefined}
                aria-activedescendant={open && shown[active] ? `${id}-opt-${active}` : undefined}
                className={cn(
                    'group flex w-full items-center gap-2 rounded-full border bg-elev text-start transition hover:border-ink/40 focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-50',
                    open ? 'border-brand ring-1 ring-brand' : 'border-line-strong',
                    invalid && 'border-danger',
                    sizes[size],
                    buttonClassName,
                )}
            >
                {Icon && <Icon className="size-4 shrink-0 text-ink-faint" />}
                {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
                <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-ink-faint')}>{selected ? selected.label : placeholder}</span>
                <ChevronDown className={cn('size-4 shrink-0 text-ink-faint transition-transform duration-300', open && 'rotate-180 text-ink')} />
            </button>

            {clientPortal(
                <AnimatePresence>
                    {open && pos && (
                        <motion.div
                            ref={list}
                            initial={{ opacity: 0, y: pos.up ? 8 : -8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }}
                            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                            style={{ position: 'fixed', left: pos.left, right: pos.right, top: pos.top, bottom: pos.bottom, minWidth: pos.minWidth, transformOrigin: pos.up ? 'bottom' : 'top' }}
                            className="z-[160] overflow-hidden rounded-2xl border border-line bg-elev p-1.5 shadow-soft"
                            data-lenis-prevent
                        >
                            {searchable && (
                                <label className="mb-1 flex h-10 items-center gap-2 rounded-xl bg-sunk px-3">
                                    <Search className="size-4 text-ink-faint" />
                                    <input
                                        autoFocus
                                        value={query}
                                        onChange={(e) => {
                                            setQuery(e.target.value);
                                            setActive(0);
                                        }}
                                        onKeyDown={onKeyDown}
                                        placeholder={t('common.search')}
                                        className="h-full min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                                    />
                                </label>
                            )}
                            <ul id={`${id}-list`} role="listbox" aria-labelledby={id} tabIndex={-1} className="overflow-y-auto" style={{ maxHeight: pos.maxHeight }}>
                                {shown.map((o, i) => {
                                    const isSel = String(o.value) === String(value ?? '');
                                    return (
                                        <li
                                            key={`${o.value}`}
                                            id={`${id}-opt-${i}`}
                                            data-index={i}
                                            role="option"
                                            aria-selected={isSel}
                                            onPointerEnter={() => setActive(i)}
                                            onClick={() => choose(o)}
                                            className={cn('relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors', isSel ? 'font-semibold text-ink' : 'text-ink-soft')}
                                        >
                                            {active === i && <motion.span layoutId={`${id}-active`} className="absolute inset-0 rounded-xl bg-ink/[0.06]" transition={{ type: 'spring', stiffness: 600, damping: 42 }} />}
                                            {o.icon && <span className="relative shrink-0">{o.icon}</span>}
                                            <span className="relative min-w-0 flex-1">
                                                <span className="block truncate">{o.label}</span>
                                                {o.hint && <span className="block truncate text-xs font-normal text-ink-faint">{o.hint}</span>}
                                            </span>
                                            <Check className={cn('relative size-4 shrink-0 text-brand transition', isSel ? 'opacity-100' : 'opacity-0')} />
                                        </li>
                                    );
                                })}
                                {shown.length === 0 && <li className="px-3 py-4 text-center text-sm text-ink-faint">{t('common.no_results')}</li>}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>,
            )}
        </div>
    );
}

export function optionsFromChildren(children) {
    const out = [];
    const walk = (nodes) =>
        [nodes].flat(Infinity).forEach((n) => {
            if (!n || typeof n !== 'object') return;
            if (n.type === 'option') out.push({ value: n.props.value ?? String(n.props.children), label: n.props.children, disabled: n.props.disabled });
            else if (n.props?.children) walk(n.props.children);
        });
    walk(children);
    return out;
}

export function SelectMenu({ value, onChange, children, className, size = 'sm', icon, ariaLabel, 'aria-label': ariaLabelAttr, align }) {
    const options = optionsFromChildren(children).map((o) => ({ ...o, label: Array.isArray(o.label) ? o.label.join('') : o.label }));
    return (
        <Dropdown
            value={value}
            options={options}
            size={size}
            icon={icon}
            align={align}
            ariaLabel={ariaLabel ?? ariaLabelAttr}
            className={cn('min-w-40', className)}
            onChange={(v) => onChange?.({ target: { value: v } })}
        />
    );
}
