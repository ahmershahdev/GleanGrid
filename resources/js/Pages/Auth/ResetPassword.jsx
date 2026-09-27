import { useForm } from '@inertiajs/react';
import { Button, Input, PasswordInput } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { BotFields, useBotGuard } from '@/lib/botguard';
import { useT } from '@/lib/i18n';

export default function ResetPassword({ token, email }) {
    const t = useT();
    const form = useForm({ token, email: email ?? '', password: '', password_confirmation: '', website: '', captcha_v2: '', captcha_turnstile: '' });
    const guard = useBotGuard(form, 'reset', 'checkbox');

    return (
        <AuthLayout title={t('auth.reset_title')}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    guard.submit('post', route('password.update'), { onFinish: () => form.reset('password', 'password_confirmation') });
                }}
                className="relative space-y-5"
            >
                <Input label={t('fields.email')} placeholder={t('ph.email')} type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required />
                <PasswordInput meter label={t('fields.password')} placeholder={t('ph.password_new')} value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} hint={t('auth.password_hint')} required />
                <PasswordInput label={t('fields.password_confirm')} placeholder={t('ph.password_confirm')} value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} required />
                <BotFields form={form} guard={guard} t={t} />
                <Button type="submit" size="lg" className="w-full" loading={form.processing}>
                    {t('auth.reset_button')}
                </Button>
            </form>
        </AuthLayout>
    );
}

ResetPassword.layout = null;
