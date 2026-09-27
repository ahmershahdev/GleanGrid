import { AnimatePresence, motion } from 'motion/react';
import { Camera, ChevronLeft, ChevronRight, MessageCircleReply, Star, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Stars } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { clientPortal, cn } from '@/lib/utils';
import { lockScroll } from '@/lib/scroll';

const photosOf = (r) => r.visible_photos ?? r.photos ?? [];

export function PhotoLightbox({ photos, index, onClose, onIndex, caption }) {
    const t = useT();
    const open = index !== null && index !== undefined && photos[index];
    const go = useCallback((d) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') go(document.dir === 'rtl' ? -1 : 1);
            if (e.key === 'ArrowLeft') go(document.dir === 'rtl' ? 1 : -1);
        };
        window.addEventListener('keydown', onKey);
        lockScroll(true);
        return () => {
            window.removeEventListener('keydown', onKey);
            lockScroll(false);
        };
    }, [open, go, onClose]);

    return clientPortal(
        <AnimatePresence>
            {open && (
                <motion.div role="dialog" aria-modal="true" aria-label={caption} className="fixed inset-0 z-[90] flex items-center justify-center bg-soil/90 p-4 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.img
                            key={photos[index].id ?? index}
                            src={photos[index].url}
                            alt={caption}
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                            className="max-h-[82vh] max-w-full rounded-3xl object-contain shadow-2xl"
                        />
                    </AnimatePresence>
                    <button onClick={onClose} className="absolute end-5 top-5 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label={t('common.close')}>
                        <X className="size-5" />
                    </button>
                    {photos.length > 1 && (
                        <>
                            <button onClick={(e) => (e.stopPropagation(), go(-1))} className="absolute start-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label={t('common.previous')}>
                                <ChevronLeft className="rtl-flip size-6" />
                            </button>
                            <button onClick={(e) => (e.stopPropagation(), go(1))} className="absolute end-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label={t('common.next')}>
                                <ChevronRight className="rtl-flip size-6" />
                            </button>
                            <p className="absolute bottom-5 font-mono text-xs text-white/70">
                                {index + 1} / {photos.length}
                            </p>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>,
    );
}

function ReviewPhotos({ review, name }) {
    const t = useT();
    const photos = photosOf(review);
    const [index, setIndex] = useState(null);
    if (!photos.length) return null;
    return (
        <>
            <div className="mt-3 flex gap-2">
                {photos.map((p, i) => (
                    <motion.button key={p.id ?? i} type="button" onClick={() => setIndex(i)} whileHover={{ y: -3, rotate: i % 2 ? 2 : -2 }} className="size-20 overflow-hidden rounded-2xl ring-1 ring-line" aria-label={t('reviews.photo_alt', { name })}>
                        <img src={p.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                    </motion.button>
                ))}
            </div>
            <PhotoLightbox photos={photos} index={index} onIndex={setIndex} onClose={() => setIndex(null)} caption={t('reviews.photo_alt', { name })} />
        </>
    );
}

export function ReviewList({ reviews }) {
    const t = useT();
    const { relative } = useFormat();
    const [photosOnly, setPhotosOnly] = useState(false);
    const withPhotos = reviews.filter((r) => photosOf(r).length).length;
    const visible = photosOnly ? reviews.filter((r) => photosOf(r).length) : reviews;

    if (!reviews.length) return <p className="rounded-3xl border border-dashed border-line-strong p-8 text-center text-ink-soft">{t('reviews.none')}</p>;
    return (
        <>
            {withPhotos > 0 && (
                <div className="mb-4 flex gap-2" role="tablist">
                    {[
                        [false, t('reviews.all')],
                        [true, `${t('reviews.photos_only')} (${withPhotos})`],
                    ].map(([v, label]) => (
                        <button key={String(v)} type="button" role="tab" aria-selected={photosOnly === v} onClick={() => setPhotosOnly(v)} className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition', photosOnly === v ? 'bg-ink text-bg' : 'bg-ink/5 hover:bg-ink/10')}>
                            {v && <Camera className="size-4" />} {label}
                        </button>
                    ))}
                </div>
            )}
            <ul className="space-y-3">
                <AnimatePresence initial={false}>
                    {visible.map((r) => (
                        <motion.li key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-3xl border border-line bg-elev p-5">
                            <div className="flex items-center gap-3">
                                <Avatar name={r.user?.name} size="size-9" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold">{r.user?.name}</p>
                                    <p className="text-xs text-ink-faint">{relative(r.created_at)}</p>
                                </div>
                                <Stars value={r.rating} />
                            </div>
                            {r.comment && <p className="mt-3 text-ink-soft">{r.comment}</p>}
                            <ReviewPhotos review={r} name={r.user?.name ?? ''} />
                            {r.farmer_reply && (
                                <div className="mt-3 flex gap-2 rounded-2xl bg-brand-soft p-3 text-sm">
                                    <MessageCircleReply className="mt-0.5 size-4 shrink-0 text-brand" />
                                    <p>
                                        <span className="font-semibold">{t('reviews.farmer_reply')}: </span>
                                        {r.farmer_reply}
                                    </p>
                                </div>
                            )}
                        </motion.li>
                    ))}
                </AnimatePresence>
            </ul>
        </>
    );
}

export function ReviewSummary({ average, count, distribution = {}, withPhotos = 0 }) {
    const t = useT();
    const rows = useMemo(() => [5, 4, 3, 2, 1].map((n) => [n, Number(distribution[n] ?? 0)]), [distribution]);
    if (!count) return null;
    return (
        <div className="mb-6 grid items-center gap-6 rounded-3xl border border-line bg-elev p-6 sm:grid-cols-[auto_1fr]">
            <div className="text-center sm:pe-6">
                <p className="font-display text-6xl leading-none">{Number(average).toFixed(1)}</p>
                <Stars value={average} className="mt-2" />
                <p className="mt-1 text-xs text-ink-faint">{t('reviews.based_on', { count })}</p>
                {withPhotos > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-ink-soft">
                        <Camera className="size-3.5" /> {t('reviews.with_photos', { count: withPhotos })}
                    </p>
                )}
            </div>
            <ul className="space-y-1.5">
                {rows.map(([n, c], i) => (
                    <li key={n} className="flex items-center gap-3 text-sm">
                        <span className="inline-flex w-8 items-center gap-0.5 tabular-nums">
                            {n} <Star className="size-3 fill-sun text-sun" />
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                            <motion.span className="block h-full rounded-full bg-sun" initial={{ width: 0 }} whileInView={{ width: `${(c / count) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }} />
                        </span>
                        <span className="w-6 text-end text-xs text-ink-faint tabular-nums">{c}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
