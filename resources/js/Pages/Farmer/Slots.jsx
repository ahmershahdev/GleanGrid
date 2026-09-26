import { Link, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Timer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, buttonClass, Card, Checkbox, EmptyState, Input, Modal, PageHeader, Select } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function SlotForm({ slot, markets, onDone }) {
    const t = useT();
    const { day } = useFormat();
    const form = useForm({
        market_id: slot?.market_id ?? markets[0]?.id ?? '',
        day_of_week: slot?.day_of_week ?? markets[0]?.operating_days?.[0] ?? 0,
        starts_at: slot?.starts_at?.slice(0, 5) ?? '08:00',
        ends_at: slot?.ends_at?.slice(0, 5) ?? '11:00',
        capacity: slot?.capacity ?? 15,
        is_active: slot?.is_active ?? true,
    });
    const market = markets.find((m) => Number(m.id) === Number(form.data.market_id));
    const field = (name) => ({ value: form.data[name], onChange: (e) => form.setData(name, e.target.value), error: form.errors[name] });

    const submit = (e) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: onDone };
        slot ? form.put(route('farmer.slots.update', slot.id), opts) : form.post(route('farmer.slots.store'), opts);
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <Select label={t('slots.market')} {...field('market_id')}>
                {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                        {m.name}
                    </option>
                ))}
            </Select>
            <Select label={t('slots.day')} {...field('day_of_week')} hint={market && t('slots.market_days_hint')}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <option key={d} value={d}>
                        {day(d)} {market?.operating_days?.includes(d) ? '✓' : ''}
                    </option>
                ))}
            </Select>
            <div className="grid grid-cols-3 gap-3">
                <Input label={t('slots.from')} type="time" {...field('starts_at')} />
                <Input label={t('slots.to')} type="time" {...field('ends_at')} />
                <Input label={t('slots.capacity')} placeholder={t('ph.capacity')} type="number" min="1" {...field('capacity')} />
            </div>
            <Checkbox label={t('slots.active')} checked={!!form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
            <Button type="submit" loading={form.processing} className="w-full">
                {t('common.save')}
            </Button>
        </form>
    );
}

export default function Slots({ slots, markets, cutoff }) {
    const t = useT();
    const { day, time } = useFormat();
    const [editing, setEditing] = useState(null);
    const cutoffForm = useForm({ order_cutoff_hours: cutoff });
    const byDay = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ d, items: slots.filter((s) => s.day_of_week === d) }));

    return (
        <>
            <PageHeader
                title={t('slots.title')}
                description={t('slots.subtitle')}
                actions={
                    markets.length > 0 && (
                        <Button size="sm" onClick={() => setEditing('new')}>
                            <Plus className="size-4" /> {t('slots.add')}
                        </Button>
                    )
                }
            />

            <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_340px]">
                <div>
                    {markets.length === 0 ? (
                        <EmptyState icon="round_pushpin" title={t('slots.no_markets')} action={<Link href={route('farmer.stall.edit')} className={buttonClass('primary', 'sm')}>{t('dash.stall')}</Link>} />
                    ) : slots.length === 0 ? (
                        <EmptyState icon="round_pushpin" title={t('slots.empty')} action={<Button size="sm" onClick={() => setEditing('new')}>{t('slots.add')}</Button>} />
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                            {byDay
                                .filter((g) => g.items.length)
                                .map((g) => (
                                    <Card key={g.d} className="p-5">
                                        <p className="font-display text-2xl">{day(g.d)}</p>
                                        <ul className="mt-3 space-y-2">
                                            {g.items.map((s) => (
                                                <li key={s.id} className={cn('flex items-center gap-3 rounded-2xl bg-ink/[0.03] p-3', !s.is_active && 'opacity-50')}>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold">
                                                            {time(s.starts_at)} – {time(s.ends_at)}
                                                        </p>
                                                        <p className="text-xs text-ink-soft">
                                                            {s.market.name} · {t('slots.cap', { count: s.capacity })}
                                                        </p>
                                                    </div>
                                                    <button onClick={() => setEditing(s)} className="rounded-full p-2 hover:bg-ink/5" aria-label={t('common.edit')}>
                                                        <Pencil className="size-4" />
                                                    </button>
                                                    <button onClick={() => router.delete(route('farmer.slots.destroy', s.id), { preserveScroll: true })} className="rounded-full p-2 text-danger hover:bg-danger/10" aria-label={t('common.delete')}>
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </Card>
                                ))}
                        </div>
                    )}
                </div>

                <Card
                    as="form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        cutoffForm.put(route('farmer.slots.cutoff'), { preserveScroll: true });
                    }}
                    className="h-fit space-y-4 p-6"
                >
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-sun/30">
                        <Timer className="size-6" />
                    </span>
                    <h2 className="font-display text-2xl">{t('slots.cutoff_title')}</h2>
                    <p className="text-sm text-ink-soft">{t('slots.cutoff_body')}</p>
                    <Input type="number" min="1" max="168" label={t('slots.cutoff_hours')} value={cutoffForm.data.order_cutoff_hours} onChange={(e) => cutoffForm.setData('order_cutoff_hours', e.target.value)} error={cutoffForm.errors.order_cutoff_hours} />
                    <Button type="submit" variant="outline" loading={cutoffForm.processing}>
                        {t('common.save')}
                    </Button>
                </Card>
            </div>

            <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? t('slots.add') : t('slots.edit')}>
                {editing && <SlotForm slot={editing === 'new' ? null : editing} markets={markets} onDone={() => setEditing(null)} />}
            </Modal>
        </>
    );
}
