import { Link } from '@inertiajs/react';
import { motion, useScroll, useSpring } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Reveal, SplitWords } from '@/Components/motion';
import { useFormat, useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const PAGES = [
    ['terms', 'terms'],
    ['privacy', 'privacy'],
    ['returns', 'returns'],
    ['pickup', 'pickup-policy'],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function Block({ block }) {
    if (Array.isArray(block) && block[0] === 'list') {
        return (
            <ul className="space-y-3">
                {block[1].map((item) => (
                    <li key={item} className="flex gap-3">
                        <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        );
    }
    return <p>{block}</p>;
}

export default function Legal({ page, content, updated }) {
    const t = useT();
    const fmt = useFormat();
    const locale = useLocale();
    const [active, setActive] = useState(null);
    const article = useRef(null);
    const { scrollYProgress } = useScroll({ target: article, offset: ['start start', 'end end'] });
    const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

    useEffect(() => {
        const heads = [...document.querySelectorAll('[data-legal-section]')];
        const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-30% 0px -60% 0px' });
        heads.forEach((h) => io.observe(h));
        return () => io.disconnect();
    }, [page]);

    return (
        <section className="mx-auto max-w-[1400px] px-5 pt-8 sm:px-8 sm:pt-12">
            <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1" aria-label={t('legal.nav')}>
                {PAGES.map(([key, name]) => (
                    <Link key={key} href={route(name)} className={cn('relative h-10 shrink-0 rounded-full px-4 text-sm leading-10 font-medium transition', page === key ? 'text-bg' : 'text-ink-soft hover:text-ink')}>
                        {page === key && <motion.span layoutId="legal-pill" className="absolute inset-0 -z-10 rounded-full bg-ink" />}
                        {t(`legal.${key}`)}
                    </Link>
                ))}
            </nav>

            <header className="mt-12 max-w-4xl">
                <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('legal.updated', { date: fmt.date(updated) })}</p>
                <h1 className="font-display mt-4 text-5xl leading-[0.95] font-light md:text-8xl">
                    <SplitWords key={page} text={content.title} immediate />
                </h1>
                <p className="mt-8 max-w-2xl text-xl text-ink-soft">{content.intro}</p>
                {locale !== 'en' && <p className="mt-4 text-sm text-ink-faint">{t('legal.english_only')}</p>}
            </header>

            <div className="mt-16 grid gap-12 lg:grid-cols-[260px_1fr]">
                <aside className="hidden lg:block">
                    <div className="sticky top-28">
                        <div className="relative h-px w-full bg-line">
                            <motion.div style={{ scaleX: progress }} className="absolute inset-0 origin-left bg-accent rtl:origin-right" />
                        </div>
                        <ol className="mt-6 space-y-1">
                            {content.sections.map(([heading], i) => {
                                const id = slug(heading);
                                return (
                                    <li key={id}>
                                        <a href={`#${id}`} className={cn('flex gap-3 rounded-xl px-3 py-2 text-sm transition', active === id ? 'bg-ink/[0.06] text-ink' : 'text-ink-faint hover:text-ink')}>
                                            <span className="font-mono tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                                            {heading}
                                        </a>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                </aside>

                <article ref={article} className="max-w-3xl space-y-14 text-lg leading-relaxed text-ink-soft" lang="en">
                    {content.sections.map(([heading, blocks], i) => (
                        <Reveal key={heading} as="section">
                            <div id={slug(heading)} data-legal-section className="scroll-mt-28">
                                <h2 className="font-display flex items-baseline gap-4 text-3xl text-ink">
                                    <span className="font-mono text-sm text-accent tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                                    {heading}
                                </h2>
                                <div className="mt-5 space-y-4">
                                    {blocks.map((b, k) => (
                                        <Block key={k} block={b} />
                                    ))}
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </article>
            </div>
        </section>
    );
}
