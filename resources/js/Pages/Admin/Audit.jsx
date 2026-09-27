import { router } from '@inertiajs/react';
import { motion } from 'motion/react';
import { Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Avatar, Badge, EmptyState, PageHeader, Pagination, Tabs } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cleanQuery } from '@/lib/utils';

const TONE = {
    farmer: 'bg-brand-soft text-brand ring-brand/25',
    customer: 'bg-sun/20 text-[color:var(--warning)] ring-sun/40',
    review: 'bg-accent/15 text-accent ring-accent/30',
    listing: 'bg-accent/15 text-accent ring-accent/30',
    order: 'bg-danger/10 text-danger ring-danger/25',
    settings: 'bg-ink/10 text-ink ring-line-strong',
    account: 'bg-ink/10 text-ink ring-line-strong',
};

export default function AdminAudit({ logs, actions, filters }) {
    const t = useT();
    const { date, time, relative } = useFormat();
    const [q, setQ] = useState(filters.q ?? '');
    const tab = (action) => route('admin.audit.index', cleanQuery({ ...filters, action }));

    return (
        <>
            <PageHeader eyebrow={t('audit.eyebrow', {}, 'Accountability')} title={t('audit.title', {}, 'Audit log')} description={t('audit.subtitle', {}, 'Every approval, suspension, moderation decision, setting change and override — who did it, when, and from where.')} />

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Tabs active={filters.action ?? 'all'} tabs={[{ key: 'all', label: t('common.all'), href: tab(undefined) }, ...actions.map((a) => ({ key: a, label: t(`audit.area.${a}`, {}, a[0].toUpperCase() + a.slice(1)), href: tab(a) }))]} />
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.get(route('admin.audit.index'), cleanQuery({ ...filters, q }), { preserveState: true });
                    }}
                    className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-elev px-3"
                    role="search"
                >
                    <Search className="size-4 text-ink-faint" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} aria-label={t('common.search')} className="w-44 bg-transparent text-sm focus:outline-none" />
                </form>
            </div>

            {logs.data.length === 0 ? (
                <EmptyState className="mt-10" title={t('audit.empty', {}, 'Nothing recorded yet')} body={t('audit.empty_body', {}, 'Administrative actions will appear here as they happen.')} />
            ) : (
                <ol className="relative mt-8 space-y-3 border-s border-line ps-6">
                    {logs.data.map((log, i) => {
                        const area = log.action.split('.')[0];
                        return (
                            <motion.li key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="relative rounded-2xl border border-line bg-elev p-4">
                                <span className="absolute -start-[1.95rem] top-5 flex size-3 items-center justify-center rounded-full border-2 border-bg bg-brand" aria-hidden="true" />
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <Avatar name={log.user?.name ?? 'System'} size="size-9" />
                                        <div className="min-w-0">
                                            <p className="text-sm">
                                                <span className="font-semibold">{log.user?.name ?? t('audit.system', {}, 'System')}</span> <span className="text-ink-soft">{log.description}</span>
                                            </p>
                                            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                                                <Badge className={TONE[area] ?? 'bg-ink/5 text-ink-soft ring-line'}>{log.action}</Badge>
                                                <span title={`${date(log.created_at)} ${time(log.created_at)}`}>{relative(log.created_at)}</span>
                                                {log.ip_address && (
                                                    <span className="font-mono" dir="ltr">
                                                        {log.ip_address}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    {log.subject_type && (
                                        <span className="shrink-0 font-mono text-xs text-ink-faint">
                                            {log.subject_type} #{log.subject_id}
                                        </span>
                                    )}
                                </div>
                                {log.meta && (
                                    <pre className="mt-3 overflow-x-auto rounded-xl bg-sunk px-3 py-2 font-mono text-[11px] text-ink-soft" dir="ltr">
                                        {JSON.stringify(log.meta)}
                                    </pre>
                                )}
                            </motion.li>
                        );
                    })}
                </ol>
            )}
            <Pagination meta={logs} className="mt-6" />
            <p className="mt-6 flex items-center gap-2 text-xs text-ink-faint">
                <ShieldCheck className="size-4" /> {t('audit.note', {}, 'Entries are append-only: the application never edits or deletes them.')}
            </p>
        </>
    );
}
