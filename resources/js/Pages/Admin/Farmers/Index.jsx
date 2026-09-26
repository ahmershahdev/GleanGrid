import { Link, router } from '@inertiajs/react';
import { Check, Search } from 'lucide-react';
import { useState } from 'react';
import { SuspendModal } from '@/Pages/Admin/Farmers/Show';
import { Button, PageHeader, Pagination, StatusBadge, Table, Tabs } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cleanQuery } from '@/lib/utils';

export default function AdminFarmers({ farmers, counts, filters }) {
    const t = useT();
    const { relative } = useFormat();
    const [q, setQ] = useState(filters.q ?? '');
    const [suspend, setSuspend] = useState(null);
    const tab = (status) => route('admin.farmers.index', cleanQuery({ ...filters, status }));
    const approve = (f) => router.patch(route('admin.farmers.status', f.slug), { status: 'approved' }, { preserveScroll: true });

    return (
        <>
            <PageHeader title={t('afarmers.title')} description={t('afarmers.subtitle')} />
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    active={filters.status ?? 'all'}
                    tabs={[{ key: 'all', label: t('common.all'), href: tab(undefined) }, ...['pending', 'approved', 'suspended'].map((s) => ({ key: s, label: t(`status.${s}`), href: tab(s), count: counts[s] ?? 0 }))]}
                />
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.get(route('admin.farmers.index'), cleanQuery({ ...filters, q }), { preserveState: true });
                    }}
                    className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-elev px-3"
                >
                    <Search className="size-4 text-ink-faint" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} className="w-44 bg-transparent text-sm focus:outline-none" />
                </form>
            </div>
            <Table className="mt-6" head={[t('afarmers.stall'), t('afarmers.contact'), t('afarmers.products'), t('afarmers.orders'), t('afarmers.registered'), t('afarmers.status'), '']}>
                {farmers.data.map((f) => (
                    <tr key={f.id} className="hover:bg-ink/[0.02]">
                        <td className="px-5 py-3.5">
                            <Link href={route('admin.farmers.show', f.slug)} className="flex items-center gap-3 font-medium hover:underline">
                                {f.logo_url && <img src={f.logo_url} alt="" className="size-8 object-contain" />}
                                {f.stall_name}
                            </Link>
                        </td>
                        <td className="px-5 py-3.5 text-ink-soft">
                            {f.contact_person}
                            <br />
                            <span className="text-xs">{f.email}</span>
                        </td>
                        <td className="px-5 py-3.5 tabular-nums">{f.products_count}</td>
                        <td className="px-5 py-3.5 tabular-nums">{f.orders_count}</td>
                        <td className="px-5 py-3.5 text-ink-soft">{relative(f.created_at)}</td>
                        <td className="px-5 py-3.5">
                            <StatusBadge status={f.status} kind="farmer" />
                        </td>
                        <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1.5">
                                {f.status !== 'approved' && (
                                    <Button size="sm" onClick={() => approve(f)}>
                                        <Check className="size-4" /> {t('admin.approve')}
                                    </Button>
                                )}
                                {f.status !== 'suspended' && (
                                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => setSuspend(f)}>
                                        {t('admin.suspend')}
                                    </Button>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
            </Table>
            <Pagination meta={farmers} className="mt-6" />
            <SuspendModal farmer={suspend} onClose={() => setSuspend(null)} />
        </>
    );
}
