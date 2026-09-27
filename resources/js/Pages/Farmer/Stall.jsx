import { useForm, usePage } from '@inertiajs/react';
import { Check, ExternalLink } from 'lucide-react';
import ImagePicker from '@/Components/ImagePicker';
import { useUnsavedGuard } from '@/lib/confirm';
import { LazyLocationPicker as LocationPicker } from '@/Components/LazyMap';
import { Button, Card, ChipToggle, Input, PageHeader, Textarea } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function Stall({ stall, markets }) {
    const t = useT();
    const { day, days } = useFormat();
    const { auth } = usePage().props;
    const form = useForm({
        stall_name: stall.stall_name,
        contact_person: stall.contact_person,
        phone: stall.phone,
        email: stall.email,
        address: stall.address,
        tagline: stall.tagline ?? '',
        bio: stall.bio ?? '',
        latitude: stall.latitude ?? '',
        longitude: stall.longitude ?? '',
        operating_days: stall.operating_days ?? [],
        market_ids: stall.market_ids ?? [],
        stall_numbers: stall.stall_numbers ?? {},
        logo: null,
        remove_logo: false,
    });
    useUnsavedGuard(form.isDirty && !form.processing);
    const field = (name) => ({ value: form.data[name] ?? '', onChange: (e) => form.setData(name, e.target.value), error: form.errors[name] });
    const toggle = (key, value) => form.setData(key, form.data[key].includes(value) ? form.data[key].filter((v) => v !== value) : [...form.data[key], value]);

    const submit = (e) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, remove_logo: d.remove_logo ? 1 : 0, _method: 'put' }));
        form.post(route('farmer.stall.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.setDefaults({ ...form.data, logo: null, remove_logo: false });
                form.reset('logo', 'remove_logo');
            },
        });
    };

    return (
        <>
            <PageHeader
                title={t('stall.title')}
                description={t('stall.subtitle')}
                actions={
                    auth.user.farmer_status === 'approved' && (
                        <a href={route('farmers.show', stall.slug)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm font-medium hover:bg-ink/5">
                            {t('dash.public_stall')} <ExternalLink className="size-3.5" />
                        </a>
                    )
                }
            />
            <form onSubmit={submit} className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                <div className="space-y-6">
                    <Card className="space-y-5 p-6">
                        <h2 className="font-display text-2xl">{t('stall.business')}</h2>
                        <ImagePicker
                            maxSide={640}
                            label={t('stall.upload_logo')}
                            file={form.data.logo}
                            current={stall.logo_url}
                            removed={form.data.remove_logo}
                            onPick={(f) => form.setData((d) => ({ ...d, logo: f, remove_logo: f ? false : d.remove_logo }))}
                            onRemove={() => form.setData('remove_logo', true)}
                            onUndo={() => form.setData('remove_logo', false)}
                            error={form.errors.logo}
                        />
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Input label={t('fields.stall_name')} placeholder={t('ph.stall_name')} {...field('stall_name')} required />
                            <Input label={t('fields.contact_person')} placeholder={t('ph.contact_person')} {...field('contact_person')} required />
                            <Input label={t('fields.phone')} placeholder={t('ph.phone')} {...field('phone')} required />
                            <Input label={t('fields.email')} placeholder={t('ph.email')} type="email" {...field('email')} required />
                        </div>
                        <Input label={t('stall.tagline')} placeholder={t('ph.tagline')} {...field('tagline')} maxLength={160} />
                        <Textarea label={t('stall.bio')} placeholder={t('ph.bio')} rows={5} {...field('bio')} hint={t('stall.bio_hint')} />
                    </Card>

                    <Card className="space-y-5 p-6">
                        <h2 className="font-display text-2xl">{t('stall.markets_title')}</h2>
                        <p className="text-sm text-ink-soft">{t('stall.markets_hint')}</p>
                        <div className="space-y-2">
                            {markets.map((m) => {
                                const on = form.data.market_ids.includes(m.id);
                                return (
                                    <div key={m.id} className={cn('flex flex-wrap items-center gap-3 rounded-2xl border p-3 transition', on ? 'border-brand bg-brand-soft/50' : 'border-line')}>
                                        <button type="button" onClick={() => toggle('market_ids', m.id)} className="flex flex-1 items-center gap-3 text-start" aria-pressed={on}>
                                            <span className={cn('flex size-6 items-center justify-center rounded-lg border', on ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong')}>{on && <Check className="size-4" />}</span>
                                            <span>
                                                <span className="block text-sm font-medium">{m.name}</span>
                                                <span className="text-xs text-ink-faint">{days(m.operating_days)}</span>
                                            </span>
                                        </button>
                                        {on && (
                                            <input
                                                value={form.data.stall_numbers[m.id] ?? ''}
                                                onChange={(e) => form.setData('stall_numbers', { ...form.data.stall_numbers, [m.id]: e.target.value })}
                                                placeholder={t('stall.stall_no')}
                                                className="h-9 w-28 rounded-xl border border-line-strong bg-elev px-3 text-sm"
                                                aria-label={t('stall.stall_no')}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div>
                            <p className="mb-2 text-sm font-medium text-ink-soft">{t('stall.operating_days')}</p>
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                                    <ChipToggle key={d} active={form.data.operating_days.includes(d)} onClick={() => toggle('operating_days', d)}>
                                        {day(d, 'short')}
                                    </ChipToggle>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="space-y-5 p-6 xl:sticky xl:top-24">
                        <h2 className="font-display text-2xl">{t('stall.location_title')}</h2>
                        <Textarea label={t('fields.address')} placeholder={t('ph.address')} rows={2} {...field('address')} required />
                        <LocationPicker lat={form.data.latitude} lng={form.data.longitude} onChange={(lat, lng) => form.setData({ ...form.data, latitude: lat, longitude: lng })} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input label={t('fields.latitude')} placeholder={t('ph.latitude')} {...field('latitude')} inputMode="decimal" />
                            <Input label={t('fields.longitude')} placeholder={t('ph.longitude')} {...field('longitude')} inputMode="decimal" />
                        </div>
                        <Button type="submit" size="lg" className="w-full" loading={form.processing}>
                            {t('common.save_changes')}
                        </Button>
                    </Card>
                </div>
            </form>
        </>
    );
}
