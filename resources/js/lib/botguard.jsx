import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

// Bot defence on the client (the server side is App\Support\BotGuard):
//  · the honeypot field and the signed form ticket (issued with the page, sent back untouched)
//  · invisible reCAPTCHA v3 when configured
//  · a visible challenge when the server asks for one: Cloudflare Turnstile or the reCAPTCHA v2 box

let recaptchaPromise = null;
let turnstilePromise = null;

function loadScript(src, ready) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => ready(resolve);
        s.onerror = () => reject(new Error(`${src} blocked`));
        document.head.appendChild(s);
    });
}

function loadRecaptcha(v3Key, lang) {
    if (window.grecaptcha?.render) return new Promise((resolve) => window.grecaptcha.ready(() => resolve(window.grecaptcha)));
    const params = new URLSearchParams({ render: v3Key || 'explicit' });
    if (lang) params.set('hl', lang);
    recaptchaPromise ??= loadScript(`https://www.google.com/recaptcha/api.js?${params}`, (resolve) => window.grecaptcha.ready(() => resolve(window.grecaptcha))).catch((e) => {
        recaptchaPromise = null;
        throw e;
    });
    return recaptchaPromise;
}

function loadTurnstile() {
    if (window.turnstile?.render) return Promise.resolve(window.turnstile);
    turnstilePromise ??= loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', (resolve) => resolve(window.turnstile)).catch((e) => {
        turnstilePromise = null;
        throw e;
    });
    return turnstilePromise;
}

export function useBotGuard(form, action, mode = 'invisible') {
    const { captcha = {}, app = {}, formTicket = '' } = usePage().props;
    // the ticket from the render this form was opened on — its issue time is what the server checks
    const ticket = useRef(formTicket);
    const widget = useRef(null);
    const [challenge, setChallenge] = useState(false);
    const provider = captcha.turnstile ? 'turnstile' : captcha.v2 ? 'recaptcha' : null;
    const needsBox = Boolean(provider) && (mode === 'checkbox' || challenge || !captcha.v3);

    useEffect(() => {
        if (captcha.v3 || provider === 'recaptcha') loadRecaptcha(captcha.v3, app.locale).catch(() => {});
        if (provider === 'turnstile' && needsBox) loadTurnstile().catch(() => {});
    }, [captcha.v3, provider, needsBox, app.locale]);

    useEffect(() => {
        if (form.errors.captcha === 'captcha.challenge' && provider) setChallenge(true);
        // an expired ticket: take the one from the page we're on now (Inertia refreshed the props)
        if (form.errors.captcha === 'captcha.expired') ticket.current = formTicket;
    }, [form.errors.captcha, provider, formTicket]);

    const resetBox = () => {
        if (widget.current !== null) {
            if (provider === 'turnstile') window.turnstile?.reset(widget.current);
            else window.grecaptcha?.reset(widget.current);
        }
        form.setData(provider === 'turnstile' ? 'captcha_turnstile' : 'captcha_v2', '');
    };

    const submit = async (method, url, options = {}) => {
        let token = '';
        if (captcha.v3) {
            try {
                const g = await loadRecaptcha(captcha.v3, app.locale);
                token = await g.execute(captcha.v3, { action });
            } catch {
                // blocked or offline: the server decides (it may ask for the visible challenge)
            }
        }
        form.transform((data) => ({ ...data, website: data.website ?? '', form_ticket: ticket.current, captcha_token: token }));
        form[method](url, {
            ...options,
            onError: (errors) => {
                resetBox();
                options.onError?.(errors);
            },
        });
    };

    return { submit, needsBox, solved: Boolean(form.data.captcha_v2 || form.data.captcha_turnstile), widget, action, provider, locale: app.locale, v3: captcha.v3, v2: captcha.v2, turnstile: captcha.turnstile };
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

function useDark() {
    const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
    useEffect(() => {
        const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);
    return dark;
}

function CaptchaBox({ guard, form }) {
    const host = useRef(null);
    const [failed, setFailed] = useState(false);
    const dark = useDark();
    const field = guard.provider === 'turnstile' ? 'captcha_turnstile' : 'captcha_v2';

    useEffect(() => {
        let alive = true;
        const load = guard.provider === 'turnstile' ? loadTurnstile() : loadRecaptcha(guard.v3, guard.locale);
        load.then((g) => {
            if (!alive || !host.current) return;
            host.current.replaceChildren();
            const slot = document.createElement('div');
            host.current.appendChild(slot);
            const done = (token) => form.setData(field, token);
            const clear = () => form.setData(field, '');
            guard.widget.current =
                guard.provider === 'turnstile'
                    ? g.render(slot, {
                          sitekey: guard.turnstile,
                          action: guard.action,
                          theme: dark ? 'dark' : 'light',
                          language: guard.locale || 'auto',
                          callback: done,
                          'expired-callback': clear,
                          'error-callback': clear,
                          'timeout-callback': clear,
                      })
                    : g.render(slot, { sitekey: guard.v2, theme: dark ? 'dark' : 'light', callback: done, 'expired-callback': clear, 'error-callback': clear });
            clear();
        }).catch(() => alive && setFailed(true));
        return () => {
            alive = false;
            if (guard.provider === 'turnstile' && guard.widget.current !== null) window.turnstile?.remove(guard.widget.current);
            guard.widget.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guard.provider, guard.v2, guard.turnstile, dark]);

    if (failed) {
        return <p className="text-xs text-ink-faint">The security check couldn’t load. Check your connection or disable blockers for this site.</p>;
    }

    return <div ref={host} className="min-h-[65px] overflow-hidden rounded-[3px]" />;
}

export function CaptchaNotice({ t, provider }) {
    if (provider === 'turnstile') {
        return (
            <p className="text-[11px] leading-relaxed text-ink-faint">
                {t('captcha.turnstile_notice', {}, 'Protected by Cloudflare Turnstile —')}{' '}
                <a className="underline hover:text-ink" href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
                    {t('captcha.privacy', {}, 'Privacy Policy')}
                </a>
            </p>
        );
    }
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
            {guard.v3 && <CaptchaNotice t={t} provider="recaptcha" />}
            {guard.turnstile && (!guard.v3 || guard.needsBox) && <CaptchaNotice t={t} provider="turnstile" />}
            {!guard.v3 && guard.v2 && <CaptchaNotice t={t} provider="recaptcha" />}
        </>
    );
}
