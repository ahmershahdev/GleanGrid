import { Link, router, usePage } from '@inertiajs/react';
import Lenis from 'lenis';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowUpRight, Globe, Heart, LayoutDashboard, LogOut, Mail, MapPin, Menu, Phone, ShoppingBasket, UserRound, X } from 'lucide-react';
import { FacebookIcon, GithubIcon, LinkedinIcon, XIcon } from '@/Components/icons';
import { useEffect, useState } from 'react';
import { AfterIdle, DeferredAssistant as Assistant } from '@/Components/Deferred';
import { ScrollProgress, ScrollToTop, SearchPalette, SearchTrigger } from '@/Components/chrome';
import Scrollbar from '@/Components/Scrollbar';
import Breadcrumbs from '@/Components/Breadcrumbs';
import Seo from '@/Components/Seo';
import { Logo, LogoFull } from '@/Components/Brand';
import { Cursor, Magnetic } from '@/Components/motion';
import { Avatar, buttonClass } from '@/Components/ui';
import { LanguageSwitcher, NotificationBell, Popover, ThemeToggle, Toaster } from '@/Components/widgets';
import { useCart } from '@/lib/cart';
import { useT } from '@/lib/i18n';
import { lockScroll, setLenis } from '@/lib/scroll';
import { cn, prefersReducedMotion } from '@/lib/utils';

const NAV = [
    { key: 'markets', route: 'markets.index', match: 'markets.*' },
    { key: 'farmers', route: 'farmers.index', match: 'farmers.*' },
    { key: 'produce', route: 'products.index', match: 'products.*' },
    { key: 'about', route: 'about', match: 'about' },
    { key: 'contact', route: 'contact', match: 'contact' },
];

function useSmoothScroll() {
    useEffect(() => {
        if (prefersReducedMotion() || window.matchMedia('(pointer: coarse)').matches) return;
        const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, anchors: { offset: -110 } });
        setLenis(lenis);
        let id = requestAnimationFrame(function raf(time) {
            lenis.raf(time);
            id = requestAnimationFrame(raf);
        });
        const off = router.on('navigate', () =>
            requestAnimationFrame(() => {
                lenis.resize();
                lenis.scrollTo(window.scrollY, { immediate: true, force: true });
            }),
        );
        return () => {
            cancelAnimationFrame(id);
            off();
            setLenis(null);
            lenis.destroy();
        };
    }, []);
}

function AnnouncementBar() {
    const { announcements } = usePage().props;
    const [hidden, setHidden] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem('gg-dismissed') ?? '[]');
        } catch {
            return [];
        }
    });
    const item = announcements?.find((a) => !hidden.includes(a.id));
    if (!item) return null;

    const dismiss = () => {
        const next = [...hidden, item.id];
        setHidden(next);
        try {
            sessionStorage.setItem('gg-dismissed', JSON.stringify(next));
        } catch {
        }
    };

    return (
        <div className={cn('relative z-50 py-2 ps-4 pe-10 text-sm sm:px-10 sm:text-center', item.level === 'warning' ? 'bg-sun text-forest' : 'bg-forest text-paper')}>
            <p className="truncate sm:whitespace-normal" title={`${item.title} — ${item.body}`}>
                <strong className="font-semibold">{item.title}</strong> <span className="opacity-80">— {item.body}</span>
            </p>
            <button onClick={dismiss} className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 opacity-70 hover:opacity-100" aria-label="Dismiss">
                <X className="size-4" />
            </button>
        </div>
    );
}

function AccountMenu() {
    const { auth } = usePage().props;
    const t = useT();
    return (
        <Popover
            trigger={({ toggle, open }) => (
                <button onClick={toggle} aria-expanded={open} className="flex items-center rounded-full p-0.5 ring-2 ring-transparent transition hover:ring-line-strong" aria-label={t('nav.account')}>
                    <Avatar name={auth.user.name} src={auth.user.avatar} size="size-9" />
                </button>
            )}
        >
            {() => (
                <div className="w-56">
                    <div className="px-3 py-2">
                        <p className="truncate text-sm font-semibold">{auth.user.name}</p>
                        <p className="text-xs text-ink-faint">{t(`roles.${auth.user.role}`)}</p>
                    </div>
                    <Link href={route('dashboard')} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-ink/5">
                        <LayoutDashboard className="size-4" /> {t('nav.dashboard')}
                    </Link>
                    <Link href={route('profile.edit')} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-ink/5">
                        <UserRound className="size-4" /> {t('nav.profile')}
                    </Link>
                    <Link href={route('logout')} method="post" as="button" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-danger hover:bg-danger/10">
                        <LogOut className="size-4" /> {t('nav.logout')}
                    </Link>
                </div>
            )}
        </Popover>
    );
}

function CartButton() {
    const { count } = useCart();
    const { auth } = usePage().props;
    const t = useT();
    if (auth.user && auth.user.role !== 'customer') return null;
    return (
        <Link href={route('cart')} data-fly-target="cart" className="relative inline-flex size-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink" aria-label={t('nav.cart')}>
            <ShoppingBasket className="size-[19px]" />
            <AnimatePresence>
                {count > 0 && (
                    <motion.span
                        key={count}
                        initial={{ scale: 0.4 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -end-0.5 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-ink tabular-nums"
                    >
                        {count}
                    </motion.span>
                )}
            </AnimatePresence>
        </Link>
    );
}

function FavoritesButton() {
    const { auth, favorites } = usePage().props;
    const t = useT();
    if (auth.user?.role !== 'customer') return null;
    const count = Object.values(favorites ?? {}).reduce((n, ids) => n + ids.length, 0);
    return (
        <Link href={route('customer.favorites.index')} data-fly-target="favorites" className="relative hidden size-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink sm:inline-flex" aria-label={t('dash.favorites')}>
            <Heart className={cn('size-[19px]', count > 0 && 'fill-accent/15 text-accent')} />
            {count > 0 && <span className="absolute -top-0.5 -end-0.5 flex min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-bg tabular-nums">{count}</span>}
        </Link>
    );
}

function DesktopNav() {
    const t = useT();
    const [hovered, setHovered] = useState(null);

    return (
        <nav className="ms-4 hidden items-center lg:flex" aria-label="Main" onPointerLeave={() => setHovered(null)}>
            {NAV.map((item) => {
                const current = route().current(item.match);
                return (
                    <Link
                        key={item.key}
                        href={route(item.route)}
                        aria-current={current ? 'page' : undefined}
                        onPointerEnter={() => setHovered(item.key)}
                        onFocus={() => setHovered(item.key)}
                        className={cn('group relative rounded-full px-3.5 py-2 text-[15px] font-medium transition-colors duration-300', current || hovered === item.key ? 'text-ink' : 'text-ink-soft')}
                    >
                        {hovered === item.key && <motion.span layoutId="nav-hover" className="absolute inset-0 -z-10 rounded-full bg-ink/[0.06]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                        <span className="relative block overflow-hidden">
                            <span className="block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full">{t(`nav.${item.key}`)}</span>
                            <span className="absolute inset-0 block translate-y-full italic transition-transform duration-500 ease-out-expo group-hover:translate-y-0" aria-hidden="true">
                                {t(`nav.${item.key}`)}
                            </span>
                        </span>
                        {current && <motion.span layoutId="nav-dot" className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                    </Link>
                );
            })}
        </nav>
    );
}

function Header() {
    const { auth, contact } = usePage().props;
    const t = useT();
    const [menu, setMenu] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, 'change', (y) => {
        const prev = scrollY.getPrevious() ?? 0;
        setScrolled(y > 20);
        setHidden(y > 240 && y > prev && !menu);
    });

    useEffect(() => {
        document.documentElement.dataset.header = hidden ? 'hidden' : 'shown';
    }, [hidden]);

    useEffect(() => router.on('navigate', () => setMenu(false)), []);
    useEffect(() => {
        const reveal = () => setHidden(false);
        window.addEventListener('gg:reveal-header', reveal);
        return () => window.removeEventListener('gg:reveal-header', reveal);
    }, []);
    useEffect(() => {
        lockScroll(menu);
        document.documentElement.classList.toggle('menu-open', menu);
    }, [menu]);

    return (
        <>
            <motion.header
                animate={{ y: hidden ? '-110%' : 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="sticky top-0 z-[60] px-3 pt-3 sm:px-5"
            >
                <div
                    className={cn(
                        'relative mx-auto flex items-center gap-4 rounded-full border ps-4 pe-2 transition-[max-width,height,background-color,border-color,box-shadow] duration-700 ease-out-expo',
                        scrolled || menu
                            ? 'h-14 max-w-[1300px] border-line bg-elev/75 shadow-[0_10px_40px_-18px_rgb(0_0_0/0.35)] backdrop-blur-2xl backdrop-saturate-150'
                            : 'h-16 max-w-[1400px] border-transparent',
                    )}
                >
                    <span aria-hidden="true" className={cn('pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-lime/60 to-transparent transition-opacity duration-700', scrolled && !menu ? 'opacity-100' : 'opacity-0')} />
                    <Logo />
                    <DesktopNav />
                    <div className="ms-auto flex items-center gap-0.5">
                        <SearchTrigger className="me-1" />
                        <div className="hidden sm:flex sm:items-center sm:gap-0.5">
                            <LanguageSwitcher />
                            <ThemeToggle />
                        </div>
                        <span className="mx-1 hidden h-5 w-px bg-line-strong sm:block" aria-hidden="true" />
                        <FavoritesButton />
                        <CartButton />
                        {auth.user ? (
                            <>
                                <NotificationBell />
                                <span className="ms-1 hidden sm:block">
                                    <AccountMenu />
                                </span>
                            </>
                        ) : (
                            <>
                                <Link href={route('login')} className="hidden rounded-full px-4 py-2 text-[15px] font-medium whitespace-nowrap text-ink-soft hover:text-ink xl:block">
                                    {t('nav.login')}
                                </Link>
                                <Magnetic className="hidden md:inline-block">
                                    <Link href={route('register')} className={buttonClass('primary', 'md', 'ms-1')}>
                                        {t('nav.join')}
                                    </Link>
                                </Magnetic>
                            </>
                        )}
                        <button onClick={() => setMenu((m) => !m)} className="ms-1 inline-flex size-11 items-center justify-center rounded-full bg-ink text-bg lg:hidden" aria-label={t('nav.menu')} aria-expanded={menu}>
                            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
            </motion.header>

            <AnimatePresence>
                {menu && (
                    <motion.div
                        initial={{ clipPath: 'circle(0% at 100% 0%)' }}
                        animate={{ clipPath: 'circle(150% at 100% 0%)' }}
                        exit={{ clipPath: 'circle(0% at 100% 0%)' }}
                        transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
                        className="fixed inset-0 z-[55] flex flex-col overflow-y-auto bg-brand px-5 pt-[calc(env(safe-area-inset-top)+7.75rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-brand-ink sm:px-8 lg:hidden"
                        data-lenis-prevent
                    >
                        <nav className="flex flex-col" aria-label="Mobile">
                            {[{ key: 'home', route: 'home', match: 'home' }, ...NAV].map((item, i) => {
                                const current = route().current(item.match);
                                return (
                                    <motion.div key={item.key} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 + i * 0.05, ease: [0.16, 1, 0.3, 1], duration: 0.6 }}>
                                        <Link href={route(item.route)} aria-current={current ? 'page' : undefined} className="group flex items-baseline gap-4 border-b border-current/15 py-3.5">
                                            <span className="font-mono text-xs tabular-nums opacity-50">{String(i + 1).padStart(2, '0')}</span>
                                            <span className={cn('font-display flex-1 text-[clamp(2rem,9vw,3rem)] leading-none transition-transform duration-500 ease-out-expo group-active:translate-x-2', current && 'italic')}>{t(`nav.${item.key}`)}</span>
                                            <ArrowUpRight className="rtl-flip size-5 self-center opacity-40 transition group-hover:rotate-45 group-hover:opacity-100" />
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </nav>

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm opacity-80">
                            <Link href={route('faq')}>{t('footer.faq')}</Link>
                            <Link href={route('pickup-policy')}>{t('legal.pickup')}</Link>
                            <Link href={route('returns')}>{t('legal.returns')}</Link>
                            <a href={`mailto:${contact?.email}`}>{contact?.email}</a>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-auto space-y-4 pt-8">
                            <div className="flex items-center justify-between rounded-full bg-brand-ink/10 p-1 [&_button]:!text-brand-ink">
                                <LanguageSwitcher />
                                <ThemeToggle />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {auth.user ? (
                                    <>
                                        <Link href={route('dashboard')} className={buttonClass('lime', 'lg', 'w-full')}>
                                            {t('nav.dashboard')}
                                        </Link>
                                        <Link href={route('logout')} method="post" as="button" className="inline-flex h-14 w-full items-center justify-center rounded-full border border-brand-ink/25 font-medium text-brand-ink transition hover:bg-brand-ink/10">
                                            {t('nav.logout')}
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link href={route('register')} className={buttonClass('lime', 'lg', 'w-full')}>
                                            {t('nav.join')}
                                        </Link>
                                        <Link href={route('login')} className="inline-flex h-14 w-full items-center justify-center rounded-full border border-brand-ink/25 font-medium text-brand-ink transition hover:bg-brand-ink/10">
                                            {t('nav.login')}
                                        </Link>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function Footer() {
    const t = useT();
    const { contact, social } = usePage().props;
    const year = new Date().getFullYear();
    const cols = [
        { title: 'footer.explore', links: [['nav.markets', 'markets.index'], ['nav.farmers', 'farmers.index'], ['nav.produce', 'products.index'], ['nav.cart', 'cart']] },
        { title: 'footer.company', links: [['nav.about', 'about'], ['nav.contact', 'contact'], ['footer.sell', 'register', { as: 'farmer' }], ['nav.join', 'register']] },
        { title: 'footer.help', links: [['footer.faq', 'faq'], ['legal.pickup', 'pickup-policy'], ['legal.returns', 'returns'], ['legal.terms', 'terms'], ['legal.privacy', 'privacy']] },
    ];
    const socials = [
        ['Website', social?.website, Globe],
        ['GitHub', social?.github, GithubIcon],
        ['LinkedIn', social?.linkedin, LinkedinIcon],
        ['X', social?.x, XIcon],
        ['Facebook', social?.facebook, FacebookIcon],
    ].filter(([, href]) => href);

    return (
        <footer className="relative mt-16 overflow-hidden bg-soil text-paper sm:mt-24">
            <div className="mx-auto max-w-[1400px] px-5 pt-14 sm:px-8 sm:pt-20">
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-[1.35fr_0.8fr_0.8fr_0.9fr_1.15fr] lg:gap-12">
                    <div className="col-span-2 md:col-span-3 lg:col-span-1">
                        <div className="flex items-center gap-5 lg:block">
                            <Link href={route('home')} className="inline-flex shrink-0 rounded-3xl bg-paper px-4 py-2.5 transition-transform duration-500 ease-out-expo hover:-rotate-2 lg:mb-8 lg:px-5 lg:py-3" aria-label="GleanGrid home">
                                <LogoFull className="w-24 lg:w-32" />
                            </Link>
                            <p className="font-display max-w-md text-2xl leading-tight font-light sm:text-3xl lg:text-4xl">{t('footer.tagline')}</p>
                        </div>
                        <Link href={route('register', { as: 'farmer' })} className="group mt-6 inline-flex items-center gap-3 rounded-full bg-lime py-2 ps-6 pe-2 font-medium text-forest lg:mt-8">
                            {t('footer.cta')}
                            <span className="flex size-10 items-center justify-center rounded-full bg-forest text-lime transition group-hover:rotate-45">
                                <ArrowUpRight className="rtl-flip size-5" />
                            </span>
                        </Link>
                    </div>
                    {cols.map((col) => (
                        <nav key={col.title} aria-label={t(col.title)}>
                            <p className="font-mono text-xs tracking-[0.2em] text-paper/50 uppercase">{t(col.title)}</p>
                            <ul className="mt-4 space-y-2 sm:space-y-2.5">
                                {col.links.map(([label, name, params]) => (
                                    <li key={label}>
                                        <Link href={route(name, params)} className="group relative inline-block text-paper/80 transition hover:text-lime">
                                            {t(label)}
                                            <span className="absolute -bottom-0.5 start-0 h-px w-full origin-left scale-x-0 bg-lime transition-transform duration-500 ease-out-expo group-hover:scale-x-100 rtl:origin-right" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                    <div className="md:col-span-2 lg:col-span-1">
                        <p className="font-mono text-xs tracking-[0.2em] text-paper/50 uppercase">{t('footer.support')}</p>
                        <ul className="mt-4 space-y-3 text-[13px] text-paper/80 sm:text-base">
                            <li>
                                <a href={`mailto:${contact.email}`} className="group inline-flex items-center gap-2.5 transition hover:text-lime">
                                    <Mail className="size-4 shrink-0 text-paper/40 group-hover:text-lime" /> {contact.email}
                                </a>
                            </li>
                            <li>
                                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="group inline-flex items-center gap-2.5 transition hover:text-lime" dir="ltr">
                                    <Phone className="size-4 shrink-0 text-paper/40 group-hover:text-lime" /> {contact.phone}
                                </a>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <MapPin className="mt-1 size-4 shrink-0 text-paper/40" /> {contact.address}
                            </li>
                        </ul>
                        <div className="mt-6 flex flex-wrap gap-2">
                            {socials.map(([label, href, Icon]) => (
                                <a key={label} href={href} target="_blank" rel="noopener noreferrer me" aria-label={label} title={label} className="flex size-10 items-center justify-center rounded-full border border-paper/15 text-paper/70 transition duration-300 hover:-translate-y-0.5 hover:border-lime hover:bg-lime hover:text-forest">
                                    <Icon className="size-[18px]" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="font-display pointer-events-none mt-10 px-3 text-center text-[21vw] leading-[0.8] font-semibold tracking-[-0.06em] select-none sm:mt-16" dir="ltr" aria-hidden="true">
                <span className="text-outline [--stroke-w:2px] [--stroke:rgb(243_238_227/0.9)]">Glean</span>
                <span className="text-lime italic">Grid</span>
            </div>
            <div className="border-t border-paper/10 px-5 py-6 pb-24 text-center text-xs text-paper/55 sm:px-8 sm:pb-7 sm:text-sm">
                <p>
                    © {year} GleanGrid · {t('footer.crafted')}{' '}
                    <a href={social?.website} target="_blank" rel="noopener noreferrer" className="font-medium text-paper underline decoration-paper/30 underline-offset-4 transition hover:text-lime hover:decoration-lime">
                        Syed Ahmer Shah
                    </a>
                    . {t('footer.rights')}
                </p>
            </div>
        </footer>
    );
}

export default function PublicLayout({ children }) {
    useSmoothScroll();

    return (
        <div className="grain min-h-screen overflow-x-clip">
            <Seo />
            <ScrollProgress />
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[200] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">
                Skip to content
            </a>
            <AnnouncementBar />
            <Header />
            <main id="main">
                <Breadcrumbs className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-7" />
                {children}
            </main>
            <Footer />
            <AfterIdle>
                <Scrollbar />
                <ScrollToTop />
                <SearchPalette />
                <Toaster />
                <Cursor />
            </AfterIdle>
            <Assistant />
        </div>
    );
}
