import { Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MapView } from '@/Components/Map';
import { Badge, Button, buttonClass, Modal, PageHeader, Table } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';

export default function AdminMarkets({ markets }) {
    const t = useT();
    const { days, time } = useFormat();
    const [toDelete, setToDelete] = useState(null);

    return (
        <>
            <PageHeader
                title={t('amarkets.title')}
                description={t('amarkets.subtitle')}
                actions={
                    <Link href={route('admin.markets.create')} className={buttonClass('primary', 'sm')}>
                        <Plus className="size-4" /> {t('amarkets.add')}
                    </Link>
                }
            />
            <MapView className="mt-8 h-72" markers={markets.map((m) => ({ id: m.id, lat: m.latitude, lng: m.longitude, title: m.name, subtitle: m.address, color: m.is_active ? '#1F4D36' : '#9AA39B', label: m.farmers_count }))} />
            <Table className="mt-6" head={[t('amarkets.name'), t('market.days'), t('market.hours'), t('afarmers.title_short'), t('afarmers.orders'), t('afarmers.status'), '']}>
                {markets.map((m) => (
                    <tr key={m.id} className="hover:bg-ink/[0.02]">
                        <td className="px-5 py-3.5">
                            <p className="font-medium">{m.name}</p>
                            <p className="text-xs text-ink-soft">{m.city}</p>
                        </td>
                        <td className="px-5 py-3.5 text-ink-soft">{days(m.operating_days)}</td>
                        <td className="px-5 py-3.5 text-ink-soft">
                            {time(m.opens_at)}–{time(m.closes_at)}
                        </td>
                        <td className="px-5 py-3.5 tabular-nums">{m.farmers_count}</td>
                        <td className="px-5 py-3.5 tabular-nums">{m.orders_count}</td>
                        <td className="px-5 py-3.5">
                            <Badge className={m.is_active ? 'bg-success/15 text-success ring-success/30' : 'bg-ink/5 text-ink-soft ring-line'}>{t(m.is_active ? 'status.active' : 'status.inactive')}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1">
                                <Link href={route('admin.markets.edit', m.slug)} className={buttonClass('ghost', 'icon')} aria-label={t('common.edit')}>
                                    <Pencil className="size-4" />
                                </Link>
                                <button onClick={() => setToDelete(m)} className={buttonClass('ghost', 'icon', 'text-danger')} aria-label={t('common.delete')}>
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </Table>
            <Modal open={!!toDelete} onClose={() => setToDelete(null)} title={t('amarkets.delete_title')}>
                <p className="text-ink-soft">{t('amarkets.delete_body', { name: toDelete?.name })}</p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setToDelete(null)}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="danger" onClick={() => router.delete(route('admin.markets.destroy', toDelete.slug), { preserveScroll: true, onFinish: () => setToDelete(null) })}>
                        {t('common.delete')}
                    </Button>
                </div>
            </Modal>
        </>
    );
}
