import { Link, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, ShoppingBasket, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Checkbox, Input, PASSWORD_RULES, PasswordInput, Textarea } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { BotFields, useBotGuard } from '@/lib/botguard';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Which fields live on which step, so a server error can send the user straight back to it.
const STEPS = [
    { key: 'you', fields: ['role', 'stall_name', 'contact_person', 'name', 'username'] },
    { key: 'reach', fields: ['email', 'phone', 'address', 'city'] },
    { key: 'secure', fields: ['password', 'password_confirmation', 'terms', 'captcha'] },
];

export default function Register({ role }) {
    const t = useT();
    const [step, setStep] = useState(0);
    const [dir, setDir] = useState(1);
    const [local, setLocal] = useState({});
    const form = useForm({
        role,
        name: '',
        username: '',
        email: '',
        phone: '',
        address: '',
        city: 'Hyderabad',
        stall_name: '',
        contact_person: '',
        password: '',
        password_confirmation: '',
        terms: false,
        website: '',
        captcha_v2: '',
    });
    const guard = useBotGuard(form, 'register');
    const farmer = form.data.role === 'farmer';

    // Server rejected something: jump to the first step that owns an errored field.
    useEffect(() => {
        const keys = Object.keys(form.errors);
        if (!keys.length) return;
        const target = STEPS.findIndex((s) => s.fields.some((f) => keys.includes(f)));
        if (target >= 0 && target !== step) {
            setDir(target > step ? 1 : -1);
            setStep(target);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.errors]);

    const required = {
        0: ['name', 'username', ...(farmer ? ['stall_name', 'contact_person'] : [])],
        1: ['email', 'phone', 'address'],
    };

    // Light client checks before moving on; the server re-validates everything.
    const check = (i) => {
        const errs = {};
        (required[i] ?? []).forEach((f) => !String(form.data[f]).trim() && (errs[f] = t('validation.required')));
        if (i === 0 && form.data.username && !/^[A-Za-z0-9_-]{3,50}$/.test(form.data.username)) errs.username = t('validation.username');
        if (i === 1 && form.data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.data.email)) errs.email = t('validation.email');
        setLocal(errs);
        return !Object.keys(errs).length;
    };

    const go = (to) => {
        if (to > step && !check(step)) return;
        setDir(to > step ? 1 : -1);
        setStep(to);
    };

    const submit = (e) => {
        e.preventDefault();
        if (step < 2) return go(step + 1);
        guard.submit('post', route('register'), { onFinish: () => form.reset('password', 'password_confirmation') });
    };

    const field = (name) => ({ value: form.data[name], onChange: (e) => form.setData(name, e.target.value), error: local[name] ?? form.errors[name] });
    const strongEnough = PASSWORD_RULES.every(([, test]) => test(form.data.password)) && form.data.password === form.data.password_confirmation;

    return (
        <AuthLayout title={t('auth.register_title')} subtitle={t(farmer ? 'auth.register_sub_farmer' : 'auth.register_sub')}>
            {/* Progress rail */}
            <ol className="mb-8 grid grid-cols-3 gap-2" aria-label={t('auth.progress')}>
                {STEPS.map((s, i) => (
                    <li key={s.key}>
                        <button type="button" onClick={() => i < step && go(i)} disabled={i > step} aria-current={i === step ? 'step' : undefined} className="group w-full text-start disabled:cursor-default">
                            <span className="block h-1 overflow-hidden rounded-full bg-line">
                                <motion.span className="block h-full rounded-full bg-brand" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
                            </span>
                            <span className={cn('mt-2 flex items-center gap-1.5 text-xs font-medium', i === step ? 'text-ink' : 'text-ink-faint')}>
                                <span className={cn('flex size-5 items-center justify-center rounded-full text-[10px]', i < step ? 'bg-brand text-brand-ink' : i === step ? 'bg-ink text-bg' : 'bg-ink/10')}>{i < step ? <Check className="size-3" /> : i + 1}</span>
                                <span className="truncate">{t(`auth.step_${s.key}`)}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ol>

            <form onSubmit={submit} className="relative" noValidate>
                <BotFields form={form} guard={guard} t={t} />
                <AnimatePresence mode="wait" custom={dir} initial={false}>
                    <motion.div
                        key={step}
                        custom={dir}
                        initial={{ opacity: 0, x: dir * 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: dir * -40 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-5"
                    >
                        {step === 0 && (
                            <>
                                <div className="relative grid grid-cols-2 rounded-full bg-ink/5 p-1" role="tablist" aria-label={t('auth.account_type')}>
                                    {[
                                        ['customer', ShoppingBasket],
                                        ['farmer', Store],
                                    ].map(([r, Icon]) => (
                                        <button
                                            key={r}
                                            type="button"
                                            role="tab"
                                            aria-selected={form.data.role === r}
                                            onClick={() => form.setData('role', r)}
                                            className={cn('relative z-10 flex h-11 items-center justify-center gap-2 rounded-full text-sm font-medium transition', form.data.role === r ? 'text-brand-ink' : 'text-ink-soft')}
                                        >
                                            {form.data.role === r && <motion.span layoutId="role-pill" className="absolute inset-0 -z-10 rounded-full bg-brand" />}
                                            <Icon className="size-4" /> {t(`auth.as_${r}`)}
                                        </button>
                                    ))}
                                </div>
                                <AnimatePresence initial={false}>
                                    {farmer && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid gap-5 overflow-hidden sm:grid-cols-2">
                                            <Input label={t('fields.stall_name')} placeholder={t('ph.stall_name')} {...field('stall_name')} required />
                                            <Input label={t('fields.contact_person')} placeholder={t('ph.contact_person')} {...field('contact_person')} required />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <Input label={t('fields.name')} placeholder={t('ph.name')} {...field('name')} autoComplete="name" autoFocus required />
                                <Input label={t('fields.username')} placeholder={t('ph.username')} {...field('username')} autoComplete="username" hint={t('auth.username_hint')} required />
                            </>
                        )}

                        {step === 1 && (
                            <>
                                <Input label={t('fields.email')} placeholder={t('ph.email')} type="email" {...field('email')} autoComplete="email" hint={t('auth.email_hint')} autoFocus required />
                                <Input label={t('fields.phone')} type="tel" placeholder={t('ph.phone')} {...field('phone')} autoComplete="tel" required />
                                <Textarea label={t('fields.address')} placeholder={t('ph.address')} rows={2} {...field('address')} autoComplete="street-address" required />
                                <Input label={t('fields.city')} placeholder={t('ph.city')} {...field('city')} autoComplete="address-level2" />
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <PasswordInput label={t('fields.password')} placeholder={t('ph.password_new')} {...field('password')} autoComplete="new-password" meter autoFocus required />
                                <PasswordInput label={t('fields.password_confirm')} placeholder={t('ph.password_confirm')} {...field('password_confirmation')} autoComplete="new-password" required />
                                {form.data.password_confirmation && form.data.password !== form.data.password_confirmation && <p className="-mt-2 text-xs text-warning">{t('auth.mismatch')}</p>}
                                <div>
                                    <Checkbox label={t('auth.terms')} checked={form.data.terms} onChange={(e) => form.setData('terms', e.target.checked)} />
                                    <p className="mt-1 ps-7 text-xs text-ink-faint">
                                        <Link href={route('terms')} className="underline">
                                            {t('legal.terms')}
                                        </Link>{' '}
                                        ·{' '}
                                        <Link href={route('privacy')} className="underline">
                                            {t('legal.privacy')}
                                        </Link>
                                    </p>
                                    {form.errors.terms && <p className="mt-1 text-sm text-danger">{t(form.errors.terms)}</p>}
                                </div>
                                {farmer && <p className="rounded-2xl bg-sun/20 p-3 text-sm">{t('auth.farmer_review_note')}</p>}
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>

                <div className="mt-8 flex gap-3">
                    {step > 0 && (
                        <Button type="button" variant="outline" size="lg" onClick={() => go(step - 1)} aria-label={t('auth.back')}>
                            <ArrowLeft className="rtl-flip size-5" />
                        </Button>
                    )}
                    <Button type="submit" size="lg" className="flex-1" loading={form.processing} disabled={step === 2 && (!strongEnough || !form.data.terms)}>
                        {step < 2 ? (
                            <>
                                {t('auth.next')} <ArrowRight className="rtl-flip size-5" />
                            </>
                        ) : (
                            t(farmer ? 'auth.register_farmer_button' : 'auth.register_button')
                        )}
                    </Button>
                </div>
            </form>
            <p className="mt-6 text-center text-sm text-ink-soft">
                {t('auth.have_account')}{' '}
                <Link href={route('login')} className="font-semibold text-ink underline">
                    {t('nav.login')}
                </Link>
            </p>
        </AuthLayout>
    );
}

Register.layout = null;
