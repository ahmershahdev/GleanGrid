import { usePage } from '@inertiajs/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { FacebookIcon } from '@/Components/icons';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function GoogleMark({ className }) {
    return (
        <svg viewBox="0 0 48 48" className={cn('size-5', className)} aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
    );
}

const PROVIDERS = [
    ['google', GoogleMark, 'bg-white text-[#1f1f1f] border-line-strong hover:bg-[#f8f8f8] dark:bg-white'],
    ['facebook', (p) => <FacebookIcon {...p} />, 'bg-[#1877F2] text-white border-[#1877F2] hover:bg-[#166fe5]'],
];

export default function SocialButtons({ as = 'customer', className }) {
    const t = useT();
    const { oauth = {} } = usePage().props;
    const [going, setGoing] = useState(null);
    const visible = PROVIDERS.filter(([p]) => oauth[p] || oauth.debug);
    if (!visible.length) return null;

    return (
        <div className={className}>
            <div className="grid gap-2.5 sm:grid-cols-2">
                {visible.map(([provider, Icon, style], i) => {
                    const ready = !!oauth[provider];
                    const href = route('social.redirect', { provider, as });
                    return (
                        <motion.a
                            key={provider}
                            href={ready ? href : undefined}
                            onClick={(e) => (ready ? setGoing(provider) : e.preventDefault())}
                            aria-disabled={!ready}
                            title={ready ? undefined : t('oauth.unconfigured', { provider: provider === 'google' ? 'GOOGLE_CLIENT_ID' : 'FACEBOOK_CLIENT_ID' })}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * i }}
                            whileHover={ready ? { y: -2 } : undefined}
                            whileTap={ready ? { scale: 0.98 } : undefined}
                            className={cn('relative flex h-12 items-center justify-center gap-2.5 overflow-hidden rounded-full border px-4 text-sm font-semibold shadow-sm transition', style, !ready && 'cursor-not-allowed opacity-50')}
                        >
                            {going === provider ? <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon className="size-5" />}
                            {t(`oauth.${provider}`)}
                        </motion.a>
                    );
                })}
            </div>
            {!visible.every(([p]) => oauth[p]) && oauth.debug && <p className="mt-2 text-center text-[11px] text-ink-faint">{t('oauth.unconfigured', { provider: 'GOOGLE_/FACEBOOK_CLIENT_ID' })}</p>}
            <div className="my-6 flex items-center gap-3 text-xs text-ink-faint uppercase">
                <span className="h-px flex-1 bg-line" /> {t('oauth.or')} <span className="h-px flex-1 bg-line" />
            </div>
        </div>
    );
}
