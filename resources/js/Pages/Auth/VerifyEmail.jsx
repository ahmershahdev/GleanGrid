import { Link, useForm } from '@inertiajs/react';
import { motion } from 'motion/react';
import { MailCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyEmail({ email }) {
    const t = useT();
    const form = useForm({ code: '' });
    const resend = useForm({});
    const [digits, setDigits] = useState(Array(LENGTH).fill(''));
    const [cooldown, setCooldown] = useState(RESEND_SECONDS);
    const [shake, setShake] = useState(0);
    const boxes = useRef([]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(id);
    }, [cooldown]);

    useEffect(() => {
        if (!form.errors.code) return;
        setDigits(Array(LENGTH).fill(''));
        setShake((n) => n + 1);
        boxes.current[0]?.focus();
    }, [form.errors.code]);

    const submit = (code) => {
        form.transform(() => ({ code }));
        form.post(route('verification.verify'), { preserveScroll: true });
    };

    const update = (next, focusIndex) => {
        setDigits(next);
        if (focusIndex !== undefined) boxes.current[Math.min(focusIndex, LENGTH - 1)]?.focus();
        const code = next.join('');
        if (code.length === LENGTH && !form.processing) submit(code);
    };

    const onChange = (i, value) => {
        const clean = value.replace(/\D/g, '');
        if (!clean) return update(digits.map((d, k) => (k === i ? '' : d)));
        const next = [...digits];
        clean.split('').slice(0, LENGTH - i).forEach((c, k) => (next[i + k] = c));
        update(next, i + clean.length);
    };

    const onKeyDown = (i, e) => {
        if (e.key === 'Backspace' && !digits[i] && i > 0) {
            e.preventDefault();
            update(digits.map((d, k) => (k === i - 1 ? '' : d)), i - 1);
        }
        if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus();
        if (e.key === 'ArrowRight' && i < LENGTH - 1) boxes.current[i + 1]?.focus();
    };

    const onPaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
        if (!pasted) return;
        e.preventDefault();
        update(pasted.padEnd(LENGTH, ' ').split('').map((c) => c.trim()), pasted.length);
    };

    return (
        <AuthLayout title={t('verify.title')} subtitle={t('verify.subtitle', { email })}>
            <div className="mb-8 flex size-16 items-center justify-center rounded-3xl bg-lime text-forest">
                <MailCheck className="size-8" />
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit(digits.join(''));
                }}
                className="space-y-6"
            >
                <motion.div
                    key={shake}
                    animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}}
                    transition={{ duration: 0.45 }}
                    className="flex justify-between gap-2 sm:gap-3"
                    dir="ltr"
                    onPaste={onPaste}
                >
                    {digits.map((d, i) => (
                        <input
                            key={i}
                            ref={(el) => (boxes.current[i] = el)}
                            value={d}
                            onChange={(e) => onChange(i, e.target.value)}
                            onKeyDown={(e) => onKeyDown(i, e)}
                            onFocus={(e) => e.target.select()}
                            inputMode="numeric"
                            autoComplete={i === 0 ? 'one-time-code' : 'off'}
                            maxLength={LENGTH}
                            autoFocus={i === 0}
                            aria-label={t('verify.digit', { n: i + 1 })}
                            className={cn(
                                'font-display size-12 rounded-2xl border bg-elev text-center text-2xl tabular-nums transition focus:scale-105 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none sm:size-14 sm:text-3xl',
                                d ? 'border-brand' : 'border-line-strong',
                                form.errors.code && 'border-danger',
                            )}
                        />
                    ))}
                </motion.div>
                {form.errors.code && (
                    <p className="text-sm text-danger" role="alert">
                        {t(form.errors.code)}
                    </p>
                )}

                <Button type="submit" size="lg" className="w-full" loading={form.processing} disabled={digits.join('').length !== LENGTH}>
                    {t('verify.confirm')}
                </Button>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
                <span>{t('verify.no_code')}</span>
                <button
                    type="button"
                    disabled={cooldown > 0 || resend.processing}
                    onClick={() => resend.post(route('verification.resend'), { preserveScroll: true, onSuccess: () => setCooldown(RESEND_SECONDS) })}
                    className="font-semibold text-brand tabular-nums hover:underline disabled:text-ink-faint disabled:no-underline"
                >
                    {cooldown > 0 ? t('verify.resend_in', { s: cooldown }) : t('verify.resend')}
                </button>
            </div>
            <p className="mt-6 text-xs text-ink-faint">
                {t('verify.wrong_email')}{' '}
                <Link href={route('logout')} method="post" as="button" className="underline">
                    {t('nav.logout')}
                </Link>
            </p>
        </AuthLayout>
    );
}

VerifyEmail.layout = null;
