import { router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { AtSign, CornerDownRight, FileText, Mail, MailOpen, Reply, Send } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, EmptyState, PageHeader, Pagination, Textarea } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function Message({ m }) {
    const t = useT();
    const { relative } = useFormat();
    const [open, setOpen] = useState(false);
    const form = useForm({ reply: '' });

    return (
        <Card className={cn('p-5 md:p-6', !m.is_read && 'border-brand/40 shadow-soft')}>
            <div className="flex flex-wrap items-start gap-3">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', m.source === 'email' ? 'bg-sun/20 text-warning' : 'bg-lime/40 text-forest')} title={t(`messages.source_${m.source ?? 'form'}`)}>
                    {m.source === 'email' ? <AtSign className="size-5" /> : <FileText className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="font-display truncate text-xl">{m.subject}</p>
                    <p className="truncate text-sm text-ink-soft">
                        {m.name} · <span dir="ltr">{m.email}</span> · {relative(m.created_at)}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant={open ? 'primary' : 'soft'} onClick={() => setOpen((o) => !o)}>
                        <Reply className="size-3.5" /> {t('messages.reply')}
                    </Button>
                    <button onClick={() => router.patch(route('admin.messages.read', m.id), {}, { preserveScroll: true })} className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5 text-xs font-medium" aria-label={t(m.is_read ? 'messages.mark_unread' : 'messages.mark_read')}>
                        {m.is_read ? <MailOpen className="size-3.5" /> : <Mail className="size-3.5" />}
                        <span className="hidden sm:inline">{t(m.is_read ? 'messages.mark_unread' : 'messages.mark_read')}</span>
                    </button>
                </div>
            </div>
            <p className="mt-4 whitespace-pre-line text-ink-soft">{m.message}</p>

            {m.replied_at && (
                <div className="mt-4 rounded-2xl bg-brand-soft/60 p-4 text-sm">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                        <CornerDownRight className="size-3.5" /> {t('messages.replied', { name: m.replier?.name ?? '—', when: relative(m.replied_at) })}
                    </p>
                    <p className="mt-2 whitespace-pre-line">{m.reply_body}</p>
                </div>
            )}

            <AnimatePresence initial={false}>
                {open && (
                    <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post(route('admin.messages.reply', m.id), { preserveScroll: true, onSuccess: () => (form.reset(), setOpen(false)) });
                        }}
                    >
                        <Textarea wrapperClass="mt-5" rows={5} label={t('messages.reply_to', { email: m.email })} placeholder={t('messages.reply_ph')} value={form.data.reply} onChange={(e) => form.setData('reply', e.target.value)} error={form.errors.reply} required />
                        <div className="mt-3 flex justify-end">
                            <Button type="submit" loading={form.processing} disabled={form.data.reply.trim().length < 5}>
                                <Send className="rtl-flip size-4" /> {t('messages.send_reply')}
                            </Button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>
        </Card>
    );
}

export default function Messages({ messages }) {
    const t = useT();
    return (
        <>
            <PageHeader title={t('messages.title')} description={t('messages.subtitle')} />
            <div className="mt-8 space-y-3">
                {messages.data.length === 0 && <EmptyState icon="sun" title={t('messages.empty')} />}
                {messages.data.map((m) => (
                    <Message key={m.id} m={m} />
                ))}
            </div>
            <Pagination meta={messages} className="mt-6" />
        </>
    );
}
