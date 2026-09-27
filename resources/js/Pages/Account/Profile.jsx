import { useForm, usePage } from '@inertiajs/react';
import { BadgeCheck, CircleAlert, Database, Download, Laptop, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ImagePicker from '@/Components/ImagePicker';
import { useUnsavedGuard } from '@/lib/confirm';
import { Avatar, Button, buttonClass, Card, Input, PageHeader, Select, Textarea, PasswordInput } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';

export default function Profile({ profile, security }) {
    const t = useT();
    const { auth, app } = usePage().props;
    const form = useForm({ ...profile, city: profile.city ?? '', avatar: null, remove_avatar: false });
    const pwd = useForm({ current_password: '', password: '', password_confirmation: '' });
    const others = useForm({ password: '' });
    const fmt = useFormat();
    const field = (f, name) => ({ value: f.data[name] ?? '', onChange: (e) => f.setData(name, e.target.value), error: f.errors[name] });

    useUnsavedGuard((form.isDirty || pwd.isDirty) && !form.processing && !pwd.processing);

    const save = (e) => {
        e.preventDefault();
        form.transform((data) => ({ ...data, remove_avatar: data.remove_avatar ? 1 : 0, _method: 'put' }));
        form.post(route('profile.update'), { forceFormData: true, preserveScroll: true, preserveState: false });
    };

    return (
        <>
            <PageHeader eyebrow={t(`roles.${auth.user.role}`)} title={t('profile.title')} description={t('profile.subtitle')} />
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <Card as="form" onSubmit={save} className="space-y-5 p-6 md:p-8">
                    <div>
                        <p className="font-display text-2xl">{auth.user.name}</p>
                        <p className="mb-4 text-sm text-ink-soft">@{auth.user.username}</p>
                        <ImagePicker
                            shape="circle"
                            maxSide={512}
                            label={t('profile.photo', {}, 'Profile photo')}
                            file={form.data.avatar}
                            current={auth.user.avatar}
                            removed={form.data.remove_avatar}
                            onPick={(f) => form.setData((d) => ({ ...d, avatar: f, remove_avatar: f ? false : d.remove_avatar }))}
                            onRemove={() => form.setData('remove_avatar', true)}
                            onUndo={() => form.setData('remove_avatar', false)}
                            error={form.errors.avatar}
                            fallback={<Avatar name={auth.user.name} size="size-24" />}
                        />
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

                <YourData />
            </section>
        </>
    );
}

function YourData() {
    const t = useT();
    const { auth } = usePage().props;
    const [open, setOpen] = useState(false);
    const del = useForm({ password: '', confirm: '' });

    return (
        <Card className="mt-6 p-6 md:p-8">
            <h2 className="font-display flex items-center gap-2 text-2xl">
                <Database className="size-5" /> {t('data.title', {}, 'Your data')}
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-line p-5">
                    <p className="font-medium">{t('data.export_title', {}, 'Download a copy')}</p>
                    <p className="mt-1 text-sm text-ink-soft">{t('data.export_body', {}, 'Your profile, orders, reviews, favourites, family links, recent sign-ins and notifications, as a JSON file.')}</p>
                    <a href={route('profile.export')} data-no-prefetch className={buttonClass('outline', 'sm', 'mt-4')} download>
                        <Download className="size-4" /> {t('data.export', {}, 'Download my data')}
                    </a>
                </div>
                <div className="rounded-2xl border border-danger/30 bg-danger/[0.03] p-5">
                    <p className="font-medium text-danger">{t('data.delete_title', {}, 'Delete account')}</p>
                    <p className="mt-1 text-sm text-ink-soft">{t('data.delete_body', {}, 'Open pre-orders are cancelled, your profile, favourites and family links are erased, and past orders are anonymised so farmers’ records stay correct. This can’t be undone.')}</p>
                    {auth.user.role === 'admin' ? (
                        <p className="mt-4 text-xs text-ink-faint">{t('data.admin_note', {}, 'Administrator accounts are removed by another administrator.')}</p>
                    ) : !open ? (
                        <Button variant="ghost" size="sm" className="mt-4 text-danger" onClick={() => setOpen(true)}>
                            <Trash2 className="size-4" /> {t('data.delete', {}, 'Delete my account')}
                        </Button>
                    ) : (
                        <form
                            className="mt-4 space-y-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                del.delete(route('profile.destroy'), { preserveScroll: true });
                            }}
                        >
                            <PasswordInput label={t('fields.password')} value={del.data.password} onChange={(e) => del.setData('password', e.target.value)} error={del.errors.password} autoComplete="current-password" required />
                            <Input label={t('data.type_delete', {}, 'Type DELETE to confirm')} value={del.data.confirm} onChange={(e) => del.setData('confirm', e.target.value)} error={del.errors.confirm} autoComplete="off" required />
                            <div className="flex gap-2">
                                <Button type="submit" variant="danger" size="sm" loading={del.processing} disabled={del.data.confirm !== 'DELETE' || !del.data.password}>
                                    {t('data.delete_forever', {}, 'Delete forever')}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => (setOpen(false), del.reset())}>
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </Card>
    );
}
