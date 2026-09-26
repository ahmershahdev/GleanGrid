import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, buttonClass, Card, Checkbox, Input, Modal, PageHeader, Select } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { produceImage } from '@/lib/utils';

function CategoryForm({ category, illustrations, onDone }) {
    const t = useT();
    const form = useForm({
        name: category?.name ?? '',
        icon: category?.icon ?? 'basket',
        color: category?.color ?? '#C9E265',
        description: category?.description ?? '',
        sort_order: category?.sort_order ?? 0,
        is_active: category?.is_active ?? true,
    });
    const field = (name) => ({ value: form.data[name] ?? '', onChange: (e) => form.setData(name, e.target.value), error: form.errors[name] });
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: onDone };
                category ? form.put(route('admin.categories.update', category.id), opts) : form.post(route('admin.categories.store'), opts);
            }}
            className="space-y-4"
        >
            <Input label={t('fields.name')} placeholder={t('ph.name')} {...field('name')} required />
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                <Select label={t('acategories.icon')} {...field('icon')}>
                    {illustrations.map((i) => (
                        <option key={i} value={i}>
                            {i.replaceAll('_', ' ')}
                        </option>
                    ))}
                </Select>
                <img src={produceImage(form.data.icon)} alt="" className="mb-1 size-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Input label={t('acategories.color')} type="color" {...field('color')} className="h-12 cursor-pointer p-1" />
                <Input label={t('acategories.order')} placeholder={t('ph.sort')} type="number" min="0" {...field('sort_order')} />
            </div>
            <Input label={t('fproducts.description')} placeholder={t('ph.description')} {...field('description')} />
            <Checkbox label={t('amarkets.active')} checked={!!form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
            <Button type="submit" className="w-full" loading={form.processing}>
                {t('common.save')}
            </Button>
        </form>
    );
}

export default function AdminCategories({ categories, illustrations }) {
    const t = useT();
    const [editing, setEditing] = useState(null);

    return (
        <>
            <PageHeader
                title={t('acategories.title')}
                description={t('acategories.subtitle')}
                actions={
                    <Button size="sm" onClick={() => setEditing('new')}>
                        <Plus className="size-4" /> {t('acategories.add')}
                    </Button>
                }
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {categories.map((c) => (
                    <Card key={c.id} className="relative overflow-hidden p-5" style={{ background: `color-mix(in oklab, ${c.color} 22%, var(--bg-elev))` }}>
                        <img src={produceImage(c.icon)} alt="" className="absolute -end-3 -bottom-3 size-24 opacity-90" />
                        <p className="font-mono text-xs text-ink-faint">#{c.sort_order}</p>
                        <h3 className="font-display mt-1 text-2xl">{t(`categories.${c.slug}`, {}, c.name)}</h3>
                        <p className="mt-1 text-sm text-ink-soft">{t('home.cat_items', { count: c.products_count })}</p>
                        {!c.is_active && <p className="mt-1 text-xs text-danger">{t('status.inactive')}</p>}
                        <div className="relative mt-6 flex gap-1">
                            <button onClick={() => setEditing(c)} className={buttonClass('soft', 'icon', 'size-9')} aria-label={t('common.edit')}>
                                <Pencil className="size-4" />
                            </button>
                            <button onClick={() => router.delete(route('admin.categories.destroy', c.id), { preserveScroll: true })} className={buttonClass('soft', 'icon', 'size-9 text-danger')} aria-label={t('common.delete')}>
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
            <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? t('acategories.add') : t('acategories.edit')}>
                {editing && <CategoryForm category={editing === 'new' ? null : editing} illustrations={illustrations} onDone={() => setEditing(null)} />}
            </Modal>
        </>
    );
}
