import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Logo, LogoFull } from '@/Components/Brand';
import Seo from '@/Components/Seo';
import { Cursor, SplitWords } from '@/Components/motion';
import Scrollbar from '@/Components/Scrollbar';
import { LanguageSwitcher, ThemeToggle, Toaster } from '@/Components/widgets';
import { useT } from '@/lib/i18n';
import { produceImage } from '@/lib/utils';

const ART = ['carrot', 'tomato', 'leafy_green', 'mango', 'bread', 'egg', 'honey_pot', 'sunflower', 'grapes'];

export default function AuthLayout({ title, subtitle, children }) {
    const t = useT();
    return (
        <div className="grain grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
            <Seo />
            <aside className="relative hidden overflow-hidden bg-brand p-12 text-brand-ink lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="self-start rounded-3xl bg-paper px-5 py-3 shadow-soft">
                    <LogoFull className="w-32" />
                </motion.div>
                <div className="grid flex-1 grid-cols-3 place-items-center gap-6 opacity-95">
                    {ART.map((img, i) => (
                        <motion.img
                            key={img}
                            src={produceImage(img)}
                            alt=""
                            initial={{ opacity: 0, scale: 0.3, rotate: -40 }}
                            animate={{ opacity: 1, scale: 1, rotate: (i % 2 ? 1 : -1) * 10 }}
                            transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 90, damping: 11 }}
                            className="w-24 animate-float xl:w-28"
                            style={{ '--r': `${(i % 2 ? 1 : -1) * 10}deg`, animationDelay: `${i * 0.4}s` }}
                        />
                    ))}
                </div>
                <p className="font-display max-w-md text-4xl leading-tight font-light">
                    <SplitWords text={t('auth.art_quote')} immediate delay={0.4} />
                </p>
                <p className="mt-4 text-sm opacity-70">{t('auth.art_caption')}</p>
                <ul className="mt-8 grid gap-2 border-t border-current/15 pt-6 text-sm xl:grid-cols-3">
                    {['auth.trust_pay', 'auth.trust_cancel', 'auth.trust_secure'].map((k, i) => (
                        <motion.li key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.1 }} className="flex items-start gap-2">
                            <Check className="mt-0.5 size-4 shrink-0" /> {t(k)}
                        </motion.li>
                    ))}
                </ul>
            </aside>
            <main className="flex flex-col px-5 py-6 sm:px-10">
                <div className="flex items-center justify-between">
                    <Logo />
                    <div className="flex items-center">
                        <LanguageSwitcher />
                        <ThemeToggle />
                    </div>
                </div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="mx-auto my-auto w-full max-w-md py-10 sm:py-12">
                    <div className="mb-6 flex gap-2 lg:hidden" aria-hidden="true">
                        {ART.slice(0, 5).map((img, i) => (
                            <motion.img key={img} src={produceImage(img)} alt="" initial={{ opacity: 0, y: 12, rotate: -20 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.05 * i, type: 'spring', stiffness: 160, damping: 14 }} className="size-10" />
                        ))}
                    </div>
                    <h1 className="font-display text-4xl font-light sm:text-5xl">{title}</h1>
                    {subtitle && <p className="mt-3 text-ink-soft">{subtitle}</p>}
                    <div className="mt-10">{children}</div>
                </motion.div>
            </main>
            <Toaster />
            <Scrollbar />
            <Cursor />
        </div>
    );
}
