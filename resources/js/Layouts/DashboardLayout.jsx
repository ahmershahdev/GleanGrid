import { Link, router, usePage } from '@inertiajs/react';
import { ScrollProgress, ScrollToTop, SearchPalette, SearchTrigger } from '@/Components/chrome';
import Scrollbar from '@/Components/Scrollbar';
import Breadcrumbs from '@/Components/Breadcrumbs';
import Seo from '@/Components/Seo';
import { AnimatePresence, motion } from 'motion/react';
import {
    Award,
    BarChart3,
    CalendarRange,
    CreditCard,
    Bell,
    CalendarClock,
    Carrot,
    ClipboardList,
    ExternalLink,
    Heart,
    Home,
    LayoutGrid,
    LogOut,
    Mail,
    MapPinned,
    Megaphone,
    Menu,
    MessageSquareWarning,
    PackageSearch,
    ShieldCheck,
    ShoppingBasket,
    Star,
    TicketPercent,
    Store,
    Tags,
    UserRound,
    Users,
    UsersRound,
    X,
    ScanLine,
    ScrollText,
    Settings2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AfterIdle, DeferredAssistant as Assistant } from '@/Components/Deferred';
import { Logo } from '@/Components/Brand';
import { Avatar } from '@/Components/ui';
import { LanguageSwitcher, NotificationBell, ThemeToggle, Toaster } from '@/Components/widgets';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const NAV = {
    customer: [
        { key: 'overview', route: 'customer.dashboard', icon: LayoutGrid, match: 'customer.dashboard' },
        { key: 'orders', route: 'customer.orders.index', icon: ClipboardList, match: 'customer.orders.*' },
        { key: 'payments', route: 'customer.payments.index', icon: CreditCard, match: 'customer.payments.*' },
        { key: 'favorites', route: 'customer.favorites.index', icon: Heart, match: 'customer.favorites.*' },
        { key: 'reviews', route: 'customer.reviews.index', icon: Star, match: 'customer.reviews.*' },
        { key: 'family', route: 'customer.family.index', icon: UsersRound, match: 'customer.family.*' },
        { divider: true },
        { key: 'shop', route: 'products.index', icon: ShoppingBasket, match: 'products.*' },
        { key: 'markets', route: 'markets.index', icon: MapPinned, match: 'markets.*' },
    ],
    farmer: [
        { key: 'overview', route: 'farmer.dashboard', icon: LayoutGrid, match: 'farmer.dashboard' },
        { key: 'orders', route: 'farmer.orders.index', icon: ClipboardList, match: 'farmer.orders.*' },
        { key: 'scan', route: 'farmer.scan', icon: ScanLine, match: 'farmer.scan' },
        { key: 'products', route: 'farmer.products.index', icon: Carrot, match: 'farmer.products.*' },
        { key: 'pickup', route: 'farmer.slots.index', icon: CalendarClock, match: 'farmer.slots.*' },
        { key: 'reviews', route: 'farmer.reviews.index', icon: Star, match: 'farmer.reviews.*' },
        { key: 'coupons', route: 'farmer.coupons.index', icon: TicketPercent, match: 'farmer.coupons.*' },
        { key: 'stall', route: 'farmer.stall.edit', icon: Store, match: 'farmer.stall.*' },
    ],
    admin: [
        { key: 'overview', route: 'admin.dashboard', icon: LayoutGrid, match: 'admin.dashboard' },
        { key: 'farmers', route: 'admin.farmers.index', icon: ShieldCheck, match: 'admin.farmers.*' },
        { key: 'customers', route: 'admin.customers.index', icon: Users, match: 'admin.customers.*' },
        { key: 'markets', route: 'admin.markets.index', icon: MapPinned, match: 'admin.markets.*' },
        { key: 'categories', route: 'admin.categories.index', icon: Tags, match: 'admin.categories.*' },
        { key: 'orders', route: 'admin.orders.index', icon: ClipboardList, match: 'admin.orders.*' },
        { key: 'payments', route: 'admin.payments.index', icon: CreditCard, match: 'admin.payments.*' },
        { divider: true },
        { key: 'mod_products', route: 'admin.moderation.products', icon: PackageSearch, match: 'admin.moderation.products*' },
        { key: 'mod_reviews', route: 'admin.moderation.reviews', icon: MessageSquareWarning, match: 'admin.moderation.reviews*' },
        { key: 'badges', route: 'admin.badges.index', icon: Award, match: 'admin.badges.*' },
        { key: 'seasons', route: 'admin.seasons.index', icon: CalendarRange, match: 'admin.seasons.*' },
        { key: 'reports', route: 'admin.reports.index', icon: BarChart3, match: 'admin.reports.*' },
        { key: 'announcements', route: 'admin.announcements.index', icon: Megaphone, match: 'admin.announcements.*' },
        { key: 'coupons', route: 'admin.coupons.index', icon: TicketPercent, match: 'admin.coupons.*' },
        { key: 'messages', route: 'admin.messages.index', icon: Mail, match: 'admin.messages.*' },
        { divider: true },
        { key: 'audit', route: 'admin.audit.index', icon: ScrollText, match: 'admin.audit.*' },
        { key: 'settings', route: 'admin.settings.edit', icon: Settings2, match: 'admin.settings.*' },
    ],
};

const COMMON = [
    { key: 'notifications', route: 'notifications.index', icon: Bell, match: 'notifications.*' },
    { key: 'profile', route: 'profile.edit', icon: UserRound, match: 'profile.*' },
];

function Sidebar({ onNavigate }) {
    const { auth } = usePage().props;
    const t = useT();
    const items = [...NAV[auth.user.role], { divider: true }, ...COMMON];

    return (
        <div className="flex h-full flex-col">
            <div className="flex h-16 items-center px-5">
                <Logo />
            </div>
            <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl bg-ink/[0.04] p-3">
                <Avatar name={auth.user.name} src={auth.user.avatar} />
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{auth.user.name}</p>
                    <p className="text-xs text-ink-faint">{t(`roles.${auth.user.role}`)}</p>
                </div>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Dashboard">
                {items.map((item, i) =>
                    item.divider ? (
                        <div key={i} className="mx-3 my-3 h-px bg-line" />
                    ) : (
                        <Link
                            key={item.key}
                            href={route(item.route)}
                            onClick={onNavigate}
                            className={cn(
                                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition',
                                route().current(item.match) ? 'text-brand-ink' : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                            )}
                        >
                            {route().current(item.match) && <motion.span layoutId="side-pill" className="absolute inset-0 -z-10 rounded-xl bg-brand" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                            <item.icon className="size-[18px]" />
                            {t(`dash.${item.key}`)}
                        </Link>
                    ),
                )}
            </nav>
            <div className="space-y-0.5 border-t border-line p-3">
                {auth.user.role === 'farmer' && auth.user.farmer_status === 'approved' && (
                    <Link href={route('farmers.show', auth.user.farmer_slug)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink">
                        <ExternalLink className="size-4" /> {t('dash.public_stall')}
                    </Link>
                )}
                <Link href={route('home')} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink">
                    <Home className="size-4" /> {t('dash.back_to_site')}
                </Link>
                <Link href={route('logout')} method="post" as="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger hover:bg-danger/10">
                    <LogOut className="size-4" /> {t('nav.logout')}
                </Link>
            </div>
        </div>
    );
}

function FarmerStatusBanner() {
    const { auth } = usePage().props;
    const t = useT();
    if (auth.user.role !== 'farmer' || auth.user.farmer_status === 'approved') return null;
    const suspended = auth.user.farmer_status === 'suspended';
    return (
        <div className={cn('mb-6 flex items-start gap-3 rounded-2xl p-4 text-sm', suspended ? 'bg-danger/10 text-danger' : 'bg-sun/20 text-ink')}>
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            <div>
                <p className="font-semibold">{t(suspended ? 'farmer.suspended_title' : 'farmer.pending_title')}</p>
                <p className="mt-0.5 opacity-80">{t(suspended ? 'farmer.suspended_body' : 'farmer.pending_body')}</p>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }) {
    const page = usePage();
    const { auth } = page.props;
    const url = page.url;
    const t = useT();
    const [drawer, setDrawer] = useState(false);

    useEffect(() => router.on('navigate', () => setDrawer(false)), []);

    return (
        <div className="min-h-screen bg-bg">
            <Seo />
            <ScrollProgress />
            <aside className="fixed inset-y-0 start-0 z-40 hidden w-72 border-e border-line bg-elev lg:block">
                <Sidebar />
            </aside>

            <AnimatePresence>
                {drawer && (
                    <>
                        <motion.div className="fixed inset-0 z-50 bg-soil/50 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
                        <motion.aside
                            className="fixed inset-y-0 start-0 z-50 w-[85vw] max-w-80 bg-elev lg:hidden"
                            initial={{ x: document.dir === 'rtl' ? '100%' : '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: document.dir === 'rtl' ? '100%' : '-100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        >
                            <button onClick={() => setDrawer(false)} className="absolute end-3 top-3 rounded-full p-2 hover:bg-ink/5" aria-label={t('common.close')}>
                                <X className="size-5" />
                            </button>
                            <Sidebar onNavigate={() => setDrawer(false)} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <div className="lg:ps-72">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-8">
                    <button onClick={() => setDrawer(true)} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-ink/5 lg:hidden" aria-label={t('nav.menu')}>
                        <Menu className="size-5" />
                    </button>
                    <Logo compact className="lg:hidden" />
                    <p className="hidden text-sm text-ink-soft sm:block">{t('dash.hello', { name: auth.user.name.split(' ')[0] })}</p>
                    <div className="ms-auto flex items-center gap-0.5">
                        <SearchTrigger className="me-1" />
                        <LanguageSwitcher />
                        <ThemeToggle />
                        <NotificationBell />
                    </div>
                </header>
                <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8">
                    <Breadcrumbs className="mb-6" />
                    <FarmerStatusBanner />
                    {children}
                </main>
            </div>
            <AfterIdle>
                <Scrollbar />
                <ScrollToTop raised={auth.user.role === 'customer'} />
                <SearchPalette />
            </AfterIdle>
            {auth.user.role === 'customer' && <Assistant />}
            <Toaster />
        </div>
    );
}
