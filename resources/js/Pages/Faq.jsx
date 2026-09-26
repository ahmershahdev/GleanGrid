import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Reveal, SplitWords } from '@/Components/motion';
import { buttonClass } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { cn, produceImage } from '@/lib/utils';

function Item({ q, a, open, onToggle, index }) {
    return (
        <div className="border-b border-line">
            <button type="button" onClick={onToggle} aria-expanded={open} className="group flex w-full items-start gap-5 py-6 text-start">
                <span className="mt-1.5 font-mono text-xs text-ink-faint tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <span className="font-display flex-1 text-xl leading-snug transition-colors group-hover:text-accent md:text-2xl">{q}</span>
                <motion.span animate={{ rotate: open ? 135 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className={cn('mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors', open ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong')}>
                    <Plus className="size-4" />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                        <p className="max-w-3xl ps-11 pb-7 text-lg text-ink-soft">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function Faq({ groups }) {
    const t = useT();
    const [q, setQ] = useState('');
    const [open, setOpen] = useState('0-0');
    const topics = Object.keys(groups);
    const [topic, setTopic] = useState('all');

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return topics
            .filter((name) => topic === 'all' || topic === name)
            .map((name) => [name, groups[name].filter(([question, answer]) => !needle || `${question} ${answer}`.toLowerCase().includes(needle))])
            .filter(([, items]) => items.length);
    }, [q, topic, groups, topics]);

    return (
        <section className="mx-auto max-w-[1400px] px-5 pt-8 sm:px-8 sm:pt-12">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
                <div className="lg:sticky lg:top-28 lg:self-start">
                    <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('faq.eyebrow')}</p>
                    <h1 className="font-display mt-4 text-5xl leading-[0.95] font-light md:text-7xl">
                        <SplitWords text={t('faq.title')} immediate />
                    </h1>
                    <p className="mt-6 max-w-md text-lg text-ink-soft">{t('faq.subtitle')}</p>

                    <label className="mt-8 flex h-14 items-center gap-3 rounded-full border border-line-strong bg-elev px-5 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
                        <Search className="size-5 text-ink-faint" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('faq.search')} aria-label={t('faq.search')} className="h-full flex-1 bg-transparent focus:outline-none" />
                    </label>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {['all', ...topics].map((name) => (
                            <button key={name} type="button" onClick={() => setTopic(name)} className={cn('h-9 rounded-full border px-4 text-sm transition', topic === name ? 'border-ink bg-ink text-bg' : 'border-line text-ink-soft hover:border-ink')}>
                                {name === 'all' ? t('faq.all') : name}
                            </button>
                        ))}
                    </div>

                    <div className="mt-10 hidden items-center gap-4 rounded-[28px] bg-brand p-6 text-brand-ink lg:flex">
                        <img src={produceImage('basket')} alt="" className="size-14 animate-float" />
                        <div className="flex-1">
                            <p className="font-display text-xl">{t('faq.still')}</p>
                            <Link href={route('contact')} className="mt-1 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4">
                                {t('faq.contact')} <ArrowUpRight className="rtl-flip size-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div>
                    {filtered.map(([name, items], g) => (
                        <Reveal key={name} delay={g * 0.04} className="mb-12">
                            <h2 className="font-mono text-xs tracking-[0.2em] text-accent uppercase">{name}</h2>
                            <div className="mt-2 border-t border-line">
                                {items.map(([question, answer], i) => {
                                    const id = `${g}-${i}`;
                                    return <Item key={question} index={i} q={question} a={answer} open={open === id} onToggle={() => setOpen(open === id ? null : id)} />;
                                })}
                            </div>
                        </Reveal>
                    ))}
                    {filtered.length === 0 && (
                        <div className="rounded-[32px] border border-dashed border-line-strong p-12 text-center">
                            <p className="font-display text-2xl">{t('faq.none')}</p>
                            <Link href={route('contact')} className={buttonClass('primary', 'md', 'mt-6')}>
                                {t('faq.contact')}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
