import { motion } from 'motion/react';
import { HorizontalScroll } from '@/Components/motion';
import { useT } from '@/lib/i18n';
import { cn, photoProps } from '@/lib/utils';

const PHOTOS = [
    ['fields-planting', 'planting', 'aspect-[4/3]'],
    ['fields-loaf', 'baking', 'aspect-[3/4]'],
    ['fields-peppers', 'market', 'aspect-[4/3]'],
    ['fields-rice', 'paddy', 'aspect-[3/4]'],
    ['fields-sunflowers', 'flowers', 'aspect-[4/3]'],
    ['fields-cow', 'dairy', 'aspect-[3/4]'],
];

export default function FieldsReel({ className }) {
    const t = useT();
    const head = (
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
            <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase">{t('fields.eyebrow', {}, 'From the fields')}</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <h2 id="fields-title" className="font-display max-w-3xl text-4xl leading-[0.95] font-light md:text-6xl">
                    {t('fields.title', {}, 'Soil, sun and early mornings.')}
                </h2>
                <p className="max-w-sm text-sm text-ink-soft md:text-base">{t('fields.body', {}, 'Every basket starts long before market day. This is the work behind the produce you reserve.')}</p>
            </div>
        </div>
    );

    return (
        <HorizontalScroll head={head} count={PHOTOS.length} className={className} label={t('fields.title', {}, 'Soil, sun and early mornings.')} trackClassName="items-center gap-4 px-5 sm:gap-6 sm:px-8 xl:px-[calc((100vw-1400px)/2+2rem)]">
            {PHOTOS.map(([slug, caption, ratio], i) => (
                <motion.li key={slug} data-hs-item initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.1 }} className={cn('group relative h-[clamp(240px,46svh,540px)] shrink-0 snap-start', ratio, i % 2 && 'md:translate-y-8')}>
                    <motion.div
                        variants={{ hidden: { clipPath: 'inset(100% 0% 0% 0% round 28px)' }, shown: { clipPath: 'inset(0% 0% 0% 0% round 28px)' } }}
                        transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
                        className="relative size-full overflow-hidden rounded-[28px]"
                    >
                        <img {...photoProps(`/images/photos/${slug}.webp`, '(min-width: 1024px) 40vw, 80vw')} alt={t(`fields.${caption}`, {}, caption)} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-[1.4s] ease-out-expo group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-soil/50 via-transparent to-transparent opacity-0 transition duration-700 group-hover:opacity-100" />
                        <span className="absolute start-4 bottom-4 rounded-full bg-paper/90 px-3 py-1 font-mono text-[11px] tracking-[0.18em] text-forest uppercase backdrop-blur">
                            {String(i + 1).padStart(2, '0')} · {t(`fields.${caption}`, {}, caption)}
                        </span>
                    </motion.div>
                </motion.li>
            ))}
        </HorizontalScroll>
    );
}
