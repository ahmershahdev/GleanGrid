import { Link, router } from '@inertiajs/react';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ArrowUpRight, CalendarCheck2, HandCoins, MapPin, Search, ShoppingBasket, Star } from 'lucide-react';
import { useRef, useState } from 'react';
import { FarmerCard, MarketCard, ProductCard } from '@/Components/Cards';
import { LazyMapView as MapView } from '@/Components/LazyMap';
import { CountUp, HorizontalScroll, Magnetic, Marquee, Reveal, SplitWords } from '@/Components/motion';
import FieldsReel from '@/Components/FieldsReel';
import { openSearch } from '@/Components/chrome';
import { buttonClass } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn, produceImage } from '@/lib/utils';
import { pathUrl } from '@/lib/url';

const FLOATERS = [
    { img: 'tomato', className: 'start-[4%] top-[18%] w-20 md:w-28', depth: 30, r: -12 },
    { img: 'carrot', className: 'end-[6%] top-[14%] w-24 md:w-36', depth: -40, r: 18 },
    { img: 'mango', className: 'end-[16%] bottom-[16%] w-20 md:w-32', depth: 50, r: -8 },
    { img: 'bread', className: 'start-[9%] bottom-[12%] w-24 md:w-32', depth: -25, r: 10 },
    { img: 'leafy_green', className: 'start-[26%] top-[24%] w-14 md:w-20 hidden sm:block', depth: 20, r: 25 },
    { img: 'honey_pot', className: 'end-[28%] top-[20%] w-14 md:w-20 hidden md:block', depth: -15, r: -15 },
    { img: 'egg', className: 'start-[24%] bottom-[30%] w-12 md:w-16 hidden md:block', depth: 35, r: 30 },
    { img: 'sunflower', className: 'end-[3%] top-[48%] w-14 md:w-20 hidden lg:block', depth: -30, r: -20 },
];

function Hero({ stats, openToday }) {
    const t = useT();
    const ref = useRef(null);
    const [q, setQ] = useState('');
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const sx = useSpring(mx, { stiffness: 60, damping: 20 });
    const sy = useSpring(my, { stiffness: 60, damping: 20 });
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
    const titleY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
    const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    const onMove = (e) => {
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
    };

    return (
        <section ref={ref} onPointerMove={onMove} className="relative -mt-[88px] flex min-h-[100svh] items-center overflow-hidden px-5 pt-28 pb-16">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute start-1/2 top-[38%] size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime/40 blur-[110px] dark:bg-lime/10" />
                <div className="absolute end-[10%] bottom-[5%] size-[40vmin] rounded-full bg-accent/20 blur-[100px]" />
            </div>

            {FLOATERS.map((f, i) => (
                <Floater key={f.img} {...f} sx={sx} sy={sy} delay={0.6 + i * 0.08} />
            ))}

            <motion.div style={{ y: titleY, opacity: fade }} className="relative mx-auto w-full max-w-6xl text-center">
                <div style={{ '--d': '0.1s' }} className="gg-rise inline-flex items-center gap-2 rounded-full border border-line-strong bg-elev/70 px-3.5 py-1.5 text-sm backdrop-blur">
                    <span className="relative flex size-2">
                        <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-70" />
                        <span className="relative size-2 rounded-full bg-success" />
                    </span>
                    {t('home.live', { count: openToday })}
                </div>

                <h1 className="font-display font-display-tight mt-7 text-[15vw] font-light sm:text-[11vw] lg:text-[9.4rem]">
                    <SplitWords text={t('home.hero_1')} immediate delay={0.15} className="block" />
                    <span className="block">
                        <SplitWords text={t('home.hero_2')} immediate delay={0.3} className="font-normal italic" />{' '}
                        <img src={produceImage('basket')} alt="" style={{ '--d': '0.9s' }} className="gg-pop -mt-[0.2em] inline-block h-[0.8em] align-middle" />
                    </span>
                    <SplitWords text={t('home.hero_3')} immediate delay={0.45} className="block text-accent" />
                </h1>

                <p style={{ '--d': '0.5s' }} className="gg-rise mx-auto mt-8 max-w-xl text-lg text-ink-soft md:text-xl">
                    {t('home.hero_sub', { farmers: stats.farmers, markets: stats.markets })}
                </p>

                <form
                    style={{ '--d': '0.65s' }}
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.get(pathUrl('products.index', q.trim() ? { q: q.trim() } : {}));
                    }}
                    className="gg-rise group/search relative z-10 mx-auto mt-9 flex max-w-xl items-center gap-2 rounded-full border border-line-strong bg-elev/90 p-1.5 shadow-soft backdrop-blur-xl transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand"
                    role="search"
                >
                    <Search className="ms-3.5 size-5 shrink-0 text-ink-faint transition group-focus-within/search:text-accent" />
                    <input
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={t('home.search_placeholder')}
                        className="h-12 min-w-0 flex-1 bg-transparent text-base placeholder:text-ink-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                        aria-label={t('home.search_placeholder')}
                        enterKeyHint="search"
                    />
                    <button type="button" onClick={() => openSearch(q)} className="hidden h-8 items-center rounded-full border border-line px-2.5 font-mono text-[11px] text-ink-faint transition hover:border-line-strong hover:text-ink sm:inline-flex" dir="ltr" aria-label={`⌘K ${t('search.open')}`}>
                        ⌘K
                    </button>
                    <button className={buttonClass('accent', 'md', 'h-12 px-6')}>
                        {t('common.search')}
                        <ArrowRight className="rtl-flip size-4 transition-transform group-focus-within/search:translate-x-0.5" />
                    </button>
                </form>

                <div style={{ '--d': '0.8s' }} className="gg-rise mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
                    <Link href={route('markets.index')} className="inline-flex items-center gap-1.5 font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        <MapPin className="size-4" /> {t('home.find_market')}
                    </Link>
                    <span className="text-ink-faint">·</span>
                    <Link href={route('register', { as: 'farmer' })} className="font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {t('home.are_you_farmer')}
                    </Link>
                </div>
            </motion.div>

        </section>
    );
}

function Floater({ img, className, depth, r, sx, sy, delay }) {
    const x = useTransform(sx, (v) => v * depth * 2);
    const y = useTransform(sy, (v) => v * depth * 2);
    return (
        <motion.div style={{ x, y }} className={cn('pointer-events-none absolute z-0', className)}>
            <motion.img
                src={produceImage(img)}
                alt=""
                initial={{ opacity: 0, scale: 0.4, rotate: r - 30 }}
                animate={{ opacity: 1, scale: 1, rotate: r }}
                transition={{ delay, type: 'spring', stiffness: 90, damping: 12 }}
                className="w-full animate-float drop-shadow-[0_24px_24px_rgba(0,0,0,0.18)]"
                style={{ '--r': `${r}deg`, animationDelay: `${delay}s` }}
            />
        </motion.div>
    );
}

function ProduceBands({ harvest }) {
    const t = useT();
    const names = harvest.length ? harvest : [];
    const words = ['home.band_fresh', 'home.band_local', 'home.band_preorder', 'home.band_pickup'];
    return (
        <section className="relative z-10 -my-4 py-10" aria-hidden="true">
            <div className="-rotate-2 bg-lime py-4 text-forest">
                <Marquee duration={38}>
                    {names.map((p) => (
                        <span key={p.id} className="font-display mx-6 inline-flex items-center gap-4 text-4xl font-medium md:text-5xl">
                            <img src={p.image_url} alt="" className="size-12 md:size-14" /> {p.name} <span className="text-2xl">✺</span>
                        </span>
                    ))}
                </Marquee>
            </div>
            <div className="mt-[-6px] rotate-1 bg-ink py-3 text-bg">
                <Marquee duration={30} reverse>
                    {[...words, ...words].map((w, i) => (
                        <span key={i} className="mx-8 font-mono text-sm tracking-[0.3em] uppercase">
                            {t(w)} <span className="ms-8 text-lime">●</span>
                        </span>
                    ))}
                </Marquee>
            </div>
        </section>
    );
}

function Stats({ stats }) {
    const t = useT();
    const items = [
        ['home.stat_farmers', stats.farmers, 'seedling'],
        ['home.stat_markets', stats.markets, 'round_pushpin'],
        ['home.stat_products', stats.products, 'basket'],
        ['home.stat_orders', stats.orders, 'shopping_cart'],
    ];
    return (
        <section className="mx-5 grid max-w-[1400px] grid-cols-2 gap-px overflow-hidden rounded-[32px] border border-line bg-line sm:mx-8 md:grid-cols-4 2xl:mx-auto">
            {items.map(([label, value, img], i) => (
                <Reveal key={label} delay={i * 0.08} className="group relative bg-bg p-6 md:p-10">
                    <img src={produceImage(img)} alt="" className="absolute end-5 top-5 size-10 opacity-80 transition duration-500 group-hover:scale-125 group-hover:rotate-12" />
                    <CountUp value={value} className="font-display block text-6xl font-light tabular-nums md:text-7xl" />
                    <p className="mt-2 text-sm text-ink-soft">{t(label)}</p>
                </Reveal>
            ))}
        </section>
    );
}

function HowItWorks() {
    const t = useT();
    const steps = [
        { icon: Search, img: 'leafy_green', color: 'bg-lime text-forest' },
        { icon: ShoppingBasket, img: 'basket', color: 'bg-accent text-accent-ink' },
        { icon: CalendarCheck2, img: 'round_pushpin', color: 'bg-sun text-forest' },
        { icon: HandCoins, img: 'honey_pot', color: 'bg-brand text-brand-ink' },
    ];
    return (
        <section className="mx-auto mt-32 grid max-w-[1400px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="lg:sticky lg:top-32 lg:self-start">
                <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('home.how_eyebrow')}</p>
                <h2 className="font-display mt-3 text-5xl leading-[0.95] font-light md:text-7xl">
                    <SplitWords text={t('home.how_title')} />
                </h2>
                <p className="mt-6 max-w-md text-lg text-ink-soft">{t('home.how_body')}</p>
                <LinkArrow href={route('products.index')} label={t('home.start_browsing')} className="mt-8" />
            </div>
            <div className="space-y-5">
                {steps.map((s, i) => (
                    <Reveal key={i} delay={0.05}>
                        <article className="group relative overflow-hidden rounded-[32px] border border-line bg-elev p-7 md:p-10">
                            <span className="font-display absolute -end-2 -top-10 text-[10rem] leading-none font-light text-ink/[0.05] transition group-hover:text-ink/[0.09]">0{i + 1}</span>
                            <div className="flex items-start gap-5">
                                <span className={cn('flex size-14 shrink-0 items-center justify-center rounded-2xl', s.color)}>
                                    <s.icon className="size-6" />
                                </span>
                                <div className="relative">
                                    <h3 className="font-display text-2xl md:text-3xl">{t(`home.step${i + 1}_title`)}</h3>
                                    <p className="mt-2 max-w-md text-ink-soft">{t(`home.step${i + 1}_body`)}</p>
                                </div>
                            </div>
                            <img src={produceImage(s.img)} alt="" className="absolute end-8 bottom-6 hidden size-16 transition duration-700 group-hover:-translate-y-2 group-hover:rotate-12 md:block" />
                        </article>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}

function Categories({ categories }) {
    const t = useT();
    const spans = ['col-span-2 md:row-span-2', '', '', 'col-span-2', '', '', '', ''];
    return (
        <section className="mx-auto mt-32 max-w-[1400px] px-5 sm:px-8">
            <SectionHead eyebrow={t('home.cat_eyebrow')} title={t('home.cat_title')} href={route('products.index')} cta={t('home.all_produce')} />
            <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[180px] sm:gap-4 md:auto-rows-[210px] md:grid-cols-4">
                {categories.map((c, i) => (
                    <Reveal key={c.id} delay={(i % 4) * 0.06} className={cn(spans[i] ?? '')}>
                        <Link
                            href={pathUrl('products.index', { category: c.slug })}
                            data-cursor={t('common.shop')}
                            className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[24px] p-4 transition duration-500 hover:rounded-[40px] sm:rounded-[28px] sm:p-6 sm:hover:rounded-[48px]"
                            style={{ background: `color-mix(in oklab, ${c.color} 30%, var(--bg-elev))` }}
                        >
                            <div className="relative z-10 flex items-start justify-between">
                                <span className="rounded-full bg-bg/70 px-2.5 py-1 text-[11px] font-medium backdrop-blur sm:px-3 sm:text-xs">{t('home.cat_items', { count: c.products_count })}</span>
                                <ArrowUpRight className="rtl-flip size-5 transition duration-500 group-hover:rotate-45 sm:size-6" />
                            </div>
                            <h3 className={cn('font-display relative z-10 leading-none font-medium', i === 0 || i === 3 ? 'max-w-[65%] text-3xl sm:text-4xl md:max-w-none md:text-6xl' : 'max-w-[80%] text-lg sm:text-2xl md:max-w-none md:text-3xl', i === 3 && 'md:text-3xl')}>{t(`categories.${c.slug}`, {}, c.name)}</h3>
                            <img
                                src={produceImage(c.icon)}
                                alt=""
                                className={cn('absolute -end-3 -bottom-3 object-contain drop-shadow-2xl transition duration-700 group-hover:scale-110 group-hover:-rotate-12 sm:-end-4 sm:-bottom-4', i === 0 ? 'size-32 sm:size-44 md:size-72' : i === 3 ? 'size-28 sm:size-32 md:size-36' : 'size-16 sm:size-24 md:size-36')}
                            />
                        </Link>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}

function Harvest({ products }) {
    const t = useT();
    return (
        <section className="mx-auto mt-32 max-w-[1400px] px-5 sm:px-8">
            <SectionHead eyebrow={t('home.harvest_eyebrow')} title={t('home.harvest_title')} href={pathUrl('products.index', { in_stock: 1 })} cta={t('home.see_all')} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((p, i) => (
                    <Reveal key={p.id} delay={(i % 4) * 0.07}>
                        <ProductCard product={p} />
                    </Reveal>
                ))}
            </div>
        </section>
    );
}

function MarketsSection({ markets }) {
    const t = useT();
    const { days } = useFormat();
    const [active, setActive] = useState(null);
    const sorted = [...markets].sort((a, b) => b.open_today - a.open_today);
    return (
        <section className="mx-auto mt-32 max-w-[1400px] px-5 sm:px-8">
            <SectionHead eyebrow={t('home.map_eyebrow')} title={t('home.map_title')} href={route('markets.index')} cta={t('home.all_markets')} />
            <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                <Reveal className="h-[440px] lg:h-[620px]">
                    <MapView
                        className="h-full"
                        activeId={active}
                        markers={markets.map((m) => ({
                            id: m.id,
                            lat: m.latitude,
                            lng: m.longitude,
                            title: m.name,
                            subtitle: days(m.operating_days, 'long'),
                            href: route('markets.show', m.slug),
                            cta: t('common.view'),
                            color: m.open_today ? '#E2552C' : '#1F4D36',
                            image: '/images/produce/basket.webp',
                        }))}
                    />
                </Reveal>
                <div className="no-scrollbar space-y-3 lg:max-h-[620px] lg:overflow-y-auto" data-lenis-prevent>
                    {sorted.map((m, i) => (
                        <Reveal key={m.id} delay={i * 0.04}>
                            <MarketCard market={m} active={active === m.id} onHover={setActive} />
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Farmers({ farmers }) {
    const t = useT();
    const head = (
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
            <SectionHead eyebrow={t('home.farmers_eyebrow')} title={t('home.farmers_title')} href={route('farmers.index')} cta={t('home.meet_all')} compact />
        </div>
    );
    return (
        <HorizontalScroll head={head} count={farmers.length} className="mt-20" label={t('home.farmers_title')} trackClassName="items-stretch gap-4 px-5 sm:gap-5 sm:px-8 xl:px-[calc((100vw-1400px)/2+2rem)]">
            {farmers.map((f, i) => (
                <li key={f.id} data-hs-item className={cn('flex w-[78vw] max-w-[340px] shrink-0 snap-start sm:w-[320px] md:w-[340px]', i % 2 && 'md:translate-y-6')}>
                    <FarmerCard farmer={f} className="w-full" />
                </li>
            ))}
        </HorizontalScroll>
    );
}

function Reviews({ reviews }) {
    const t = useT();
    if (!reviews.length) return null;
    return (
        <section className="mt-32 overflow-hidden">
            <div className="mx-auto max-w-[1400px] px-5 text-center sm:px-8">
                <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('home.reviews_eyebrow')}</p>
                <h2 className="font-display mx-auto mt-3 max-w-3xl text-4xl font-light md:text-6xl">
                    <SplitWords text={t('home.reviews_title')} />
                </h2>
            </div>
            <Marquee duration={60} className="mt-12">
                {reviews.map((r) => (
                    <figure key={r.id} className="mx-2.5 w-[340px] shrink-0 rounded-[28px] border border-line bg-elev p-6">
                        <div className="flex gap-0.5">
                            {Array.from({ length: r.rating }).map((_, i) => (
                                <Star key={i} className="size-4 fill-sun text-sun" />
                            ))}
                        </div>
                        <blockquote className="font-display mt-4 text-xl leading-snug">“{r.comment}”</blockquote>
                        <figcaption className="mt-5 text-sm text-ink-soft">
                            <span className="font-semibold text-ink">{r.user}</span> · {r.subject}
                        </figcaption>
                    </figure>
                ))}
            </Marquee>
        </section>
    );
}

function FarmerCta() {
    const t = useT();
    return (
        <section className="mx-auto mt-32 max-w-[1400px] px-5 sm:px-8">
            <div className="relative overflow-hidden rounded-[40px] bg-brand px-7 py-16 text-brand-ink md:px-16 md:py-24">
                <img src={produceImage('tractor')} alt="" className="absolute -end-10 -bottom-10 w-72 opacity-90 md:w-[420px]" />
                <div className="relative max-w-2xl">
                    <p className="font-mono text-xs tracking-[0.2em] uppercase opacity-70">{t('home.cta_eyebrow')}</p>
                    <h2 className="font-display mt-4 text-5xl leading-[0.95] font-light md:text-7xl">
                        <SplitWords text={t('home.cta_title')} />
                    </h2>
                    <ul className="mt-8 grid gap-3 text-lg sm:grid-cols-2">
                        {[1, 2, 3, 4].map((i) => (
                            <li key={i} className="flex items-start gap-2.5">
                                <span className="mt-2 size-2 shrink-0 rounded-full bg-lime dark:bg-forest" /> {t(`home.cta_point${i}`)}
                            </li>
                        ))}
                    </ul>
                    <Magnetic className="mt-10">
                        <Link href={route('register', { as: 'farmer' })} className={buttonClass('lime', 'lg', 'dark:bg-forest dark:text-lime')}>
                            {t('home.cta_button')} <ArrowRight className="rtl-flip size-5" />
                        </Link>
                    </Magnetic>
                </div>
            </div>
        </section>
    );
}

function SectionHead({ eyebrow, title, href, cta, compact = false }) {
    return (
        <div className={cn(!compact && 'mb-10', 'flex flex-col gap-4 md:flex-row md:items-end md:justify-between')}>
            <div>
                <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{eyebrow}</p>
                <h2 className="font-display mt-3 max-w-3xl text-4xl leading-[1] font-light md:text-6xl">
                    <SplitWords text={title} />
                </h2>
            </div>
            {href && <LinkArrow href={href} label={cta} />}
        </div>
    );
}

function LinkArrow({ href, label, className }) {
    return (
        <Link href={href} className={cn('group inline-flex shrink-0 items-center gap-3 font-medium', className)}>
            <span className="border-b border-current pb-0.5">{label}</span>
            <span className="flex size-10 items-center justify-center rounded-full bg-ink text-bg transition group-hover:bg-accent group-hover:text-accent-ink">
                <ArrowRight className="rtl-flip size-4 transition group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}

export default function Home({ stats, categories, harvest, farmers, markets, reviews }) {
    const openToday = markets.filter((m) => m.open_today).length;
    return (
        <>
            <Hero stats={stats} openToday={openToday} />
            <ProduceBands harvest={harvest} />
            <div className="mt-20">
                <Stats stats={stats} />
            </div>
            <HowItWorks />
            <Categories categories={categories} />
            <Harvest products={harvest} />
            <FieldsReel className="mt-16" />
            <MarketsSection markets={markets} />
            <Farmers farmers={farmers} />
            <Reviews reviews={reviews} />
            <FarmerCta />
        </>
    );
}
