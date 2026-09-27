import { Link } from '@inertiajs/react';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, Code2, CreditCard, Database, Globe, Palette, Quote, Rocket, ShieldCheck } from 'lucide-react';
import { useRef } from 'react';
import { GithubIcon, LinkedinIcon } from '@/Components/icons';
import FieldsReel from '@/Components/FieldsReel';
import { CountUp, Marquee, Parallax, Reveal, SplitWords } from '@/Components/motion';
import { buttonClass } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { prefersReducedMotion, produceImage } from '@/lib/utils';

const LINKS = [
    ['Portfolio', 'https://ahmershah.dev/', Globe],
    ['GitHub', 'https://github.com/ahmershahdev', GithubIcon],
    ['LinkedIn', 'https://linkedin.com/in/syedahmershah', LinkedinIcon],
];

const CRAFT = [
    ['design', Palette, 'leafy_green'],
    ['frontend', Code2, 'sunflower'],
    ['backend', Database, 'sheaf_of_rice'],
    ['payments', CreditCard, 'honey_pot'],
    ['security', ShieldCheck, 'seedling'],
    ['ops', Rocket, 'tractor'],
];

const STACK = ['Laravel 12', 'PHP 8.3', 'MySQL 8', 'React 19', 'Inertia 3', 'Tailwind CSS 4', 'Motion', 'Recharts', 'Leaflet', 'Socialite', 'Argon2id', 'Playwright', 'PHPUnit', 'GitHub Actions', 'Vite 8', 'PWA'];

function OrbitText({ text }) {
    const chars = `${text} · `.repeat(2).split('');
    return (
        <div className="gg-orbit pointer-events-none absolute -end-10 -top-10 size-40 md:size-48" aria-hidden="true">
            {chars.map((c, i) => (
                <span key={i} className="absolute start-1/2 top-0 h-1/2 origin-bottom font-mono text-[10px] tracking-widest text-ink uppercase" style={{ transform: `rotate(${(i / chars.length) * 360}deg)` }}>
                    {c}
                </span>
            ))}
            <span className="absolute inset-[34%] rounded-full bg-lime" />
            <img src={produceImage('mango')} alt="" className="absolute inset-[38%] size-[24%]" />
        </div>
    );
}

function Portrait() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
    const reduced = prefersReducedMotion();
    return (
        <div ref={ref} className="relative">
            <motion.div
                initial={reduced ? false : { clipPath: 'inset(18% 18% 18% 18% round 200px)' }}
                whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 44px)' }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative aspect-[4/5] overflow-hidden rounded-[44px] bg-brand-soft"
            >
                <motion.img src="/images/team/syed-ahmer-shah.webp" alt="Syed Ahmer Shah" width="640" height="800" loading="lazy" decoding="async" style={{ y: reduced ? 0 : y, scale: 1.18 }} className="absolute inset-0 size-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-soil/60 via-transparent to-transparent" />
                <p className="absolute start-6 bottom-6 font-mono text-[11px] tracking-[0.25em] text-white/85 uppercase">Hyderabad · Sindh · PK</p>
            </motion.div>
            <OrbitText text="Designed · Engineered · Shipped solo" />
            <Parallax speed={0.25} className="pointer-events-none absolute -start-8 -bottom-10 w-28 md:w-36">
                <img src={produceImage('tomato')} alt="" className="w-full animate-float drop-shadow-[0_20px_24px_rgb(0_0_0/0.25)]" />
            </Parallax>
        </div>
    );
}

function Timeline({ t }) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] });
    const scale = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
    return (
        <div ref={ref} className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
            <div className="absolute start-0 end-0 top-5 hidden h-px bg-line md:block" />
            <motion.div className="absolute start-0 end-0 top-5 hidden h-px origin-left bg-accent md:block rtl:origin-right" style={{ scaleX: scale }} />
            {[1, 2, 3, 4].map((n, i) => (
                <Reveal key={n} delay={i * 0.1} className="relative">
                    <span className="relative z-10 flex size-10 items-center justify-center rounded-full border border-line-strong bg-bg font-mono text-sm">{`0${n}`}</span>
                    <h3 className="font-display mt-5 text-3xl">{t(`about.t${n}`)}</h3>
                    <p className="mt-2 text-ink-soft">{t(`about.t${n}_body`)}</p>
                </Reveal>
            ))}
        </div>
    );
}

export default function About({ stats, build = {} }) {
    const t = useT();
    const values = [
        ['about.v1_title', 'about.v1_body', 'leafy_green'],
        ['about.v2_title', 'about.v2_body', 'round_pushpin'],
        ['about.v3_title', 'about.v3_body', 'honeybee'],
    ];

    return (
        <>
            <section className="mx-auto max-w-[1400px] px-5 pt-8 sm:px-8 sm:pt-12">
                <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('about.eyebrow')}</p>
                <h1 className="font-display mt-4 max-w-5xl text-5xl leading-[0.95] font-light md:text-8xl">
                    <SplitWords text={t('about.title')} immediate />
                </h1>
                <div className="mt-14 grid gap-10 lg:grid-cols-2">
                    <Reveal>
                        <p className="font-display text-2xl leading-snug md:text-3xl">{t('about.lead')}</p>
                    </Reveal>
                    <Reveal delay={0.1} className="space-y-5 text-lg text-ink-soft">
                        <p>{t('about.p1')}</p>
                        <p>{t('about.p2')}</p>
                    </Reveal>
                </div>
            </section>

            <section className="relative mx-auto mt-24 max-w-[1400px] overflow-hidden px-5 sm:px-8">
                <div className="relative grid grid-cols-2 gap-px overflow-hidden rounded-[40px] bg-brand text-brand-ink md:grid-cols-4">
                    {[
                        ['about.stat_farmers', stats.farmers],
                        ['about.stat_customers', stats.customers],
                        ['about.stat_markets', stats.markets],
                        ['about.stat_orders', stats.orders],
                    ].map(([label, value]) => (
                        <div key={label} className="p-8 md:p-12">
                            <CountUp value={value} className="font-display block text-6xl font-light md:text-7xl" />
                            <p className="mt-2 text-sm opacity-75">{t(label)}</p>
                        </div>
                    ))}
                    <Parallax speed={0.3} className="pointer-events-none absolute -end-6 -top-10 w-40 md:w-56">
                        <img src={produceImage('sun')} alt="" className="w-full animate-spin-slow" />
                    </Parallax>
                </div>
            </section>

            <FieldsReel className="mt-12" />

            <section className="mx-auto mt-28 max-w-[1400px] px-5 sm:px-8">
                <h2 className="font-display max-w-3xl text-4xl font-light md:text-6xl">
                    <SplitWords text={t('about.values_title')} />
                </h2>
                <div className="mt-12 grid gap-4 md:grid-cols-3">
                    {values.map(([title, body, img], i) => (
                        <Reveal key={title} delay={i * 0.08}>
                            <article className="group h-full rounded-[32px] border border-line bg-elev p-8">
                                <img src={produceImage(img)} alt="" className="size-16 transition duration-500 group-hover:-rotate-12" />
                                <h3 className="font-display mt-8 text-3xl">{t(title)}</h3>
                                <p className="mt-3 text-ink-soft">{t(body)}</p>
                            </article>
                        </Reveal>
                    ))}
                </div>
            </section>

            <section className="mx-auto mt-32 max-w-[1400px] px-5 sm:px-8" aria-labelledby="builder">
                <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('about.solo_eyebrow')}</p>
                <h2 id="builder" className="font-display mt-3 text-4xl font-light md:text-6xl">
                    <SplitWords text={t('about.team_title')} />
                </h2>
                <p className="mt-4 max-w-2xl text-lg text-ink-soft">{t('about.team_body')}</p>

                <div className="mt-14 grid items-center gap-14 lg:grid-cols-[0.85fr_1fr]">
                    <Portrait />
                    <div>
                        <p className="font-mono text-[11px] tracking-[0.2em] text-ink-faint uppercase">{t('about.role_ahmer')}</p>
                        <h3 className="font-display mt-3 text-6xl leading-[0.9] font-light md:text-8xl">
                            <SplitWords text="Syed Ahmer Shah" />
                        </h3>
                        <Reveal delay={0.15}>
                            <blockquote className="relative mt-10 border-s-2 border-accent ps-6">
                                <Quote className="absolute -start-3 -top-4 size-6 rounded-full bg-bg p-1 text-accent" />
                                <p className="font-display text-2xl leading-snug italic md:text-3xl">{t('about.solo_quote')}</p>
                            </blockquote>
                        </Reveal>
                        <Reveal delay={0.25}>
                            <p className="mt-8 text-lg font-semibold">{t('about.solo_lead')}</p>
                            <p className="mt-2 text-ink-soft">{t('about.solo_body')}</p>
                        </Reveal>
                        <Reveal delay={0.3} className="mt-8 flex flex-wrap gap-2">
                            {LINKS.map(([label, href, Icon]) => (
                                <motion.a key={label} href={href} target="_blank" rel="noopener noreferrer me" whileHover={{ y: -3 }} className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-medium transition hover:border-ink hover:bg-ink hover:text-bg">
                                    <Icon className="size-4" /> {label}
                                </motion.a>
                            ))}
                        </Reveal>
                    </div>
                </div>

                <div className="mt-24 grid grid-cols-2 gap-px overflow-hidden rounded-[36px] border border-line bg-line md:grid-cols-4">
                    {[
                        ['n_screens', build.screens],
                        ['n_languages', build.languages],
                        ['n_tests', build.tests],
                        ['n_roles', build.roles],
                    ].map(([label, value]) => (
                        <div key={label} className="bg-elev p-7 md:p-10">
                            <CountUp value={value ?? 0} className="font-display block text-5xl font-light md:text-6xl" />
                            <p className="mt-2 text-sm text-ink-soft">{t(`about.${label === 'n_screens' ? 'n_pages' : label}`)}</p>
                        </div>
                    ))}
                </div>

                <h3 className="font-display mt-28 text-4xl font-light md:text-5xl">
                    <SplitWords text={t('about.craft_title')} />
                </h3>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {CRAFT.map(([key, Icon, img], i) => (
                        <Reveal key={key} delay={(i % 3) * 0.08}>
                            <motion.article whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="group relative h-full overflow-hidden rounded-[32px] border border-line bg-elev p-7">
                                <span className="absolute -end-10 -bottom-10 size-40 rounded-full bg-lime/0 blur-2xl transition duration-700 group-hover:bg-lime/40" />
                                <img src={produceImage(img)} alt="" className="absolute end-6 top-6 size-14 opacity-80 transition duration-700 group-hover:scale-125 group-hover:-rotate-12" />
                                <span className="relative flex size-12 items-center justify-center rounded-2xl bg-brand text-brand-ink">
                                    <Icon className="size-5" />
                                </span>
                                <p className="relative mt-6 font-mono text-[11px] text-ink-faint">{`0${i + 1}`}</p>
                                <h4 className="font-display relative mt-1 text-2xl">{t(`about.craft_${key}`)}</h4>
                                <p className="relative mt-2 text-sm leading-relaxed text-ink-soft">{t(`about.craft_${key}_body`)}</p>
                            </motion.article>
                        </Reveal>
                    ))}
                </div>

                <h3 className="font-display mt-28 text-4xl font-light md:text-5xl">
                    <SplitWords text={t('about.timeline_title')} />
                </h3>
                <Timeline t={t} />
            </section>

            <section className="mt-28" aria-label={t('about.stack_label')}>
                <p className="mx-auto max-w-[1400px] px-5 font-mono text-xs tracking-[0.2em] text-ink-faint uppercase sm:px-8">{t('about.stack_label')}</p>
                <Marquee duration={36} className="mt-5 border-y border-line py-6">
                    {STACK.map((s) => (
                        <span key={s} className="font-display mx-8 inline-flex items-center gap-8 text-4xl font-light whitespace-nowrap md:text-6xl">
                            {s} <span className="size-3 rounded-full bg-accent" />
                        </span>
                    ))}
                </Marquee>
            </section>

            <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
                <div className="mt-16 rounded-[32px] border border-line p-8 text-sm text-ink-soft">
                    <p className="font-semibold text-ink">{t('about.stack_title')}</p>
                    <p className="mt-2">{t('about.stack_body')}</p>
                </div>
                <div className="mt-12 flex justify-center">
                    <Link href={route('contact')} className={buttonClass('primary', 'lg')}>
                        {t('about.say_hi')} <ArrowRight className="rtl-flip size-5" />
                    </Link>
                </div>
            </section>
        </>
    );
}
