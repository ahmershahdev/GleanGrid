import { Link, usePage, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Check, Clock, Copy, Globe, Mail, MapPin, MessageCircleQuestion, Phone, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FacebookIcon, GithubIcon, LinkedinIcon, XIcon } from '@/Components/icons';
import { Reveal, SplitWords } from '@/Components/motion';
import { Button, Input, Textarea, buttonClass } from '@/Components/ui';
import { BotFields, useBotGuard } from '@/lib/botguard';
import { useT } from '@/lib/i18n';
import { cn, produceImage } from '@/lib/utils';

const TOPICS = ['order', 'sell', 'partner', 'feedback', 'other'];
const MAX = 3000;

/** Live Hyderabad time + whether the team is likely online (Mon–Sat, 9:00–18:00 PKT). */
function useLocalTime() {
    const make = () => {
        const now = new Date();
        const pk = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
        const open = pk.getDay() !== 0 && pk.getHours() >= 9 && pk.getHours() < 18;
        return { label: now.toLocaleTimeString([], { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }), open };
    };
    const [state, setState] = useState(make);
    useEffect(() => {
        const id = setInterval(() => setState(make()), 30_000);
        return () => clearInterval(id);
    }, []);
    return state;
}

function CopyRow({ icon: Icon, label, value, href }) {
    const t = useT();
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            /* clipboard blocked — the link still works */
        }
    };
    return (
        <div className="group flex items-center gap-4 rounded-3xl border border-line bg-elev p-4 transition hover:border-line-strong sm:p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-lime text-forest transition duration-500 group-hover:rotate-[-8deg]">
                <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-soft">{label}</p>
                {href ? (
                    <a href={href} className="font-display block truncate text-lg hover:underline sm:text-xl" dir="ltr">
                        {value}
                    </a>
                ) : (
                    <p className="font-display text-lg sm:text-xl">{value}</p>
                )}
            </div>
            {href && (
                <button type="button" onClick={copy} className="relative flex size-10 shrink-0 items-center justify-center rounded-full text-ink-faint transition hover:bg-ink/5 hover:text-ink" aria-label={t('contact.copy')}>
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span key={copied ? 'y' : 'n'} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
                            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                        </motion.span>
                    </AnimatePresence>
                </button>
            )}
        </div>
    );
}

export default function Contact({ contact }) {
    const t = useT();
    const { social } = usePage().props;
    const clock = useLocalTime();
    const [topic, setTopic] = useState('order');
    const [sent, setSent] = useState(false);
    const form = useForm({ name: '', email: '', subject: t('contact.topic_order'), message: '', website: '', captcha_v2: '' });
    const guard = useBotGuard(form, 'contact');

    const pickTopic = (k) => {
        setTopic(k);
        // Pre-fill the subject unless the visitor already wrote their own.
        const known = TOPICS.map((x) => t(`contact.topic_${x}`));
        if (!form.data.subject || known.includes(form.data.subject)) form.setData('subject', t(`contact.topic_${k}`));
    };

    const submit = (e) => {
        e.preventDefault();
        guard.submit('post', route('contact.send'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setSent(true);
            },
        });
    };

    const socials = [
        ['Website', social?.website, Globe],
        ['GitHub', social?.github, GithubIcon],
        ['LinkedIn', social?.linkedin, LinkedinIcon],
        ['X', social?.x, XIcon],
        ['Facebook', social?.facebook, FacebookIcon],
    ].filter(([, href]) => href);

    return (
        <>
            <section className="mx-auto max-w-[1400px] px-5 pt-8 sm:px-8 sm:pt-12">
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('contact.eyebrow')}</p>
                        <h1 className="font-display mt-4 max-w-4xl text-5xl leading-[0.95] font-light md:text-8xl">
                            <SplitWords text={t('contact.title')} immediate />
                        </h1>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-3 rounded-full border border-line bg-elev px-4 py-2.5 text-sm">
                        <span className="relative flex size-2.5">
                            {clock.open && <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60" />}
                            <span className={cn('relative size-2.5 rounded-full', clock.open ? 'bg-success' : 'bg-ink-faint')} />
                        </span>
                        <span>
                            <Clock className="me-1 inline size-3.5 opacity-60" />
                            {t('contact.local_time', { time: clock.label })} · {t(clock.open ? 'contact.online' : 'contact.offline')}
                        </span>
                    </motion.div>
                </div>

                <div className="mt-12 grid gap-10 lg:mt-14 lg:grid-cols-[1fr_1.15fr]">
                    <Reveal className="space-y-4">
                        <CopyRow icon={Mail} label={t('contact.email')} value={contact.email} href={`mailto:${contact.email}`} />
                        <CopyRow icon={Phone} label={t('contact.phone')} value={contact.phone} href={`tel:${contact.phone.replace(/\s/g, '')}`} />
                        <CopyRow icon={MapPin} label={t('contact.visit')} value={contact.address} />

                        {/* SRS: "static team contact information with Google Maps showing location" — keyless embed. */}
                        <div className="relative overflow-hidden rounded-3xl border border-line">
                            <iframe
                                title={t('contact.map_title')}
                                src={`https://www.google.com/maps?q=${contact.latitude},${contact.longitude}&z=13&output=embed`}
                                className="h-72 w-full dark:[filter:invert(0.9)_hue-rotate(180deg)] sm:h-80"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${contact.latitude},${contact.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute end-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-elev/95 px-3.5 py-2 text-sm font-medium shadow-soft backdrop-blur transition hover:bg-ink hover:text-bg"
                            >
                                {t('map.directions')} <ArrowUpRight className="rtl-flip size-4" />
                            </a>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            {socials.map(([label, href, Icon]) => (
                                <a key={label} href={href} target="_blank" rel="noopener noreferrer me" aria-label={label} title={label} className="flex size-11 items-center justify-center rounded-full border border-line-strong transition duration-300 hover:-translate-y-0.5 hover:border-ink hover:bg-ink hover:text-bg">
                                    <Icon className="size-[18px]" />
                                </a>
                            ))}
                            <Link href={route('faq')} className="ms-auto inline-flex h-11 items-center gap-2 rounded-full bg-lime px-4 text-sm font-medium text-forest">
                                <MessageCircleQuestion className="size-4" /> {t('contact.faq_first')}
                            </Link>
                        </div>
                    </Reveal>

                    <Reveal delay={0.1}>
                        <div className="relative overflow-hidden rounded-[32px] border border-line bg-elev p-6 md:p-10">
                            <AnimatePresence mode="wait" initial={false}>
                                {sent ? (
                                    <motion.div key="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex min-h-[520px] flex-col items-center justify-center text-center">
                                        <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="flex size-24 items-center justify-center rounded-full bg-lime text-forest">
                                            <Check className="size-12" strokeWidth={2.5} />
                                        </motion.div>
                                        <h2 className="font-display mt-8 text-4xl">{t('contact.sent_title')}</h2>
                                        <p className="mt-3 max-w-sm text-ink-soft">{t('contact.sent_body')}</p>
                                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                                            <button type="button" onClick={() => setSent(false)} className={buttonClass('outline', 'md')}>
                                                {t('contact.another')}
                                            </button>
                                            <Link href={route('products.index')} className={buttonClass('primary', 'md')}>
                                                {t('nav.produce')}
                                            </Link>
                                        </div>
                                        <img src={produceImage('sunflower')} alt="" className="absolute -end-8 -bottom-8 w-40 animate-spin-slow opacity-20" />
                                    </motion.div>
                                ) : (
                                    <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} className="relative space-y-5">
                                        <BotFields form={form} guard={guard} t={t} />
                                        <div>
                                            <h2 className="font-display text-3xl">{t('contact.form_title')}</h2>
                                            <p className="mt-1 text-sm text-ink-soft">{t('contact.reply_time')}</p>
                                        </div>

                                        <fieldset>
                                            <legend className="mb-2 text-sm font-medium text-ink-soft">{t('contact.topic')}</legend>
                                            <div className="flex flex-wrap gap-2">
                                                {TOPICS.map((k) => (
                                                    <button key={k} type="button" onClick={() => pickTopic(k)} aria-pressed={topic === k} className={cn('relative h-9 rounded-full border px-4 text-sm transition', topic === k ? 'border-brand text-brand-ink' : 'border-line-strong text-ink-soft hover:border-ink')}>
                                                        {topic === k && <motion.span layoutId="contact-topic" className="absolute inset-0 -z-0 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                                                        <span className="relative">{t(`contact.topic_${k}`)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </fieldset>

                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <Input label={t('fields.name')} placeholder={t('ph.name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} autoComplete="name" required />
                                            <Input label={t('fields.email')} placeholder={t('ph.email')} type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} autoComplete="email" required />
                                        </div>
                                        <Input label={t('contact.subject')} placeholder={t('ph.subject')} value={form.data.subject} onChange={(e) => form.setData('subject', e.target.value)} error={form.errors.subject} maxLength={150} required />
                                        <div>
                                            <Textarea label={t('contact.message')} placeholder={t('ph.message')} rows={6} maxLength={MAX} value={form.data.message} onChange={(e) => form.setData('message', e.target.value)} error={form.errors.message} required />
                                            <p className={cn('mt-1 text-end text-xs tabular-nums', form.data.message.length > MAX * 0.9 ? 'text-warning' : 'text-ink-faint')}>
                                                {form.data.message.length} / {MAX}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4">
                                            <Button type="submit" size="lg" loading={form.processing} disabled={form.data.message.trim().length < 10}>
                                                <Send className="rtl-flip size-4" /> {t('contact.send')}
                                            </Button>
                                            <p className="text-xs text-ink-faint">{t('contact.privacy_note')}</p>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </div>
                    </Reveal>
                </div>
            </section>
        </>
    );
}
