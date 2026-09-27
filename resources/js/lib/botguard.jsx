import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

let scriptPromise = null;

function loadRecaptcha(v3Key, lang) {
    if (window.grecaptcha?.render) return new Promise((resolve) => window.grecaptcha.ready(() => resolve(window.grecaptcha)));
    scriptPromise ??= new Promise((resolve, reject) => {
        const s = document.createElement('script');
        const params = new URLSearchParams({ render: v3Key || 'explicit' });
        if (lang) params.set('hl', lang);
        s.src = `https://www.google.com/recaptcha/api.js?${params}`;
        s.async = true;
        s.onload = () => window.grecaptcha.ready(() => resolve(window.grecaptcha));
        s.onerror = () => {
            scriptPromise = null;
            reject(new Error('recaptcha blocked'));
        };
        document.head.appendChild(s);
    });
    return scriptPromise;
}

export function useBotGuard(form, action, mode = 'invisible') {
    const { captcha = {}, app = {} } = usePage().props;
    const startedAt = useRef(Date.now());
    const widget = useRef(null);
    const [challenge, setChallenge] = useState(false);
    const needsBox = Boolean(captcha.v2) && (mode === 'checkbox' || challenge);
    const anyKey = captcha.v3 || captcha.v2;

    useEffect(() => {
        if (anyKey) loadRecaptcha(captcha.v3, app.locale).catch(() => {});
    }, [anyKey, captcha.v3, app.locale]);

    useEffect(() => {
        if (form.errors.captcha === 'captcha.challenge' && captcha.v2) setChallenge(true);
    }, [form.errors.captcha, captcha.v2]);

    const resetBox = () => {
        if (widget.current !== null) window.grecaptcha?.reset(widget.current);
        form.setData('captcha_v2', '');
    };

    const submit = async (method, url, options = {}) => {
        let token = '';
        if (captcha.v3) {
            try {
                const g = await loadRecaptcha(captcha.v3, app.locale);
                token = await g.execute(captcha.v3, { action });
            } catch {
            }
        }
        form.transform((data) => ({ ...data, website: data.website ?? '', form_started_at: startedAt.current, captcha_token: token }));
        form[method](url, {
            ...options,
            onError: (errors) => {
                resetBox();
                options.onError?.(errors);
            },
        });
    };

    return { submit, needsBox, widget, locale: app.locale, v3: captcha.v3, v2: captcha.v2 };
}

export function Honeypot({ form }) {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute -start-[9999px] top-0 h-px w-px overflow-hidden opacity-0">
            <label>
                Leave this field empty
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.data.website ?? ''} onChange={(e) => form.setData('website', e.target.value)} />
            </label>
        </div>
    );
}

function CaptchaBox({ guard, form }) {
    const host = useRef(null);
    const [failed, setFailed] = useState(false);
    const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        let alive = true;
        loadRecaptcha(guard.v3, guard.locale)
            .then((g) => {
                if (!alive || !host.current) return;
                host.current.replaceChildren();
                const slot = document.createElement('div');
                host.current.appendChild(slot);
                guard.widget.current = g.render(slot, {
                    sitekey: guard.v2,
                    theme: dark ? 'dark' : 'light',
                    callback: (token) => form.setData('captcha_v2', token),
                    'expired-callback': () => form.setData('captcha_v2', ''),
                    'error-callback': () => form.setData('captcha_v2', ''),
                });
                form.setData('captcha_v2', '');
            })
            .catch(() => alive && setFailed(true));
        return () => {
            alive = false;
            guard.widget.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guard.v2, dark]);

    if (failed) {
        return <p className="text-xs text-ink-faint">reCAPTCHA couldn’t load. Check your connection or disable blockers for this site.</p>;
    }

    return <div ref={host} className="min-h-[78px] overflow-hidden rounded-[3px]" />;
}

export function CaptchaNotice({ t }) {
    return (
        <p className="text-[11px] leading-relaxed text-ink-faint">
            {t('captcha.notice_pre', {}, 'Protected by reCAPTCHA — Google’s')}{' '}
            <a className="underline hover:text-ink" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                {t('captcha.privacy', {}, 'Privacy Policy')}
            </a>{' '}
            &amp;{' '}
            <a className="underline hover:text-ink" href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
                {t('captcha.terms', {}, 'Terms')}
            </a>{' '}
            {t('captcha.notice_post', {}, 'apply.')}
        </p>
    );
}

export function BotFields({ form, guard, t }) {
    const error = form.errors.captcha;
    return (
        <>
            <Honeypot form={form} />
            {guard.needsBox && <CaptchaBox guard={guard} form={form} />}
            {error && (
                <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
                    {t(error)}
                </p>
            )}
            {(guard.v3 || guard.v2) && <CaptchaNotice t={t} />}
        </>
    );
}
