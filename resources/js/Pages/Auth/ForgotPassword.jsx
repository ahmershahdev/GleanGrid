import { Link, useForm } from '@inertiajs/react';
import { Button, Input } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { BotFields, useBotGuard } from '@/lib/botguard';
import { useT } from '@/lib/i18n';

export default function ForgotPassword() {
    const t = useT();
    const form = useForm({ email: '', website: '', captcha_v2: '', captcha_turnstile: '' });
    const guard = useBotGuard(form, 'forgot', 'checkbox');

    return (
        <AuthLayout title={t('auth.forgot_title')} subtitle={t('auth.forgot_sub')}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    guard.submit('post', route('password.email'));
                }}
                className="relative space-y-5"
            >
                <Input label={t('fields.email')} placeholder={t('ph.email')} type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} autoFocus required />
                <BotFields form={form} guard={guard} t={t} />
                <Button type="submit" size="lg" className="w-full" loading={form.processing}>
                    {t('auth.send_link')}
                </Button>
            </form>
            <p className="mt-6 text-center text-sm">
                <Link href={route('login')} className="font-medium text-brand hover:underline">
                    ← {t('auth.back_to_login')}
                </Link>
            </p>
        </AuthLayout>
    );
}

ForgotPassword.layout = null;
