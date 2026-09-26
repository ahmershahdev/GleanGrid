import { useForm } from '@inertiajs/react';
import { MessageCircleReply, Star } from 'lucide-react';
import { useState } from 'react';
import { Avatar, Button, Card, EmptyState, PageHeader, Pagination, Stars, Tabs, Textarea } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';

function ReplyBox({ review }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const form = useForm({ farmer_reply: review.farmer_reply ?? '' });

    if (!open) {
        return review.farmer_reply ? (
            <div className="mt-3 flex gap-2 rounded-2xl bg-brand-soft p-3 text-sm">
                <MessageCircleReply className="mt-0.5 size-4 shrink-0 text-brand" />
                <p className="flex-1">{review.farmer_reply}</p>
                <button onClick={() => setOpen(true)} className="text-xs font-medium text-brand">
                    {t('common.edit')}
                </button>
            </div>
        ) : (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setOpen(true)}>
                <MessageCircleReply className="size-4" /> {t('freviews.reply')}
            </Button>
        );
    }
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.put(route('farmer.reviews.reply', review.id), { preserveScroll: true, onSuccess: () => setOpen(false) });
            }}
            className="mt-3 space-y-2"
        >
            <Textarea rows={2} value={form.data.farmer_reply} onChange={(e) => form.setData('farmer_reply', e.target.value)} placeholder={t('freviews.placeholder')} error={form.errors.farmer_reply} autoFocus />
            <div className="flex gap-2">
                <Button type="submit" size="sm" loading={form.processing}>
                    {t('freviews.post')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                    {t('common.cancel')}
                </Button>
            </div>
        </form>
    );
}

export default function FarmerReviews({ reviews, rating, filter }) {
    const t = useT();
    const { relative } = useFormat();

    return (
        <>
            <PageHeader
                title={t('freviews.title')}
                description={t('freviews.subtitle')}
                actions={
                    <span className="inline-flex items-center gap-2 rounded-full bg-elev px-4 py-2 ring-1 ring-line">
                        <Star className="size-5 fill-sun text-sun" /> <span className="font-display text-2xl">{Number(rating.rating_avg).toFixed(2)}</span>
                        <span className="text-sm text-ink-soft">({rating.rating_count})</span>
                    </span>
                }
            />
            <Tabs
                className="mt-8"
                active={filter ?? 'all'}
                tabs={[
                    { key: 'all', label: t('common.all'), href: route('farmer.reviews.index') },
                    { key: 'unanswered', label: t('freviews.unanswered'), href: route('farmer.reviews.index', { filter: 'unanswered' }) },
                ]}
            />
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
                {reviews.data.length === 0 && <EmptyState className="lg:col-span-2" icon="rosette" title={t('reviews.none')} />}
                {reviews.data.map((r) => (
                    <Card key={r.id} className="p-5">
                        <div className="flex items-center gap-3">
                            <Avatar name={r.user.name} size="size-9" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold">{r.user.name}</p>
                                <p className="text-xs text-ink-faint">
                                    {r.subject ? t('freviews.on_product', { name: r.subject }) : t('freviews.on_stall')} · {relative(r.created_at)}
                                </p>
                            </div>
                            <Stars value={r.rating} />
                        </div>
                        {r.comment && <p className="mt-3 text-ink-soft">{r.comment}</p>}
                        {r.is_hidden ? <p className="mt-3 text-xs text-danger">{t('reviews.hidden_by_admin')}</p> : <ReplyBox review={r} />}
                    </Card>
                ))}
            </div>
            <Pagination meta={reviews} className="mt-6" />
        </>
    );
}
