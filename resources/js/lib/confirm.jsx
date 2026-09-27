import { router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { translate } from '@/lib/i18n';
import { buttonClass } from '@/Components/ui';
import { clientPortal } from '@/lib/utils';

let current = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function confirmDialog(options) {
    return new Promise((resolve) => {
        current?.resolve(false);
        current = { ...options, resolve };
        emit();
    });
}

function settle(value) {
    const c = current;
    current = null;
    emit();
    c?.resolve(value);
}

const tr = (key, fallback) => translate(document.documentElement.lang || 'en', key, {}, fallback);

export function ConfirmHost() {
    const dialog = useSyncExternalStore(
        (l) => (listeners.add(l), () => listeners.delete(l)),
        () => current,
        () => null,
    );
    const okRef = useRef(null);

    useEffect(() => {
        if (!dialog) return;
        const previous = document.activeElement;
        okRef.current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') settle(false);
            if (e.key === 'Enter' && e.target === document.body) settle(true);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            previous?.focus?.();
        };
    }, [dialog]);

    const danger = dialog?.tone === 'danger';

    return clientPortal(
        <AnimatePresence>
            {dialog && (
                <motion.div className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="absolute inset-0 bg-soil/55 backdrop-blur-sm" onClick={() => settle(false)} />
                    <motion.div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="gg-confirm-title"
                        aria-describedby="gg-confirm-body"
                        initial={{ y: 40, opacity: 0, scale: 0.97 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 24, opacity: 0 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                        className="relative w-full rounded-t-3xl border border-line bg-elev p-6 shadow-soft sm:max-w-md sm:rounded-3xl"
                    >
                        <div className="flex gap-4">
                            <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${danger ? 'bg-danger/10 text-danger' : 'bg-sun/25 text-warning'}`}>
                                <AlertTriangle className="size-5" />
                            </span>
                            <div className="min-w-0">
                                <h2 id="gg-confirm-title" className="font-display text-2xl leading-tight">
                                    {dialog.title}
                                </h2>
                                {dialog.body && (
                                    <p id="gg-confirm-body" className="mt-2 text-sm text-ink-soft">
                                        {dialog.body}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" className={buttonClass('ghost', 'md')} onClick={() => settle(false)}>
                                {dialog.cancelLabel ?? tr('common.cancel', 'Cancel')}
                            </button>
                            <button ref={okRef} type="button" className={buttonClass(danger ? 'danger' : 'primary', 'md')} onClick={() => settle(true)}>
                                {dialog.confirmLabel ?? tr('common.confirm', 'Confirm')}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
    );
}

export async function confirmDelete(url, { title, body, ...visit } = {}) {
    const ok = await confirmDialog({
        title: title ?? tr('confirm.delete_title', 'Delete this for good?'),
        body: body ?? tr('confirm.delete_body', 'This can’t be undone.'),
        confirmLabel: tr('common.delete', 'Delete'),
        tone: 'danger',
    });
    if (ok) router.delete(url, { preserveScroll: true, ...visit });
}

export function useUnsavedGuard(dirty, message) {
    const dirtyRef = useRef(dirty);
    dirtyRef.current = dirty;

    useEffect(() => {
        const onUnload = (e) => {
            if (!dirtyRef.current) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onUnload);

        let bypass = false;
        const off = router.on('before', (event) => {
            const visit = event.detail.visit;
            if (bypass || !dirtyRef.current || visit.method !== 'get' || visit.only?.length || visit.prefetch) return;
            event.preventDefault();
            confirmDialog({
                title: tr('confirm.unsaved_title', 'Leave without saving?'),
                body: message ?? tr('confirm.unsaved_body', 'You have changes that haven’t been saved yet. They’ll be lost if you leave now.'),
                confirmLabel: tr('confirm.leave', 'Leave page'),
                cancelLabel: tr('confirm.stay', 'Keep editing'),
                tone: 'danger',
            }).then((leave) => {
                if (!leave) return;
                bypass = true;
                router.visit(visit.url, {
                    preserveScroll: visit.preserveScroll,
                    replace: visit.replace,
                    onFinish: () => (bypass = false),
                });
            });
        });

        return () => {
            window.removeEventListener('beforeunload', onUnload);
            off();
        };
    }, [message]);
}
