import { useForm } from '@inertiajs/react';
import { BellRing, Database, ShieldAlert, UserPlus } from 'lucide-react';
import { Button, Card, Input, PageHeader, Stat } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function Toggle({ checked, onChange, label, hint }) {
    return (
        <label className="flex cursor-pointer items-start justify-between gap-6 rounded-2xl border border-line p-4 transition hover:border-line-strong">
            <span>
                <span className="block font-medium">{label}</span>
                {hint && <span className="mt-0.5 block text-sm text-ink-soft">{hint}</span>}
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => onChange(!checked)}
                className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-brand' : 'bg-ink/15')}
            >
                <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow transition-all duration-300 ease-out-expo', checked ? 'start-6' : 'start-1')} />
            </button>
        </label>
    );
}

export default function AdminSettings({ settings, updated, summary }) {
    const t = useT();
    const { money, relative } = useFormat();
    const form = useForm(settings);
    const num = (key, props = {}) => ({ type: 'number', value: form.data[key], onChange: (e) => form.setData(key, Number(e.target.value)), error: form.errors[key], ...props });

    return (
        <>
            <PageHeader
                eyebrow={t('settings.eyebrow', {}, 'Platform')}
                title={t('settings.title', {}, 'Settings')}
                description={updated?.updated_at ? t('settings.updated', { who: updated.name ?? '—', when: relative(updated.updated_at) }, `Last changed by ${updated.name ?? '—'} ${relative(updated.updated_at)}`) : t('settings.subtitle', {}, 'Rules that apply across GleanGrid.')}
            />

            {summary && (
                <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Stat label={t('settings.orders_60', {}, 'Orders (±30 days)')} value={summary.orders} icon={Database} />
                    <Stat label={t('settings.revenue_60', {}, 'Completed revenue')} value={money(summary.revenue)} />
                    <Stat label={t('settings.no_shows', {}, 'Missed pickups')} value={summary.no_shows ?? 0} tone="accent" />
                    <Stat label={t('settings.lost', {}, 'Declined / cancelled')} value={summary.lost ?? 0} />
                </div>
            )}
            <p className="mt-2 text-xs text-ink-faint">{t('settings.proc', {}, 'Figures come live from the sp_platform_summary stored procedure.')}</p>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put(route('admin.settings.update'), { preserveScroll: true });
                }}
                className="mt-8 grid gap-6 lg:grid-cols-2"
            >
                <Card className="space-y-5 p-6 md:p-8">
                    <h2 className="font-display flex items-center gap-2 text-2xl">
                        <ShieldAlert className="size-5" /> {t('settings.no_show_title', {}, 'Missed pickups')}
                    </h2>
                    <p className="text-sm text-ink-soft">{t('settings.no_show_hint', {}, 'Customers who miss this many pickups inside the window can’t pre-order until an admin resets them.')}</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input label={t('settings.no_show_limit', {}, 'Pause after (no-shows)')} min={1} max={20} {...num('no_show_limit')} />
                        <Input label={t('settings.no_show_window', {}, 'Within (days)')} min={7} max={365} {...num('no_show_window_days')} />
                    </div>
                    <Input label={t('settings.max_open', {}, 'Max open pre-orders per customer')} min={1} max={200} {...num('max_open_orders_per_customer')} />
                </Card>

                <div className="space-y-6">
                    <Card className="space-y-5 p-6 md:p-8">
                        <h2 className="font-display flex items-center gap-2 text-2xl">
                            <BellRing className="size-5" /> {t('settings.reminders', {}, 'Pickup reminders')}
                        </h2>
                        <Input label={t('settings.reminder_hour', {}, 'Send the evening before at (hour, PKT)')} min={0} max={23} hint={t('settings.reminder_hint', {}, 'The scheduler checks every hour; each order is reminded once.')} {...num('reminder_hour')} />
                    </Card>
                    <Card className="space-y-3 p-6 md:p-8">
                        <h2 className="font-display flex items-center gap-2 text-2xl">
                            <UserPlus className="size-5" /> {t('settings.signups', {}, 'Sign-ups')}
                        </h2>
                        <Toggle checked={form.data.customer_registration_open} onChange={(v) => form.setData('customer_registration_open', v)} label={t('settings.customer_signups', {}, 'New customers can register')} />
                        <Toggle checked={form.data.farmer_registration_open} onChange={(v) => form.setData('farmer_registration_open', v)} label={t('settings.farmer_signups', {}, 'New farmer stalls can register')} hint={t('settings.farmer_signups_hint', {}, 'Pause while you work through a backlog of stall approvals.')} />
                    </Card>
                </div>

                <div className="flex justify-end gap-3 lg:col-span-2">
                    <Button variant="ghost" onClick={() => form.reset()} disabled={!form.isDirty}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" loading={form.processing} disabled={!form.isDirty}>
                        {t('common.save_changes')}
                    </Button>
                </div>
            </form>
        </>
    );
}
