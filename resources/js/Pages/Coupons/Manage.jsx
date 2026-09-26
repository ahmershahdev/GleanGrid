import { router, useForm, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, Dices, Plus, Power, TicketPercent, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, EmptyState, Input, Modal, PageHeader, Select } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const BLANK = { farmer_profile_id: '', code: '', description: '', type: 'percent', value: 10, min_subtotal: '', max_discount: '', usage_limit: '', per_customer_limit: 1, starts_at: '', ends_at: '', is_active: true };

function randomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion
    return 'FRESH' + Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => alphabet[b % alphabet.length]).join('');
}

function statusOf(c) {
    const now = Date.now();
    if (!c.is_active) return 'off';
    if (c.starts_at && new Date(c.starts_at) > now) return 'scheduled';
    if (c.ends_at && new Date(c.ends_at) < now) return 'expired';
    if (c.usage_limit && c.used_count >= c.usage_limit) return 'used_up';
    return 'live';
}

const TONES = { live: 'bg-success/15 text-success', scheduled: 'bg-sun/20 text-warning', expired: 'bg-ink/5 text-ink-faint', used_up: 'bg-ink/5 text-ink-faint', off: 'bg-danger/10 text-danger' };

function Ticket({ coupon, onDelete, admin }) {
    const t = useT();
    const { money, date } = useFormat();
    const [copied, setCopied] = useState(false);
    const status = statusOf(coupon);
    const used = coupon.usage_limit ? Math.min(100, (coupon.used_count / coupon.usage_limit) * 100) : null;

    return (
        <motion.article layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className={cn('group relative flex overflow-hidden rounded-[28px] border border-line bg-elev', status !== 'live' && 'opacity-80')}>
            {/* Stub with the value, separated by a perforated edge like a paper ticket. */}
            <div className="relative flex w-32 shrink-0 flex-col items-center justify-center bg-brand px-3 py-6 text-center text-brand-ink sm:w-36">
                <TicketPercent className="size-5 opacity-60" />
                <p className="font-display mt-2 text-3xl leading-none">{coupon.type === 'percent' ? `${Number(coupon.value)}%` : money(coupon.value)}</p>
                <p className="mt-1 text-xs opacity-75">{t('coupons.off')}</p>
                <span className="absolute -end-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-bg" />
                <span className="absolute inset-y-4 end-0 border-e-2 border-dashed border-brand-ink/25" />
            </div>
            <div className="min-w-0 flex-1 p-5">
                <div className="flex items-start justify-between gap-3">
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(coupon.code);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                            } catch {
                                /* ignore */
                            }
                        }}
                        className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-ink/[0.04] px-3 py-1.5 font-mono text-sm font-semibold tracking-wider transition hover:bg-ink/10"
                        aria-label={t('coupons.copy')}
                    >
                        <span className="truncate">{coupon.code}</span>
                        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5 opacity-50" />}
                    </button>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', TONES[status])}>{t(`coupons.status_${status}`)}</span>
                </div>
                {admin && coupon.farmer && <p className="mt-2 text-xs text-ink-faint">{coupon.farmer.stall_name}</p>}
                {coupon.description && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{coupon.description}</p>}
                <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-faint">
                    {coupon.min_subtotal > 0 && <li>{t('coupons.min_short', { amount: money(coupon.min_subtotal) })}</li>}
                    {coupon.max_discount && <li>{t('coupons.cap_short', { amount: money(coupon.max_discount) })}</li>}
                    <li>{t('coupons.per_customer_short', { count: coupon.per_customer_limit })}</li>
                    {coupon.ends_at && <li>{t('coupons.until', { date: date(coupon.ends_at) })}</li>}
                </ul>
                <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-soft">{t('coupons.used', { count: coupon.used_count, limit: coupon.usage_limit ?? '∞' })}</span>
                        <span className="font-medium tabular-nums">{money(coupon.discounted ?? 0)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                        <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: used === null ? '100%' : `${used}%` }} style={{ opacity: used === null ? 0.25 : 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="soft" onClick={() => router.put(route(`${admin ? 'admin' : 'farmer'}.coupons.update`, coupon.id), { toggle: 1 }, { preserveScroll: true })}>
                        <Power className="size-3.5" /> {t(coupon.is_active ? 'coupons.pause' : 'coupons.resume')}
                    </Button>
                    <Button size="sm" variant="ghost" className="ms-auto text-danger" onClick={() => onDelete(coupon)} aria-label={t('common.delete')}>
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>
        </motion.article>
    );
}

export default function Manage({ coupons, farmers }) {
    const t = useT();
    const { auth, app } = usePage().props;
    const admin = auth.user.role === 'admin';
    const scope = admin ? 'admin' : 'farmer';
    const [open, setOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const form = useForm(BLANK);
    const field = (name) => ({ value: form.data[name] ?? '', onChange: (e) => form.setData(name, e.target.value), error: form.errors[name] });

    const save = (e) => {
        e.preventDefault();
        form.post(route(`${scope}.coupons.store`), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });
    };

    return (
        <>
            <PageHeader
                eyebrow={t(admin ? 'coupons.eyebrow_admin' : 'coupons.eyebrow')}
                title={t('coupons.title')}
                description={t('coupons.subtitle')}
                actions={
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="size-4" /> {t('coupons.add')}
                    </Button>
                }
            />

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
                <AnimatePresence>
                    {coupons.map((c) => (
                        <Ticket key={c.id} coupon={c} admin={admin} onDelete={setToDelete} />
                    ))}
                </AnimatePresence>
            </div>
            {coupons.length === 0 && <EmptyState icon="rosette" title={t('coupons.empty_title')} body={t('coupons.empty_body')} action={<Button onClick={() => setOpen(true)}>{t('coupons.add')}</Button>} />}

            <Modal open={open} onClose={() => setOpen(false)} title={t('coupons.add')} wide>
                <form onSubmit={save} className="space-y-5">
                    {admin && (
                        <Select label={t('coupons.stall')} {...field('farmer_profile_id')} placeholder={t('coupons.pick_stall')} required>
                            {farmers.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.stall_name}
                                </option>
                            ))}
                        </Select>
                    )}
                    <div className="flex items-end gap-2">
                        <Input wrapperClass="flex-1" label={t('coupons.code')} placeholder="FRESH10" {...field('code')} onChange={(e) => form.setData('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} className="font-mono tracking-wider uppercase" maxLength={30} required />
                        <Button type="button" variant="outline" className="h-12" onClick={() => form.setData('code', randomCode())} aria-label={t('coupons.generate')}>
                            <Dices className="size-4" />
                        </Button>
                    </div>
                    <Input label={t('coupons.description')} placeholder={t('coupons.description_ph')} {...field('description')} maxLength={160} />

                    <div>
                        <p className="mb-1.5 text-sm font-medium text-ink-soft">{t('coupons.type')}</p>
                        <div className="relative grid grid-cols-2 rounded-full bg-ink/5 p-1">
                            {['percent', 'fixed'].map((type) => (
                                <button key={type} type="button" onClick={() => form.setData('type', type)} aria-pressed={form.data.type === type} className={cn('relative z-10 h-10 rounded-full text-sm font-medium transition', form.data.type === type ? 'text-brand-ink' : 'text-ink-soft')}>
                                    {form.data.type === type && <motion.span layoutId="coupon-type" className="absolute inset-0 -z-10 rounded-full bg-brand" />}
                                    {t(`coupons.type_${type}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Input label={form.data.type === 'percent' ? t('coupons.percent') : `${t('coupons.amount')} (${app.currency})`} type="number" min="0" step="0.01" max={form.data.type === 'percent' ? 100 : undefined} {...field('value')} required />
                        <Input label={`${t('coupons.min')} (${app.currency})`} placeholder="0" type="number" min="0" step="0.01" {...field('min_subtotal')} />
                        {form.data.type === 'percent' && <Input label={`${t('coupons.cap')} (${app.currency})`} placeholder={t('coupons.optional')} type="number" min="0" step="0.01" {...field('max_discount')} />}
                        <Input label={t('coupons.limit')} placeholder={t('coupons.unlimited')} type="number" min="1" {...field('usage_limit')} />
                        <Input label={t('coupons.per_customer')} type="number" min="1" max="100" {...field('per_customer_limit')} required />
                        <Input label={t('coupons.starts')} type="datetime-local" {...field('starts_at')} />
                        <Input label={t('coupons.ends')} type="datetime-local" {...field('ends_at')} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" loading={form.processing}>
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal open={!!toDelete} onClose={() => setToDelete(null)} title={t('coupons.delete_title', { code: toDelete?.code ?? '' })}>
                <p className="text-ink-soft">{t('coupons.delete_body')}</p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setToDelete(null)}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="danger" onClick={() => router.delete(route(`${scope}.coupons.destroy`, toDelete.id), { preserveScroll: true, onSuccess: () => setToDelete(null) })}>
                        {t('common.delete')}
                    </Button>
                </div>
            </Modal>
        </>
    );
}
