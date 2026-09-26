import { router, useForm } from '@inertiajs/react';
import { Check, UserMinus, UserPlus } from 'lucide-react';
import { Avatar, Badge, Button, Card, Input, PageHeader } from '@/Components/ui';
import { useT } from '@/lib/i18n';

function Row({ person, status, actions }) {
    const t = useT();
    return (
        <li className="flex flex-wrap items-center gap-4 py-3">
            <Avatar name={person.name} />
            <div className="min-w-0 flex-1">
                <p className="font-medium">{person.name}</p>
                <p className="truncate text-sm text-ink-soft">{person.email}</p>
            </div>
            <Badge className={status === 'accepted' ? 'bg-success/15 text-success ring-success/30' : 'bg-sun/20 ring-sun/40'}>{t(`family.${status}`)}</Badge>
            <div className="flex gap-2">{actions}</div>
        </li>
    );
}

export default function Family({ members, memberships }) {
    const t = useT();
    const form = useForm({ email: '' });
    const remove = (id) => router.delete(route('customer.family.destroy', id), { preserveScroll: true });

    return (
        <>
            <PageHeader title={t('family.title')} description={t('family.subtitle')} />
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                <Card
                    as="form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(route('customer.family.invite'), { preserveScroll: true, onSuccess: () => form.reset() });
                    }}
                    className="h-fit space-y-4 p-6"
                >
                    <img src="/images/produce/shallow_pan_of_food.png" alt="" className="size-14" />
                    <h2 className="font-display text-2xl">{t('family.invite_title')}</h2>
                    <p className="text-sm text-ink-soft">{t('family.invite_body')}</p>
                    <Input type="email" placeholder="name@example.com" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required aria-label={t('fields.email')} />
                    <Button type="submit" loading={form.processing}>
                        <UserPlus className="size-4" /> {t('family.invite')}
                    </Button>
                </Card>
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="font-display text-xl">{t('family.my_members')}</h2>
                        {members.length === 0 ? (
                            <p className="mt-3 text-sm text-ink-soft">{t('family.none')}</p>
                        ) : (
                            <ul className="mt-2 divide-y divide-line">
                                {members.map((l) => (
                                    <Row key={l.id} person={l.member} status={l.status} actions={<Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(l.id)}><UserMinus className="size-4" /> {t('common.remove')}</Button>} />
                                ))}
                            </ul>
                        )}
                    </Card>
                    <Card className="p-6">
                        <h2 className="font-display text-xl">{t('family.households')}</h2>
                        {memberships.length === 0 ? (
                            <p className="mt-3 text-sm text-ink-soft">{t('family.no_invites')}</p>
                        ) : (
                            <ul className="mt-2 divide-y divide-line">
                                {memberships.map((l) => (
                                    <Row
                                        key={l.id}
                                        person={l.owner}
                                        status={l.status}
                                        actions={
                                            <>
                                                {l.status === 'pending' && (
                                                    <Button size="sm" onClick={() => router.post(route('customer.family.accept', l.id), {}, { preserveScroll: true })}>
                                                        <Check className="size-4" /> {t('family.accept')}
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(l.id)}>
                                                    {t(l.status === 'pending' ? 'family.decline' : 'family.leave')}
                                                </Button>
                                            </>
                                        }
                                    />
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
}
