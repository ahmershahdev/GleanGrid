import { Link, useForm } from '@inertiajs/react';
import { LazyLocationPicker as LocationPicker } from '@/Components/LazyMap';
import { Button, Card, Checkbox, ChipToggle, Field, Input, PageHeader, Select, Textarea } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';

export default function MarketForm({ market }) {
    const t = useT();
    const { day } = useFormat();
    const form = useForm({
        name: market?.name ?? '',
        description: market?.description ?? '',
        address: market?.address ?? '',
        city: market?.city ?? '',
        latitude: market?.latitude ?? '',
        longitude: market?.longitude ?? '',
        map_provider: market?.map_provider ?? 'openstreetmap',
        operating_days: market?.operating_days ?? [0],
        opens_at: market?.opens_at?.slice(0, 5) ?? '08:00',
        closes_at: market?.closes_at?.slice(0, 5) ?? '14:00',
        is_active: market?.is_active ?? true,
    });
    const field = (name) => ({ value: form.data[name] ?? '', onChange: (e) => form.setData(name, e.target.value), error: form.errors[name] });
    const toggleDay = (d) => form.setData('operating_days', form.data.operating_days.includes(d) ? form.data.operating_days.filter((x) => x !== d) : [...form.data.operating_days, d]);

    const submit = (e) => {
        e.preventDefault();
        market ? form.put(route('admin.markets.update', market.slug)) : form.post(route('admin.markets.store'));
    };

    return (
        <>
            <Link href={route('admin.markets.index')} className="text-sm text-ink-soft hover:text-ink">
                ← {t('dash.markets')}
            </Link>
            <PageHeader className="mt-3" title={market ? t('amarkets.edit') : t('amarkets.add')} />
            <form onSubmit={submit} className="mt-8 grid gap-6 xl:grid-cols-2">
                <Card className="space-y-5 p-6">
                    <Input label={t('amarkets.name')} placeholder={t('ph.market_name')} {...field('name')} required />
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Input label={t('fields.city')} placeholder={t('ph.city')} {...field('city')} required />
                        <Select label={t('amarkets.provider')} {...field('map_provider')}>
                            <option value="openstreetmap">OpenStreetMap</option>
                            <option value="google">Google Maps</option>
                        </Select>
                    </div>
                    <Textarea label={t('fields.address')} placeholder={t('ph.address')} rows={2} {...field('address')} required />
                    <Textarea label={t('fproducts.description')} placeholder={t('ph.description')} rows={3} {...field('description')} />
                    <Field label={t('market.days')} error={form.errors.operating_days}>
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                                <ChipToggle key={d} active={form.data.operating_days.includes(d)} onClick={() => toggleDay(d)}>
                                    {day(d, 'short')}
                                </ChipToggle>
                            ))}
                        </div>
                    </Field>
                    <div className="grid grid-cols-2 gap-5">
                        <Input label={t('amarkets.opens')} type="time" {...field('opens_at')} required />
                        <Input label={t('amarkets.closes')} type="time" {...field('closes_at')} required />
                    </div>
                    <Checkbox label={t('amarkets.active')} checked={!!form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
                </Card>
                <Card className="h-fit space-y-5 p-6">
                    <h2 className="font-display text-2xl">{t('stall.location_title')}</h2>
                    <LocationPicker lat={form.data.latitude} lng={form.data.longitude} onChange={(lat, lng) => form.setData({ ...form.data, latitude: lat, longitude: lng })} />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label={t('fields.latitude')} placeholder={t('ph.latitude')} {...field('latitude')} required />
                        <Input label={t('fields.longitude')} placeholder={t('ph.longitude')} {...field('longitude')} required />
                    </div>
                    <Button type="submit" size="lg" className="w-full" loading={form.processing}>
                        {t('common.save')}
                    </Button>
                </Card>
            </form>
        </>
    );
}
