import { Link } from '@inertiajs/react';
import { EyeOff, MessageCircleReply } from 'lucide-react';
import { Card, EmptyState, PageHeader, Pagination, Stars } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';

export default function MyReviews({ reviews }) {
    const t = useT();
    const { relative } = useFormat();

    return (
        <>
            <PageHeader title={t('reviews.mine_title')} description={t('reviews.mine_sub')} />
            <div className="mt-8 space-y-3">
                {reviews.data.length === 0 && <EmptyState icon="rosette" title={t('reviews.mine_empty')} />}
                {reviews.data.map((r) => (
                    <Card key={r.id} className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs text-ink-faint uppercase">{t(`reviews.type_${r.reviewable_type}`)}</p>
                                {r.slug ? (
                                    <Link href={r.reviewable_type === 'farmer' ? route('farmers.show', r.slug) : route('products.show', r.slug)} className="font-display text-xl hover:underline">
                                        {r.subject}
                                    </Link>
                                ) : (
                                    <p className="font-display text-xl">{r.subject}</p>
                                )}
                            </div>
                            <div className="text-end">
                                <Stars value={r.rating} />
                                <p className="text-xs text-ink-faint">{relative(r.created_at)}</p>
                            </div>
                        </div>
                        {r.comment && <p className="mt-3 text-ink-soft">{r.comment}</p>}
                        {r.is_hidden && (
                            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-xs text-danger">
                                <EyeOff className="size-3.5" /> {t('reviews.hidden_by_admin')}
                            </p>
                        )}
                        {r.farmer_reply && (
                            <div className="mt-3 flex gap-2 rounded-2xl bg-brand-soft p-3 text-sm">
                                <MessageCircleReply className="mt-0.5 size-4 shrink-0 text-brand" /> {r.farmer_reply}
                            </div>
                        )}
                    </Card>
                ))}
            </div>
            <Pagination meta={reviews} className="mt-6" />
        </>
    );
}
