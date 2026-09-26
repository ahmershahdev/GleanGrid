import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, Loader2, Store, Trash2 } from 'lucide-react';
import { SplitWords } from '@/Components/motion';
import { buttonClass, EmptyState } from '@/Components/ui';
import { QtyStepper } from '@/Components/widgets';
import { fly } from '@/lib/fly';
import { cart } from '@/lib/cart';
import { useFormat, useT } from '@/lib/i18n';
import { useCartSync } from '@/lib/useCartSync';

export default function Cart() {
    const t = useT();
    const { money } = useFormat();
    const { auth } = usePage().props;
    const { groups, missing, loading } = useCartSync();

    const total = groups.reduce((sum, g) => sum + g.items.filter((i) => i.orderable).reduce((s, i) => s + i.product.price * i.quantity, 0), 0);
    const count = groups.reduce((sum, g) => sum + g.items.filter((i) => i.orderable).reduce((s, i) => s + i.quantity, 0), 0);
    const blocked = auth.user && auth.user.role !== 'customer';

    return (
        <>
            <section className="mx-auto max-w-[1200px] px-5 pt-12 sm:px-8">
                <h1 className="font-display text-5xl font-light md:text-7xl">
                    <SplitWords text={t('cart.title')} immediate />
                </h1>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="size-8 animate-spin text-ink-faint" />
                    </div>
                ) : groups.length === 0 ? (
                    <EmptyState className="mt-10" icon="basket" title={t('cart.empty_title')} body={t('cart.empty_body')} action={<Link href={route('products.index')} className={buttonClass('primary')}>{t('cart.browse')}</Link>} />
                ) : (
                    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
                        <div className="space-y-6">
                            {missing.length > 0 && (
                                <div className="flex items-center gap-3 rounded-2xl bg-sun/20 p-4 text-sm">
                                    <AlertTriangle className="size-5 shrink-0" />
                                    <span className="flex-1">{t('cart.missing', { count: missing.length })}</span>
                                    <button onClick={() => cart.removeMany(missing)} className="font-semibold underline">
                                        {t('common.remove')}
                                    </button>
                                </div>
                            )}
                            {groups.map((g) => (
                                <div key={g.farmer.id} className="rounded-[28px] border border-line bg-elev p-5 md:p-6">
                                    <Link href={route('farmers.show', g.farmer.slug)} className="flex items-center gap-3">
                                        {g.farmer.logo_url ? <img src={g.farmer.logo_url} alt="" className="size-10 object-contain" /> : <Store className="size-5" />}
                                        <span className="font-display text-xl hover:underline">{g.farmer.stall_name}</span>
                                        <span className="ms-auto text-xs text-ink-faint">{t('cart.separate_order')}</span>
                                    </Link>
                                    <ul className="mt-4 divide-y divide-line">
                                        <AnimatePresence initial={false}>
                                            {g.items.map(({ product, quantity, orderable }) => (
                                                <motion.li key={product.id} layout exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-center gap-4 py-4">
                                                    <img src={product.image_url} alt="" className="size-16 rounded-2xl bg-sunk object-contain p-2" />
                                                    <div className="min-w-0 flex-1">
                                                        <Link href={route('products.show', product.slug)} className="font-medium hover:underline">
                                                            {product.name}
                                                        </Link>
                                                        <p className="text-sm text-ink-soft">
                                                            {money(product.price)} / {t(`units.${product.unit}`)}
                                                        </p>
                                                        {!orderable && <p className="text-sm font-medium text-accent">{t('status.sold_out')}</p>}
                                                        {orderable && quantity > product.stock_quantity && <p className="text-sm text-accent">{t('cart.only_left', { count: product.stock_quantity })}</p>}
                                                    </div>
                                                    {orderable && <QtyStepper size="sm" value={quantity} min={1} max={product.stock_quantity} image={product.image_url} onChange={(q) => cart.set(product.id, q)} />}
                                                    <p className="w-24 text-end font-semibold tabular-nums">{orderable ? money(product.price * quantity) : '—'}</p>
                                                    <button
                                                        onClick={(e) => {
                                                            fly('cart', e.currentTarget, { image: product.image_url });
                                                            cart.remove(product.id);
                                                        }}
                                                        className="rounded-full p-2 text-ink-faint hover:bg-danger/10 hover:text-danger"
                                                        aria-label={t('common.remove')}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </motion.li>
                                            ))}
                                        </AnimatePresence>
                                    </ul>
                                    {g.slots.length === 0 && <p className="mt-2 rounded-2xl bg-accent/10 p-3 text-sm text-accent">{t('cart.no_slots')}</p>}
                                </div>
                            ))}
                        </div>

                        <aside className="lg:sticky lg:top-24 lg:self-start">
                            <div className="rounded-[28px] bg-ink p-6 text-bg">
                                <p className="font-display text-2xl">{t('cart.summary')}</p>
                                <div className="mt-5 space-y-2 text-sm opacity-80">
                                    <div className="flex justify-between">
                                        <span>{t('cart.items', { count })}</span>
                                        <span className="tabular-nums">{money(total)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('cart.stalls', { count: groups.length })}</span>
                                        <span>{t('cart.pickup_free')}</span>
                                    </div>
                                </div>
                                <div className="mt-5 flex items-end justify-between border-t border-bg/15 pt-5">
                                    <span>{t('cart.total')}</span>
                                    <span className="font-display text-4xl tabular-nums">{money(total)}</span>
                                </div>
                                <p className="mt-2 text-xs opacity-60">{t('cart.pay_note')}</p>
                                {blocked ? (
                                    <p className="mt-6 rounded-2xl bg-bg/10 p-3 text-sm">{t('cart.customers_only')}</p>
                                ) : (
                                    <Link href={route('customer.checkout')} className={buttonClass('lime', 'lg', 'mt-6 w-full')} disabled={!count}>
                                        {auth.user ? t('cart.checkout') : t('cart.login_checkout')} <ArrowRight className="rtl-flip size-5" />
                                    </Link>
                                )}
                            </div>
                        </aside>
                    </div>
                )}
            </section>
        </>
    );
}
