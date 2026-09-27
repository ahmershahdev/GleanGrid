import { Link } from '@inertiajs/react';
import { ArrowRight, Globe, UserRound } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '@/Components/icons';
import FieldsReel from '@/Components/FieldsReel';
import { CountUp, Parallax, Reveal, SplitWords } from '@/Components/motion';
import { buttonClass } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { produceImage } from '@/lib/utils';

const TEAM = [
    {
        name: 'Syed Ahmer Shah',
        role: 'about.role_ahmer',
        work: 'about.work_ahmer',
        photo: '/images/team/syed-ahmer-shah.webp',
        links: [
            ['Portfolio', 'https://ahmershah.dev/', Globe],
            ['GitHub', 'https://github.com/ahmershahdev', GithubIcon],
            ['LinkedIn', 'https://linkedin.com/in/syedahmershah', LinkedinIcon],
        ],
    },
    { name: 'Syed Hassan', role: 'about.role_hassan', work: null, photo: null, links: [] },
];

function GuestPortrait({ name }) {
    const initials = name.split(' ').map((p) => p[0]).slice(-2).join('');
    return (
        <div className="relative flex size-full items-center justify-center overflow-hidden bg-gradient-to-br from-brand-soft via-bg to-lime/30" role="img" aria-label={`${name} — photo coming soon`}>
            <svg className="absolute inset-0 size-full text-brand/10" aria-hidden="true">
                <defs>
                    <pattern id="rows" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
                        <path d="M0 14h28" stroke="currentColor" strokeWidth="1.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#rows)" />
            </svg>
            <div className="relative flex flex-col items-center">
                <div className="flex size-32 items-center justify-center rounded-full border border-line-strong bg-elev/80 shadow-soft backdrop-blur">
                    <UserRound className="size-14 text-ink-faint" strokeWidth={1.25} />
                </div>
                <span className="font-display mt-5 text-5xl font-light text-brand/70" aria-hidden="true">
                    {initials}
                </span>
            </div>
        </div>
    );
}

export default function About({ stats }) {
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

            <section className="mx-auto mt-28 max-w-[1400px] px-5 sm:px-8">
                <h2 className="font-display text-4xl font-light md:text-6xl">
                    <SplitWords text={t('about.team_title')} />
                </h2>
                <p className="mt-4 max-w-2xl text-lg text-ink-soft">{t('about.team_body')}</p>
                <div className="mt-12 grid gap-5 md:grid-cols-2">
                    {TEAM.map((m, i) => (
                        <Reveal key={m.name} delay={i * 0.08}>
                            <article className="group grid h-full overflow-hidden rounded-[36px] border border-line bg-elev sm:grid-cols-[0.9fr_1fr]">
                                <div className="relative aspect-[4/5] overflow-hidden bg-brand-soft sm:aspect-auto">
                                    {m.photo ? (
                                        <img
                                            src={m.photo}
                                            alt={m.name}
                                            width="640"
                                            height="800"
                                            loading="lazy"
                                            decoding="async"
                                            className="size-full object-cover grayscale-[35%] transition duration-[1.2s] ease-out-expo group-hover:scale-[1.04] group-hover:grayscale-0"
                                        />
                                    ) : (
                                        <GuestPortrait name={m.name} />
                                    )}
                                    <span className="absolute start-4 top-4 rounded-full bg-paper/90 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-forest uppercase backdrop-blur">
                                        0{i + 1}
                                    </span>
                                </div>
                                <div className="flex flex-col p-7 md:p-8">
                                    <p className="font-mono text-[11px] tracking-[0.2em] text-ink-faint uppercase">{t(m.role)}</p>
                                    <h3 className="font-display mt-3 text-4xl leading-none font-light">{m.name}</h3>
                                    {m.work && (
                                        <p className="mt-5 border-s-2 border-accent ps-4 text-ink-soft">
                                            <span className="block text-xs font-semibold tracking-wider text-ink uppercase">{t('about.work_label')}</span>
                                            {t(m.work)}
                                        </p>
                                    )}
                                    {m.links.length > 0 && (
                                        <div className="mt-auto flex flex-wrap gap-2 pt-8">
                                            {m.links.map(([label, href, Icon]) => (
                                                <a key={label} href={href} target="_blank" rel="noopener noreferrer me" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium transition hover:border-ink hover:bg-ink hover:text-bg">
                                                    <Icon className="size-4" /> {label}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </article>
                        </Reveal>
                    ))}
                </div>
                <div className="mt-16 rounded-[32px] border border-line p-8 text-sm text-ink-soft">
                    <p className="font-semibold text-ink">{t('about.stack_title')}</p>
                    <p className="mt-2">{t('about.stack_body')}</p>
                </div>
                <div className="mt-12 flex justify-center">
                    <Link href={route('contact')} className={buttonClass('primary', 'lg')}>
                        {t('about.contact_cta')} <ArrowRight className="rtl-flip size-5" />
                    </Link>
                </div>
            </section>
        </>
    );
}
