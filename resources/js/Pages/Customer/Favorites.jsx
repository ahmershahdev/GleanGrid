import { router } from '@inertiajs/react';
import { BellRing, BellOff } from 'lucide-react';
import { FarmerCard, MarketCard, ProductCard } from '@/Components/Cards';
import { EmptyState, PageHeader, SectionTitle } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export default function Favorites({ products, farmers, markets, alerts = [] }) {
    const t = useT();
    const toggleAlert = (fav) => router.patch(route('customer.favorites.update', fav.favorite_id), { notify_restock: !fav.notify_restock }, { preserveScroll: true });
    const empty = !products.length && !farmers.length && !markets.length && !alerts.length;
    const { money } = useFormat();

    return (
        <>
            <PageHeader title={t('favorites.title')} description={t('favorites.subtitle')} />
            {empty && <EmptyState className="mt-8" icon="red_apple" title={t('favorites.empty_title')} body={t('favorites.empty_body')} />}

            {alerts.length > 0 && (
                <section className="mt-10">
                    <SectionTitle title={`${t('alerts.title')} (${alerts.length})`} />
                    <ul className="grid gap-3 md:grid-cols-2">
                        {alerts.map((a) => (
                            <li key={a.id} className="flex items-center gap-3 rounded-3xl border border-line bg-elev p-3">
                                <img src={a.product.image_url} alt="" className="size-12 rounded-2xl bg-sunk object-contain p-1.5" />
                                <Link href={route('products.show', a.product.slug)} className="min-w-0 flex-1">
                                    <span className="block truncate font-medium hover:underline">{a.product.name}</span>
                                    <span className="block truncate text-xs text-ink-soft">
                                        {a.product.farmer} · {money(a.product.price)} · <span className="text-accent">{t('alerts.waiting')}</span>
                                    </span>
                                </Link>
                                <button type="button" onClick={() => router.delete(route('customer.alerts.destroy', a.product.id), { preserveScroll: true })} className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1.5 text-xs hover:bg-danger/10 hover:text-danger">
                                    <BellOff className="size-3.5" /> {t('alerts.remove')}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {products.length > 0 && (
                <section className="mt-10">
                    <SectionTitle title={t('favorites.products', { count: products.length })} />
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {products.map((fav) => (
                            <div key={fav.favorite_id}>
                                <ProductCard product={fav.item} />
                                <button onClick={() => toggleAlert(fav)} className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium', fav.notify_restock ? 'bg-lime/40 text-forest dark:text-lime' : 'bg-ink/5 text-ink-soft')}>
                                    {fav.notify_restock ? <BellRing className="size-3.5" /> : <BellOff className="size-3.5" />}
                                    {t(fav.notify_restock ? 'favorites.alert_on' : 'favorites.alert_off')}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {farmers.length > 0 && (
                <section className="mt-12">
                    <SectionTitle title={t('favorites.farmers', { count: farmers.length })} />
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {farmers.map((fav) => (
                            <FarmerCard key={fav.favorite_id} farmer={fav.item} />
                        ))}
                    </div>
                </section>
            )}

            {markets.length > 0 && (
                <section className="mt-12">
                    <SectionTitle title={t('favorites.markets', { count: markets.length })} />
                    <div className="grid gap-4 md:grid-cols-2">
                        {markets.map((fav) => (
                            <MarketCard key={fav.favorite_id} market={{ ...fav.item, open_today: fav.item.operating_days.includes(new Date().getDay()) }} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
