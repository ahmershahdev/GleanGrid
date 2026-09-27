import { Link, useForm } from '@inertiajs/react';
import ImagePicker from '@/Components/ImagePicker';
import { useUnsavedGuard } from '@/lib/confirm';
import { useState } from 'react';
import { Button, Card, Input, PageHeader, Select, Textarea } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn, produceImage } from '@/lib/utils';

export default function ProductForm({ product, categories, units, illustrations }) {
    const t = useT();
    const { currency } = useFormat();
    const editing = !!product;
    const [filter, setFilter] = useState('');
    const form = useForm({
        name: product?.name ?? '',
        category_id: product?.category_id ?? categories[0]?.id ?? '',
        description: product?.description ?? '',
        price: product?.price ?? '',
        unit: product?.unit ?? 'kg',
        stock_quantity: product?.stock_quantity ?? 10,
        weekly_quantity: product?.weekly_quantity ?? 10,
        status: product?.status ?? 'available',
        image: product?.image?.startsWith('produce:') ? product.image : product ? '' : 'produce:basket',
        upload: null,
        remove_image: false,
    });
    useUnsavedGuard(form.isDirty && !form.processing);
    const savedPhoto = product?.image && !product.image.startsWith('produce:') ? product.image_url : null;
    const field = (name) => ({ value: form.data[name] ?? '', onChange: (e) => form.setData(name, e.target.value), error: form.errors[name] });

    const submit = (e) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, remove_image: d.remove_image ? 1 : 0, ...(editing ? { _method: 'put' } : {}) }));
        if (editing) {
            form.post(route('farmer.products.update', product.slug), { forceFormData: true });
        } else {
            form.post(route('farmer.products.store'), { forceFormData: true });
        }
    };

    return (
        <>
            <Link href={route('farmer.products.index')} className="text-sm text-ink-soft hover:text-ink">
                ← {t('dash.products')}
            </Link>
            <PageHeader className="mt-3" title={editing ? t('fproducts.edit_title') : t('fproducts.add_title')} />

            <form onSubmit={submit} className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
                <Card className="space-y-5 p-6">
                    <Input label={t('fproducts.name')} placeholder={t('ph.product_name')} {...field('name')} required />
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Select label={t('products.category')} {...field('category_id')} required>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {t(`categories.${c.slug}`, {}, c.name)}
                                </option>
                            ))}
                        </Select>
                        <Select label={t('fproducts.unit')} {...field('unit')} required>
                            {units.map((u) => (
                                <option key={u} value={u}>
                                    {t(`units.${u}`)}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-3">
                        <Input label={`${t('products.price')} (${currency})`} placeholder={t('ph.price')} type="number" step="0.01" min="0" {...field('price')} required />
                        <Input label={t('fproducts.stock')} placeholder={t('ph.qty')} type="number" min="0" {...field('stock_quantity')} required />
                        <Input label={t('fproducts.weekly')} placeholder={t('ph.qty')} type="number" min="0" {...field('weekly_quantity')} hint={t('fproducts.weekly_hint')} required />
                    </div>
                    <Select label={t('fproducts.status')} {...field('status')}>
                        {['available', 'sold_out', 'unavailable'].map((s) => (
                            <option key={s} value={s}>
                                {t(`status.${s}`)}
                            </option>
                        ))}
                    </Select>
                    <Textarea label={t('fproducts.description')} placeholder={t('ph.description')} rows={4} {...field('description')} />
                    <Button type="submit" size="lg" loading={form.processing}>
                        {editing ? t('common.save_changes') : t('fproducts.create')}
                    </Button>
                </Card>

                <Card className="h-fit space-y-5 p-6 xl:sticky xl:top-24">
                    <h2 className="font-display text-2xl">{t('fproducts.image')}</h2>
                    <ImagePicker
                        shape="wide"
                        label={t('fproducts.upload_photo')}
                        file={form.data.upload}
                        current={form.data.image ? produceImage(form.data.image.slice(8)) : savedPhoto}
                        removed={form.data.remove_image && !form.data.image}
                        onPick={(f) => form.setData((d) => ({ ...d, upload: f, image: f ? '' : d.image, remove_image: f ? false : d.remove_image }))}
                        onRemove={() => form.setData((d) => ({ ...d, image: '', remove_image: true }))}
                        onUndo={() => form.setData((d) => ({ ...d, remove_image: false }))}
                        error={form.errors.upload}
                    />
                    <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-sm text-ink-soft">{t('fproducts.or_pick')}</p>
                            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('common.search')} className="h-8 w-32 rounded-full border border-line-strong bg-bg px-3 text-xs" />
                        </div>
                        <div className="grid max-h-64 grid-cols-6 gap-2 overflow-y-auto rounded-2xl bg-ink/[0.03] p-2" data-lenis-prevent>
                            {illustrations
                                .filter((i) => i.includes(filter.toLowerCase()))
                                .map((i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => form.setData({ ...form.data, image: `produce:${i}`, upload: null })}
                                        title={i.replaceAll('_', ' ')}
                                        className={cn('aspect-square rounded-xl p-1.5 transition hover:bg-elev', form.data.image === `produce:${i}` && 'bg-elev ring-2 ring-brand')}
                                    >
                                        <img src={produceImage(i)} alt={i} className="size-full object-contain" loading="lazy" />
                                    </button>
                                ))}
                        </div>
                    </div>
                </Card>
            </form>
        </>
    );
}
