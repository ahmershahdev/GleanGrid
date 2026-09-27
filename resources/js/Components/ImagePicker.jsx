import { AnimatePresence, motion } from 'motion/react';
import { ImagePlus, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { confirmDialog } from '@/lib/confirm';
import { useT } from '@/lib/i18n';
import { compressToWebp, formatBytes, ImageError } from '@/lib/image';
import { cn } from '@/lib/utils';

export default function ImagePicker({ file, current, removed, onPick, onRemove, onUndo, error, shape = 'square', maxSide = 1600, label, className, fallback }) {
    const t = useT();
    const id = useId();
    const input = useRef(null);
    const [busy, setBusy] = useState(false);
    const [stats, setStats] = useState(null);
    const [problem, setProblem] = useState(null);
    const [drag, setDrag] = useState(false);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (!file) return setPreview(null);
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const handle = async (raw) => {
        if (!raw) return;
        setProblem(null);
        setBusy(true);
        try {
            const result = await compressToWebp(raw, { maxSide });
            setStats(result);
            onPick(result.file);
        } catch (e) {
            setProblem(e instanceof ImageError ? `image.err_${e.message}` : 'image.err_decode');
        } finally {
            setBusy(false);
            if (input.current) input.current.value = '';
        }
    };

    const remove = async () => {
        if (file && !current) {
            onPick(null);
            setStats(null);
            return;
        }
        const ok = await confirmDialog({
            title: t('image.remove_title', {}, 'Remove this photo?'),
            body: t('image.remove_body', {}, 'It will be deleted when you save. You can undo until then.'),
            confirmLabel: t('common.remove', {}, 'Remove'),
            tone: 'danger',
        });
        if (!ok) return;
        setStats(null);
        onPick(null);
        onRemove?.();
    };

    const shown = preview ?? (removed ? null : current);
    const radius = shape === 'circle' ? 'rounded-full' : 'rounded-3xl';
    const box = shape === 'wide' ? 'aspect-[4/3] w-full' : shape === 'circle' ? 'size-24' : 'size-24';

    return (
        <div className={cn('flex flex-wrap items-center gap-4', shape === 'wide' && 'flex-col items-stretch', className)}>
            <label
                htmlFor={id}
                onDragOver={(e) => (e.preventDefault(), setDrag(true))}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    handle(e.dataTransfer.files?.[0]);
                }}
                className={cn('group relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed bg-sunk transition', radius, box, drag ? 'scale-[1.02] border-brand bg-brand-soft' : 'border-transparent hover:border-line-strong')}
            >
                <AnimatePresence mode="wait" initial={false}>
                    {shown ? (
                        <motion.img key={shown} src={shown} alt="" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="size-full object-cover" />
                    ) : (
                        <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-1 p-2 text-center text-xs text-ink-faint">
                            {fallback ?? <ImagePlus className="size-6" />}
                            {shape === 'wide' && <span>{t('image.drop', {}, 'Drop a photo or click to choose')}</span>}
                        </motion.span>
                    )}
                </AnimatePresence>
                {busy && (
                    <span className="absolute inset-0 flex items-center justify-center bg-bg/70 backdrop-blur-sm">
                        <LoaderCircle className="size-6 animate-spin text-brand" />
                    </span>
                )}
                <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic" className="sr-only" onChange={(e) => handle(e.target.files?.[0])} />
            </label>

            <div className="min-w-0 space-y-2">
                {label && <p className="text-sm font-medium">{label}</p>}
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm font-medium transition hover:bg-ink/5 disabled:opacity-50">
                        {shown ? <RefreshCw className="size-3.5" /> : <ImagePlus className="size-3.5" />}
                        {shown ? t('image.replace', {}, 'Replace') : t('image.choose', {}, 'Choose photo')}
                    </button>
                    {shown && (
                        <button type="button" onClick={remove} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50">
                            <Trash2 className="size-3.5" /> {t('common.remove', {}, 'Remove')}
                        </button>
                    )}
                    {removed && !file && (
                        <button type="button" onClick={onUndo} className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium underline">
                            {t('image.undo', {}, 'Undo remove')}
                        </button>
                    )}
                </div>
                <p className="text-xs text-ink-faint" aria-live="polite">
                    {stats && file
                        ? t('image.saved', { before: formatBytes(stats.before), after: formatBytes(stats.after) }, `Optimised to WebP: ${formatBytes(stats.before)} → ${formatBytes(stats.after)}`)
                        : removed
                          ? t('image.will_remove', {}, 'Photo will be removed when you save.')
                          : t('image.hint', {}, 'JPG, PNG, WebP or HEIC. We shrink it to WebP before upload.')}
                </p>
                {(problem || error) && (
                    <p className="text-sm text-danger" role="alert">
                        {t(problem ?? error, {}, problem ? 'That file couldn’t be read as an image.' : error)}
                    </p>
                )}
            </div>
        </div>
    );
}
