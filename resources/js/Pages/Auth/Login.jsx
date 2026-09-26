import { Link, useForm } from '@inertiajs/react';
import { ShieldCheck, Store, UserRound } from 'lucide-react';
import { Button, Checkbox, Input, PasswordInput } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { BotFields, useBotGuard } from '@/lib/botguard';
import { useT } from '@/lib/i18n';

// Seeded demo accounts (also listed in README) so evaluators can switch roles quickly.
const DEMO = [
    { role: 'customer', login: 'customer@gleangrid.test', password: 'Customer@123', icon: UserRound },
    { role: 'farmer', login: 'farmer@gleangrid.test', password: 'Farmer@123', icon: Store },
    { role: 'admin', login: 'admin@gleangrid.test', password: 'Admin@123', icon: ShieldCheck },
];

export default function Login() {
    const t = useT();
    const form = useForm({ login: '', password: '', remember: true, website: '', captcha_v2: '' });
    const guard = useBotGuard(form, 'login');

    const submit = (e) => {
        e.preventDefault();
        guard.submit('post', route('login'), { onFinish: () => form.reset('password') });
    };

    return (
        <AuthLayout title={t('auth.login_title')} subtitle={t('auth.login_sub')}>
            <form onSubmit={submit} className="space-y-5">
                <Input label={t('auth.login_field')} placeholder={t('ph.login')} value={form.data.login} onChange={(e) => form.setData('login', e.target.value)} error={form.errors.login} autoComplete="username" autoFocus required />
                <PasswordInput label={t('fields.password')} placeholder={t('ph.password')} value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} autoComplete="current-password" required />
                <BotFields form={form} guard={guard} t={t} />
                <div className="flex items-center justify-between">
                    <Checkbox label={t('auth.remember')} checked={form.data.remember} onChange={(e) => form.setData('remember', e.target.checked)} />
                    <Link href={route('password.request')} className="text-sm font-medium text-brand hover:underline">
                        {t('auth.forgot')}
                    </Link>
                </div>
                <Button type="submit" size="lg" className="w-full" loading={form.processing}>
                    {t('auth.login_button')}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-soft">
                {t('auth.no_account')}{' '}
                <Link href={route('register')} className="font-semibold text-ink underline">
                    {t('nav.join')}
                </Link>
            </p>

            <div className="mt-10 rounded-3xl border border-dashed border-line-strong p-4">
                <p className="text-xs font-semibold tracking-wider text-ink-faint uppercase">{t('auth.demo')}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                    {DEMO.map((d) => (
                        <button
                            key={d.role}
                            type="button"
                            onClick={() => form.setData({ ...form.data, login: d.login, password: d.password })}
                            className="flex flex-col items-center gap-1.5 rounded-2xl bg-ink/[0.04] px-2 py-3 text-xs font-medium transition hover:bg-lime/40"
                        >
                            <d.icon className="size-5" />
                            {t(`roles.${d.role}`)}
                        </button>
                    ))}
                </div>
            </div>
        </AuthLayout>
    );
}

Login.layout = null;
