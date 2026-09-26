import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/*
 * Client half of App\Support\BotGuard.
 *
 * Every protected form carries a honeypot field and the time it was opened.
 * When reCAPTCHA keys are configured, submit() also fetches an invisible v3
 * token; if the server answers `captcha.challenge` the v2 checkbox appears.
 */

let scriptPromise = null;

function loadRecaptcha(siteKey) {
    if (window.grecaptcha?.execute) return Promise.resolve(window.grecaptcha);
    scriptPromise ??= new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
        s.async = true;
        s.onload = () => window.grecaptcha.ready(() => resolve(window.grecaptcha));
        s.onerror = reject;
        document.head.appendChild(s);
    });
    return scriptPromise;
}

export function useBotGuard(form, action) {
    const captcha = usePage().props.captcha ?? {};
    const startedAt = useRef(Date.now());
    const [challenge, setChallenge] = useState(false);

    useEffect(() => {
        if (captcha.enabled && captcha.v3) loadRecaptcha(captcha.v3).catch(() => {});
    }, [captcha.enabled, captcha.v3]);

    useEffect(() => {
        if (form.errors.captcha === 'captcha.challenge' && captcha.v2) setChallenge(true);
    }, [form.errors.captcha, captcha.v2]);

    /** Wrap form.post: adds bot fields and a fresh v3 token, then submits. */
    const submit = async (method, url, options = {}) => {
        let token = '';
        if (captcha.enabled && captcha.v3 && !form.data.captcha_v2) {
            try {
                const g = await loadRecaptcha(captcha.v3);
                token = await g.execute(captcha.v3, { action });
            } catch {
                /* network blocked: the server-side honeypot still runs */
            }
        }
        form.transform((data) => ({ ...data, website: data.website ?? '', form_started_at: startedAt.current, captcha_token: token }));
        form[method](url, options);
    };

    return { submit, challenge, siteKeyV2: captcha.v2 };
}

/** Invisible-to-humans honeypot. Off-screen (not display:none, which some bots skip). */
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

/** reCAPTCHA v2 checkbox, rendered only after the server asks for a challenge. */
export function CaptchaChallenge({ siteKey, form }) {
    const box = useRef(null);
    useEffect(() => {
        let widget;
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.onload = () =>
            window.grecaptcha.ready(() => {
                if (!box.current) return;
                widget = window.grecaptcha.render(box.current, {
                    sitekey: siteKey,
                    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                    callback: (token) => form.setData('captcha_v2', token),
                    'expired-callback': () => form.setData('captcha_v2', ''),
                });
            });
        document.head.appendChild(script);
        return () => widget !== undefined && window.grecaptcha?.reset(widget);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteKey]);

    return <div ref={box} className="min-h-[78px]" />;
}

/** Drop-in for any protected form: honeypot, v2 challenge when asked, and the error line. */
export function BotFields({ form, guard, t }) {
    const error = form.errors.captcha;
    return (
        <>
            <Honeypot form={form} />
            {guard.challenge && guard.siteKeyV2 && <CaptchaChallenge siteKey={guard.siteKeyV2} form={form} />}
            {error && (
                <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
                    {t(error)}
                </p>
            )}
        </>
    );
}
