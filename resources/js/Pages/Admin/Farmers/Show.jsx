import { Link, router, useForm } from '@inertiajs/react';
import { Check, ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, Modal, Stat, StatusBadge, Textarea } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';

export function SuspendModal({ farmer, onClose }) {
    const t = useT();
    const form = useForm({ status: 'suspended', reason: '' });
    return (
        <Modal open={!!farmer} onClose={onClose} title={t('afarmers.suspend_title', { name: farmer?.stall_name ?? '' })}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.patch(route('admin.farmers.status', farmer.slug), { preserveScroll: true, onSuccess: () => { form.reset('reason'); onClose(); } });
                }}
                className="space-y-4"
            >
                <p className="text-sm text-ink-soft">{t('afarmers.suspend_body')}</p>
                <Textarea label={t('afarmers.reason')} placeholder={t('ph.reason')} rows={3} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} />
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" variant="danger" loading={form.processing}>
                        {t('admin.suspend')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export default function AdminFarmerShow({ farmer, products, stats, recentOrders }) {
    const t = useT();
    const { money, day, time, date } = useFormat();
    const [suspend, setSuspend] = useState(null);

    return (
        <>
            <Link href={route('admin.farmers.index')} className="text-sm text-ink-soft hover:text-ink">
                ← {t('dash.farmers')}
            </Link>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {farmer.logo_url && <img src={farmer.logo_url} alt="" className="size-16 object-contain" />}
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="font-display text-4xl font-light">{farmer.stall_name}</h1>
                            <StatusBadge status={farmer.status} kind="farmer" />
                        </div>
                        <p className="text-sm text-ink-soft">{farmer.tagline}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {farmer.status === 'approved' && (
                        <a href={route('farmers.show', farmer.slug)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm font-medium">
                            {t('dash.public_stall')} <ExternalLink className="size-3.5" />
                        </a>
                    )}
                    {farmer.status !== 'approved' && (
                        <Button size="sm" onClick={() => router.patch(route('admin.farmers.status', farmer.slug), { status: 'approved' }, { preserveScroll: true })}>
                            <Check className="size-4" /> {t('admin.approve')}
                        </Button>
                    )}
                    {farmer.status !== 'suspended' && (
                        <Button size="sm" variant="danger" onClick={() => setSuspend(farmer)}>
                            {t('admin.suspend')}
                        </Button>
                    )}
                </div>
            </div>
            {farmer.status_reason && <p className="mt-4 rounded-2xl bg-danger/10 p-3 text-sm text-danger">{farmer.status_reason}</p>}

            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label={t('afarmers.orders')} value={stats.orders} />
                <Stat label={t('status.completed')} value={stats.completed} />
                <Stat label={t('farmer.revenue')} value={money(stats.revenue)} tone="brand" />
                <Stat label={t('afarmers.cancel_rate')} value={`${stats.cancel_rate}%`} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
                <Card className="space-y-4 p-6">
                    <h2 className="font-display text-xl">{t('afarmers.details')}</h2>
                    <p className="text-sm">
                        <span className="text-ink-faint">{t('fields.contact_person')}:</span> {farmer.contact_person}
                    </p>
                    <p className="flex items-center gap-2 text-sm">
                        <Phone className="size-4 text-ink-faint" /> <span dir="ltr">{farmer.phone}</span>
                    </p>
                    <p className="flex items-center gap-2 text-sm">
                        <Mail className="size-4 text-ink-faint" /> {farmer.email}
                    </p>
                    <p className="flex items-start gap-2 text-sm">
                        <MapPin className="mt-0.5 size-4 text-ink-faint" /> {farmer.address}
                    </p>
                    <p className="text-sm text-ink-soft">{farmer.bio}</p>
                    <div className="border-t border-line pt-4">
                        <p className="text-sm font-medium">{t('farmer.sells_at')}</p>
                        <p className="mt-1 text-sm text-ink-soft">{farmer.markets.map((m) => m.name).join(' · ') || '—'}</p>
                    </div>
                    <div className="border-t border-line pt-4">
                        <p className="text-sm font-medium">{t('farmer.pickup_windows')}</p>
                        <ul className="mt-1 space-y-1 text-sm text-ink-soft">
                            {farmer.pickup_slots.map((s) => (
                                <li key={s.id}>
                                    {day(s.day_of_week, 'short')} {time(s.starts_at)}–{time(s.ends_at)} · {s.market.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="font-display text-xl">{t('afarmers.listings', { count: products.length })}</h2>
                        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                            {products.map((p) => (
                                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-ink/[0.03] p-2.5">
                                    <img src={p.image_url} alt="" className="size-9 object-contain" />
                                    <span className="flex-1 truncate text-sm">{p.name}</span>
                                    <StatusBadge status={p.removed_at ? 'unavailable' : p.status} kind="product" />
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card className="p-6">
                        <h2 className="font-display text-xl">{t('admin.recent_title')}</h2>
                        <ul className="mt-4 space-y-2 text-sm">
                            {recentOrders.map((o) => (
                                <li key={o.id} className="flex items-center gap-3">
                                    <span className="font-mono text-xs">{o.code}</span>
                                    <span className="flex-1 text-ink-soft">{o.customer.name}</span>
                                    <span className="text-xs text-ink-faint">{date(o.pickup_date)}</span>
                                    <StatusBadge status={o.status} />
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
            <SuspendModal farmer={suspend} onClose={() => setSuspend(null)} />
        </>
    );
}
