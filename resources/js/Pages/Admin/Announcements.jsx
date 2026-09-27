import { useForm } from '@inertiajs/react';
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, buttonClass, Card, Checkbox, EmptyState, Input, Modal, PageHeader, Select, Textarea } from '@/Components/ui';
import { useFormat, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { confirmDelete } from '@/lib/confirm';

function AnnouncementForm({ item, onDone }) {
    const t = useT();
    const form = useForm({
        title: item?.title ?? '',
        body: item?.body ?? '',
        audience: item?.audience ?? 'all',
        level: item?.level ?? 'info',
        is_published: item?.is_published ?? true,
        expires_at: item?.expires_at?.slice(0, 16) ?? '',
    });
    const field = (name) => ({ value: form.data[name] ?? '', onChange: (e) => form.setData(name, e.target.value), error: form.errors[name] });
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: onDone };
                item ? form.put(route('admin.announcements.update', item.id), opts) : form.post(route('admin.announcements.store'), opts);
            }}
            className="space-y-4"
        >
            <Input label={t('announce.title_field')} placeholder={t('ph.announce_title')} {...field('title')} required />
            <Textarea label={t('announce.body')} placeholder={t('ph.announce_body')} rows={4} {...field('body')} required />
            <div className="grid grid-cols-2 gap-3">
                <Select label={t('announce.audience')} {...field('audience')}>
                    {['all', 'customers', 'farmers'].map((a) => (
                        <option key={a} value={a}>
                            {t(`announce.aud_${a}`)}
                        </option>
                    ))}
                </Select>
                <Select label={t('announce.level')} {...field('level')}>
                    {['info', 'success', 'warning'].map((l) => (
                        <option key={l} value={l}>
                            {t(`announce.lvl_${l}`)}
                        </option>
                    ))}
                </Select>
            </div>
            <Input label={t('announce.expires')} type="datetime-local" {...field('expires_at')} />
            <Checkbox label={t('announce.published')} checked={!!form.data.is_published} onChange={(e) => form.setData('is_published', e.target.checked)} />
            <Button type="submit" className="w-full" loading={form.processing}>
                {t('common.save')}
            </Button>
        </form>
    );
}

export default function Announcements({ announcements }) {
    const t = useT();
    const { relative } = useFormat();
    const [editing, setEditing] = useState(null);
    return (
        <>
            <PageHeader
                title={t('announce.title')}
                description={t('announce.subtitle')}
                actions={
                    <Button size="sm" onClick={() => setEditing('new')}>
                        <Plus className="size-4" /> {t('announce.add')}
                    </Button>
                }
            />
            <div className="mt-8 space-y-3">
                {announcements.length === 0 && <EmptyState icon="sun" title={t('announce.empty')} />}
                {announcements.map((a) => (
                    <Card key={a.id} className={cn('flex flex-wrap items-start gap-4 p-5', !a.is_published && 'opacity-60')}>
                        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', a.level === 'warning' ? 'bg-sun/30' : a.level === 'success' ? 'bg-lime/40' : 'bg-brand-soft')}>
                            <Megaphone className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="font-display text-xl">{a.title}</p>
                                <Badge className="bg-ink/5 ring-line">{t(`announce.aud_${a.audience}`)}</Badge>
                                {!a.is_published && <Badge className="bg-ink/5 ring-line">{t('announce.draft')}</Badge>}
                            </div>
                            <p className="mt-1 text-ink-soft">{a.body}</p>
                            <p className="mt-2 text-xs text-ink-faint">
                                {a.author?.name} · {relative(a.created_at)}
                            </p>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => setEditing(a)} className={buttonClass('ghost', 'icon')} aria-label={t('common.edit')}>
                                <Pencil className="size-4" />
                            </button>
                            <button onClick={() => confirmDelete(route('admin.announcements.destroy', a.id), { title: t('confirm.delete_announcement', {}, 'Delete this announcement?') })} className={buttonClass('ghost', 'icon', 'text-danger')} aria-label={t('common.delete')}>
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
            <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? t('announce.add') : t('announce.edit')}>
                {editing && <AnnouncementForm item={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
            </Modal>
        </>
    );
}
