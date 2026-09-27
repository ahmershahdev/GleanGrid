import { useForm, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, buttonClass, Card, Checkbox, Input, Modal, PageHeader, Select } from '@/Components/ui';
import { confirmDelete } from '@/lib/confirm';
import { useT } from '@/lib/i18n';
import { cn, produceImage } from '@/lib/utils';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function useShortMonth() {
    const { locale } = usePage().props.app;
    return useMemo(() => {
        const f = new Intl.DateTimeFormat(locale, { month: 'short' });
        return (m) => f.format(new Date(2026, m - 1, 1));
    }, [locale]);
}

function MonthToggles({ months, peak, onChange, error }) {
    const t = useT();
    const short = useShortMonth();
    const cycle = (m) => {
        if (peak.includes(m)) onChange(months.filter((x) => x !== m), peak.filter((x) => x !== m));
        else if (months.includes(m)) onChange(months, [...peak, m]);
        else onChange([...months, m], peak);
    };
    return (
        <div>
            <p className="mb-2 text-sm font-medium">{t('seasons.months')}</p>
            <div className="grid grid-cols-6 gap-1.5">
                {MONTHS.map((m) => {
                    const state = peak.includes(m) ? 'peak' : months.includes(m) ? 'on' : 'off';
                    return (
                        <button key={m} type="button" onClick={() => cycle(m)} aria-label={`${short(m)}: ${t(state === 'peak' ? 'seasons.peak' : state === 'on' ? 'seasons.season' : 'seasons.off')}`} className={cn('h-11 rounded-xl text-xs font-semibold transition', state === 'peak' ? 'bg-accent text-accent-ink' : state === 'on' ? 'bg-lime text-forest' : 'bg-ink/5 text-ink-soft hover:bg-ink/10')}>
                            {short(m)}
                        </button>
                    );
                })}
            </div>
            {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
        </div>
    );
}

function SeasonForm({ item, categories, images, onDone }) {
    const t = useT();
    const form = useForm({
        name: item?.name ?? '',
        category_id: item?.category_id ?? '',
        image: item?.image ?? 'basket',
        months: item?.months ?? [],
        peak_months: item?.peak_months ?? [],
        search: item?.search ?? '',
        notes: item?.notes ?? '',
        sort_order: item?.sort_order ?? 0,
        is_active: item?.is_active ?? true,
    });
    const field = (name) => ({ value: form.data[name] ?? '', onChange: (e) => form.setData(name, e.target.value), error: form.errors[name] });
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: onDone };
                item ? form.put(route('admin.seasons.update', item.id), opts) : form.post(route('admin.seasons.store'), opts);
            }}
            className="space-y-4"
        >
            <Input label={t('fields.name')} {...field('name')} required maxLength={80} />
            <div className="grid grid-cols-2 gap-3">
                <Select label={t('seasons.category')} {...field('category_id')}>
                    <option value="">—</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </Select>
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                    <Select label={t('seasons.image')} {...field('image')}>
                        {images.map((i) => (
                            <option key={i} value={i}>
                                {i.replaceAll('_', ' ')}
                            </option>
                        ))}
                    </Select>
                    <img src={produceImage(form.data.image || 'basket')} alt="" className="mb-1 size-10" />
                </div>
            </div>
            <MonthToggles months={form.data.months} peak={form.data.peak_months} onChange={(months, peak) => form.setData({ ...form.data, months, peak_months: peak })} error={form.errors.months} />
            <Input label={t('seasons.search')} placeholder="mango" {...field('search')} maxLength={60} />
            <Input label={t('seasons.notes')} {...field('notes')} maxLength={255} />
            <div className="grid grid-cols-2 items-end gap-3">
                <Input label={t('acategories.order')} type="number" min="0" {...field('sort_order')} />
                <Checkbox label={t('amarkets.active')} checked={!!form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
            </div>
            <Button type="submit" className="w-full" loading={form.processing}>
                {t('common.save')}
            </Button>
        </form>
    );
}

export default function AdminSeasons({ items, categories, images }) {
    const t = useT();
    const short = useShortMonth();
    const [editing, setEditing] = useState(null);
    const current = new Date().getMonth() + 1;

    return (
        <>
            <PageHeader
                title={t('seasons.admin_title')}
                description={t('seasons.admin_sub')}
                actions={
                    <Button size="sm" onClick={() => setEditing('new')}>
                        <Plus className="size-4" /> {t('seasons.add')}
                    </Button>
                }
            />
            <Card className="mt-8 overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                    <thead>
                        <tr className="border-b border-line text-xs text-ink-faint uppercase">
                            <th className="px-5 py-3 text-start font-medium">{t('fields.name')}</th>
                            {MONTHS.map((m) => (
                                <th key={m} className={cn('px-1 py-3 text-center font-mono font-medium', m === current && 'text-accent')}>
                                    {short(m)}
                                </th>
                            ))}
                            <th className="px-5 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {items.map((i) => (
                            <tr key={i.id} className={cn('hover:bg-ink/[0.02]', !i.is_active && 'opacity-50')}>
                                <td className="px-5 py-2.5">
                                    <span className="flex items-center gap-2.5 font-medium">
                                        <img src={produceImage(i.image ?? 'basket')} alt="" className="size-7" /> {i.name}
                                    </span>
                                    <span className="ms-9 block text-xs text-ink-faint">{i.category?.name}</span>
                                </td>
                                {MONTHS.map((m) => (
                                    <td key={m} className="px-1 py-2.5">
                                        <span className={cn('mx-auto block size-5 rounded-md', i.peak_months?.includes(m) ? 'bg-accent' : i.months.includes(m) ? 'bg-lime' : 'bg-ink/5')} />
                                    </td>
                                ))}
                                <td className="px-5 py-2.5">
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => setEditing(i)} className={buttonClass('soft', 'icon', 'size-9')} aria-label={t('common.edit')}>
                                            <Pencil className="size-4" />
                                        </button>
                                        <button onClick={() => confirmDelete(route('admin.seasons.destroy', i.id), { title: t('confirm.delete_title') })} className={buttonClass('soft', 'icon', 'size-9 text-danger')} aria-label={t('common.delete')}>
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
            <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? t('seasons.add') : t('seasons.edit')}>
                {editing && <SeasonForm item={editing === 'new' ? null : editing} categories={categories} images={images} onDone={() => setEditing(null)} />}
            </Modal>
        </>
    );
}
