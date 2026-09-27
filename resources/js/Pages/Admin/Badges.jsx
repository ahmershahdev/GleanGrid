import { router, useForm } from '@inertiajs/react';
import { motion } from 'motion/react';
import { Lock, Plus, RefreshCw, RotateCcw, Search, Sigma, X } from 'lucide-react';
import { useState } from 'react';
import { BADGE_ORDER, BadgePill } from '@/Components/Badges';
import { SelectMenu } from '@/Components/Dropdown';
import { Button, Card, Input, Modal, PageHeader, Select, Stat, Textarea } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { pathUrl } from '@/lib/url';
import { cn } from '@/lib/utils';

function Meter({ value, max, good }) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (
        <span className="mt-1 block h-1.5 w-20 overflow-hidden rounded-full bg-ink/10">
            <motion.span className={cn('block h-full rounded-full', good ? 'bg-success' : 'bg-sun')} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
        </span>
    );
}

function RulesForm({ settings }) {
    const t = useT();
    const form = useForm(settings);
    const num = (key, label, step = 1) => <Input label={label} type="number" step={step} value={form.data[key]} onChange={(e) => form.setData(key, e.target.value)} error={form.errors[key]} />;
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.put(route('admin.badges.rules'), { preserveScroll: true });
            }}
            className="grid gap-3 sm:grid-cols-2"
        >
            {num('badge_prior_weight', t('badges.prior_weight'))}
            {num('badge_top_rated_min_score', t('badges.min_score'), 0.05)}
            {num('badge_top_rated_min_reviews', t('badges.min_reviews'))}
            {num('badge_reliable_min_orders', t('badges.min_orders'))}
            {num('badge_reliable_min_rate', t('badges.min_rate'))}
            {num('badge_rising_days', t('badges.rising_days'))}
            {num('badge_favourite_min', t('badges.fav_min'))}
            <div className="flex items-end">
                <Button type="submit" className="w-full" loading={form.processing}>
                    {t('badges.save_rules')}
                </Button>
            </div>
        </form>
    );
}

export default function AdminBadges({ farmers, rules, settings, counts, filters }) {
    const t = useT();
    const [award, setAward] = useState(null);
    const [revoke, setRevoke] = useState(null);
    const [q, setQ] = useState(filters.q ?? '');
    const awardForm = useForm({ badge: 'top_rated', reason: '' });
    const revokeForm = useForm({ reason: '' });
    const apply = (patch) => router.get(pathUrl('admin.badges.index', { ...filters, ...patch }), {}, { preserveState: true });

    return (
        <>
            <PageHeader
                title={t('badges.title')}
                description={t('badges.sub')}
                actions={
                    <Button size="sm" variant="outline" onClick={() => router.post(route('admin.badges.recompute'), {}, { preserveScroll: true })}>
                        <RefreshCw className="size-4" /> {t('badges.recompute')}
                    </Button>
                }
            />

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {BADGE_ORDER.map((b) => (
                    <Stat key={b} label={t(`badges.${b}`)} value={counts[b] ?? 0} hint={t(`badges.${b}_desc`)} />
                ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
                <Card className="p-6">
                    <h2 className="font-display flex items-center gap-2 text-2xl">
                        <Sigma className="size-5" /> {t('badges.how_title')}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t('badges.how_top')}</p>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li className="flex gap-2">
                            <BadgePill badge="top_rated" compact /> {t('badges.how_top_rule', { score: rules.top_rated_min_score, reviews: rules.top_rated_min_reviews })}
                        </li>
                        <li className="flex gap-2">
                            <BadgePill badge="reliable" compact /> {t('badges.how_reliable_rule', { orders: rules.reliable_min_orders, days: rules.window_days, rate: rules.reliable_min_rate })}
                        </li>
                        <li className="flex gap-2">
                            <BadgePill badge="rising_star" compact /> {t('badges.how_rising_rule', { days: rules.rising_days })}
                        </li>
                        <li className="flex gap-2">
                            <BadgePill badge="customer_favourite" compact /> {t('badges.how_fav_rule', { count: rules.favourite_min })}
                        </li>
                    </ul>
                    <p className="mt-4 rounded-2xl bg-ink/[0.03] p-3 text-xs text-ink-soft">
                        <Lock className="me-1 inline size-3.5" /> {t('badges.how_override')}
                    </p>
                </Card>
                <Card className="p-6">
                    <h2 className="font-display text-2xl">{t('badges.rules')}</h2>
                    <div className="mt-4">
                        <RulesForm settings={settings} />
                    </div>
                </Card>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({ q });
                    }}
                    className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-elev px-3"
                >
                    <Search className="size-4 text-ink-faint" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('farmers.search')} aria-label={t('farmers.search')} className="w-48 bg-transparent text-sm focus:outline-none" />
                </form>
                <SelectMenu value={filters.badge ?? ''} onChange={(e) => apply({ badge: e.target.value })} ariaLabel={t('badges.filter')}>
                    <option value="">{t('badges.any')}</option>
                    {BADGE_ORDER.map((b) => (
                        <option key={b} value={b}>
                            {t(`badges.${b}`)}
                        </option>
                    ))}
                </SelectMenu>
                {farmers[0] && <span className="text-xs text-ink-faint">{t('badges.global_mean', { c: farmers[0].global_mean })}</span>}
            </div>

            <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-elev">
                <table className="w-full min-w-[980px] text-sm">
                    <thead>
                        <tr className="border-b border-line text-start text-xs tracking-wide text-ink-faint uppercase">
                            {[t('badges.stall'), t('badges.score'), t('badges.reviews'), t('badges.fulfilment'), t('badges.favourites'), t('badges.title'), ''].map((h, i) => (
                                <th key={i} className="px-5 py-3.5 text-start font-medium">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {farmers.map((f) => (
                            <tr key={f.farmer_profile_id} className="align-top hover:bg-ink/[0.02]">
                                <td className="px-5 py-3">
                                    <span className="flex items-center gap-3">
                                        {f.logo_url && <img src={f.logo_url} alt="" className="size-9 object-contain" />}
                                        <span>
                                            <span className="block font-medium">{f.stall_name}</span>
                                            <span className="text-xs text-ink-faint">{f.since}</span>
                                        </span>
                                    </span>
                                </td>
                                <td className="px-5 py-3 tabular-nums">
                                    <span className="font-display text-xl">{f.score.toFixed(2)}</span>
                                    <span className="block text-xs text-ink-faint">{f.average.toFixed(2)}★ raw</span>
                                    <Meter value={f.score} max={5} good={f.score >= rules.top_rated_min_score} />
                                </td>
                                <td className="px-5 py-3 tabular-nums">
                                    {f.reviews}
                                    <Meter value={f.reviews} max={Math.max(rules.top_rated_min_reviews, 1)} good={f.reviews >= rules.top_rated_min_reviews} />
                                </td>
                                <td className="px-5 py-3 tabular-nums">
                                    {f.fulfilment === null ? '—' : `${f.fulfilment}%`}
                                    <span className="block text-xs text-ink-faint">
                                        {f.completed} / {f.completed + f.declined}
                                    </span>
                                </td>
                                <td className="px-5 py-3 tabular-nums">{f.favourites}</td>
                                <td className="px-5 py-3">
                                    <div className="flex max-w-xs flex-wrap gap-1.5">
                                        {f.badges.length === 0 && <span className="text-xs text-ink-faint">{t('badges.none')}</span>}
                                        {f.badges.map((b) => (
                                            <span key={b.id} className={cn('inline-flex items-center gap-1 rounded-full', !b.active && 'opacity-40 grayscale')}>
                                                <BadgePill badge={b.badge} compact />
                                                <span className="text-[10px] text-ink-faint">
                                                    {b.active ? t(`badges.${b.source}`) : t('badges.revoked')}
                                                    {b.locked && <Lock className="ms-0.5 inline size-2.5" />}
                                                </span>
                                                {b.active && (
                                                    <button type="button" onClick={() => (revokeForm.reset(), setRevoke(b))} className="rounded-full p-0.5 text-ink-faint hover:bg-danger/10 hover:text-danger" aria-label={t('badges.revoke')}>
                                                        <X className="size-3" />
                                                    </button>
                                                )}
                                                {b.locked && (
                                                    <button type="button" onClick={() => router.patch(route('admin.badges.unlock', b.id), {}, { preserveScroll: true })} className="rounded-full p-0.5 text-ink-faint hover:bg-ink/10 hover:text-ink" aria-label={t('badges.unlock')} title={t('badges.unlock')}>
                                                        <RotateCcw className="size-3" />
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-end">
                                    <Button size="sm" variant="soft" onClick={() => (awardForm.reset(), setAward(f))}>
                                        <Plus className="size-4" /> {t('badges.award')}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={!!award} onClose={() => setAward(null)} title={award ? t('badges.award_title', { name: award.stall_name }) : ''}>
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        awardForm.post(route('admin.badges.award', award.farmer_profile_id), { preserveScroll: true, onSuccess: () => setAward(null) });
                    }}
                >
                    <Select label={t('badges.filter')} value={awardForm.data.badge} onChange={(e) => awardForm.setData('badge', e.target.value)} error={awardForm.errors.badge}>
                        {BADGE_ORDER.map((b) => (
                            <option key={b} value={b}>
                                {t(`badges.${b}`)}
                            </option>
                        ))}
                    </Select>
                    <Textarea label={t('pay.reason')} rows={2} value={awardForm.data.reason} onChange={(e) => awardForm.setData('reason', e.target.value)} error={awardForm.errors.reason} required maxLength={190} />
                    <Button type="submit" className="w-full" loading={awardForm.processing}>
                        {t('badges.award')}
                    </Button>
                </form>
            </Modal>

            <Modal open={!!revoke} onClose={() => setRevoke(null)} title={revoke ? t('badges.revoke_title', { badge: t(`badges.${revoke.badge}`) }) : ''}>
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        revokeForm.patch(route('admin.badges.revoke', revoke.id), { preserveScroll: true, onSuccess: () => setRevoke(null) });
                    }}
                >
                    <Textarea label={t('pay.reason')} rows={2} value={revokeForm.data.reason} onChange={(e) => revokeForm.setData('reason', e.target.value)} error={revokeForm.errors.reason} required maxLength={190} />
                    <Button type="submit" variant="accent" className="w-full" loading={revokeForm.processing}>
                        {t('badges.revoke')}
                    </Button>
                </form>
            </Modal>
        </>
    );
}
