import { router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, CameraOff, Keyboard, ScanLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, PageHeader } from '@/Components/ui';
import { useT } from '@/lib/i18n';

export default function FarmerScan() {
    const t = useT();
    const video = useRef(null);
    const stream = useRef(null);
    const [supported, setSupported] = useState(null);
    const [active, setActive] = useState(false);
    const [error, setError] = useState(null);
    const [code, setCode] = useState('');

    useEffect(() => {
        setSupported('BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia);
        return () => stop();
    }, []);

    const stop = () => {
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        setActive(false);
    };

    const open = (value) => router.post(route('farmer.orders.lookup'), { code: value });

    const start = async () => {
        setError(null);
        try {
            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            video.current.srcObject = stream.current;
            await video.current.play();
            setActive(true);
            const tick = async () => {
                if (!stream.current) return;
                try {
                    const [hit] = await detector.detect(video.current);
                    if (hit?.rawValue) {
                        navigator.vibrate?.(60);
                        stop();
                        return open(hit.rawValue);
                    }
                } catch {
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        } catch {
            stop();
            setError(t('scan.camera_error', {}, 'Couldn’t open the camera. Allow camera access, or type the code below.'));
        }
    };

    return (
        <>
            <PageHeader title={t('scan.title', {}, 'Scan a pickup pass')} description={t('scan.subtitle', {}, 'Point your camera at the customer’s QR code, or type their order code.')} />

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <Card className="relative overflow-hidden p-0">
                    <div className="relative aspect-[4/3] bg-soil">
                        <video ref={video} className="size-full object-cover" playsInline muted aria-label={t('scan.preview', {}, 'Camera preview')} />
                        <div className="pointer-events-none absolute inset-0 grid place-items-center">
                            <div className="relative size-56 max-w-[70%] rounded-3xl">
                                {['start-0 top-0 border-s-4 border-t-4 rounded-ss-3xl', 'end-0 top-0 border-e-4 border-t-4 rounded-se-3xl', 'start-0 bottom-0 border-s-4 border-b-4 rounded-es-3xl', 'end-0 bottom-0 border-e-4 border-b-4 rounded-ee-3xl'].map((c) => (
                                    <span key={c} className={`absolute size-10 border-lime ${c}`} />
                                ))}
                                <AnimatePresence>
                                    {active && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1, top: ['8%', '92%', '8%'] }}
                                            exit={{ opacity: 0 }}
                                            transition={{ top: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } }}
                                            className="absolute inset-x-4 h-0.5 rounded-full bg-lime shadow-[0_0_16px_rgb(201_226_101/0.9)]"
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                        {!active && (
                            <div className="absolute inset-0 grid place-items-center bg-soil/80 text-paper">
                                <div className="flex flex-col items-center gap-4 p-6 text-center">
                                    <ScanLine className="size-12 text-lime" aria-hidden="true" />
                                    {supported === false ? (
                                        <p className="max-w-xs text-sm text-paper/80">{t('scan.unsupported', {}, 'This browser can’t scan QR codes. Use your phone’s camera app on the pass, or type the code.')}</p>
                                    ) : (
                                        <Button variant="lime" onClick={start} disabled={!supported}>
                                            <Camera className="size-4" /> {t('scan.start', {}, 'Start camera')}
                                        </Button>
                                    )}
                                    {error && (
                                        <p className="max-w-xs text-sm text-sun" role="alert">
                                            {error}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {active && (
                        <div className="flex justify-end p-4">
                            <Button variant="ghost" size="sm" onClick={stop}>
                                <CameraOff className="size-4" /> {t('scan.stop', {}, 'Stop')}
                            </Button>
                        </div>
                    )}
                </Card>

                <Card
                    as="form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (code.trim()) open(code.trim());
                    }}
                    className="h-fit p-6 md:p-8"
                >
                    <h2 className="font-display flex items-center gap-2 text-2xl">
                        <Keyboard className="size-5" /> {t('scan.manual', {}, 'Type the code')}
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft">{t('scan.manual_hint', {}, 'Codes look like GG-7K2M9Q.')}</p>
                    <label className="sr-only" htmlFor="scan-code">
                        {t('scan.code', {}, 'Order code')}
                    </label>
                    <input
                        id="scan-code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="GG-XXXXXX"
                        autoComplete="off"
                        spellCheck={false}
                        className="mt-5 h-14 w-full rounded-2xl border border-line-strong bg-elev px-5 text-center font-mono text-2xl tracking-[0.3em] uppercase"
                    />
                    <Button type="submit" className="mt-4 w-full" disabled={!code.trim()}>
                        {t('scan.open', {}, 'Open order')}
                    </Button>
                </Card>
            </div>
        </>
    );
}
