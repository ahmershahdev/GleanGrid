import { router, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar, Button, Card, Checkbox, Modal, PageHeader, Pagination, Stars, Textarea } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cleanQuery, cn } from '@/lib/utils';

export default function ModerateReviews({ reviews, filters }) {
    const t = useT();
    const { relative } = useFormat();
    const [target, setTarget] = useState(null);
    const [del, setDel] = useState(null);
    const form = useForm({ reason: '' });
    const apply = (patch) => router.get(route('admin.moderation.reviews'), cleanQuery({ ...filters, ...patch }), { preserveState: true });

    return (
        <>
            <PageHeader title={t('moderation.reviews_title')} description={t('moderation.reviews_sub')} />
            <div className="mt-8 flex flex-wrap items-center gap-4">
                <Checkbox label={t('moderation.hidden_only')} checked={!!Number(filters.hidden)} onChange={(e) => apply({ hidden: e.target.checked ? 1 : undefined })} />
                <Checkbox label={t('moderation.low_only')} checked={!!filters.max_rating} onChange={(e) => apply({ max_rating: e.target.checked ? 2 : undefined })} />
            </div>
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
                {reviews.data.map((r) => (
                    <Card key={r.id} className={cn('p-5', r.is_hidden && 'border-danger/40 bg-danger/[0.03]')}>
                        <div className="flex items-center gap-3">
                            <Avatar name={r.user.name} size="size-9" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold">{r.user.name}</p>
                                <p className="text-xs text-ink-faint">
                                    {t(`reviews.type_${r.reviewable_type}`)}: {r.subject} · {relative(r.created_at)}
                                </p>
                            </div>
                            <Stars value={r.rating} />
                        </div>
                        {r.comment && <p className="mt-3 text-ink-soft">{r.comment}</p>}
                        {r.is_hidden && <p className="mt-2 text-xs text-danger">{t('moderation.hidden_reason', { reason: r.hidden_reason })}</p>}
                        <div className="mt-4 flex gap-2">
                            {r.is_hidden ? (
                                <Button size="sm" variant="outline" onClick={() => router.patch(route('admin.moderation.reviews.toggle', r.id), {}, { preserveScroll: true })}>
                                    <Eye className="size-4" /> {t('moderation.restore')}
                                </Button>
                            ) : (
                                <Button size="sm" variant="ghost" onClick={() => setTarget(r)}>
                                    <EyeOff className="size-4" /> {t('moderation.hide')}
                                </Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDel(r)}>
                                <Trash2 className="size-4" /> {t('common.delete')}
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
            <Pagination meta={reviews} className="mt-6" />

            <Modal open={!!target} onClose={() => setTarget(null)} title={t('moderation.hide_title')}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.patch(route('admin.moderation.reviews.toggle', target.id), { preserveScroll: true, onSuccess: () => { form.reset(); setTarget(null); } });
                    }}
                    className="space-y-4"
                >
                    <Textarea label={t('afarmers.reason')} placeholder={t('ph.reason')} rows={3} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} required />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setTarget(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" variant="danger" loading={form.processing}>
                            {t('moderation.hide')}
                        </Button>
                    </div>
                </form>
            </Modal>
            <Modal open={!!del} onClose={() => setDel(null)} title={t('moderation.delete_title')}>
                <p className="text-ink-soft">{t('moderation.delete_body')}</p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setDel(null)}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="danger" onClick={() => router.delete(route('admin.moderation.reviews.destroy', del.id), { preserveScroll: true, onFinish: () => setDel(null) })}>
                        {t('common.delete')}
                    </Button>
                </div>
            </Modal>
        </>
    );
}
