import { Link, router, useForm } from '@inertiajs/react';
import { EyeOff, RotateCcw, Search } from 'lucide-react';
import { useState } from 'react';
import { Button, Checkbox, Modal, PageHeader, Pagination, StatusBadge, Table, Textarea } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cleanQuery } from '@/lib/utils';

export default function ModerateProducts({ products, filters }) {
    const t = useT();
    const { money } = useFormat();
    const [q, setQ] = useState(filters.q ?? '');
    const [target, setTarget] = useState(null);
    const form = useForm({ reason: '' });
    const apply = (patch) => router.get(route('admin.moderation.products'), cleanQuery({ ...filters, ...patch }), { preserveState: true });

    return (
        <>
            <PageHeader title={t('moderation.products_title')} description={t('moderation.products_sub')} />
            <div className="mt-8 flex flex-wrap items-center gap-3">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({ q });
                    }}
                    className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-elev px-3"
                >
                    <Search className="size-4 text-ink-faint" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} className="w-52 bg-transparent text-sm focus:outline-none" />
                </form>
                <Checkbox label={t('moderation.removed_only')} checked={!!Number(filters.removed)} onChange={(e) => apply({ removed: e.target.checked ? 1 : undefined })} />
            </div>
            <Table className="mt-6" head={[t('moderation.listing'), t('afarmers.stall'), t('products.price'), t('afarmers.status'), '']}>
                {products.data.map((p) => (
                    <tr key={p.id} className={p.removed_at ? 'bg-danger/[0.04]' : 'hover:bg-ink/[0.02]'}>
                        <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                                <img src={p.image_url} alt="" className="size-10 object-contain" />
                                <div>
                                    <p className="font-medium">{p.name}</p>
                                    <p className="line-clamp-1 max-w-xs text-xs text-ink-soft">{p.description}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-5 py-3">
                            <Link href={route('admin.farmers.show', p.farmer.slug)} className="hover:underline">
                                {p.farmer.stall_name}
                            </Link>
                        </td>
                        <td className="px-5 py-3 tabular-nums">{money(p.price)}</td>
                        <td className="px-5 py-3">{p.removed_at ? <span className="text-xs text-danger">{t('moderation.removed', { reason: p.removed_reason })}</span> : <StatusBadge status={p.status} kind="product" />}</td>
                        <td className="px-5 py-3 text-end">
                            {p.removed_at ? (
                                <Button size="sm" variant="outline" onClick={() => router.patch(route('admin.moderation.products.toggle', p.slug), {}, { preserveScroll: true })}>
                                    <RotateCcw className="size-4" /> {t('moderation.restore')}
                                </Button>
                            ) : (
                                <Button size="sm" variant="ghost" className="text-danger" onClick={() => setTarget(p)}>
                                    <EyeOff className="size-4" /> {t('moderation.remove')}
                                </Button>
                            )}
                        </td>
                    </tr>
                ))}
            </Table>
            <Pagination meta={products} className="mt-6" />

            <Modal open={!!target} onClose={() => setTarget(null)} title={t('moderation.remove_title', { name: target?.name ?? '' })}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.patch(route('admin.moderation.products.toggle', target.slug), { preserveScroll: true, onSuccess: () => { form.reset(); setTarget(null); } });
                    }}
                    className="space-y-4"
                >
                    <Textarea label={t('afarmers.reason')} placeholder={t('ph.reason')} rows={3} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} required />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setTarget(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" variant="danger" loading={form.processing}>
                            {t('moderation.remove')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
