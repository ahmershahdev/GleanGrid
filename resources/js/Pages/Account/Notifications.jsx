import { router } from '@inertiajs/react';
import { CheckCheck } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader, Pagination } from '@/Components/ui';
import { notificationText } from '@/Components/widgets';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function Notifications({ items }) {
    const t = useT();
    const { relative } = useFormat();

    return (
        <>
            <PageHeader
                title={t('notifications.title')}
                description={t('notifications.subtitle')}
                actions={
                    <Button variant="outline" size="sm" onClick={() => router.post(route('notifications.read-all'), {}, { preserveScroll: true })}>
                        <CheckCheck className="size-4" /> {t('notifications.mark_all')}
                    </Button>
                }
            />
            <div className="mt-8">
                {items.data.length === 0 ? (
                    <EmptyState icon="sun" title={t('notifications.empty')} />
                ) : (
                    <Card className="divide-y divide-line overflow-hidden">
                        {items.data.map((n) => {
                            const { title, body } = notificationText(t, n.data);
                            return (
                                <button key={n.id} onClick={() => router.post(route('notifications.read', n.id))} className={cn('flex w-full items-start gap-4 px-5 py-4 text-start transition hover:bg-ink/[0.03]', !n.read && 'bg-lime/10')}>
                                    <span className={cn('mt-2 size-2.5 shrink-0 rounded-full', n.read ? 'bg-line-strong' : 'bg-accent')} />
                                    <span className="flex-1">
                                        <span className="block font-medium">{title}</span>
                                        <span className="block text-sm text-ink-soft">{body}</span>
                                    </span>
                                    <span className="shrink-0 text-xs text-ink-faint">{relative(n.created_at)}</span>
                                </button>
                            );
                        })}
                    </Card>
                )}
                <Pagination meta={items} className="mt-6" />
            </div>
        </>
    );
}
