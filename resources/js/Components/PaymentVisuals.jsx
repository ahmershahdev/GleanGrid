import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Banknote, Check, CreditCard, Loader2, Smartphone, Wifi } from 'lucide-react';
import { useRef } from 'react';
import { cn, prefersReducedMotion } from '@/lib/utils';

export const BRAND_THEME = {
    visa: { from: '#1a2a6c', via: '#2a4ab0', to: '#0f1a45', label: 'VISA' },
    mastercard: { from: '#2b1b17', via: '#5c2a1e', to: '#1a1210', label: 'mastercard' },
    amex: { from: '#0b4f6c', via: '#1f8aa8', to: '#063447', label: 'AMERICAN EXPRESS' },
    unionpay: { from: '#113a2c', via: '#1f6b4f', to: '#0a261d', label: 'UnionPay' },
    card: { from: '#1f4d36', via: '#2f6b4d', to: '#13201a', label: '' },
};

export const WALLET_THEME = {
    easypaisa: { bg: '#0fa958', ink: '#ffffff', soft: '#e3f7ec', word: 'easypaisa' },
    jazzcash: { bg: '#d2232a', ink: '#ffffff', soft: '#fdeaea', word: 'JazzCash', accent: '#ffc20e' },
};

export function detectBrand(number = '') {
    const d = number.replace(/\D/g, '');
    if (/^4/.test(d)) return 'visa';
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return 'mastercard';
    if (/^3[47]/.test(d)) return 'amex';
    if (/^62/.test(d)) return 'unionpay';
    return 'card';
}

export function formatCardNumber(value) {
    const d = value.replace(/\D/g, '').slice(0, 19);
    if (detectBrand(d) === 'amex') return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
    return d.replace(/(.{4})/g, '$1 ').trim();
}

function BrandMark({ brand, className }) {
    if (brand === 'mastercard') {
        return (
            <span className={cn('relative flex h-8 w-12 items-center', className)} aria-label="Mastercard">
                <span className="absolute start-0 size-8 rounded-full bg-[#eb001b]" />
                <span className="absolute end-0 size-8 rounded-full bg-[#f79e1b] mix-blend-screen" />
            </span>
        );
    }
    const label = BRAND_THEME[brand]?.label;
    if (!label) return <CreditCard className={cn('size-8 opacity-80', className)} />;
    return <span className={cn('font-display text-2xl font-semibold tracking-tight italic', brand === 'amex' && 'text-[10px] not-italic tracking-[0.2em]', className)}>{label}</span>;
}

function Chip() {
    return (
        <svg viewBox="0 0 48 36" className="h-9 w-12" aria-hidden="true">
            <defs>
                <linearGradient id="chip" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#f6e27a" />
                    <stop offset="0.5" stopColor="#cfa94a" />
                    <stop offset="1" stopColor="#f3d774" />
                </linearGradient>
            </defs>
            <rect x="1" y="1" width="46" height="34" rx="6" fill="url(#chip)" />
            <path d="M1 12h14M1 24h14M33 12h14M33 24h14M15 1v34M33 1v34M15 18h18" stroke="#8a6d23" strokeWidth="1.2" fill="none" opacity="0.7" />
        </svg>
    );
}

export function CreditCard3D({ number = '', name = '', expiry = '', cvc = '', flipped = false, className }) {
    const ref = useRef(null);
    const mx = useMotionValue(0.5);
    const my = useMotionValue(0.5);
    const rx = useSpring(useTransform(my, [0, 1], [10, -10]), { stiffness: 160, damping: 18 });
    const ry = useSpring(useTransform(mx, [0, 1], [-14, 14]), { stiffness: 160, damping: 18 });
    const glareX = useTransform(mx, [0, 1], ['0%', '100%']);
    const glareY = useTransform(my, [0, 1], ['0%', '100%']);
    const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.35), transparent 45%)`;
    const brand = detectBrand(number);
    const theme = BRAND_THEME[brand];
    const digits = number.replace(/\D/g, '');
    const masked = formatCardNumber(digits.padEnd(brand === 'amex' ? 15 : 16, '•'));

    const onMove = (e) => {
        if (prefersReducedMotion()) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
    };
    const reset = () => {
        mx.set(0.5);
        my.set(0.5);
    };

    return (
        <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={cn('mx-auto w-full max-w-[400px] [perspective:1400px]', className)} aria-hidden="true">
            <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }} className="relative aspect-[1.586] w-full">
                <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 90, damping: 16 }} style={{ transformStyle: 'preserve-3d' }} className="absolute inset-0">
                    <div className="absolute inset-0 overflow-hidden rounded-[22px] p-6 text-white shadow-[0_30px_60px_-20px_rgb(0_0_0/0.55)] [backface-visibility:hidden]">
                        <motion.div key={brand} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.via} 55%, ${theme.to})` }} />
                        <div className="absolute -end-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl" />
                        <div className="absolute -start-10 -bottom-24 size-56 rounded-full bg-lime/20 blur-3xl" />
                        <svg className="absolute inset-0 size-full opacity-[0.07]" aria-hidden="true">
                            <pattern id="cc-lines" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                                <path d="M0 7h14" stroke="#fff" strokeWidth="1" />
                            </pattern>
                            <rect width="100%" height="100%" fill="url(#cc-lines)" />
                        </svg>
                        <motion.div className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ background: glare }} />
                        <div className="relative flex h-full flex-col justify-between">
                            <div className="flex items-start justify-between">
                                <Chip />
                                <div className="flex items-center gap-3">
                                    <Wifi className="size-6 rotate-90 opacity-80" />
                                    <AnimatePresence mode="popLayout">
                                        <motion.span key={brand} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
                                            <BrandMark brand={brand} />
                                        </motion.span>
                                    </AnimatePresence>
                                </div>
                            </div>
                            <p className="font-mono text-[clamp(1rem,4.4vw,1.45rem)] tracking-[0.14em] tabular-nums [text-shadow:0_1px_1px_rgb(0_0_0/0.4)]" dir="ltr">
                                {masked.split('').map((c, i) => (
                                    <motion.span key={`${i}-${c}`} initial={{ y: c === '•' ? 0 : -8, opacity: c === '•' ? 0.5 : 0 }} animate={{ y: 0, opacity: c === '•' ? 0.55 : 1 }} transition={{ duration: 0.25 }} className="inline-block min-w-[0.5ch]">
                                        {c === ' ' ? ' ' : c}
                                    </motion.span>
                                ))}
                            </p>
                            <div className="flex items-end justify-between gap-4 text-xs">
                                <div className="min-w-0">
                                    <p className="text-[9px] tracking-[0.2em] uppercase opacity-60">Card holder</p>
                                    <p className="mt-1 truncate font-mono text-sm tracking-wider uppercase">{name || 'Your name'}</p>
                                </div>
                                <div className="text-end">
                                    <p className="text-[9px] tracking-[0.2em] uppercase opacity-60">Expires</p>
                                    <p className="mt-1 font-mono text-sm tabular-nums">{expiry || 'MM/YY'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute inset-0 overflow-hidden rounded-[22px] text-white shadow-[0_30px_60px_-20px_rgb(0_0_0/0.55)] [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ background: `linear-gradient(135deg, ${theme.to}, ${theme.via})` }}>
                        <div className="mt-7 h-11 bg-black/80" />
                        <div className="mx-6 mt-5 flex items-center gap-3">
                            <div className="h-10 flex-1 rounded-md bg-[repeating-linear-gradient(90deg,#f4f1ea_0_8px,#e5e0d4_8px_16px)]" />
                            <div className="flex h-10 w-16 items-center justify-center rounded-md bg-white font-mono text-base text-ink tabular-nums">{cvc ? cvc.replace(/./g, '•') : '•••'}</div>
                        </div>
                        <p className="mx-6 mt-5 text-[10px] leading-relaxed opacity-60">This card is only drawn in your browser. GleanGrid never stores your card number or security code.</p>
                        <div className="absolute end-6 bottom-5">
                            <BrandMark brand={brand} />
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}

export function WalletPhone({ wallet = 'easypaisa', state = 'idle', number = '', amount, seconds = 4, className }) {
    const theme = WALLET_THEME[wallet] ?? WALLET_THEME.easypaisa;
    return (
        <div className={cn('mx-auto w-[240px] [perspective:1200px]', className)} aria-hidden="true">
            <motion.div initial={{ rotateY: -18, rotateX: 8, y: 20, opacity: 0 }} animate={{ rotateY: -8, rotateX: 4, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 70, damping: 14 }} className="relative rounded-[38px] border-[10px] border-[#101512] bg-[#101512] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]">
                <div className="absolute start-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
                <div className="relative flex aspect-[9/18] flex-col overflow-hidden rounded-[28px]" style={{ background: theme.soft }}>
                    <div className="px-5 pt-10 pb-6" style={{ background: theme.bg, color: theme.ink }}>
                        <p className="font-display text-2xl font-semibold tracking-tight">{theme.word}</p>
                        <p className="mt-1 text-[11px] opacity-80">{number || '03XX XXXXXXX'}</p>
                    </div>
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center text-ink">
                        <AnimatePresence mode="wait">
                            {state === 'waiting' && (
                                <motion.div key="wait" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                                    <div className="relative flex size-20 items-center justify-center">
                                        {[0, 1, 2].map((i) => (
                                            <motion.span key={i} className="absolute inset-0 rounded-full" style={{ border: `2px solid ${theme.bg}` }} animate={{ scale: [1, 1.8], opacity: [0.6, 0] }} transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.6 }} />
                                        ))}
                                        <Smartphone className="size-8" style={{ color: theme.bg }} />
                                    </div>
                                    <p className="text-sm font-semibold">Payment request</p>
                                    <p className="font-display text-2xl tabular-nums">{amount}</p>
                                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-black/10">
                                        <motion.div className="h-full" style={{ background: theme.bg }} initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: seconds, ease: 'linear' }} />
                                    </div>
                                </motion.div>
                            )}
                            {state === 'approved' && (
                                <motion.div key="ok" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }} className="flex flex-col items-center gap-3">
                                    <span className="flex size-20 items-center justify-center rounded-full text-white" style={{ background: theme.bg }}>
                                        <Check className="size-10" strokeWidth={3} />
                                    </span>
                                    <p className="font-display text-xl">Approved</p>
                                </motion.div>
                            )}
                            {state === 'idle' && (
                                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                    <p className="text-xs text-ink-soft">Enter your mobile account number to get a payment request on this phone.</p>
                                    <div className="mx-auto grid w-36 grid-cols-3 gap-2">
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <span key={i} className="aspect-square rounded-xl bg-white/70" />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export function MethodIcon({ method, className }) {
    if (method === 'cash') return <Banknote className={cn('size-6', className)} />;
    if (method === 'card') return <CreditCard className={cn('size-6', className)} />;
    const theme = WALLET_THEME[method];
    return (
        <span className={cn('flex size-9 items-center justify-center rounded-xl text-[10px] font-black tracking-tight', className)} style={{ background: theme.bg, color: theme.ink }}>
            {method === 'easypaisa' ? 'ep' : 'JC'}
        </span>
    );
}

export function MethodPicker({ methods, value, onChange, t, className }) {
    return (
        <div role="radiogroup" aria-label={t('pay.method_title')} className={cn('grid gap-3 sm:grid-cols-2', className)}>
            {methods.map((m, i) => {
                const active = value === m;
                return (
                    <motion.button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(m)}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn('group relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 text-start transition', active ? 'border-brand bg-brand-soft/60 ring-1 ring-brand' : 'border-line-strong hover:border-ink')}
                    >
                        {active && <motion.span layoutId="method-glow" className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(201_226_101/0.35),transparent_60%)]" />}
                        <span className="relative mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg">
                            <MethodIcon method={m} />
                        </span>
                        <span className="relative min-w-0 flex-1">
                            <span className="block font-semibold">{t(`pay.${m}`)}</span>
                            <span className="mt-0.5 block text-xs text-ink-soft">{t(`pay.${m}_hint`)}</span>
                        </span>
                        <span className={cn('relative mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition', active ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong')}>
                            {active && <Check className="size-3" strokeWidth={3} />}
                        </span>
                    </motion.button>
                );
            })}
        </div>
    );
}

export function Spinner({ className }) {
    return <Loader2 className={cn('size-5 animate-spin', className)} />;
}
