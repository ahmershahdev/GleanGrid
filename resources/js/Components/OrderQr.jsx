import { motion } from 'motion/react';
import { Download, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function OrderQr({ url, code, className }) {
    const t = useT();
    const [svg, setSvg] = useState(null);

    useEffect(() => {
        let alive = true;
        import('qrcode').then(({ default: QR }) =>
            QR.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#13201a', light: '#ffffff' } }).then((s) => alive && setSvg(s)),
        );
        return () => {
            alive = false;
        };
    }, [url]);

    const download = () => {
        if (!svg) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        a.download = `gleangrid-${code}.svg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };

    return (
        <div className={cn('flex flex-col items-center gap-4 sm:flex-row sm:items-center', className)}>
            <motion.div
                initial={{ rotate: -6, scale: 0.9, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: svg ? 1 : 0.4 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="relative size-40 shrink-0 overflow-hidden rounded-3xl bg-white p-3 shadow-soft ring-1 ring-line"
            >
                {svg ? (
                    <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={t('order.qr_alt', { code }, `QR code for order ${code}`)} className="size-full" />
                ) : (
                    <QrCode className="size-full animate-pulse text-ink/10" aria-hidden="true" />
                )}
                <motion.span aria-hidden="true" className="pointer-events-none absolute inset-x-3 h-0.5 rounded-full bg-accent/70 shadow-[0_0_12px_rgb(226_85_44/0.6)]" animate={{ top: ['12%', '88%', '12%'] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} />
            </motion.div>
            <div className="text-center sm:text-start">
                <p className="font-display text-xl">{t('order.qr_title', {}, 'Your pickup pass')}</p>
                <p className="mt-1 max-w-xs text-sm text-ink-soft">{t('order.qr_hint', {}, 'Show this at the stall. The farmer scans it to find your order instantly — or just read out the code.')}</p>
                <p className="mt-2 font-mono text-lg tracking-widest">{code}</p>
                <button type="button" onClick={download} disabled={!svg} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline disabled:opacity-40">
                    <Download className="size-4" /> {t('order.qr_save', {}, 'Save pass')}
                </button>
            </div>
        </div>
    );
}
