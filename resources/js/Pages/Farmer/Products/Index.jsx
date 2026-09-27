import { Link, router } from '@inertiajs/react';
import { CalendarSync, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, buttonClass, EmptyState, Modal, PageHeader, StatusBadge, Tabs } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { SelectMenu } from '@/Components/Dropdown';
import { pathUrl } from '@/lib/url';

export default function FarmerProducts({ products, filters }) {
    const t = useT();
    const { money } = useFormat();
    const [q, setQ] = useState(filters.q ?? '');
    const [toDelete, setToDelete] = useState(null);
    const [template, setTemplate] = useState(false);

    const setStatus = (p, status) => router.patch(route('farmer.products.status', p.slug), { status }, { preserveScroll: true });
    const setStock = (p, stock) => router.patch(route('farmer.products.status', p.slug), { status: stock > 0 && p.status === 'sold_out' ? 'available' : stock === 0 && p.status === 'available' ? 'sold_out' : p.status, stock_quantity: stock, stock_seen: p.stock_quantity }, { preserveScroll: true });
    const tab = (status) => pathUrl('farmer.products.index', { ...filters, status });

    return (
        <>
            <PageHeader
                title={t('fproducts.title')}
                description={t('fproducts.subtitle')}
                actions={
                    <>
                        <Button variant="outline" size="sm" onClick={() => setTemplate(true)}>
                            <CalendarSync className="size-4" /> {t('fproducts.apply_template')}
                        </Button>
                        <Link href={route('farmer.products.create')} className={buttonClass('primary', 'sm')}>
                            <Plus className="size-4" /> {t('fproducts.add')}
                        </Link>
                    </>
                }
            />

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Tabs active={filters.status ?? 'all'} tabs={[{ key: 'all', label: t('common.all'), href: tab(undefined) }, ...['available', 'sold_out', 'unavailable'].map((s) => ({ key: s, label: t(`status.${s}`), href: tab(s) }))]} />
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.get(pathUrl('farmer.products.index', { ...filters, q }), {}, { preserveState: true });
                    }}
                    className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-elev px-4"
                >
                    <Search className="size-4 text-ink-faint" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} className="w-40 bg-transparent text-sm focus:outline-none" />
                </form>
            </div>

            {products.length === 0 ? (
                <EmptyState className="mt-6" icon="seedling" title={t('fproducts.empty')} action={<Link href={route('farmer.products.create')} className={buttonClass('primary', 'sm')}>{t('fproducts.add')}</Link>} />
            ) : (
                <div className="mt-6 grid gap-3">
                    {products.map((p) => (
                        <div key={p.id} className={cn('flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-elev p-4', p.removed_at && 'border-danger/40')}>
                            <img src={p.image_url} alt="" className="size-16 rounded-2xl bg-sunk object-contain p-2" />
                            <div className="min-w-[180px] flex-1">
                                <p className="font-display text-lg">{p.name}</p>
                                <p className="text-sm text-ink-soft">
                                    {t(`categories.${p.category?.slug}`, {}, p.category?.name)} · {money(p.price)} / {t(`units.${p.unit}`)}
                                </p>
                                {p.removed_at && <p className="mt-1 text-xs text-danger">{t('fproducts.removed_by_admin', { reason: p.removed_reason })}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-ink-faint">{t('fproducts.stock')}</label>
                                <input
                                    type="number"
                                    min="0"
                                    defaultValue={p.stock_quantity}
                                    key={p.stock_quantity}
                                    onBlur={(e) => Number(e.target.value) !== p.stock_quantity && setStock(p, Number(e.target.value))}
                                    className="h-9 w-20 rounded-xl border border-line-strong bg-bg px-2 text-center text-sm tabular-nums"
                                    aria-label={t('fproducts.stock')}
                                />
                                <span className="text-xs text-ink-faint">/ {p.weekly_quantity}</span>
                            </div>
                            <SelectMenu value={p.status} onChange={(e) => setStatus(p, e.target.value)} aria-label={t('fproducts.status')}>
                                {['available', 'sold_out', 'unavailable'].map((s) => (
                                    <option key={s} value={s}>
                                        {t(`status.${s}`)}
                                    </option>
                                ))}
                            </SelectMenu>
                            <StatusBadge status={p.status} kind="product" />
                            <div className="flex gap-1">
                                <Link href={route('farmer.products.edit', p.slug)} className={buttonClass('ghost', 'icon')} aria-label={t('common.edit')}>
                                    <Pencil className="size-4" />
                                </Link>
                                <button onClick={() => setToDelete(p)} className={buttonClass('ghost', 'icon', 'text-danger')} aria-label={t('common.delete')}>
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal open={!!toDelete} onClose={() => setToDelete(null)} title={t('fproducts.delete_title')}>
                <p className="text-ink-soft">{t('fproducts.delete_body', { name: toDelete?.name })}</p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setToDelete(null)}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="danger" onClick={() => router.delete(route('farmer.products.destroy', toDelete.slug), { preserveScroll: true, onFinish: () => setToDelete(null) })}>
                        {t('common.delete')}
                    </Button>
                </div>
            </Modal>

            <Modal open={template} onClose={() => setTemplate(false)} title={t('fproducts.template_title')}>
                <p className="text-ink-soft">{t('fproducts.template_body')}</p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setTemplate(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={() => router.post(route('farmer.products.apply-template'), {}, { preserveScroll: true, onFinish: () => setTemplate(false) })}>
                        <CalendarSync className="size-4" /> {t('fproducts.apply_template')}
                    </Button>
                </div>
            </Modal>
        </>
    );
}
