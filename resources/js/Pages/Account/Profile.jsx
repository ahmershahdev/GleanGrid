import { useForm, usePage } from '@inertiajs/react';
import { BadgeCheck, Camera, CircleAlert, Laptop, LogOut, ShieldCheck } from 'lucide-react';
import { Avatar, Button, Card, Input, PageHeader, Select, Textarea, PasswordInput } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';

export default function Profile({ profile, security }) {
    const t = useT();
    const { auth, app } = usePage().props;
    const form = useForm({ ...profile, city: profile.city ?? '', avatar: null });
    const pwd = useForm({ current_password: '', password: '', password_confirmation: '' });
    const others = useForm({ password: '' });
    const fmt = useFormat();
    const field = (f, name) => ({ value: f.data[name] ?? '', onChange: (e) => f.setData(name, e.target.value), error: f.errors[name] });

    const save = (e) => {
        e.preventDefault();
        form.transform((data) => ({ ...data, _method: 'put' }));
        form.post(route('profile.update'), { forceFormData: true, preserveScroll: true, preserveState: false });
    };

    return (
        <>
            <PageHeader eyebrow={t(`roles.${auth.user.role}`)} title={t('profile.title')} description={t('profile.subtitle')} />
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <Card as="form" onSubmit={save} className="space-y-5 p-6 md:p-8">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <Avatar name={auth.user.name} src={form.data.avatar ? URL.createObjectURL(form.data.avatar) : auth.user.avatar} size="size-20" />
                            <label className="absolute -end-1 -bottom-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-ink text-bg">
                                <Camera className="size-4" />
                                <input type="file" accept="image/*" className="sr-only" onChange={(e) => form.setData('avatar', e.target.files[0])} />
                            </label>
                        </div>
                        <div>
                            <p className="font-display text-2xl">{auth.user.name}</p>
                            <p className="text-sm text-ink-soft">@{auth.user.username}</p>
                            {form.errors.avatar && <p className="text-sm text-danger">{form.errors.avatar}</p>}
                        </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Input label={t('fields.name')} placeholder={t('ph.name')} {...field(form, 'name')} required />
                        <Input label={t('fields.username')} placeholder={t('ph.username')} {...field(form, 'username')} required />
                        <Input label={t('fields.email')} placeholder={t('ph.email')} type="email" {...field(form, 'email')} required />
                        <Input label={t('fields.phone')} placeholder={t('ph.phone')} {...field(form, 'phone')} required />
                    </div>
                    <Textarea label={t('fields.address')} placeholder={t('ph.address')} rows={2} {...field(form, 'address')} required />
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Input label={t('fields.city')} placeholder={t('ph.city')} {...field(form, 'city')} />
                        <Select label={t('profile.language')} {...field(form, 'locale')}>
                            {Object.entries(app.locales).map(([code, l]) => (
                                <option key={code} value={code}>
                                    {l.native} — {l.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <Button type="submit" loading={form.processing}>
                        {t('common.save')}
                    </Button>
                </Card>

                <Card
                    as="form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        pwd.put(route('profile.password'), { preserveScroll: true, onSuccess: () => pwd.reset() });
                    }}
                    className="h-fit space-y-5 p-6 md:p-8"
                >
                    <h2 className="font-display text-2xl">{t('profile.password_title')}</h2>
                    <PasswordInput label={t('profile.current_password')} placeholder={t('ph.password_current')} {...field(pwd, 'current_password')} autoComplete="current-password" required />
                    <PasswordInput meter label={t('fields.password')} placeholder={t('ph.password_new')} {...field(pwd, 'password')} autoComplete="new-password" hint={t('auth.password_hint')} required />
                    <PasswordInput label={t('fields.password_confirm')} placeholder={t('ph.password_confirm')} {...field(pwd, 'password_confirmation')} autoComplete="new-password" required />
                    <Button type="submit" variant="outline" loading={pwd.processing}>
                        {t('profile.update_password')}
                    </Button>
                </Card>
            </div>

            <section id="security" className="mt-6 scroll-mt-24">
                <Card className="p-6 md:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="font-display flex items-center gap-2 text-2xl">
                                <ShieldCheck className="size-6 text-brand" /> {t('security.title')}
                            </h2>
                            <p className="mt-1 text-sm text-ink-soft">{t('security.subtitle')}</p>
                        </div>
                        <span className={security.verified ? 'inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm text-success' : 'inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-sm text-warning'}>
                            {security.verified ? <BadgeCheck className="size-4" /> : <CircleAlert className="size-4" />}
                            {t(security.verified ? 'security.verified' : 'security.unverified')}
                        </span>
                    </div>

                    <div className="mt-8 grid gap-8 lg:grid-cols-2">
                        <div>
                            <h3 className="font-mono text-[11px] tracking-[0.2em] text-ink-faint uppercase">{t('security.sessions')}</h3>
                            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
                                {security.sessions.map((s) => (
                                    <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                                        <Laptop className="size-5 shrink-0 text-ink-faint" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {s.device} {s.current && <span className="ms-1 rounded-full bg-lime/50 px-2 py-0.5 text-[11px] text-forest">{t('security.this_device')}</span>}
                                            </p>
                                            <p className="text-xs text-ink-faint" dir="ltr">
                                                {s.ip} · {fmt.relative(s.last_active)}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            {security.sessions.length > 1 && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        others.delete(route('profile.sessions.destroy'), { preserveScroll: true, onSuccess: () => others.reset() });
                                    }}
                                    className="mt-4 flex flex-wrap items-end gap-3"
                                >
                                    <PasswordInput wrapperClass="min-w-56 flex-1" label={t('security.confirm_password')} placeholder={t('ph.password_current')} value={others.data.password} onChange={(e) => others.setData('password', e.target.value)} error={others.errors.password} autoComplete="current-password" required />
                                    <Button type="submit" variant="outline" loading={others.processing} className="h-12">
                                        <LogOut className="size-4" /> {t('security.logout_others')}
                                    </Button>
                                </form>
                            )}
                        </div>
                        <div>
                            <h3 className="font-mono text-[11px] tracking-[0.2em] text-ink-faint uppercase">{t('security.recent')}</h3>
                            <ul className="mt-3 space-y-2">
                                {security.recent_logins.map((e) => (
                                    <li key={e.id} className="flex items-center gap-3 text-sm">
                                        <span className={e.successful ? 'size-2 rounded-full bg-success' : 'size-2 rounded-full bg-danger'} />
                                        <span className="flex-1 truncate">{e.device}</span>
                                        <span className="text-xs text-ink-faint" dir="ltr">
                                            {e.ip_address} · {fmt.relative(e.created_at)}
                                        </span>
                                    </li>
                                ))}
                                {security.recent_logins.length === 0 && <li className="text-sm text-ink-faint">{t('security.no_history')}</li>}
                            </ul>
                            {security.password_changed_at && <p className="mt-6 text-xs text-ink-faint">{t('security.password_changed', { when: fmt.relative(security.password_changed_at) })}</p>}
                        </div>
                    </div>
                </Card>
            </section>
        </>
    );
}
