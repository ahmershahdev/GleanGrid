import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Avatar, Badge, Button, PageHeader, Pagination, Table, Tabs } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cleanQuery } from '@/lib/utils';

export default function AdminCustomers({ customers, filters }) {
    const t = useT();
    const { money, relative } = useFormat();
    const [q, setQ] = useState(filters.q ?? '');
    const tab = (status) => route('admin.customers.index', cleanQuery({ ...filters, status }));
    const toggle = (c) => router.patch(route('admin.customers.status', c.id), { status: c.status === 'active' ? 'inactive' : 'active' }, { preserveScroll: true });

    return (
        <>
            <PageHeader title={t('acustomers.title')} description={t('acustomers.subtitle')} />
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Tabs active={filters.status ?? 'all'} tabs={[{ key: 'all', label: t('common.all'), href: tab(undefined) }, { key: 'active', label: t('status.active'), href: tab('active') }, { key: 'inactive', label: t('status.inactive'), href: tab('inactive') }]} />
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.get(route('admin.customers.index'), cleanQuery({ ...filters, q }), { preserveState: true });
                    }}
                    className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-elev px-3"
                >
                    <Search className="size-4 text-ink-faint" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} className="w-44 bg-transparent text-sm focus:outline-none" />
                </form>
            </div>
            <Table className="mt-6" head={[t('acustomers.customer'), t('fields.phone'), t('afarmers.orders'), t('acustomers.no_shows', {}, 'Missed'), t('acustomers.spent'), t('acustomers.joined'), t('afarmers.status'), '']}>
                {customers.data.map((c) => (
                    <tr key={c.id} className="hover:bg-ink/[0.02]">
                        <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                                <Avatar name={c.name} size="size-9" />
                                <div>
                                    <p className="font-medium">{c.name}</p>
                                    <p className="text-xs text-ink-soft">{c.email}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-5 py-3.5 text-ink-soft" dir="ltr">
                            {c.phone}
                        </td>
                        <td className="px-5 py-3.5 tabular-nums">{c.orders_count}</td>
                        <td className="px-5 py-3.5">
                            {c.recent_no_shows > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => router.patch(route('admin.customers.no-shows.reset', c.id), {}, { preserveScroll: true })}
                                    className="group inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger"
                                    title={t('acustomers.reset_no_shows', {}, 'Reset missed pickups')}
                                >
                                    {c.recent_no_shows}
                                    <span className="hidden group-hover:inline">· {t('acustomers.reset', {}, 'Reset')}</span>
                                </button>
                            ) : (
                                <span className="text-ink-faint">0</span>
                            )}
                        </td>
                        <td className="px-5 py-3.5 tabular-nums">{money(c.spent ?? 0)}</td>
                        <td className="px-5 py-3.5 text-ink-soft">{relative(c.created_at)}</td>
                        <td className="px-5 py-3.5">
                            <Badge className={c.status === 'active' ? 'bg-success/15 text-success ring-success/30' : 'bg-danger/10 text-danger ring-danger/25'}>{t(`status.${c.status}`)}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-end">
                            <Button size="sm" variant={c.status === 'active' ? 'ghost' : 'primary'} className={c.status === 'active' ? 'text-danger' : ''} onClick={() => toggle(c)}>
                                {t(c.status === 'active' ? 'acustomers.deactivate' : 'acustomers.activate')}
                            </Button>
                        </td>
                    </tr>
                ))}
            </Table>
            <Pagination meta={customers} className="mt-6" />
        </>
    );
}
