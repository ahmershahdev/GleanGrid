import { useForm } from '@inertiajs/react';
import { motion } from 'motion/react';
import { BadgeCheck } from 'lucide-react';
import { Button, Checkbox, Input, Textarea } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';

export default function Onboarding({ profile, avatar, needsStall, providers = [] }) {
    const t = useT();
    const form = useForm({
        name: profile.name ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        city: profile.city ?? 'Hyderabad',
        stall_name: '',
        contact_person: profile.name ?? '',
        terms: false,
    });
    const field = (k) => ({ value: form.data[k] ?? '', onChange: (e) => form.setData(k, e.target.value), error: form.errors[k] });
    const provider = providers[0] ? providers[0][0].toUpperCase() + providers[0].slice(1) : null;

    return (
        <AuthLayout title={t('oauth.onboarding_title')} subtitle={t('oauth.onboarding_sub')}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-4 rounded-3xl border border-line bg-elev p-4">
                {avatar ? (
                    <motion.img src={avatar} alt="" className="size-14 rounded-full object-cover ring-2 ring-lime" initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} />
                ) : (
                    <span className="flex size-14 items-center justify-center rounded-full bg-brand text-xl font-semibold text-brand-ink">{profile.name?.[0]}</span>
                )}
                <div className="min-w-0">
                    <p className="truncate font-semibold">{profile.email}</p>
                    {provider && (
                        <p className="flex items-center gap-1 text-xs text-success">
                            <BadgeCheck className="size-3.5" /> {t('oauth.onboarding_from', { provider })}
                        </p>
                    )}
                </div>
            </motion.div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post(route('onboarding.store'));
                }}
                className="space-y-4"
            >
                <Input label={t('fields.name')} autoComplete="name" required maxLength={100} {...field('name')} />
                <Input label={t('fields.phone')} type="tel" autoComplete="tel" placeholder="+92 3XX XXXXXXX" required maxLength={30} {...field('phone')} />
                <Textarea label={t('fields.address')} rows={2} autoComplete="street-address" required maxLength={500} {...field('address')} />
                <Input label={t('fields.city')} autoComplete="address-level2" maxLength={80} {...field('city')} />
                {needsStall && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input label={t('fields.stall_name')} required maxLength={120} {...field('stall_name')} />
                        <Input label={t('fields.contact_person')} required maxLength={100} {...field('contact_person')} />
                    </div>
                )}
                <Checkbox label={t('auth.terms')} checked={form.data.terms} onChange={(e) => form.setData('terms', e.target.checked)} />
                {form.errors.terms && <p className="text-xs text-danger">{form.errors.terms}</p>}
                <Button type="submit" size="lg" className="w-full" loading={form.processing} disabled={!form.data.terms}>
                    {needsStall ? t('oauth.finish_farmer') : t('oauth.finish')}
                </Button>
            </form>
        </AuthLayout>
    );
}

Onboarding.layout = null;
