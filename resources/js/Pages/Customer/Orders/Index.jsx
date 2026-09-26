import { Link, router } from '@inertiajs/react';
import { PartyPopper, Users } from 'lucide-react';
import { OrderRow } from '@/Components/OrderBits';
import { Reveal } from '@/Components/motion';
import { buttonClass, EmptyState, PageHeader, Pagination, Tabs } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { cleanQuery, cn } from '@/lib/utils';

export default function CustomerOrders({ orders, filters, hasHousehold, placed }) {
    const t = useT();
    const tab = (status) => route('customer.orders.index', cleanQuery({ ...filters, status }));
    const statuses = ['open', 'completed', 'cancelled', 'declined'];

    return (
        <>
            <PageHeader title={t('orders.title')} description={t('orders.subtitle')} actions={<Link href={route('products.index')} className={buttonClass('primary', 'sm')}>{t('customer.shop_now')}</Link>} />

            {placed?.length > 0 && (
                <Reveal className="mt-6 flex items-center gap-4 rounded-3xl bg-lime/40 p-5 text-forest dark:text-lime">
                    <PartyPopper className="size-8 shrink-0" />
                    <div>
                        <p className="font-display text-xl">{t('orders.placed_title')}</p>
                        <p className="text-sm opacity-80">{t('orders.placed_body', { codes: placed.join(', ') })}</p>
                    </div>
                </Reveal>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Tabs active={filters.status ?? 'all'} tabs={[{ key: 'all', label: t('common.all'), href: tab(undefined) }, ...statuses.map((s) => ({ key: s, label: t(`status.${s}`), href: tab(s) }))]} />
                {hasHousehold && (
                    <button
                        onClick={() => router.get(route('customer.orders.index'), cleanQuery({ ...filters, household: filters.household ? undefined : 1 }), { preserveScroll: true })}
                        className={cn('inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium', filters.household ? 'bg-brand text-brand-ink' : 'bg-ink/5')}
                    >
                        <Users className="size-4" /> {t('orders.household')}
                    </button>
                )}
            </div>

            <div className="mt-6 space-y-3">
                {orders.data.length === 0 ? (
                    <EmptyState icon="shopping_cart" title={t('orders.empty')} action={<Link href={route('products.index')} className={buttonClass('outline', 'sm')}>{t('cart.browse')}</Link>} />
                ) : (
                    orders.data.map((o) => (
                        <OrderRow key={o.id} order={o} href={route('customer.orders.show', o.code)} who={filters.household ? `${o.farmer.stall_name} · ${o.customer.name}` : o.farmer.stall_name} />
                    ))
                )}
            </div>
            <Pagination meta={orders} className="mt-6" />
        </>
    );
}
